'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, Trash2, X, UserPlus, PiggyBank, Loader2, Check, Edit2, Key, Copy, ShieldCheck, Eye, EyeOff, TrendingUp, ArrowRightLeft } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { searchSchemesMerged, type MergedFundScheme, getSchemeLatestNAV, resolveSchemeCode } from '@/lib/mfapi';
import { useClientContext, type Client } from '@/context/ClientContext';
import { getSupabaseClient } from '@/lib/supabase';
import { useHoldings } from '@/context/HoldingsContext';
import { useSIPs } from '@/context/SIPContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useAuth } from '@/context/AuthContext';

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

// Finds NAV on or after targetDate from MFAPI history (dates in DD-MM-YYYY, sorted descending)
function findNavForDate(navHistory: { date: string; nav: string }[], targetDate: Date): number {
    const targetTs = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
    let bestNav: number | null = null;
    let bestDiff = Infinity;

    for (const item of navHistory) {
        const [dd, mm, yyyy] = item.date.split('-').map(Number);
        const itemTs = new Date(yyyy, mm - 1, dd).getTime();
        const diff = itemTs - targetTs;
        if (diff >= 0 && diff < bestDiff) {
            bestDiff = diff;
            bestNav = parseFloat(item.nav);
        }
    }
    // Fallback to nearest date before target
    if (bestNav === null) {
        for (const item of navHistory) {
            const [dd, mm, yyyy] = item.date.split('-').map(Number);
            const itemTs = new Date(yyyy, mm - 1, dd).getTime();
            if (itemTs <= targetTs) return parseFloat(item.nav);
        }
    }
    return bestNav ?? 0;
}

function ManageClientsContent() {
    const { user } = useAuth();
    const { clients, addClient, updateClient, deleteClient } = useClientContext();
    const { addHolding, refreshHoldings } = useHoldings();
    const { addSIP, refreshSIPs } = useSIPs();
    const { addTransaction, refreshTransactions } = useTransactions();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState<{email: string, password: string} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Password change modal
    const [showPasswordModal, setShowPasswordModal] = useState<{ clientId: string; clientName: string; email: string } | null>(null);
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '', showNew: false, showConfirm: false });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        panCard: '',
        aadharCard: '',
        password: '', // Admin-defined password for client
        investmentType: 'SIP' as 'SIP' | 'Lumpsum' | 'Transfer',
        amount: '',
        totalInvested: '',
        sipAmount: '',
        startDate: '',
        schemeCode: 0,
        schemeName: '',
        selectedIsin: '',
        selectedNseCode: '',
        selectedFundCode: '', // canonical mutual_funds.code (AMFI > NSE)
        stepUpAmount: '',
        stepUpInterval: 'Yearly' as 'Yearly' | 'Half-Yearly' | 'Quarterly',
        isCustomFund: false,
        customFundName: '',
        customFundNAV: '',
    });

    type EnrichedFundScheme = MergedFundScheme;

    // Fund search state
    const [fundSearch, setFundSearch] = useState('');
    const [fundResults, setFundResults] = useState<EnrichedFundScheme[]>([]);
    const [fundSearching, setFundSearching] = useState(false);
    const [showFundDropdown, setShowFundDropdown] = useState(false);
    const fundDropdownRef = useRef<HTMLDivElement>(null);

    // SIP auto-calculation for Transfer mode
    const [sipCalculation, setSipCalculation] = useState<{
        totalUnits: number;
        currentValue: number;
        totalInvested: number;
        latestNav: number;
        pnl: number;
        pnlPct: number;
        nextSipDate: string;
        nInstallments: number;
        isLoading: boolean;
        error: string | null;
    } | null>(null);

    // Lumpsum auto-calculation
    const [lumpCalculation, setLumpCalculation] = useState<{
        units: number;
        currentValue: number;
        investedAmount: number;
        navOnDate: number;
        latestNav: number;
        pnl: number;
        pnlPct: number;
        isLoading: boolean;
        error: string | null;
    } | null>(null);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (showAddModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showAddModal]);

    // When switching to/from Transfer mode, clear Transfer-specific fields
    useEffect(() => {
        if (formData.investmentType === 'Transfer') {
            setFormData(prev => ({ ...prev, startDate: '', amount: '', totalInvested: '' }));
            setSipCalculation(null);
        }
    }, [formData.investmentType]);

    // Click outside handler for fund dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (fundDropdownRef.current && !fundDropdownRef.current.contains(event.target as Node)) {
                setShowFundDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search funds via merged endpoint (MFAPI ∪ NSE scheme master)
    const handleFundSearch = useCallback(async () => {
        if (!fundSearch.trim() || fundSearch.length < 2) {
            setFundResults([]);
            return;
        }
        setFundSearching(true);
        try {
            const results = await searchSchemesMerged(fundSearch);
            setFundResults(results.slice(0, 10));
        } catch (error) {
            console.error('Failed to search funds:', error);
        } finally {
            setFundSearching(false);
        }
    }, [fundSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (fundSearch.length >= 2) {
                handleFundSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [fundSearch, handleFundSearch]);

    // Resolve AMFI scheme code: direct > selectedFundCode numeric > ISIN reverse lookup
    const resolveAmfiCode = useCallback(async (schemeCode: number, selectedFundCode: string, isin: string): Promise<number> => {
        if (schemeCode > 0) return schemeCode;
        const parsed = parseInt(selectedFundCode, 10);
        if (parsed > 0) return parsed;
        if (isin && isin.startsWith('IN')) {
            try {
                const res = await fetch(`/api/amfi/isin-lookup?isin=${encodeURIComponent(isin)}`);
                if (res.ok) {
                    const data = await res.json() as { schemeCode?: number };
                    if (data.schemeCode && data.schemeCode > 0) return data.schemeCode;
                }
            } catch {
                // best effort
            }
        }
        return 0;
    }, []);

    // Auto-calculate SIP values for Transfer mode using MFAPI NAV history
    const calculateSIPValues = useCallback(async () => {
        // Resolve AMFI code: direct schemeCode > numeric selectedFundCode > ISIN reverse lookup
        const effectiveAmfiCode = await resolveAmfiCode(
            formData.schemeCode,
            formData.selectedFundCode,
            formData.selectedIsin,
        );

        if (
            formData.investmentType !== 'Transfer' ||
            !formData.startDate ||
            !formData.sipAmount ||
            parseFloat(formData.sipAmount) <= 0
        ) {
            if (formData.investmentType === 'Transfer' && !(effectiveAmfiCode > 0) && formData.startDate) {
                setSipCalculation({ totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund (not NSE-only).' });
            }
            return;
        }
        if (!(effectiveAmfiCode > 0)) {
            setSipCalculation({ totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund (not NSE-only).' });
            return;
        }

        setSipCalculation(prev => ({ ...(prev ?? { totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0 }), isLoading: true, error: null }));

        try {
            const sipAmount = parseFloat(formData.sipAmount);
            const startDate = new Date(formData.startDate + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const res = await fetch(`https://api.mfapi.in/mf/${effectiveAmfiCode}`);
            if (!res.ok) throw new Error('Failed to fetch NAV history');
            const data = await res.json();
            const navHistory: { date: string; nav: string }[] = data.data;
            if (!navHistory?.length) throw new Error('No NAV data available for this fund');

            let totalUnits = 0;
            let nInstallments = 0;
            const sipDate = new Date(startDate);

            while (sipDate <= today) {
                const nav = findNavForDate(navHistory, new Date(sipDate));
                if (nav > 0) {
                    totalUnits += sipAmount / nav;
                    nInstallments++;
                }
                sipDate.setMonth(sipDate.getMonth() + 1);
            }

            const latestNav = parseFloat(navHistory[0].nav);
            const currentValue = totalUnits * latestNav;
            const totalInvested = nInstallments * sipAmount;
            const pnl = currentValue - totalInvested;
            const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

            // Next SIP date = startDate + nInstallments months (local date to avoid UTC offset shifting day)
            const nextSip = new Date(startDate);
            nextSip.setMonth(nextSip.getMonth() + nInstallments);
            const nextSipDate = `${nextSip.getFullYear()}-${String(nextSip.getMonth() + 1).padStart(2, '0')}-${String(nextSip.getDate()).padStart(2, '0')}`;

            setSipCalculation({ totalUnits, currentValue, totalInvested, latestNav, pnl, pnlPct, nextSipDate, nInstallments, isLoading: false, error: null });
        } catch (err) {
            setSipCalculation(prev => ({ ...(prev ?? { totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0 }), isLoading: false, error: err instanceof Error ? err.message : 'Calculation failed' }));
        }
    }, [formData.investmentType, formData.schemeCode, formData.selectedFundCode, formData.selectedIsin, formData.startDate, formData.sipAmount, resolveAmfiCode]);

    useEffect(() => {
        if (formData.investmentType !== 'Transfer') { setSipCalculation(null); return; }
        const timer = setTimeout(calculateSIPValues, 600);
        return () => clearTimeout(timer);
    }, [formData.investmentType, formData.schemeCode, formData.selectedFundCode, formData.selectedIsin, formData.startDate, formData.sipAmount, calculateSIPValues]);

    // Auto-calculate Lumpsum values using MFAPI NAV history
    const calculateLumpsumValues = useCallback(async () => {
        // Resolve AMFI code: direct schemeCode > numeric selectedFundCode > ISIN reverse lookup
        const effectiveAmfiCode = await resolveAmfiCode(
            formData.schemeCode,
            formData.selectedFundCode,
            formData.selectedIsin,
        );

        if (
            formData.investmentType !== 'Lumpsum' ||
            !formData.startDate ||
            !formData.amount ||
            parseFloat(formData.amount) <= 0
        ) {
            if (formData.investmentType === 'Lumpsum' && !(effectiveAmfiCode > 0) && formData.startDate) {
                setLumpCalculation({ units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund (not NSE-only).' });
            }
            return;
        }
        if (!(effectiveAmfiCode > 0)) {
            setLumpCalculation({ units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund (not NSE-only).' });
            return;
        }

        setLumpCalculation(prev => ({ ...(prev ?? { units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0 }), isLoading: true, error: null }));

        try {
            const investedAmount = parseFloat(formData.amount);
            const investmentDate = new Date(formData.startDate + 'T00:00:00');

            const res = await fetch(`https://api.mfapi.in/mf/${effectiveAmfiCode}`);
            if (!res.ok) throw new Error('Failed to fetch NAV history');
            const data = await res.json();
            const navHistory: { date: string; nav: string }[] = data.data;
            if (!navHistory?.length) throw new Error('No NAV data available for this fund');

            const navOnDate = findNavForDate(navHistory, investmentDate);
            if (navOnDate <= 0) throw new Error('Could not find NAV for the investment date. Try an earlier date.');

            const units = investedAmount / navOnDate;
            const latestNav = parseFloat(navHistory[0].nav);
            const currentValue = units * latestNav;
            const pnl = currentValue - investedAmount;
            const pnlPct = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

            setLumpCalculation({ units, currentValue, investedAmount, navOnDate, latestNav, pnl, pnlPct, isLoading: false, error: null });
        } catch (err) {
            setLumpCalculation(prev => ({ ...(prev ?? { units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0 }), isLoading: false, error: err instanceof Error ? err.message : 'Calculation failed' }));
        }
    }, [formData.investmentType, formData.schemeCode, formData.selectedFundCode, formData.selectedIsin, formData.startDate, formData.amount, resolveAmfiCode]);

    useEffect(() => {
        if (formData.investmentType !== 'Lumpsum') { setLumpCalculation(null); return; }
        const timer = setTimeout(calculateLumpsumValues, 600);
        return () => clearTimeout(timer);
    }, [formData.investmentType, formData.schemeCode, formData.selectedFundCode, formData.selectedIsin, formData.startDate, formData.amount, calculateLumpsumValues]);

    const handleSelectFund = (fund: EnrichedFundScheme) => {
        setFormData(prev => ({
            ...prev,
            schemeCode: fund.schemeCode,
            schemeName: fund.schemeName,
            selectedIsin: fund.isin ?? '',
            selectedNseCode: fund.nseCode ?? '',
            selectedFundCode: resolveSchemeCode(fund),
        }));
        setFundSearch(fund.schemeName);
        setShowFundDropdown(false);
    };

    const handleAddClient = async () => {
        if (!formData.name || !formData.email) {
            alert('Please fill in Name and Email');
            return;
        }

        if (!formData.panCard) {
            alert('PAN Card is required');
            return;
        }

        // Password required only for new clients (they need to login)
        if (!editingClient && (!formData.password || formData.password.length < 6)) {
            alert('Password must be at least 6 characters (required for client login)');
            return;
        }

        // If a fund is selected, at least one investment type should have an amount
        const hasFundSelected = formData.isCustomFund
            ? formData.customFundName.trim() !== ''
            : (formData.schemeCode > 0 || !!formData.selectedNseCode);
        if (hasFundSelected) {
            const hasLumpsum = formData.amount && parseFloat(formData.amount) > 0;
            const hasSIP = formData.sipAmount && parseFloat(formData.sipAmount) > 0;

            if (formData.investmentType === 'Transfer') {
                if (!hasSIP) {
                    alert('Please enter the Monthly SIP amount');
                    return;
                }
                if (!formData.startDate) {
                    alert('Please enter the SIP Start Date');
                    return;
                }
                if (formData.schemeCode <= 0) {
                    alert('Please select an AMFI-listed mutual fund for Transfer mode (fund must have an AMFI code)');
                    return;
                }
                if (!sipCalculation || sipCalculation.isLoading) {
                    alert('Please wait for the SIP calculation to complete');
                    return;
                }
                if (sipCalculation.error) {
                    alert('SIP calculation failed: ' + sipCalculation.error);
                    return;
                }
                if (sipCalculation.nInstallments === 0) {
                    alert('No SIP installments found from the start date to today. Please check the SIP Start Date (it should be a past date).');
                    return;
                }
            } else if (!hasLumpsum && !hasSIP) {
                alert('Please enter at least a Lumpsum Amount or SIP Amount');
                return;
            }
        }

        setIsSubmitting(true);

        let targetClientId: string | undefined;

        try {
            if (editingClient) {
                // Update existing client - use Profile field names
                await updateClient(editingClient.id, {
                    full_name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    pan: formData.panCard,
                    aadhar: formData.aadharCard.replace(/\s/g, '') || null,
                    notes: null,
                });
                targetClientId = editingClient.id;
            } else {
                // Create new client - addClient now handles the API call internally
                console.log('Creating client...', { formData });
                const result = await addClient({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone || undefined,
                    pan: formData.panCard,
                    aadhar: formData.aadharCard ? formData.aadharCard.replace(/\s/g, '') : undefined,
                    password: formData.password,
                });

                if (!result.success) {
                    throw new Error(result.error || 'Failed to create client');
                }

                console.log('Client created successfully, result:', result);
                targetClientId = result.data?.id;
            }

            // If fund was selected, create holdings and transactions (for BOTH new and existing clients)
            const hasScheme = formData.isCustomFund
                ? formData.customFundName.trim() !== ''
                : (formData.schemeCode > 0 || !!formData.selectedNseCode);
            if (targetClientId && hasScheme) {
                console.log('Processing investment for client:', targetClientId);

                const supabase = getSupabaseClient();

                let effectiveSchemeCode: string;
                let effectiveSchemeName: string;
                let currentNav = 10;
                let isinValue: string | null = null;
                let nseCodeValue: string | null = null;

                if (formData.isCustomFund) {
                    // Custom fund: generate unique code
                    effectiveSchemeCode = `CUSTOM-${Date.now()}`;
                    effectiveSchemeName = formData.customFundName.trim();
                    currentNav = parseFloat(formData.customFundNAV) || 10;
                } else {
                    // AMFI present ⇒ use AMFI as primary code (works with MFAPI for daily NAV).
                    // NSE-only ⇒ use NSE scheme code as primary; daily-refresh will resolve NAV via NSE.
                    effectiveSchemeCode = formData.selectedFundCode
                        || (formData.schemeCode > 0 ? formData.schemeCode.toString() : formData.selectedNseCode);
                    effectiveSchemeName = formData.schemeName;
                    isinValue = formData.selectedIsin || null;
                    nseCodeValue = formData.selectedNseCode || null;

                    // Fetch latest NAV from MFAPI when an AMFI code is available
                    if (formData.schemeCode > 0) {
                        try {
                            const navData = await getSchemeLatestNAV(formData.schemeCode);
                            if (navData?.data?.[0]) {
                                currentNav = parseFloat(navData.data[0].nav);
                            }
                            if (!isinValue) {
                                isinValue = navData?.meta?.isin_growth ?? null;
                            }
                        } catch (e) {
                            console.warn('Could not fetch latest NAV, using default', e);
                        }
                    }
                    // For NSE-only schemes, currentNav stays at 10 here; the next /api/cron/daily-refresh
                    // will pull the real NAV from NSE MASTER_DOWNLOAD using nse_code.
                }

                // Upsert mutual fund — include isin_value AND nse_code so daily-refresh
                // can route NAV updates through NSE/MFAPI without further intervention.
                await (supabase.from('mutual_funds') as any).upsert({
                    code: effectiveSchemeCode,
                    name: effectiveSchemeName,
                    category: null,
                    type: null,
                    fund_house: formData.isCustomFund ? 'Custom' : null,
                    current_nav: currentNav,
                    last_updated: new Date().toISOString(),
                    ...(isinValue ? { isin_value: isinValue } : {}),
                    ...(nseCodeValue ? { nse_code: nseCodeValue } : {}),
                });

                const lumpsumAmount = parseFloat(formData.amount) || 0;
                const sipAmountInput = parseFloat(formData.sipAmount) || 0;

                if (formData.investmentType === 'Transfer' && sipCalculation) {
                    // Transfer mode: create holding from auto-calculated historical SIP values
                    const { totalUnits, latestNav: calcNav, totalInvested: calcInvested, nextSipDate } = sipCalculation;
                    const avgPrice = totalUnits > 0 ? calcInvested / totalUnits : calcNav;
                    const navForHolding = calcNav || currentNav;

                    await addHolding({
                        user_id: targetClientId,
                        scheme_code: effectiveSchemeCode,
                        units: totalUnits,
                        average_price: avgPrice,
                        current_nav: navForHolding,
                    });

                    await addTransaction({
                        user_id: targetClientId,
                        scheme_code: effectiveSchemeCode,
                        type: 'buy',
                        amount: calcInvested,
                        units: totalUnits,
                        nav: avgPrice,
                        status: 'completed',
                        date: new Date().toISOString().split('T')[0],
                    });

                    const sipPayload: any = {
                        user_id: targetClientId,
                        scheme_code: effectiveSchemeCode,
                        amount: sipAmountInput,
                        frequency: 'monthly',
                        start_date: formData.startDate,
                        next_execution_date: nextSipDate,
                        status: 'active',
                    };
                    const stepUp = parseFloat(formData.stepUpAmount);
                    if (stepUp > 0) {
                        sipPayload.step_up_amount = stepUp;
                        sipPayload.step_up_interval = formData.stepUpInterval;
                    }
                    await addSIP(sipPayload);

                } else if (formData.investmentType === 'Lumpsum' && lumpCalculation && !lumpCalculation.error) {
                    // Lumpsum mode with auto-calculated historical NAV values
                    const { units: calcUnits, navOnDate, latestNav: calcLatestNav, investedAmount: calcInvested } = lumpCalculation;

                    await addHolding({
                        user_id: targetClientId,
                        scheme_code: effectiveSchemeCode,
                        units: calcUnits,
                        average_price: navOnDate,
                        current_nav: calcLatestNav,
                    });

                    await addTransaction({
                        user_id: targetClientId,
                        scheme_code: effectiveSchemeCode,
                        type: 'buy',
                        amount: calcInvested,
                        units: calcUnits,
                        nav: navOnDate,
                        status: 'completed',
                        date: formData.startDate || new Date().toISOString().split('T')[0],
                    });

                } else {
                    // SIP / Lumpsum modes
                    let sipFirstAmount = 0;
                    let nextExecutionDate = formData.startDate ? new Date(formData.startDate) : new Date();

                    if (sipAmountInput > 0) {
                        const startDate = formData.startDate ? new Date(formData.startDate) : new Date();
                        const today = new Date();
                        startDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        if (startDate <= today) {
                            sipFirstAmount = sipAmountInput;
                            nextExecutionDate = new Date(startDate);
                            nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
                        }
                    }

                    const totalInitialAmount = lumpsumAmount + sipFirstAmount;

                    if (totalInitialAmount > 0) {
                        const totalUnits = currentNav > 0 ? totalInitialAmount / currentNav : 0;
                        const lumpsumUnits = currentNav > 0 ? lumpsumAmount / currentNav : 0;

                        await addHolding({
                            user_id: targetClientId,
                            scheme_code: effectiveSchemeCode,
                            units: totalUnits,
                            average_price: currentNav,
                            current_nav: currentNav,
                        });

                        if (lumpsumAmount > 0) {
                            await addTransaction({
                                user_id: targetClientId,
                                scheme_code: effectiveSchemeCode,
                                type: 'buy',
                                amount: lumpsumAmount,
                                units: lumpsumUnits,
                                nav: currentNav,
                                status: 'completed',
                                date: formData.startDate || new Date().toISOString().split('T')[0],
                            });
                        }

                        if (sipFirstAmount > 0) {
                            const units = currentNav > 0 ? sipFirstAmount / currentNav : 0;
                            await addTransaction({
                                user_id: targetClientId,
                                scheme_code: effectiveSchemeCode,
                                type: 'sip',
                                amount: sipFirstAmount,
                                units,
                                nav: currentNav,
                                status: 'completed',
                                date: formData.startDate || new Date().toISOString().split('T')[0],
                            });
                        }
                    }

                    if (sipAmountInput > 0) {
                        const sipPayload: any = {
                            user_id: targetClientId,
                            scheme_code: effectiveSchemeCode,
                            amount: sipAmountInput,
                            frequency: 'monthly',
                            start_date: formData.startDate || new Date().toISOString(),
                            next_execution_date: nextExecutionDate.toISOString().split('T')[0],
                            status: 'active',
                        };
                        const stepUp = parseFloat(formData.stepUpAmount);
                        if (stepUp > 0) {
                            sipPayload.step_up_amount = stepUp;
                            sipPayload.step_up_interval = formData.stepUpInterval;
                        }
                        await addSIP(sipPayload);
                    }
                }
            }

            // Close modal and reset
            setShowAddModal(false);
            resetForm();

            // Store credentials to show ONLY if new client
            if (!editingClient) {
                const savedCredentials = { email: formData.email, password: formData.password };
                setShowCredentialsModal(savedCredentials);
            }
        } catch (error) {
            console.error('Error creating client:', error);
            alert(error instanceof Error ? error.message : 'Failed to create client');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClient = useCallback((client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || client.full_name || '',
            email: client.email || '',
            phone: client.phone || '',
            panCard: client.panCard || client.pan || '',
            aadharCard: client.aadharCard || client.aadhar || '',
            password: '',
            investmentType: 'SIP',
            amount: '0',
            totalInvested: '',
            sipAmount: '',
            startDate: '',
            schemeCode: 0,
            schemeName: '',
            selectedIsin: '',
            selectedNseCode: '',
            selectedFundCode: '',
            stepUpAmount: '',
            stepUpInterval: 'Yearly',
            isCustomFund: false,
            customFundName: '',
            customFundNAV: '',
        });
        setFundSearch('');
        setShowAddModal(true);
    }, []);

    // Handle edit from query params
    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId && clients.length > 0 && !showAddModal) {
            const client = clients.find(c => c.id === editId);
            if (client) {
                handleEditClient(client);
                // Clear the param so it doesn't persist if we close/navigate
                router.replace('/manage', { scroll: false });
            }
        }
    }, [searchParams, clients, showAddModal, router, handleEditClient]);

    const handleOpenPasswordModal = (client: Client) => {
        setPasswordForm({ newPassword: '', confirmPassword: '', showNew: false, showConfirm: false });
        setShowPasswordModal({ clientId: client.id, clientName: client.name, email: client.email || '' });
    };

    const handleChangePassword = async () => {
        if (!showPasswordModal) return;
        if (passwordForm.newPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        setIsChangingPassword(true);
        try {
            const res = await fetch('/api/clients/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: showPasswordModal.clientId, newPassword: passwordForm.newPassword, advisorId: user?.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update password');
            setShowPasswordModal(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteClient = async (clientId: string) => {
        if (confirm('Are you sure you want to remove this client?')) {
            const result = await deleteClient(clientId);
            if (result.success) {
                Promise.all([refreshHoldings(), refreshSIPs(), refreshTransactions()]).catch(console.error);
            } else {
                alert('Failed to delete client: ' + (result.error || 'Unknown error'));
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            panCard: '',
            aadharCard: '',
            password: '',
            investmentType: 'SIP',
            amount: '',
            totalInvested: '',
            sipAmount: '',
            startDate: '',
            schemeCode: 0,
            schemeName: '',
            selectedIsin: '',
            selectedNseCode: '',
            selectedFundCode: '',
            stepUpAmount: '',
            stepUpInterval: 'Yearly',
            isCustomFund: false,
            customFundName: '',
            customFundNAV: '',
        });
        setFundSearch('');
        setFundResults([]);
        setEditingClient(null);
        setSipCalculation(null);
        setLumpCalculation(null);
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="pr-12 md:pr-0">
                        <h1 className="text-xl md:text-2xl font-bold">Manage Clients</h1>
                        <p className="text-[#9CA3AF] text-xs md:text-sm">Add, edit, and remove client investments</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 md:px-5 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-[#C4A265] to-[#D4B87A] text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#C4A265]/30 transition-all text-sm self-start sm:self-auto"
                    >
                        <Plus size={18} />
                        Add Client
                    </button>
                </header>

                {/* Search */}
                <div className="glass-card rounded-2xl p-3 md:p-4 mb-4 md:mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Clients List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Desktop Header */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 bg-white/5 border-b border-white/10">
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Client</div>
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Email / Phone</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">PAN</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Status</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">Actions</div>
                    </div>

                    {/* Body */}
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 md:py-16">
                            <UserPlus className="text-[#9CA3AF] mb-3" size={40} />
                            <p className="text-[#9CA3AF] text-sm">No clients found</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 text-[#C4A265] hover:underline text-sm"
                            >
                                Add your first client
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredClients.map((client) => (
                                <div key={client.id}>
                                    {/* Mobile Card View */}
                                    <div className="lg:hidden p-4 hover:bg-white/5 transition-all">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4A265] to-[#5B7FA4] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                    {client.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium text-sm">{client.name}</p>
                                                    <p className="text-[#9CA3AF] text-xs">{client.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditClient(client)}
                                                    className="p-2 rounded-lg bg-[#C4A265]/10 text-[#C4A265] hover:bg-[#C4A265]/20 transition-colors flex-shrink-0"
                                                    title="Edit client"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenPasswordModal(client)}
                                                    className="p-2 rounded-lg bg-[#5B7FA4]/10 text-[#5B7FA4] hover:bg-[#5B7FA4]/20 transition-colors flex-shrink-0"
                                                    title="Change password"
                                                >
                                                    <Key size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClient(client.id)}
                                                    className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors flex-shrink-0"
                                                    title="Delete client"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs mt-2">
                                            <span className="text-[#9CA3AF] font-mono">{client.panCard || client.pan || 'NO PAN'}</span>
                                            <span
                                                className={`px-2.5 py-1 rounded-md font-medium capitalize ${client.status === 'active'
                                                    ? 'bg-[#C4A265]/10 text-[#C4A265]'
                                                    : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                                                    }`}
                                            >
                                                {client.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop Row */}
                                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-all items-center">
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4A265] to-[#5B7FA4] flex items-center justify-center text-white font-semibold text-sm">
                                                    {client.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium text-sm">{client.name}</p>
                                                    <p className="text-[#9CA3AF] text-xs">ID: {client.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <p className="text-white text-sm ">{client.email}</p>
                                            <p className="text-[#9CA3AF] text-xs">{client.phone || '-'}</p>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-center">
                                            <span className="text-white font-mono text-sm">{client.panCard || client.pan || '-'}</span>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end">
                                            <span
                                                className={`px-3 py-1 rounded-md text-xs font-medium capitalize ${client.status === 'active'
                                                    ? 'bg-[#C4A265]/10 text-[#C4A265]'
                                                    : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                                                    }`}
                                            >
                                                {client.status || 'Active'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEditClient(client)}
                                                className="p-2 rounded-lg bg-[#C4A265]/10 text-[#C4A265] hover:bg-[#C4A265]/20 transition-colors"
                                                title="Edit client"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenPasswordModal(client)}
                                                className="p-2 rounded-lg bg-[#5B7FA4]/10 text-[#5B7FA4] hover:bg-[#5B7FA4]/20 transition-colors"
                                                title="Change password"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClient(client.id)}
                                                className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
                                                title="Delete client"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <Sidebar />

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="w-full max-w-sm glass-card rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowPasswordModal(null)}
                            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-[#5B7FA4]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Key size={24} className="text-[#5B7FA4]" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Change Password</h3>
                            <p className="text-[#9CA3AF] text-xs mt-1">{showPasswordModal.clientName}</p>
                            <p className="text-[#9CA3AF] text-[11px]">{showPasswordModal.email}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">New Password *</label>
                                <div className="relative">
                                    <input
                                        type={passwordForm.showNew ? 'text' : 'password'}
                                        placeholder="Minimum 6 characters"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#5B7FA4]/50 text-sm pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPasswordForm(prev => ({ ...prev, showNew: !prev.showNew }))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white transition-colors"
                                    >
                                        {passwordForm.showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={passwordForm.showConfirm ? 'text' : 'password'}
                                        placeholder="Re-enter password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className={`w-full px-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none text-sm pr-12 transition-colors ${
                                            passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                                                ? 'border-[#EF4444]/50 focus:border-[#EF4444]/70'
                                                : passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword
                                                ? 'border-[#10B981]/50 focus:border-[#10B981]/70'
                                                : 'border-white/10 focus:border-[#5B7FA4]/50'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPasswordForm(prev => ({ ...prev, showConfirm: !prev.showConfirm }))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white transition-colors"
                                    >
                                        {passwordForm.showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                                    <p className="text-[10px] text-[#EF4444] mt-1">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPasswordModal(null)}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#9CA3AF] font-medium hover:bg-white/10 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                disabled={isChangingPassword || passwordForm.newPassword.length < 6 || passwordForm.newPassword !== passwordForm.confirmPassword}
                                className="flex-1 py-2.5 rounded-xl bg-[#5B7FA4] text-white font-medium hover:bg-[#5B7FA4]/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isChangingPassword ? (
                                    <><Loader2 size={16} className="animate-spin" /> Updating...</>
                                ) : (
                                    <><Key size={16} /> Update Password</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Modal */}
            {showCredentialsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="w-full max-w-sm glass-card rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowCredentialsModal(null)}
                            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <ShieldCheck size={24} className="text-[var(--accent-purple)]" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Client Credentials</h3>
                            <p className="text-[#9CA3AF] text-xs mt-1">Share these details securely with the client</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-[#9CA3AF] text-[10px] uppercase font-medium mb-1">Login ID / Email</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-white font-mono text-sm">{showCredentialsModal.email || 'N/A'}</p>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(showCredentialsModal.email || '')}
                                        className="text-[var(--accent-mint)] hover:text-white"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-[#9CA3AF] text-[10px] uppercase font-medium mb-1">Password</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-white font-mono text-sm">{showCredentialsModal.password || '••••••••'}</p>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(showCredentialsModal.password || '')}
                                        className="text-[var(--accent-mint)] hover:text-white"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-[#9CA3AF] mt-2 italic">
                                    Share these credentials securely with the client
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowCredentialsModal(null)}
                            className="w-full mt-6 py-2.5 rounded-xl bg-[var(--accent-purple)] text-white font-medium hover:bg-[var(--accent-purple)]/90 transition-colors text-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
                    <div className="w-full sm:max-w-xl glass-card rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#C4A265]/20 flex items-center justify-center">
                                    <UserPlus size={20} className="text-[#C4A265]" />
                                </div>
                                <div>
                                    <h2 className="text-white text-base md:text-lg font-semibold">
                                        {editingClient ? 'Edit Client' : 'Add New Client'}
                                    </h2>
                                    <p className="text-[#9CA3AF] text-xs">
                                        {editingClient ? 'Update client investment details' : 'Enter client investment details'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X size={20} className="text-[#9CA3AF]" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Client Name */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Client Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter client name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                />
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Email *</label>
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Password - Only shown for new clients */}
                            {!editingClient && (
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block flex items-center gap-2">
                                        <Key size={12} />
                                        Client Login Password *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Minimum 6 characters"
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-[#9CA3AF] mt-1">
                                        This password will be used by the client to log in to their dashboard
                                    </p>
                                </div>
                            )}

                            {/* PAN Card & Aadhar Card */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">PAN Card *</label>
                                    <input
                                        type="text"
                                        placeholder="ABCDE1234F"
                                        value={formData.panCard}
                                        onChange={(e) => setFormData(prev => ({ ...prev, panCard: e.target.value.toUpperCase() }))}
                                        maxLength={10}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Aadhar Card</label>
                                    <input
                                        type="text"
                                        placeholder="XXXX XXXX XXXX"
                                        value={formData.aadharCard}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                                            // Format as 1234 5678 9012
                                            const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                                            setFormData(prev => ({ ...prev, aadharCard: formatted }));
                                        }}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Mutual Fund Search */}
                            <div className="relative" ref={fundDropdownRef}>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Select Mutual Fund *</label>

                                <div className="relative">
                                            <PiggyBank className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search mutual funds..."
                                                value={fundSearch}
                                                onChange={(e) => { setFundSearch(e.target.value); setShowFundDropdown(true); }}
                                                onFocus={() => setShowFundDropdown(true)}
                                                className="w-full pl-12 pr-10 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                            />
                                            {fundSearching && (
                                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C4A265] animate-spin" size={18} />
                                            )}
                                            {formData.schemeCode > 0 && !fundSearching && (
                                                <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C4A265]" size={18} />
                                            )}
                                        </div>

                                        {/* Fund Results Dropdown */}
                                        {showFundDropdown && fundResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-2 bg-[#151A21] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                {fundResults.map((fund) => {
                                                    const key = fund.schemeCode > 0
                                                        ? `mfapi-${fund.schemeCode}`
                                                        : `nse-${fund.nseCode}`;
                                                    const sourceBadge = fund.source === 'both'
                                                        ? { label: 'AMFI + NSE', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
                                                        : fund.source === 'nse'
                                                            ? { label: 'NSE only', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
                                                            : { label: 'AMFI', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => handleSelectFund(fund)}
                                                            className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="text-white text-sm  flex-1">{fund.schemeName}</p>
                                                                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${sourceBadge.cls}`}>
                                                                    {sourceBadge.label}
                                                                </span>
                                                            </div>
                                                            <p className="text-[#9CA3AF] text-xs">
                                                                {fund.isin
                                                                    ? `ISIN: ${fund.isin}`
                                                                    : fund.nseCode
                                                                        ? `NSE: ${fund.nseCode}`
                                                                        : `Code: ${fund.schemeCode}`}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                            </div>

                            {/* Investment Type */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Investment Type *</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, investmentType: 'SIP' }))}
                                        className={`p-3 md:p-4 rounded-xl border transition-all ${formData.investmentType === 'SIP'
                                            ? 'bg-[#C4A265]/20 border-[#C4A265]/50 text-[#C4A265]'
                                            : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:bg-white/10'
                                            }`}
                                    >
                                        <p className="font-medium text-sm">SIP</p>
                                        <p className="text-[10px] opacity-70">Monthly Investment</p>
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, investmentType: 'Lumpsum' }))}
                                        className={`p-3 md:p-4 rounded-xl border transition-all ${formData.investmentType === 'Lumpsum'
                                            ? 'bg-[#5B7FA4]/20 border-[#5B7FA4]/50 text-[#5B7FA4]'
                                            : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:bg-white/10'
                                            }`}
                                    >
                                        <p className="font-medium text-sm">Lumpsum</p>
                                        <p className="text-[10px] opacity-70">One-time Investment</p>
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, investmentType: 'Transfer' }))}
                                        className={`p-3 md:p-4 rounded-xl border transition-all ${formData.investmentType === 'Transfer'
                                            ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]'
                                            : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:bg-white/10'
                                            }`}
                                    >
                                        <p className="font-medium text-sm">Transfer</p>
                                        <p className="text-[10px] opacity-70">Existing SIP</p>
                                    </button>
                                </div>
                            </div>

                            {/* Amount — hidden for Transfer (values auto-calculated) */}
                            {formData.investmentType !== 'Transfer' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[#9CA3AF] text-xs mb-2 block">
                                            {formData.investmentType === 'SIP' ? 'Initial Lumpsum (Optional)' : 'Investment Amount *'}
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="₹ Amount"
                                            value={formData.amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                        />
                                    </div>
                                    {formData.investmentType === 'SIP' && (
                                        <div>
                                            <label className="text-[#9CA3AF] text-xs mb-2 block">Monthly SIP Amount</label>
                                            <input
                                                type="number"
                                                placeholder="₹ Monthly"
                                                value={formData.sipAmount}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sipAmount: e.target.value }))}
                                                className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Transfer mode — SIP amount + start date (current value & invested auto-calculated) */}
                            {formData.investmentType === 'Transfer' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[#9CA3AF] text-xs mb-2 block">Monthly SIP Amount (₹) *</label>
                                        <input
                                            type="number"
                                            placeholder="₹ e.g. 5000"
                                            value={formData.sipAmount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sipAmount: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[#9CA3AF] text-xs mb-2 block">SIP Start Date (on previous platform) *</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                        />
                                        <p className="text-[10px] text-[#9CA3AF] mt-1">Date of first SIP installment (must be in the past)</p>
                                    </div>

                                    {/* Next SIP Date — computed from calculation */}
                                    {sipCalculation && !sipCalculation.isLoading && !sipCalculation.error && sipCalculation.nextSipDate && (
                                        <div className="sm:col-span-2">
                                            <label className="text-[#9CA3AF] text-xs mb-2 block">Next SIP Date (computed)</label>
                                            <div className="px-4 py-2.5 bg-white/5 border border-[#10B981]/30 rounded-xl text-[#6EE7B7] text-sm font-medium">
                                                {new Date(sipCalculation.nextSipDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Transfer auto-calculated summary card */}
                            {formData.investmentType === 'Transfer' && (
                                <div className="p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/20">
                                    <p className="text-[10px] text-[#10B981] mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                        <ArrowRightLeft size={11} />
                                        SIP Calculation (Auto)
                                        {sipCalculation?.isLoading && <Loader2 size={11} className="animate-spin ml-1" />}
                                    </p>
                                    {sipCalculation?.isLoading && (
                                        <p className="text-[#9CA3AF] text-xs">Fetching NAV history and calculating...</p>
                                    )}
                                    {sipCalculation?.error && (
                                        <p className="text-[#FCA5A5] text-xs">{sipCalculation.error}</p>
                                    )}
                                    {!sipCalculation && (
                                        <p className="text-[#9CA3AF] text-xs">Enter the SIP amount and start date above to auto-calculate units, current value, and P&amp;L.</p>
                                    )}
                                    {sipCalculation && !sipCalculation.isLoading && !sipCalculation.error && (
                                        <>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                                                <span className="text-[#9CA3AF]">Installments</span>
                                                <span className="text-white font-medium text-right">{sipCalculation.nInstallments} months</span>
                                                <span className="text-[#9CA3AF]">Total Units</span>
                                                <span className="text-white font-medium text-right">{sipCalculation.totalUnits.toFixed(4)}</span>
                                                <span className="text-[#9CA3AF]">Latest NAV</span>
                                                <span className="text-white font-medium text-right">₹{sipCalculation.latestNav.toFixed(4)}</span>
                                                <span className="text-[#9CA3AF]">Current Value</span>
                                                <span className="text-white font-medium text-right">₹{sipCalculation.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                <span className="text-[#9CA3AF]">Total Invested</span>
                                                <span className="text-white font-medium text-right">₹{sipCalculation.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {(() => {
                                                const positive = sipCalculation.pnl >= 0;
                                                return (
                                                    <p className={`text-[11px] font-semibold border-t border-white/10 pt-1.5 ${positive ? 'text-[#6EE7B7]' : 'text-[#FCA5A5]'}`}>
                                                        P&amp;L: {positive ? '+' : ''}₹{sipCalculation.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({positive ? '+' : ''}{sipCalculation.pnlPct.toFixed(2)}%)
                                                    </p>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Step-up SIP */}
                            {(formData.investmentType === 'SIP' || formData.investmentType === 'Transfer') && (
                                <div className="p-3 rounded-xl bg-[var(--accent-purple)]/5 border border-[var(--accent-purple)]/20">
                                    <p className="text-[10px] text-[var(--accent-purple)] mb-2 font-medium uppercase tracking-wider flex items-center gap-1">
                                        <TrendingUp size={12} />
                                        Step-up SIP (Optional)
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[#9CA3AF] text-[10px] mb-1 block">Step-up Amount (₹)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 500"
                                                value={formData.stepUpAmount}
                                                onChange={(e) => setFormData(prev => ({ ...prev, stepUpAmount: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[var(--accent-purple)]/50 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[#9CA3AF] text-[10px] mb-1 block">Step-up Interval</label>
                                            <select
                                                value={formData.stepUpInterval}
                                                onChange={(e) => setFormData(prev => ({ ...prev, stepUpInterval: e.target.value as 'Yearly' | 'Half-Yearly' | 'Quarterly' }))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-purple)]/50 text-sm appearance-none"
                                            >
                                                <option value="Yearly" className="bg-[#151A21]">Yearly</option>
                                                <option value="Half-Yearly" className="bg-[#151A21]">Half-Yearly</option>
                                                <option value="Quarterly" className="bg-[#151A21]">Quarterly</option>
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-[#9CA3AF] mt-2">
                                        SIP amount will increase by ₹{formData.stepUpAmount || '0'} every {formData.stepUpInterval === 'Quarterly' ? '3 months' : formData.stepUpInterval === 'Half-Yearly' ? '6 months' : 'year'}
                                    </p>
                                </div>
                            )}

                            {/* Start Date — only for SIP/Lumpsum; Transfer mode has its own start date field above */}
                            {formData.investmentType !== 'Transfer' && (
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">
                                        {formData.investmentType === 'Lumpsum' ? 'Investment Date (when lumpsum was made) *' : 'Start Date *'}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#C4A265]/50 text-sm"
                                    />
                                    {formData.investmentType === 'Lumpsum' && (
                                        <p className="text-[10px] text-[#9CA3AF] mt-1">Date the lumpsum investment was originally made (must be in the past)</p>
                                    )}
                                </div>
                            )}

                            {/* Lumpsum auto-calculated summary card */}
                            {formData.investmentType === 'Lumpsum' && (
                                <div className="p-3 rounded-xl bg-[#5B7FA4]/5 border border-[#5B7FA4]/20">
                                    <p className="text-[10px] text-[#5B7FA4] mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                        <TrendingUp size={11} />
                                        Lumpsum Calculation (Auto)
                                        {lumpCalculation?.isLoading && <Loader2 size={11} className="animate-spin ml-1" />}
                                    </p>
                                    {lumpCalculation?.isLoading && (
                                        <p className="text-[#9CA3AF] text-xs">Fetching NAV history and calculating...</p>
                                    )}
                                    {lumpCalculation?.error && (
                                        <p className="text-[#FCA5A5] text-xs">{lumpCalculation.error}</p>
                                    )}
                                    {!lumpCalculation && (
                                        <p className="text-[#9CA3AF] text-xs">Enter the investment amount and investment date above to auto-calculate units, current value, and P&amp;L.</p>
                                    )}
                                    {lumpCalculation && !lumpCalculation.isLoading && !lumpCalculation.error && (
                                        <>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                                                <span className="text-[#9CA3AF]">NAV on Inv. Date</span>
                                                <span className="text-white font-medium text-right">₹{lumpCalculation.navOnDate.toFixed(4)}</span>
                                                <span className="text-[#9CA3AF]">Units Purchased</span>
                                                <span className="text-white font-medium text-right">{lumpCalculation.units.toFixed(4)}</span>
                                                <span className="text-[#9CA3AF]">Latest NAV</span>
                                                <span className="text-white font-medium text-right">₹{lumpCalculation.latestNav.toFixed(4)}</span>
                                                <span className="text-[#9CA3AF]">Current Value</span>
                                                <span className="text-white font-medium text-right">₹{lumpCalculation.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                <span className="text-[#9CA3AF]">Invested Amount</span>
                                                <span className="text-white font-medium text-right">₹{lumpCalculation.investedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {(() => {
                                                const positive = lumpCalculation.pnl >= 0;
                                                return (
                                                    <p className={`text-[11px] font-semibold border-t border-white/10 pt-1.5 ${positive ? 'text-[#6EE7B7]' : 'text-[#FCA5A5]'}`}>
                                                        P&amp;L: {positive ? '+' : ''}₹{lumpCalculation.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({positive ? '+' : ''}{lumpCalculation.pnlPct.toFixed(2)}%)
                                                    </p>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 md:p-6 border-t border-white/10 flex gap-3 safe-area-bottom">
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="flex-1 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-[#9CA3AF] font-medium hover:bg-white/10 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddClient}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-[#C4A265] to-[#D4B87A] text-white font-medium hover:shadow-lg hover:shadow-[#C4A265]/30 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        {editingClient ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    editingClient ? 'Update Client' : 'Add Client'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
 
export default function ManageClientsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user?.role !== 'admin') {
            router.replace('/client-dashboard');
        }
    }, [isLoading, user, router]);

    if (isLoading || user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[var(--accent-mint)]" />
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--bg-primary)] p-6 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[var(--accent-mint)]" />
            </div>
        }>
            <ManageClientsContent />
        </Suspense>
    );
}
