'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, PiggyBank, TrendingUp, TrendingDown, FileText, Edit, Trash2, Plus, Calculator, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useSettings } from '@/context/SettingsContext';
import { useClientContext } from '@/context/ClientContext';
import { useHoldings } from '@/context/HoldingsContext';
import { useSIPs } from '@/context/SIPContext';
import { useTransactions } from '@/context/TransactionsContext';

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientDetailPage() {
    const params = useParams();
    const clientId = params.id as string;
    
    const { ltcgTax, stcgTax } = useSettings();
    const { clients, isLoading: clientsLoading } = useClientContext();
    const { holdings } = useHoldings();
    const { sips } = useSIPs();
    const { transactions } = useTransactions();
    
    const [activeTab, setActiveTab] = useState<'investments' | 'transactions' | 'notes'>('investments');
    const [notes, setNotes] = useState('');
    const [showPostTax, setShowPostTax] = useState(false);

    // Find the client by ID
    const client = clients.find(c => c.id === clientId);
    
    // Filter holdings for this client
    const clientHoldings = holdings.filter(h => h.user_id === clientId);
    
    // Filter SIPs for this client
    const clientSIPs = sips.filter(s => s.user_id === clientId);
    
    // Filter transactions for this client
    const clientTransactions = transactions.filter(t => t.user_id === clientId);

    // Set notes from client data
    useEffect(() => {
        if (client?.notes) {
            setNotes(client.notes);
        }
    }, [client]);

    // Calculate returns for a single holding
    const getHoldingReturns = (holding: typeof clientHoldings[0]) => {
        const investedAmount = holding.invested_amount || (holding.units * holding.average_price);
        const currentValue = holding.current_nav ? holding.units * holding.current_nav : investedAmount;
        const grossReturnAmount = currentValue - investedAmount;
        
        if (!showPostTax || grossReturnAmount <= 0) {
            return {
                returnAmount: grossReturnAmount,
                returnPercentage: investedAmount > 0 ? (grossReturnAmount / investedAmount) * 100 : 0,
                currentValue,
                investedAmount,
            };
        }

        const startDate = new Date(holding.created_at || Date.now());
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const isLongTerm = startDate < oneYearAgo;
        const taxRate = isLongTerm ? ltcgTax : stcgTax;

        const taxAmount = grossReturnAmount * (taxRate / 100);
        const netReturnAmount = grossReturnAmount - taxAmount;

        return {
            returnAmount: netReturnAmount,
            returnPercentage: investedAmount > 0 ? (netReturnAmount / investedAmount) * 100 : 0,
            isLongTerm,
            currentValue,
            investedAmount,
        };
    };

    // Calculate totals
    const totalInvested = clientHoldings.reduce((sum, h) => sum + (h.invested_amount || h.units * h.average_price), 0);
    const totalCurrent = clientHoldings.reduce((sum, h) => {
        const currentValue = h.current_nav ? h.units * h.current_nav : (h.invested_amount || h.units * h.average_price);
        return sum + currentValue;
    }, 0);
    const totalReturns = clientHoldings.reduce((sum, h) => sum + getHoldingReturns(h).returnAmount, 0);
    const returnsPercentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : '0.00';

    // Loading state
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

    // Client not found
    if (!client) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[var(--text-secondary)] mb-4">Client not found</p>
                    <Link
                        href="/clients"
                        className="inline-flex items-center gap-2 text-[var(--accent-mint)] hover:underline"
                    >
                        <ArrowLeft size={18} />
                        Back to Clients
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-6">
                    <Link
                        href="/clients"
                        className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back to Clients
                    </Link>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-mint)] to-[var(--accent-purple)] flex items-center justify-center text-white text-2xl font-bold">
                                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{client.name}</h1>
                                <p className="text-[var(--text-secondary)] text-sm">Client ID: {client.id.slice(0, 8)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        client.kyc_status === 'verified' 
                                            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                            : 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]'
                                    }`}>
                                        {client.kyc_status || 'Pending KYC'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        client.status === 'active'
                                            ? 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]'
                                            : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                                    }`}>
                                        {client.status || 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                <Edit size={18} />
                            </button>
                            <button className="p-2 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Client Info Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                            <Mail size={12} />
                            Email
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{client.email || 'Not provided'}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                            <Phone size={12} />
                            Phone
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{client.phone || 'Not provided'}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                            <FileText size={12} />
                            PAN
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{client.panCard || client.pan || 'Not provided'}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                            <Calendar size={12} />
                            Member Since
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">
                            {client.created_at ? formatDate(client.created_at) : 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Portfolio Summary */}
                <div className="flex items-center justify-end mb-4">
                    <button
                        onClick={() => setShowPostTax(!showPostTax)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${showPostTax
                                ? 'bg-[var(--accent-mint)]/10 border-[var(--accent-mint)]/20 text-[var(--accent-mint)]'
                                : 'bg-[var(--bg-hover)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <Calculator size={14} />
                        <span className="text-xs font-medium">{showPostTax ? 'Post-Tax Returns' : 'Pre-Tax Returns'}</span>
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <p className="text-[var(--text-secondary)] text-xs mb-1">Total Invested</p>
                        <p className="text-[var(--text-primary)] text-xl font-bold">{formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <p className="text-[var(--text-secondary)] text-xs mb-1">Current Value</p>
                        <p className="text-[var(--text-primary)] text-xl font-bold">{formatCurrency(totalCurrent)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <p className="text-[var(--text-secondary)] text-xs mb-1">{showPostTax ? 'Net Returns' : 'Total Returns'}</p>
                        <p className={`text-xl font-bold ${totalReturns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <p className="text-[var(--text-secondary)] text-xs mb-1">Returns %</p>
                        <p className={`text-xl font-bold flex items-center gap-1 ${parseFloat(returnsPercentage) >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {parseFloat(returnsPercentage) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            {parseFloat(returnsPercentage) >= 0 ? '+' : ''}{returnsPercentage}%
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    {(['investments', 'transactions', 'notes'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                                ? 'bg-[var(--accent-mint)]/20 text-[var(--accent-mint)] border border-[var(--accent-mint)]/30'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    {activeTab === 'investments' && (
                        <>
                            {clientHoldings.length === 0 ? (
                                <div className="p-8 text-center text-[var(--text-secondary)]">
                                    <PiggyBank size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No investments found for this client</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-12 gap-4 p-4 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                                        <div className="col-span-4 text-[var(--text-secondary)] text-xs font-medium uppercase">Fund</div>
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Invested</div>
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Current</div>
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Returns</div>
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-center">Units</div>
                                    </div>
                                    <div className="divide-y divide-[var(--border-primary)]">
                                        {clientHoldings.map((holding) => {
                                            const returns = getHoldingReturns(holding);
                                            return (
                                                <div key={holding.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-[var(--bg-hover)] transition-all">
                                                    <div className="col-span-4 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-[var(--accent-mint)]/10 flex items-center justify-center">
                                                            <PiggyBank size={18} className="text-[var(--accent-mint)]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[var(--text-primary)] text-sm font-medium">
                                                                {holding.scheme_code || 'Unknown Fund'}
                                                            </p>
                                                            <p className="text-[var(--text-secondary)] text-xs">
                                                                NAV: ₹{holding.current_nav?.toFixed(2) || holding.average_price.toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 flex flex-col items-end justify-center">
                                                        <p className="text-[var(--text-primary)] text-sm">{formatCurrency(returns.investedAmount)}</p>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end">
                                                        <p className="text-[var(--text-primary)] text-sm font-medium">{formatCurrency(returns.currentValue)}</p>
                                                    </div>
                                                    <div className="col-span-2 flex flex-col items-end justify-center">
                                                        <p className={`text-sm font-medium flex items-center gap-1 ${returns.returnPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                            {returns.returnPercentage >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                            {returns.returnPercentage >= 0 ? '+' : ''}{returns.returnPercentage.toFixed(2)}%
                                                        </p>
                                                        <p className={`text-xs ${returns.returnAmount >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                            {returns.returnAmount >= 0 ? '+' : ''}{formatCurrency(returns.returnAmount)}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-center">
                                                        <span className="text-[var(--text-primary)] text-sm">
                                                            {holding.units.toFixed(3)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'transactions' && (
                        <>
                            {clientTransactions.length === 0 ? (
                                <div className="p-8 text-center text-[var(--text-secondary)]">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No transactions found for this client</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-12 gap-4 p-4 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase">Date</div>
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase">Type</div>
                                        <div className="col-span-3 text-[var(--text-secondary)] text-xs font-medium uppercase">Fund</div>
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Amount</div>
                                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Units</div>
                                        <div className="col-span-1 text-[var(--text-secondary)] text-xs font-medium uppercase text-center">Status</div>
                                    </div>
                                    <div className="divide-y divide-[var(--border-primary)]">
                                        {clientTransactions.map((tx) => (
                                            <div key={tx.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-[var(--bg-hover)] transition-all">
                                                <div className="col-span-2 flex items-center">
                                                    <p className="text-[var(--text-primary)] text-sm">{formatDate(tx.date)}</p>
                                                </div>
                                                <div className="col-span-2 flex items-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        tx.type === 'sip' ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]' : 
                                                        tx.type === 'buy' ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' :
                                                        'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]'
                                                    }`}>
                                                        {tx.type.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="col-span-3 flex items-center">
                                                    <p className="text-[var(--text-primary)] text-sm">{tx.scheme_code || 'N/A'}</p>
                                                </div>
                                                <div className="col-span-2 flex items-center justify-end">
                                                    <p className={`text-sm font-medium ${tx.type === 'sell' ? 'text-[var(--accent-red)]' : 'text-[var(--accent-mint)]'}`}>
                                                        {tx.type === 'sell' ? '-' : '+'}{formatCurrency(tx.amount)}
                                                    </p>
                                                </div>
                                                <div className="col-span-2 flex items-center justify-end">
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
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'notes' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[var(--text-primary)] font-semibold">Client Notes</h3>
                                <button className="px-3 py-1.5 rounded-lg bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] text-sm font-medium flex items-center gap-1 hover:bg-[var(--accent-mint)]/20 transition-colors">
                                    <Plus size={14} />
                                    Save Note
                                </button>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-40 p-4 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 resize-none"
                                placeholder="Add notes about this client..."
                            />
                            <p className="text-[var(--text-muted)] text-xs mt-2">
                                Last updated: {client.updated_at ? formatDate(client.updated_at) : 'Never'}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
