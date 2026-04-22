'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, PiggyBank, TrendingUp, TrendingDown, FileText, Edit, Trash2, Plus, Calculator, Loader2, ShieldCheck } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useSettings } from '@/context/SettingsContext';
import { useClientContext } from '@/context/ClientContext';
import { useHoldings } from '@/context/HoldingsContext';
import { useSIPs } from '@/context/SIPContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useAuth } from '@/context/AuthContext';
import { calculateXIRR } from '@/lib/utils/finance';

function formatCurrency(amount: number): string {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
    const { holdings, deleteHolding, refreshHoldings } = useHoldings();
    const { sips, cancelSIP, refreshSIPs } = useSIPs();
    const { transactions, refreshTransactions } = useTransactions();

    const [activeTab, setActiveTab] = useState<'investments' | 'transactions' | 'notes'>('investments');
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
        const xirr = calculateXIRR(cashFlows);

        if (!showPostTax || grossReturnAmount <= 0) {
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
                            <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-[var(--accent-mint)] to-[var(--accent-purple)] flex items-center justify-center text-white text-xl font-bold">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-bold truncate">{client.name}</h1>
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
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{client.email || '—'}</p>
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
                                                            <p className="text-[var(--text-primary)] text-sm font-medium truncate">{fundName}</p>
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
                                                        <p className="text-[var(--text-primary)] text-sm truncate">{fundName}</p>
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
        </div>
    );
}
