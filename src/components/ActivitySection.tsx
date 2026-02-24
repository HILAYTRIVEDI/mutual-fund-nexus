'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, Activity } from 'lucide-react';
import { useTransactions } from '@/context/TransactionsContext';

function formatCurrency(amount: number): string {
    if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getTransactionIcon(type: string) {
    switch (type) {
        case 'buy':
        case 'sip':
            return ArrowDownLeft;
        case 'sell':
            return ArrowUpRight;
        case 'switch':
            return ArrowLeftRight;
        default:
            return ArrowDownLeft;
    }
}

function getTransactionLabel(type: string): string {
    switch (type) {
        case 'buy': return 'Purchase';
        case 'sell': return 'Redemption';
        case 'sip': return 'SIP Executed';
        case 'switch': return 'Switch';
        default: return type;
    }
}

export default function ActivitySection() {
    const { getRecentTransactions, isLoading, error } = useTransactions();
    
    const recentTransactions = getRecentTransactions(5);

    if (isLoading) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border relative overflow-hidden transition-colors duration-300 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-[var(--accent-mint)] mb-2" size={24} />
                    <p className="text-[var(--text-secondary)] text-sm">Loading transactions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border relative overflow-hidden transition-colors duration-300">
                <p className="text-[var(--accent-red)] text-sm">{error}</p>
            </div>
        );
    }

    if (recentTransactions.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border relative overflow-hidden transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/5 via-transparent to-[var(--accent-slate)]/5 pointer-events-none" />
                <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
                    <h3 className="text-[var(--text-primary)] font-semibold text-sm md:text-base">Recent Transactions</h3>
                    <Link href="/history" className="text-[var(--accent-gold)] text-xs md:text-sm font-medium hover:underline transition-colors">
                        View All
                    </Link>
                </div>
                <div className="flex flex-col items-center justify-center py-8 relative z-10">
                    <Activity size={40} className="text-[var(--text-secondary)] mb-3 opacity-50" />
                    <p className="text-[var(--text-secondary)] text-sm">No transactions yet</p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Transactions will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/5 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
                <h3 className="text-[var(--text-primary)] font-semibold text-sm md:text-base">Recent Transactions</h3>
                <Link href="/history" className="text-[var(--accent-gold)] text-xs md:text-sm font-medium hover:underline transition-colors">
                    View All
                </Link>
            </div>

            <div className="space-y-2 md:space-y-3 relative z-10">
                {recentTransactions.map((tx) => {
                    const Icon = getTransactionIcon(tx.type);
                    const isPositive = tx.type === 'buy' || tx.type === 'sip';
                    const label = getTransactionLabel(tx.type);
                    
                    return (
                        <div
                            key={tx.id}
                            className="flex items-center justify-between p-2.5 md:p-3 rounded-xl hover:bg-gradient-to-r hover:from-[var(--bg-hover)] hover:to-transparent transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-2.5 md:gap-3">
                                <div
                                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${isPositive
                                        ? 'bg-gradient-to-br from-[var(--accent-mint)]/20 to-[var(--accent-mint)]/5 shadow-lg shadow-[var(--accent-mint)]/20'
                                        : 'bg-gradient-to-br from-[var(--accent-red)]/20 to-[var(--accent-red)]/5 shadow-lg shadow-[var(--accent-red)]/20'
                                        }`}
                                >
                                    <Icon
                                        size={14}
                                        className={`md:w-[18px] md:h-[18px] ${isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}
                                    />
                                </div>
                                <div>
                                    <p className="text-[var(--text-primary)] text-xs md:text-sm font-medium">{label}</p>
                                    <p className="text-[var(--text-secondary)] text-[10px] md:text-xs">
                                        {tx.scheme_code || 'Fund'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p
                                    className={`text-xs md:text-sm font-medium ${isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}
                                >
                                    {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                                <p className="text-[var(--text-secondary)] text-[10px] md:text-xs">
                                    {formatDate(tx.date)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
