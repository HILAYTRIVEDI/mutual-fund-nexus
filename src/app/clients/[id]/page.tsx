'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, PiggyBank, TrendingUp, TrendingDown, FileText, Edit, Trash2, Plus, Calculator, Loader2, ShieldCheck, Search, X, Check, ArrowRightLeft } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useSettings } from '@/context/SettingsContext';
import { useClientContext } from '@/context/ClientContext';
import { useHoldings } from '@/context/HoldingsContext';
import { useSIPs } from '@/context/SIPContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useAuth } from '@/context/AuthContext';
import { calculateXIRR } from '@/lib/utils/finance';
import { searchSchemesMerged, type MergedFundScheme, getSchemeLatestNAV, resolveSchemeCode } from '@/lib/mfapi';
import { getSupabaseClient } from '@/lib/supabase';

function formatCurrency(amount: number): string {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
        if (diff >= 0 && diff < bestDiff) { bestDiff = diff; bestNav = parseFloat(item.nav); }
    }
    if (bestNav === null) {
        for (const item of navHistory) {
            const [dd, mm, yyyy] = item.date.split('-').map(Number);
            const itemTs = new Date(yyyy, mm - 1, dd).getTime();
            if (itemTs <= targetTs) return parseFloat(item.nav);
        }
    }
    return bestNav ?? 0;
}

export default function ClientDetailPage() {
    const { user, isLoading: authLoading } = useAuth();
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    useEffect(() => {
        if (!authLoading && user?.role !== 'admin') {
            router.replace('/client-dashboard');
        }
    }, [authLoading, user, router]);

    const { ltcgTax, stcgTax } = useSettings();
    const { clients, deleteClient, updateClient, isLoading: clientsLoading } = useClientContext();
    const { holdings, addHolding, deleteHolding, refreshHoldings } = useHoldings();
    const { sips, addSIP, cancelSIP, refreshSIPs } = useSIPs();
    const { transactions, addTransaction, refreshTransactions } = useTransactions();

    const [activeTab, setActiveTab] = useState<'investments' | 'transactions' | 'notes'>('investments');

    // ── Add Investment modal state ──────────────────────────────────────────
    const [showAddInvestmentModal, setShowAddInvestmentModal] = useState(false);
    const [isAddingInvestment, setIsAddingInvestment] = useState(false);
    const investFundDropdownRef = useRef<HTMLDivElement>(null);

    const defaultInvestForm = {
        investmentType: 'SIP' as 'SIP' | 'Lumpsum' | 'Transfer',
        amount: '',
        sipAmount: '',
        startDate: '',
        schemeCode: 0,
        schemeName: '',
        selectedIsin: '',
        selectedNseCode: '',
        selectedFundCode: '',
        stepUpAmount: '',
        stepUpInterval: 'Yearly' as 'Yearly' | 'Half-Yearly' | 'Quarterly',
    };
    const [investForm, setInvestForm] = useState(defaultInvestForm);
    const [investFundSearch, setInvestFundSearch] = useState('');
    const [investFundResults, setInvestFundResults] = useState<MergedFundScheme[]>([]);
    const [investFundSearching, setInvestFundSearching] = useState(false);
    const [showInvestFundDropdown, setShowInvestFundDropdown] = useState(false);

    type SipCalc = { totalUnits: number; currentValue: number; totalInvested: number; latestNav: number; pnl: number; pnlPct: number; nextSipDate: string; nInstallments: number; isLoading: boolean; error: string | null };
    type LumpCalc = { units: number; currentValue: number; investedAmount: number; navOnDate: number; latestNav: number; pnl: number; pnlPct: number; isLoading: boolean; error: string | null };

    const [investSipCalc, setInvestSipCalc] = useState<SipCalc | null>(null);
    const [investLumpCalc, setInvestLumpCalc] = useState<LumpCalc | null>(null);

    // Lock body scroll when modal open
    useEffect(() => {
        document.body.style.overflow = showAddInvestmentModal ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showAddInvestmentModal]);

    // Reset Transfer-specific fields when switching away from Transfer
    useEffect(() => {
        if (investForm.investmentType === 'Transfer') {
            setInvestForm(prev => ({ ...prev, startDate: '', amount: '' }));
            setInvestSipCalc(null);
        }
    }, [investForm.investmentType]);

    // Click-outside to close fund dropdown
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (investFundDropdownRef.current && !investFundDropdownRef.current.contains(e.target as Node))
                setShowInvestFundDropdown(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced fund search
    useEffect(() => {
        if (investFundSearch.length < 2) { setInvestFundResults([]); return; }
        const timer = setTimeout(async () => {
            setInvestFundSearching(true);
            try {
                const results = await searchSchemesMerged(investFundSearch);
                setInvestFundResults(results.slice(0, 10));
            } catch { /* ignore */ } finally { setInvestFundSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [investFundSearch]);

    const resolveInvestAmfiCode = useCallback(async (schemeCode: number, fundCode: string, isin: string): Promise<number> => {
        if (schemeCode > 0) return schemeCode;
        const parsed = parseInt(fundCode, 10);
        if (parsed > 0) return parsed;
        if (isin?.startsWith('IN')) {
            try {
                const res = await fetch(`/api/amfi/isin-lookup?isin=${encodeURIComponent(isin)}`);
                if (res.ok) {
                    const data = await res.json() as { schemeCode?: number };
                    if (data.schemeCode && data.schemeCode > 0) return data.schemeCode;
                }
            } catch { /* best effort */ }
        }
        return 0;
    }, []);

    const calculateInvestSIPValues = useCallback(async () => {
        const effectiveAmfiCode = await resolveInvestAmfiCode(investForm.schemeCode, investForm.selectedFundCode, investForm.selectedIsin);
        if (investForm.investmentType !== 'Transfer' || !investForm.startDate || !investForm.sipAmount || parseFloat(investForm.sipAmount) <= 0) {
            if (investForm.investmentType === 'Transfer' && !(effectiveAmfiCode > 0) && investForm.startDate)
                setInvestSipCalc({ totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund.' });
            return;
        }
        if (!(effectiveAmfiCode > 0)) {
            setInvestSipCalc({ totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund.' });
            return;
        }
        setInvestSipCalc(prev => ({ ...(prev ?? { totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0 }), isLoading: true, error: null }));
        try {
            const sipAmount = parseFloat(investForm.sipAmount);
            const startDate = new Date(investForm.startDate + 'T00:00:00');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const res = await fetch(`https://api.mfapi.in/mf/${effectiveAmfiCode}`);
            if (!res.ok) throw new Error('Failed to fetch NAV history');
            const data = await res.json();
            const navHistory: { date: string; nav: string }[] = data.data;
            if (!navHistory?.length) throw new Error('No NAV data available');
            let totalUnits = 0; let nInstallments = 0;
            const sipDate = new Date(startDate);
            while (sipDate <= today) {
                const nav = findNavForDate(navHistory, new Date(sipDate));
                if (nav > 0) { totalUnits += sipAmount / nav; nInstallments++; }
                sipDate.setMonth(sipDate.getMonth() + 1);
            }
            const latestNav = parseFloat(navHistory[0].nav);
            const currentValue = totalUnits * latestNav;
            const totalInvested = nInstallments * sipAmount;
            const pnl = currentValue - totalInvested;
            const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
            const nextSip = new Date(startDate);
            nextSip.setMonth(nextSip.getMonth() + nInstallments);
            const nextSipDate = `${nextSip.getFullYear()}-${String(nextSip.getMonth() + 1).padStart(2, '0')}-${String(nextSip.getDate()).padStart(2, '0')}`;
            setInvestSipCalc({ totalUnits, currentValue, totalInvested, latestNav, pnl, pnlPct, nextSipDate, nInstallments, isLoading: false, error: null });
        } catch (err) {
            setInvestSipCalc(prev => ({ ...(prev ?? { totalUnits: 0, currentValue: 0, totalInvested: 0, latestNav: 0, pnl: 0, pnlPct: 0, nextSipDate: '', nInstallments: 0 }), isLoading: false, error: err instanceof Error ? err.message : 'Calculation failed' }));
        }
    }, [investForm.investmentType, investForm.schemeCode, investForm.selectedFundCode, investForm.selectedIsin, investForm.startDate, investForm.sipAmount, resolveInvestAmfiCode]);

    useEffect(() => {
        if (investForm.investmentType !== 'Transfer') { setInvestSipCalc(null); return; }
        const t = setTimeout(calculateInvestSIPValues, 600);
        return () => clearTimeout(t);
    }, [investForm.investmentType, investForm.schemeCode, investForm.selectedFundCode, investForm.selectedIsin, investForm.startDate, investForm.sipAmount, calculateInvestSIPValues]);

    const calculateInvestLumpsumValues = useCallback(async () => {
        const effectiveAmfiCode = await resolveInvestAmfiCode(investForm.schemeCode, investForm.selectedFundCode, investForm.selectedIsin);
        if (investForm.investmentType !== 'Lumpsum' || !investForm.startDate || !investForm.amount || parseFloat(investForm.amount) <= 0) {
            if (investForm.investmentType === 'Lumpsum' && !(effectiveAmfiCode > 0) && investForm.startDate)
                setInvestLumpCalc({ units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund.' });
            return;
        }
        if (!(effectiveAmfiCode > 0)) {
            setInvestLumpCalc({ units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0, isLoading: false, error: 'Historical NAV calculation requires an AMFI-listed fund.' });
            return;
        }
        setInvestLumpCalc(prev => ({ ...(prev ?? { units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0 }), isLoading: true, error: null }));
        try {
            const investedAmount = parseFloat(investForm.amount);
            const investmentDate = new Date(investForm.startDate + 'T00:00:00');
            const res = await fetch(`https://api.mfapi.in/mf/${effectiveAmfiCode}`);
            if (!res.ok) throw new Error('Failed to fetch NAV history');
            const data = await res.json();
            const navHistory: { date: string; nav: string }[] = data.data;
            if (!navHistory?.length) throw new Error('No NAV data available');
            const navOnDate = findNavForDate(navHistory, investmentDate);
            if (navOnDate <= 0) throw new Error('Could not find NAV for the investment date. Try an earlier date.');
            const units = investedAmount / navOnDate;
            const latestNav = parseFloat(navHistory[0].nav);
            const currentValue = units * latestNav;
            const pnl = currentValue - investedAmount;
            const pnlPct = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;
            setInvestLumpCalc({ units, currentValue, investedAmount, navOnDate, latestNav, pnl, pnlPct, isLoading: false, error: null });
        } catch (err) {
            setInvestLumpCalc(prev => ({ ...(prev ?? { units: 0, currentValue: 0, investedAmount: 0, navOnDate: 0, latestNav: 0, pnl: 0, pnlPct: 0 }), isLoading: false, error: err instanceof Error ? err.message : 'Calculation failed' }));
        }
    }, [investForm.investmentType, investForm.schemeCode, investForm.selectedFundCode, investForm.selectedIsin, investForm.startDate, investForm.amount, resolveInvestAmfiCode]);

    useEffect(() => {
        if (investForm.investmentType !== 'Lumpsum') { setInvestLumpCalc(null); return; }
        const t = setTimeout(calculateInvestLumpsumValues, 600);
        return () => clearTimeout(t);
    }, [investForm.investmentType, investForm.schemeCode, investForm.selectedFundCode, investForm.selectedIsin, investForm.startDate, investForm.amount, calculateInvestLumpsumValues]);

    const handleSelectInvestFund = (fund: MergedFundScheme) => {
        setInvestForm(prev => ({
            ...prev,
            schemeCode: fund.schemeCode,
            schemeName: fund.schemeName,
            selectedIsin: fund.isin ?? '',
            selectedNseCode: fund.nseCode ?? '',
            selectedFundCode: resolveSchemeCode(fund),
        }));
        setInvestFundSearch(fund.schemeName);
        setShowInvestFundDropdown(false);
    };

    const resetInvestForm = () => {
        setInvestForm(defaultInvestForm);
        setInvestFundSearch('');
        setInvestFundResults([]);
        setInvestSipCalc(null);
        setInvestLumpCalc(null);
    };
    const [notes, setNotes] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [showPostTax, setShowPostTax] = useState(false);

    const client = clients.find(c => c.id === clientId);
    const clientHoldings = holdings.filter(h => h.user_id === clientId);
    const clientSIPs = sips.filter(s => s.user_id === clientId);
    const clientTransactions = transactions.filter(t => t.user_id === clientId);

    useEffect(() => {
        if (client?.notes) setNotes(client.notes);
    }, [client]);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            const result = await deleteClient(clientId);
            if (result.success) {
                Promise.all([refreshHoldings(), refreshSIPs(), refreshTransactions()]).catch(console.error);
                router.replace('/manage');
            } else {
                alert('Failed to delete client: ' + (result.error || 'Unknown error'));
            }
        }
    };

    const handleDeleteInvestment = async (holdingId: string, schemeCode: string | null) => {
        const fundName = clientHoldings.find(h => h.id === holdingId)?.mutual_fund?.name || schemeCode || 'this fund';
        if (!confirm(`Remove investment in "${fundName}"? This will delete the holding and cancel any active SIP for this fund.`)) return;
        const result = await deleteHolding(holdingId);
        if (!result.success) {
            alert('Failed to remove investment: ' + (result.error || 'Unknown error'));
            return;
        }
        if (schemeCode) {
            const matchingSips = clientSIPs.filter(s => s.scheme_code === schemeCode && s.status === 'active');
            for (const sip of matchingSips) await cancelSIP(sip.id);
        }
    };

    const getHoldingReturns = (holding: typeof clientHoldings[0]) => {
        const investedAmount = holding.invested_amount || (holding.units * holding.average_price);
        const currentNav = holding.current_nav || holding.average_price;
        const isStaleNav = !holding.current_nav;
        const currentValue = holding.units * currentNav;
        const grossReturnAmount = currentValue - investedAmount;

        const fundTxs = clientTransactions.filter(t => t.scheme_code === holding.scheme_code);
        const cashFlows = fundTxs.map(t => ({
            amount: (t.type === 'buy' || t.type === 'sip') ? -t.amount : t.amount,
            date: new Date(t.date || t.created_at)
        }));
        cashFlows.push({ amount: currentValue, date: new Date() });
        const hasOutflows = cashFlows.some(cf => cf.amount < 0);
        const rawXirr = hasOutflows && currentValue > 0 ? calculateXIRR(cashFlows) : 0;
        const xirr = isNaN(rawXirr) ? 0 : rawXirr;

        // No tax when not in post-tax mode, individual holding is in loss, or overall portfolio is in loss
        const totalPortfolioGross = clientHoldings.reduce((sum, h) => {
            const nav = h.current_nav || h.average_price;
            return sum + (h.units * nav) - (h.invested_amount || (h.units * h.average_price));
        }, 0);

        if (!showPostTax || grossReturnAmount <= 0 || totalPortfolioGross <= 0) {
            return {
                returnAmount: grossReturnAmount,
                returnPercentage: investedAmount > 0 ? (grossReturnAmount / investedAmount) * 100 : 0,
                currentValue, investedAmount, isStaleNav, xirr,
            };
        }

        const startDate = new Date(holding.created_at || new Date());
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const isLongTerm = startDate < oneYearAgo;
        const taxRate = isLongTerm ? ltcgTax : stcgTax;
        const taxAmount = grossReturnAmount * (taxRate / 100);
        const netReturnAmount = grossReturnAmount - taxAmount;

        return {
            returnAmount: netReturnAmount,
            returnPercentage: investedAmount > 0 ? (netReturnAmount / investedAmount) * 100 : 0,
            isLongTerm, currentValue, investedAmount, isStaleNav, xirr,
        };
    };

    const totalInvested = clientHoldings.reduce((sum, h) => sum + (h.invested_amount || h.units * h.average_price), 0);
    const totalCurrent = clientHoldings.reduce((sum, h) => sum + getHoldingReturns(h).currentValue, 0);
    const totalReturns = clientHoldings.reduce((sum, h) => sum + getHoldingReturns(h).returnAmount, 0);
    const returnsPercentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : '0.00';

    const portfolioXirr = useMemo(() => {
        if (!clientTransactions.length || totalCurrent === 0) return 0;
        const cashFlows = clientTransactions.map(t => ({
            amount: (t.type === 'buy' || t.type === 'sip') ? -t.amount : t.amount,
            date: new Date(t.date || t.created_at)
        }));
        cashFlows.push({ amount: totalCurrent, date: new Date() });
        return calculateXIRR(cashFlows);
    }, [clientTransactions, totalCurrent]);

    const handleAddInvestment = async () => {
        const hasScheme = investForm.schemeCode > 0 || !!investForm.selectedNseCode;
        if (!hasScheme) { alert('Please select a mutual fund'); return; }

        const hasLumpsum = investForm.amount && parseFloat(investForm.amount) > 0;
        const hasSIP = investForm.sipAmount && parseFloat(investForm.sipAmount) > 0;

        if (investForm.investmentType === 'Transfer') {
            if (!hasSIP) { alert('Please enter the Monthly SIP amount'); return; }
            if (!investForm.startDate) { alert('Please enter the SIP Start Date'); return; }
            if (investForm.schemeCode <= 0) { alert('Transfer mode requires an AMFI-listed fund'); return; }
            if (!investSipCalc || investSipCalc.isLoading) { alert('Please wait for the SIP calculation to complete'); return; }
            if (investSipCalc.error) { alert('SIP calculation failed: ' + investSipCalc.error); return; }
            if (investSipCalc.nInstallments === 0) { alert('No installments found from the start date to today. The start date must be in the past.'); return; }
        } else if (!hasLumpsum && !hasSIP) {
            alert('Please enter at least a Lumpsum Amount or SIP Amount');
            return;
        }

        setIsAddingInvestment(true);
        try {
            const supabase = getSupabaseClient();
            const effectiveSchemeCode = investForm.selectedFundCode || (investForm.schemeCode > 0 ? investForm.schemeCode.toString() : investForm.selectedNseCode);
            const isinValue = investForm.selectedIsin || null;
            const nseCodeValue = investForm.selectedNseCode || null;
            let currentNav = 10;

            if (investForm.schemeCode > 0) {
                try {
                    const navData = await getSchemeLatestNAV(investForm.schemeCode);
                    if (navData?.data?.[0]) currentNav = parseFloat(navData.data[0].nav);
                } catch { /* use default */ }
            }

            await (supabase.from('mutual_funds') as any).upsert({
                code: effectiveSchemeCode,
                name: investForm.schemeName,
                category: null,
                type: null,
                fund_house: null,
                current_nav: currentNav,
                last_updated: new Date().toISOString(),
                ...(isinValue ? { isin_value: isinValue } : {}),
                ...(nseCodeValue ? { nse_code: nseCodeValue } : {}),
            });

            const lumpsumAmount = parseFloat(investForm.amount) || 0;
            const sipAmountInput = parseFloat(investForm.sipAmount) || 0;

            if (investForm.investmentType === 'Transfer' && investSipCalc) {
                const { totalUnits, latestNav: calcNav, totalInvested: calcInvested, nextSipDate } = investSipCalc;
                const avgPrice = totalUnits > 0 ? calcInvested / totalUnits : calcNav;

                await addHolding({ user_id: clientId, scheme_code: effectiveSchemeCode, units: totalUnits, average_price: avgPrice, current_nav: calcNav || currentNav });
                await addTransaction({ user_id: clientId, scheme_code: effectiveSchemeCode, type: 'buy', amount: calcInvested, units: totalUnits, nav: avgPrice, status: 'completed', date: new Date().toISOString().split('T')[0] });

                const sipPayload: any = { user_id: clientId, scheme_code: effectiveSchemeCode, amount: sipAmountInput, frequency: 'monthly', start_date: investForm.startDate, next_execution_date: nextSipDate, status: 'active' };
                const stepUp = parseFloat(investForm.stepUpAmount);
                if (stepUp > 0) { sipPayload.step_up_amount = stepUp; sipPayload.step_up_interval = investForm.stepUpInterval; }
                await addSIP(sipPayload);

            } else if (investForm.investmentType === 'Lumpsum' && investLumpCalc && !investLumpCalc.error) {
                const { units: calcUnits, navOnDate, latestNav: calcLatestNav, investedAmount: calcInvested } = investLumpCalc;
                await addHolding({ user_id: clientId, scheme_code: effectiveSchemeCode, units: calcUnits, average_price: navOnDate, current_nav: calcLatestNav });
                await addTransaction({ user_id: clientId, scheme_code: effectiveSchemeCode, type: 'buy', amount: calcInvested, units: calcUnits, nav: navOnDate, status: 'completed', date: investForm.startDate || new Date().toISOString().split('T')[0] });

            } else {
                // SIP mode (or Lumpsum without AMFI code)
                let sipFirstAmount = 0;
                let nextExecutionDate = investForm.startDate ? new Date(investForm.startDate) : new Date();

                if (sipAmountInput > 0) {
                    const startDate = investForm.startDate ? new Date(investForm.startDate) : new Date();
                    const today = new Date();
                    startDate.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
                    if (startDate <= today) {
                        sipFirstAmount = sipAmountInput;
                        nextExecutionDate = new Date(startDate);
                        nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
                    }
                }

                const totalInitialAmount = lumpsumAmount + sipFirstAmount;
                if (totalInitialAmount > 0) {
                    const totalUnits = currentNav > 0 ? totalInitialAmount / currentNav : 0;
                    await addHolding({ user_id: clientId, scheme_code: effectiveSchemeCode, units: totalUnits, average_price: currentNav, current_nav: currentNav });
                    if (lumpsumAmount > 0) {
                        await addTransaction({ user_id: clientId, scheme_code: effectiveSchemeCode, type: 'buy', amount: lumpsumAmount, units: currentNav > 0 ? lumpsumAmount / currentNav : 0, nav: currentNav, status: 'completed', date: investForm.startDate || new Date().toISOString().split('T')[0] });
                    }
                    if (sipFirstAmount > 0) {
                        await addTransaction({ user_id: clientId, scheme_code: effectiveSchemeCode, type: 'sip', amount: sipFirstAmount, units: currentNav > 0 ? sipFirstAmount / currentNav : 0, nav: currentNav, status: 'completed', date: investForm.startDate || new Date().toISOString().split('T')[0] });
                    }
                }

                if (sipAmountInput > 0) {
                    const sipPayload: any = { user_id: clientId, scheme_code: effectiveSchemeCode, amount: sipAmountInput, frequency: 'monthly', start_date: investForm.startDate || new Date().toISOString(), next_execution_date: nextExecutionDate.toISOString().split('T')[0], status: 'active' };
                    const stepUp = parseFloat(investForm.stepUpAmount);
                    if (stepUp > 0) { sipPayload.step_up_amount = stepUp; sipPayload.step_up_interval = investForm.stepUpInterval; }
                    await addSIP(sipPayload);
                }
            }

            await Promise.all([refreshHoldings(), refreshTransactions(), refreshSIPs()]);
            setShowAddInvestmentModal(false);
            resetInvestForm();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to add investment');
        } finally {
            setIsAddingInvestment(false);
        }
    };

    const handleSaveNote = async () => {
        setIsSavingNote(true);
        const res = await updateClient(clientId, { notes });
        if (!res.success) alert('Failed to save notes: ' + (res.error || 'Unknown error'));
        setIsSavingNote(false);
    };

    if (clientsLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <Loader2 className="animate-spin" size={24} />
                    <span>Loading client data...</span>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[var(--text-secondary)] mb-4">Client not found</p>
                    <Link href="/clients" className="inline-flex items-center gap-2 text-[var(--accent-mint)] hover:underline">
                        <ArrowLeft size={18} /> Back to Clients
                    </Link>
                </div>
            </div>
        );
    }

    const initials = client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const returnsPositive = parseFloat(returnsPercentage) >= 0;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            <main className="flex-1 min-w-0">

                {/* ── Back link ── */}
                <Link
                    href="/clients"
                    className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors text-sm"
                >
                    <ArrowLeft size={16} /> Back to Clients
                </Link>

                {/* ── Client header ── */}
                <header className="mb-5">
                    <div className="flex items-start justify-between gap-3">
                        {/* Avatar + name */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 shrink-0 rounded-full bg-[var(--accent-mint)] flex items-center justify-center text-white text-xl font-bold">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-bold ">{client.name}</h1>
                                <p className="text-[var(--text-secondary)] text-xs">ID: {client.id.slice(0, 8)}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        client.kyc_status === 'verified'
                                            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                            : 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]'
                                    }`}>
                                        {client.kyc_status || 'pending'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
                                        {client.status || 'active'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => router.push(`/manage?edit=${clientId}`)}
                                aria-label="Edit client"
                                className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                                <Edit size={17} />
                            </button>
                            <button
                                onClick={handleDelete}
                                aria-label="Delete client"
                                className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-colors cursor-pointer"
                            >
                                <Trash2 size={17} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Client info cards: 2-col mobile → 4-col desktop ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="glass-card rounded-2xl p-3 md:p-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs mb-1">
                            <Mail size={11} /> Email
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium ">{client.email || '—'}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs mb-1">
                            <Phone size={11} /> Phone
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{client.phone || '—'}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs mb-1">
                            <ShieldCheck size={11} /> PAN
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium tracking-wider">{client.panCard || client.pan || '—'}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs mb-1">
                            <Calendar size={11} /> Member Since
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">
                            {client.created_at ? formatDate(client.created_at) : '—'}
                        </p>
                    </div>
                </div>

                {/* ── Portfolio summary: 2-col mobile → 4-col desktop ── */}
                <div className="flex items-center justify-end mb-3">
                    <button
                        onClick={() => setShowPostTax(!showPostTax)}
                        className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            showPostTax
                                ? 'bg-[var(--accent-mint)]/10 border-[var(--accent-mint)]/20 text-[var(--accent-mint)]'
                                : 'bg-[var(--bg-hover)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <Calculator size={13} />
                        {showPostTax ? 'Post-Tax' : 'Pre-Tax'} Returns
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border">
                        <p className="text-[var(--text-secondary)] text-xs mb-1">Total Invested</p>
                        <p className="text-[var(--text-primary)] text-base md:text-xl font-bold">{formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border">
                        <p className="text-[var(--text-secondary)] text-xs mb-1">Current Value</p>
                        <p className="text-[var(--text-primary)] text-base md:text-xl font-bold">{formatCurrency(totalCurrent)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border">
                        <p className="text-[var(--text-secondary)] text-xs mb-1">
                            {showPostTax ? 'Net Returns' : 'Total Returns'}
                        </p>
                        <p className={`text-base md:text-xl font-bold ${totalReturns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border">
                        {/* Returns % — shows XIRR on tap/hover */}
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[var(--text-secondary)] text-xs">Returns %</p>
                            {portfolioXirr !== 0 && (
                                <span className="text-[10px] text-[var(--text-secondary)]">
                                    XIRR {portfolioXirr >= 0 ? '+' : ''}{portfolioXirr.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className={`text-base md:text-xl font-bold flex items-center gap-1 ${returnsPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {returnsPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {returnsPositive ? '+' : ''}{returnsPercentage}%
                        </p>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1.5 mb-4 border-b border-[var(--border-primary)]">
                    {(['investments', 'transactions', 'notes'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2.5 min-h-[44px] text-sm font-medium capitalize transition-all cursor-pointer border-b-2 -mb-px ${
                                activeTab === tab
                                    ? 'border-[var(--accent-mint)] text-[var(--accent-mint)]'
                                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Investments ── */}
                {activeTab === 'investments' && (
                    <div>
                    <div className="flex justify-end mb-3">
                        <button
                            onClick={() => setShowAddInvestmentModal(true)}
                            className="flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/20 text-[var(--accent-mint)] text-sm font-medium hover:bg-[var(--accent-mint)]/20 transition-colors cursor-pointer"
                        >
                            <Plus size={15} /> Add Investment
                        </button>
                    </div>
                    <div className="glass-card rounded-2xl overflow-hidden">
                        {clientHoldings.length === 0 ? (
                            <div className="p-10 text-center text-[var(--text-secondary)]">
                                <PiggyBank size={40} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No investments for this client</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop table header — hidden on mobile */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                                    <div className="col-span-3 text-[var(--text-secondary)] text-xs font-semibold uppercase">Fund</div>
                                    <div className="col-span-2 text-[var(--text-secondary)] text-xs font-semibold uppercase text-right">Invested</div>
                                    <div className="col-span-2 text-[var(--text-secondary)] text-xs font-semibold uppercase text-right">Current</div>
                                    <div className="col-span-2 text-[var(--text-secondary)] text-xs font-semibold uppercase text-right">Returns</div>
                                    <div className="col-span-1 text-[var(--text-secondary)] text-xs font-semibold uppercase text-right">XIRR</div>
                                    <div className="col-span-1 text-[var(--text-secondary)] text-xs font-semibold uppercase text-center">Units</div>
                                    <div className="col-span-1" />
                                </div>

                                <div className="divide-y divide-[var(--border-primary)]">
                                    {clientHoldings.map((holding) => {
                                        const returns = getHoldingReturns(holding);
                                        const fundName = (holding as any).mutual_fund?.name || holding.scheme_code || 'Unknown Fund';
                                        const returnPositive = returns.returnPercentage >= 0;

                                        return (
                                            <div key={holding.id}>
                                                {/* ── Mobile card layout ── */}
                                                <div className="md:hidden p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--accent-mint)]/10 flex items-center justify-center">
                                                                <PiggyBank size={16} className="text-[var(--accent-mint)]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[var(--text-primary)] text-sm font-medium leading-snug">{fundName}</p>
                                                                <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                                                                    NAV ₹{holding.current_nav?.toFixed(2) || holding.average_price.toFixed(2)}
                                                                    {returns.isStaleNav && (
                                                                        <span className="ml-1 text-[10px] bg-red-500/10 text-red-400 px-1 rounded">stale</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteInvestment(holding.id, holding.scheme_code)}
                                                            aria-label="Remove investment"
                                                            className="p-2 min-h-[36px] min-w-[36px] rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors cursor-pointer shrink-0"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    {/* 2×2 stats grid */}
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div className="bg-[var(--bg-hover)] rounded-xl p-2.5">
                                                            <p className="text-[var(--text-secondary)] text-[10px] mb-0.5">Invested</p>
                                                            <p className="text-[var(--text-primary)] font-medium">{formatCurrency(returns.investedAmount)}</p>
                                                        </div>
                                                        <div className="bg-[var(--bg-hover)] rounded-xl p-2.5">
                                                            <p className="text-[var(--text-secondary)] text-[10px] mb-0.5">Current</p>
                                                            <p className="text-[var(--text-primary)] font-medium">{formatCurrency(returns.currentValue)}</p>
                                                        </div>
                                                        <div className="bg-[var(--bg-hover)] rounded-xl p-2.5">
                                                            <p className="text-[var(--text-secondary)] text-[10px] mb-0.5">Returns</p>
                                                            <p className={`font-medium flex items-center gap-1 ${returnPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                                {returnPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                                {returnPositive ? '+' : ''}{returns.returnPercentage.toFixed(2)}%
                                                            </p>
                                                            <p className={`text-[10px] ${returnPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                                {returnPositive ? '+' : ''}{formatCurrency(returns.returnAmount)}
                                                            </p>
                                                        </div>
                                                        <div className="bg-[var(--bg-hover)] rounded-xl p-2.5">
                                                            <p className="text-[var(--text-secondary)] text-[10px] mb-0.5">XIRR · Units</p>
                                                            <p className={`font-medium text-xs ${returns.xirr >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                                {returns.xirr >= 0 ? '+' : ''}{returns.xirr.toFixed(2)}%
                                                            </p>
                                                            <p className="text-[var(--text-secondary)] text-[10px]">{holding.units.toFixed(3)} units</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── Desktop table row ── */}
                                                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 hover:bg-[var(--bg-hover)] transition-all">
                                                    <div className="col-span-3 flex items-center gap-3">
                                                        <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--accent-mint)]/10 flex items-center justify-center">
                                                            <PiggyBank size={16} className="text-[var(--accent-mint)]" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[var(--text-primary)] text-sm font-medium ">{fundName}</p>
                                                            <p className="text-[var(--text-secondary)] text-xs flex items-center gap-1">
                                                                NAV ₹{holding.current_nav?.toFixed(2) || holding.average_price.toFixed(2)}
                                                                {returns.isStaleNav && (
                                                                    <span className="text-[10px] bg-red-500/10 text-red-400 px-1 rounded">stale</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end">
                                                        <p className="text-[var(--text-primary)] text-sm">{formatCurrency(returns.investedAmount)}</p>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end">
                                                        <p className="text-[var(--text-primary)] text-sm font-medium">{formatCurrency(returns.currentValue)}</p>
                                                    </div>
                                                    <div className="col-span-2 flex flex-col items-end justify-center">
                                                        <p className={`text-sm font-medium flex items-center gap-1 ${returnPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                            {returnPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                            {returnPositive ? '+' : ''}{returns.returnPercentage.toFixed(2)}%
                                                        </p>
                                                        <p className={`text-xs ${returnPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                            {returnPositive ? '+' : ''}{formatCurrency(returns.returnAmount)}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1 flex items-center justify-end">
                                                        <span className={`text-sm font-medium ${returns.xirr >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                            {returns.xirr >= 0 ? '+' : ''}{returns.xirr.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 flex items-center justify-center">
                                                        <span className="text-[var(--text-primary)] text-sm">{holding.units.toFixed(3)}</span>
                                                    </div>
                                                    <div className="col-span-1 flex items-center justify-center">
                                                        <button
                                                            onClick={() => handleDeleteInvestment(holding.id, holding.scheme_code)}
                                                            aria-label="Remove investment"
                                                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                    </div>
                )}

                {/* ── Tab: Transactions ── */}
                {activeTab === 'transactions' && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        {clientTransactions.length === 0 ? (
                            <div className="p-10 text-center text-[var(--text-secondary)]">
                                <FileText size={40} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No transactions for this client</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop header */}
                                <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                                    <div className="col-span-2 text-[var(--text-secondary)] text-xs font-semibold uppercase">Date</div>
                                    <div className="col-span-1 text-[var(--text-secondary)] text-xs font-semibold uppercase">Type</div>
                                    <div className="col-span-4 text-[var(--text-secondary)] text-xs font-semibold uppercase">Fund</div>
                                    <div className="col-span-2 text-[var(--text-secondary)] text-xs font-semibold uppercase text-right">Amount</div>
                                    <div className="col-span-1 text-[var(--text-secondary)] text-xs font-semibold uppercase text-right">NAV</div>
                                    <div className="col-span-1 text-[var(--text-secondary)] text-xs font-semibold uppercase text-right">Units</div>
                                    <div className="col-span-1 text-[var(--text-secondary)] text-xs font-semibold uppercase text-center">Status</div>
                                </div>

                                <div className="divide-y divide-[var(--border-primary)]">
                                    {clientTransactions.map((tx) => {
                                        const fundName = (tx as any).mutual_fund?.name || tx.scheme_code || 'N/A';
                                        const nav = tx.nav || (tx.units > 0 ? tx.amount / tx.units : 0);
                                        const isBuy = tx.type === 'buy' || tx.type === 'sip';
                                        const typeColors: Record<string, string> = {
                                            sip: 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]',
                                            buy: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
                                            sell: 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]',
                                            switch: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
                                        };

                                        return (
                                            <div key={tx.id}>
                                                {/* ── Mobile card ── */}
                                                <div className="md:hidden p-4 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors[tx.type] || typeColors.buy}`}>
                                                            {tx.type.toUpperCase()}
                                                        </span>
                                                        <span className="text-[var(--text-secondary)] text-xs">{formatDate(tx.date)}</span>
                                                    </div>
                                                    <p className="text-[var(--text-primary)] text-sm font-medium leading-snug">{fundName}</p>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div>
                                                            <p className="text-[var(--text-secondary)] mb-0.5">Amount</p>
                                                            <p className={`font-medium ${isBuy ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                                {isBuy ? '+' : '-'}{formatCurrency(tx.amount)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[var(--text-secondary)] mb-0.5">NAV</p>
                                                            <p className="text-[var(--text-primary)]">₹{nav.toFixed(2)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[var(--text-secondary)] mb-0.5">Units</p>
                                                            <p className="text-[var(--text-primary)]">{tx.units.toFixed(3)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                            tx.status === 'completed' ? 'bg-[var(--accent-mint)]' :
                                                            tx.status === 'pending' ? 'bg-[var(--accent-yellow)]' :
                                                            'bg-[var(--accent-red)]'
                                                        }`} />
                                                        <span className="text-[var(--text-secondary)] text-xs capitalize">{tx.status}</span>
                                                    </div>
                                                </div>

                                                {/* ── Desktop row ── */}
                                                <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-4 hover:bg-[var(--bg-hover)] transition-all">
                                                    <div className="col-span-2 flex items-center">
                                                        <p className="text-[var(--text-primary)] text-sm">{formatDate(tx.date)}</p>
                                                    </div>
                                                    <div className="col-span-1 flex items-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${typeColors[tx.type] || typeColors.buy}`}>
                                                            {tx.type.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-4 flex items-center">
                                                        <p className="text-[var(--text-primary)] text-sm ">{fundName}</p>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end">
                                                        <p className={`text-sm font-medium ${isBuy ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                            {isBuy ? '+' : '-'}{formatCurrency(tx.amount)}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1 flex items-center justify-end">
                                                        <p className="text-[var(--text-primary)] text-sm">₹{nav.toFixed(2)}</p>
                                                    </div>
                                                    <div className="col-span-1 flex items-center justify-end">
                                                        <p className="text-[var(--text-primary)] text-sm">{tx.units.toFixed(3)}</p>
                                                    </div>
                                                    <div className="col-span-1 flex items-center justify-center">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            tx.status === 'completed' ? 'bg-[var(--accent-mint)]' :
                                                            tx.status === 'pending' ? 'bg-[var(--accent-yellow)]' :
                                                            'bg-[var(--accent-red)]'
                                                        }`} title={tx.status} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Tab: Notes ── */}
                {activeTab === 'notes' && (
                    <div className="glass-card rounded-2xl p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[var(--text-primary)] font-semibold">Client Notes</h3>
                            <button
                                onClick={handleSaveNote}
                                disabled={isSavingNote}
                                className="px-3 py-2 min-h-[44px] rounded-xl bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] text-sm font-medium flex items-center gap-1.5 hover:bg-[var(--accent-mint)]/20 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {isSavingNote ? 'Saving…' : 'Save Note'}
                            </button>
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-40 p-4 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 resize-none text-sm"
                            placeholder="Add notes about this client…"
                        />
                        <p className="text-[var(--text-muted)] text-xs mt-2">
                            Last updated: {client.updated_at ? formatDate(client.updated_at) : 'Never'}
                        </p>
                    </div>
                )}
            </main>

            {/* Sidebar */}
            <Sidebar />

            {/* ── Add Investment Modal ─────────────────────────────────────────── */}
            {showAddInvestmentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="w-full sm:max-w-xl glass-card rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">

                        {/* Header */}
                        <div className="p-4 md:p-5 border-b border-[var(--border-primary)] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[var(--accent-mint)]/15 flex items-center justify-center">
                                    <PiggyBank size={18} className="text-[var(--accent-mint)]" />
                                </div>
                                <div>
                                    <h2 className="text-white text-base font-semibold">Add Investment</h2>
                                    <p className="text-[var(--text-secondary)] text-xs">{client.name}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowAddInvestmentModal(false); resetInvestForm(); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                <X size={18} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1">

                            {/* Fund Search */}
                            <div className="relative" ref={investFundDropdownRef}>
                                <label className="text-[var(--text-secondary)] text-xs mb-2 block">Select Mutual Fund *</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search mutual funds..."
                                        value={investFundSearch}
                                        onChange={(e) => { setInvestFundSearch(e.target.value); setShowInvestFundDropdown(true); }}
                                        onFocus={() => setShowInvestFundDropdown(true)}
                                        className="w-full pl-10 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 text-sm"
                                    />
                                    {investFundSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent-mint)] animate-spin" size={16} />}
                                    {!investFundSearching && investForm.schemeCode > 0 && <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent-mint)]" size={16} />}
                                </div>
                                {showInvestFundDropdown && investFundResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#151A21] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {investFundResults.map((fund) => {
                                            const key = fund.schemeCode > 0 ? `mfapi-${fund.schemeCode}` : `nse-${fund.nseCode}`;
                                            const badge = fund.source === 'both'
                                                ? { label: 'AMFI + NSE', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
                                                : fund.source === 'nse'
                                                    ? { label: 'NSE only', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
                                                    : { label: 'AMFI', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
                                            return (
                                                <button key={key} onClick={() => handleSelectInvestFund(fund)} className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-white text-sm flex-1">{fund.schemeName}</p>
                                                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                                                    </div>
                                                    <p className="text-[var(--text-secondary)] text-xs">{fund.isin ? `ISIN: ${fund.isin}` : fund.nseCode ? `NSE: ${fund.nseCode}` : `Code: ${fund.schemeCode}`}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Investment Type */}
                            <div>
                                <label className="text-[var(--text-secondary)] text-xs mb-2 block">Investment Type *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['SIP', 'Lumpsum', 'Transfer'] as const).map((type) => {
                                        const colors: Record<string, string> = { SIP: '#C4A265', Lumpsum: '#5B7FA4', Transfer: '#10B981' };
                                        const active = investForm.investmentType === type;
                                        return (
                                            <button key={type} onClick={() => setInvestForm(prev => ({ ...prev, investmentType: type }))}
                                                className={`p-3 rounded-xl border text-sm transition-all ${active ? `border-opacity-50 text-white` : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10'}`}
                                                style={active ? { backgroundColor: `${colors[type]}20`, borderColor: `${colors[type]}80`, color: colors[type] } : {}}>
                                                <p className="font-medium">{type}</p>
                                                <p className="text-[10px] opacity-70">{type === 'SIP' ? 'Monthly' : type === 'Lumpsum' ? 'One-time' : 'Existing SIP'}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Amount fields — hidden for Transfer */}
                            {investForm.investmentType !== 'Transfer' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[var(--text-secondary)] text-xs mb-1.5 block">
                                            {investForm.investmentType === 'SIP' ? 'Initial Lumpsum (Optional)' : 'Investment Amount *'}
                                        </label>
                                        <input type="number" placeholder="₹ Amount" value={investForm.amount}
                                            onChange={(e) => setInvestForm(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 text-sm" />
                                    </div>
                                    {investForm.investmentType === 'SIP' && (
                                        <div>
                                            <label className="text-[var(--text-secondary)] text-xs mb-1.5 block">Monthly SIP Amount</label>
                                            <input type="number" placeholder="₹ Monthly" value={investForm.sipAmount}
                                                onChange={(e) => setInvestForm(prev => ({ ...prev, sipAmount: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 text-sm" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Transfer — SIP amount + start date */}
                            {investForm.investmentType === 'Transfer' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[var(--text-secondary)] text-xs mb-1.5 block">Monthly SIP Amount (₹) *</label>
                                        <input type="number" placeholder="e.g. 5000" value={investForm.sipAmount}
                                            onChange={(e) => setInvestForm(prev => ({ ...prev, sipAmount: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#10B981]/50 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[var(--text-secondary)] text-xs mb-1.5 block">SIP Start Date *</label>
                                        <input type="date" value={investForm.startDate}
                                            onChange={(e) => setInvestForm(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#10B981]/50 text-sm" />
                                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">Date of first SIP installment (must be in the past)</p>
                                    </div>
                                    {investSipCalc && !investSipCalc.isLoading && !investSipCalc.error && investSipCalc.nextSipDate && (
                                        <div className="sm:col-span-2">
                                            <label className="text-[var(--text-secondary)] text-xs mb-1.5 block">Next SIP Date (computed)</label>
                                            <div className="px-3 py-2.5 bg-white/5 border border-[#10B981]/30 rounded-xl text-[#6EE7B7] text-sm font-medium">
                                                {new Date(investSipCalc.nextSipDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Transfer auto-calc summary */}
                            {investForm.investmentType === 'Transfer' && (
                                <div className="p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/20">
                                    <p className="text-[10px] text-[#10B981] mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                        <ArrowRightLeft size={11} /> SIP Calculation (Auto)
                                        {investSipCalc?.isLoading && <Loader2 size={11} className="animate-spin ml-1" />}
                                    </p>
                                    {investSipCalc?.isLoading && <p className="text-[var(--text-secondary)] text-xs">Fetching NAV history...</p>}
                                    {investSipCalc?.error && <p className="text-red-400 text-xs">{investSipCalc.error}</p>}
                                    {!investSipCalc && <p className="text-[var(--text-secondary)] text-xs">Enter SIP amount and start date to auto-calculate.</p>}
                                    {investSipCalc && !investSipCalc.isLoading && !investSipCalc.error && (
                                        <>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                                                <span className="text-[var(--text-secondary)]">Installments</span><span className="text-white font-medium text-right">{investSipCalc.nInstallments} months</span>
                                                <span className="text-[var(--text-secondary)]">Total Units</span><span className="text-white font-medium text-right">{investSipCalc.totalUnits.toFixed(4)}</span>
                                                <span className="text-[var(--text-secondary)]">Current Value</span><span className="text-white font-medium text-right">₹{investSipCalc.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                <span className="text-[var(--text-secondary)]">Total Invested</span><span className="text-white font-medium text-right">₹{investSipCalc.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <p className={`text-[11px] font-semibold border-t border-white/10 pt-1.5 ${investSipCalc.pnl >= 0 ? 'text-[#6EE7B7]' : 'text-red-400'}`}>
                                                P&L: {investSipCalc.pnl >= 0 ? '+' : ''}₹{investSipCalc.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({investSipCalc.pnl >= 0 ? '+' : ''}{investSipCalc.pnlPct.toFixed(2)}%)
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Step-up SIP */}
                            {(investForm.investmentType === 'SIP' || investForm.investmentType === 'Transfer') && (
                                <div className="p-3 rounded-xl bg-[var(--accent-purple)]/5 border border-[var(--accent-purple)]/20">
                                    <p className="text-[10px] text-[var(--accent-purple)] mb-2 font-medium uppercase tracking-wider">Step-up SIP (Optional)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[var(--text-secondary)] text-[10px] mb-1 block">Step-up Amount (₹)</label>
                                            <input type="number" placeholder="e.g. 500" value={investForm.stepUpAmount}
                                                onChange={(e) => setInvestForm(prev => ({ ...prev, stepUpAmount: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-purple)]/50 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-[var(--text-secondary)] text-[10px] mb-1 block">Step-up Interval</label>
                                            <select value={investForm.stepUpInterval}
                                                onChange={(e) => setInvestForm(prev => ({ ...prev, stepUpInterval: e.target.value as 'Yearly' | 'Half-Yearly' | 'Quarterly' }))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-purple)]/50 text-sm appearance-none">
                                                <option value="Yearly" className="bg-[#151A21]">Yearly</option>
                                                <option value="Half-Yearly" className="bg-[#151A21]">Half-Yearly</option>
                                                <option value="Quarterly" className="bg-[#151A21]">Quarterly</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Start Date — SIP / Lumpsum */}
                            {investForm.investmentType !== 'Transfer' && (
                                <div>
                                    <label className="text-[var(--text-secondary)] text-xs mb-1.5 block">
                                        {investForm.investmentType === 'Lumpsum' ? 'Investment Date *' : 'Start Date *'}
                                    </label>
                                    <input type="date" value={investForm.startDate}
                                        onChange={(e) => setInvestForm(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[var(--accent-mint)]/50 text-sm" />
                                    {investForm.investmentType === 'Lumpsum' && <p className="text-[10px] text-[var(--text-secondary)] mt-1">Date the lumpsum was originally made (must be in the past)</p>}
                                </div>
                            )}

                            {/* Lumpsum auto-calc summary */}
                            {investForm.investmentType === 'Lumpsum' && (
                                <div className="p-3 rounded-xl bg-[#5B7FA4]/5 border border-[#5B7FA4]/20">
                                    <p className="text-[10px] text-[#5B7FA4] mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                        Lumpsum Calculation (Auto)
                                        {investLumpCalc?.isLoading && <Loader2 size={11} className="animate-spin ml-1" />}
                                    </p>
                                    {investLumpCalc?.isLoading && <p className="text-[var(--text-secondary)] text-xs">Fetching NAV history...</p>}
                                    {investLumpCalc?.error && <p className="text-red-400 text-xs">{investLumpCalc.error}</p>}
                                    {!investLumpCalc && <p className="text-[var(--text-secondary)] text-xs">Enter the investment amount and date to auto-calculate.</p>}
                                    {investLumpCalc && !investLumpCalc.isLoading && !investLumpCalc.error && (
                                        <>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                                                <span className="text-[var(--text-secondary)]">NAV on Inv. Date</span><span className="text-white font-medium text-right">₹{investLumpCalc.navOnDate.toFixed(4)}</span>
                                                <span className="text-[var(--text-secondary)]">Units Purchased</span><span className="text-white font-medium text-right">{investLumpCalc.units.toFixed(4)}</span>
                                                <span className="text-[var(--text-secondary)]">Current Value</span><span className="text-white font-medium text-right">₹{investLumpCalc.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                <span className="text-[var(--text-secondary)]">Invested</span><span className="text-white font-medium text-right">₹{investLumpCalc.investedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <p className={`text-[11px] font-semibold border-t border-white/10 pt-1.5 ${investLumpCalc.pnl >= 0 ? 'text-[#6EE7B7]' : 'text-red-400'}`}>
                                                P&L: {investLumpCalc.pnl >= 0 ? '+' : ''}₹{investLumpCalc.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({investLumpCalc.pnl >= 0 ? '+' : ''}{investLumpCalc.pnlPct.toFixed(2)}%)
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 md:p-5 border-t border-[var(--border-primary)] flex gap-3 shrink-0">
                            <button onClick={() => { setShowAddInvestmentModal(false); resetInvestForm(); }}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-secondary)] font-medium hover:bg-white/10 transition-colors text-sm">
                                Cancel
                            </button>
                            <button onClick={handleAddInvestment} disabled={isAddingInvestment}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--accent-mint)] text-white font-medium hover:opacity-90 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {isAddingInvestment ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : 'Add Investment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
