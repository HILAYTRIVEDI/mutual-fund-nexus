'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Calendar, PiggyBank, TrendingUp, TrendingDown, FileText, Edit, Trash2, Plus, Calculator } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useSettings } from '@/context/SettingsContext';

// Mock client data - in production this would come from API/database
const clientData = {
    id: 'CLT001',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    phone: '+91 98765 43210',
    pan: 'ABCDE1234F',
    dateOfBirth: '1985-06-15',
    address: '123 MG Road, Bengaluru, Karnataka 560001',
    kycStatus: 'Verified',
    kycExpiry: '2026-06-15',
    joinedDate: '2022-01-15',
    riskProfile: 'Aggressive',
    notes: 'High-value client. Prefers equity funds. Review portfolio quarterly.',
};

const clientInvestments = [
    {
        id: '1',
        fundName: 'HDFC Top 100 Fund - Direct Growth',
        fundHouse: 'HDFC',
        type: 'SIP',
        investedAmount: 1500000,
        currentValue: 1820000,
        units: 1523.45,
        avgNav: 985.23,
        currentNav: 1194.67,
        sipAmount: 50000,
        startDate: '2023-01-15',
        returns: 21.33,
    },
    {
        id: '2',
        fundName: 'Axis Small Cap Fund - Direct Growth',
        fundHouse: 'Axis',
        type: 'SIP',
        investedAmount: 600000,
        currentValue: 782000,
        units: 8234.12,
        avgNav: 72.87,
        currentNav: 94.98,
        sipAmount: 25000,
        startDate: '2023-06-10',
        returns: 30.33,
    },
    {
        id: '3',
        fundName: 'ICICI Prudential Liquid Fund',
        fundHouse: 'ICICI',
        type: 'Lumpsum',
        investedAmount: 500000,
        currentValue: 518000,
        units: 1456.78,
        avgNav: 343.21,
        currentNav: 355.56,
        startDate: '2024-01-05',
        returns: 3.6,
    },
];

const transactionHistory = [
    { id: '1', date: '2024-12-05', type: 'SIP', fund: 'HDFC Top 100', amount: 50000, units: 41.87, nav: 1194.67, status: 'Completed' },
    { id: '2', date: '2024-12-10', type: 'SIP', fund: 'Axis Small Cap', amount: 25000, units: 263.21, nav: 94.98, status: 'Completed' },
    { id: '3', date: '2024-11-05', type: 'SIP', fund: 'HDFC Top 100', amount: 50000, units: 42.32, nav: 1181.45, status: 'Completed' },
    { id: '4', date: '2024-11-10', type: 'SIP', fund: 'Axis Small Cap', amount: 25000, units: 268.45, nav: 93.12, status: 'Completed' },
    { id: '5', date: '2024-10-05', type: 'SIP', fund: 'HDFC Top 100', amount: 50000, units: 43.01, nav: 1162.78, status: 'Completed' },
    { id: '6', date: '2024-01-05', type: 'Lumpsum', fund: 'ICICI Liquid', amount: 500000, units: 1456.78, nav: 343.21, status: 'Completed' },
];

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
    const { ltcgTax, stcgTax } = useSettings();
    const [activeTab, setActiveTab] = useState<'investments' | 'transactions' | 'notes'>('investments');
    const [notes, setNotes] = useState(clientData.notes);
    const [showPostTax, setShowPostTax] = useState(false);

    // Calculate returns for a single investment
    const getInvestmentReturns = (inv: typeof clientInvestments[0]) => {
        const grossReturnAmount = inv.currentValue - inv.investedAmount;
        if (!showPostTax || grossReturnAmount <= 0) {
            return {
                returnAmount: grossReturnAmount,
                returnPercentage: (grossReturnAmount / inv.investedAmount) * 100
            };
        }

        const startDate = new Date(inv.startDate);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const isLongTerm = startDate < oneYearAgo;
        const taxRate = isLongTerm ? ltcgTax : stcgTax;

        const taxAmount = grossReturnAmount * (taxRate / 100);
        const netReturnAmount = grossReturnAmount - taxAmount;

        return {
            returnAmount: netReturnAmount,
            returnPercentage: (netReturnAmount / inv.investedAmount) * 100,
            isLongTerm
        };
    };

    // Calculate totals
    const totalInvested = clientInvestments.reduce((sum, inv) => sum + inv.investedAmount, 0);
    const totalCurrent = clientInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalReturns = clientInvestments.reduce((sum, inv) => sum + getInvestmentReturns(inv).returnAmount, 0);
    const returnsPercentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : '0.00';

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
                                {clientData.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{clientData.name}</h1>
                                <p className="text-[var(--text-secondary)] text-sm">Client ID: {clientData.id}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]">
                                        {clientData.kycStatus}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
                                        {clientData.riskProfile}
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
                        <p className="text-[var(--text-primary)] text-sm font-medium">{clientData.email}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                            <Phone size={12} />
                            Phone
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{clientData.phone}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                            <FileText size={12} />
                            PAN
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{clientData.pan}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                            <Calendar size={12} />
                            Member Since
                        </div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{formatDate(clientData.joinedDate)}</p>
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
                            <div className="grid grid-cols-12 gap-4 p-4 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                                <div className="col-span-4 text-[var(--text-secondary)] text-xs font-medium uppercase">Fund</div>
                                <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Invested</div>
                                <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Current</div>
                                <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">Returns</div>
                                <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-center">Type</div>
                            </div>
                            <div className="divide-y divide-[var(--border-primary)]">
                                {clientInvestments.map((inv) => (
                                    <div key={inv.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-[var(--bg-hover)] transition-all">
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[var(--accent-mint)]/10 flex items-center justify-center">
                                                <PiggyBank size={18} className="text-[var(--accent-mint)]" />
                                            </div>
                                            <div>
                                                <p className="text-[var(--text-primary)] text-sm font-medium">{inv.fundName}</p>
                                                <p className="text-[var(--text-secondary)] text-xs">{inv.units.toLocaleString()} units @ ₹{inv.currentNav} (26-12-2025 • Code: 123456)</p>
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex flex-col items-end justify-center">
                                            <p className="text-[var(--text-primary)] text-sm">{formatCurrency(inv.investedAmount)}</p>
                                            {inv.sipAmount && <p className="text-[var(--text-secondary)] text-xs">{formatCurrency(inv.sipAmount)}/mo</p>}
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end">
                                            <p className="text-[var(--text-primary)] text-sm font-medium">{formatCurrency(inv.currentValue)}</p>
                                        </div>
                                        <div className="col-span-2 flex flex-col items-end justify-center">
                                            <p className={`text-sm font-medium flex items-center gap-1 ${getInvestmentReturns(inv).returnPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {getInvestmentReturns(inv).returnPercentage >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {getInvestmentReturns(inv).returnPercentage >= 0 ? '+' : ''}{getInvestmentReturns(inv).returnPercentage.toFixed(2)}%
                                            </p>
                                            <p className={`text-xs ${getInvestmentReturns(inv).returnAmount >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {getInvestmentReturns(inv).returnAmount >= 0 ? '+' : ''}{formatCurrency(getInvestmentReturns(inv).returnAmount)}
                                            </p>
                                            {showPostTax && (
                                                <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                                                    {(new Date(inv.startDate) < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) ? 'LTCG' : 'STCG'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-2 flex items-center justify-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${inv.type === 'SIP' ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]' : 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]'
                                                }`}>
                                                {inv.type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'transactions' && (
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
                                {transactionHistory.map((tx) => (
                                    <div key={tx.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-[var(--bg-hover)] transition-all">
                                        <div className="col-span-2 flex items-center">
                                            <p className="text-[var(--text-primary)] text-sm">{formatDate(tx.date)}</p>
                                        </div>
                                        <div className="col-span-2 flex items-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === 'SIP' ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]' : 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]'
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </div>
                                        <div className="col-span-3 flex items-center">
                                            <p className="text-[var(--text-primary)] text-sm">{tx.fund}</p>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end">
                                            <p className="text-[var(--accent-mint)] text-sm font-medium">+{formatCurrency(tx.amount)}</p>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end">
                                            <p className="text-[var(--text-primary)] text-sm">{tx.units.toFixed(2)}</p>
                                        </div>
                                        <div className="col-span-1 flex items-center justify-center">
                                            <span className="w-2 h-2 rounded-full bg-[var(--accent-mint)]" title={tx.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'notes' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[var(--text-primary)] font-semibold">Client Notes</h3>
                                <button className="px-3 py-1.5 rounded-lg bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] text-sm font-medium flex items-center gap-1 hover:bg-[var(--accent-mint)]/20 transition-colors">
                                    <Plus size={14} />
                                    Add Note
                                </button>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-40 p-4 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 resize-none"
                                placeholder="Add notes about this client..."
                            />
                            <p className="text-[var(--text-muted)] text-xs mt-2">
                                Last updated: {formatDate('2024-12-20')}
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
