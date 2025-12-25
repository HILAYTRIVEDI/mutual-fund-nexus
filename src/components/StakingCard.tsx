'use client';

import Link from 'next/link';
import { Calendar, PiggyBank, Clock } from 'lucide-react';

const upcomingSIPs = [
    {
        id: 1,
        clientName: 'Rajesh Kumar',
        fundName: 'HDFC Top 100 Fund',
        amount: 50000,
        sipDate: '2024-12-28',
        daysUntil: 2,
        color: '#10B981',
    },
    {
        id: 2,
        clientName: 'Sneha Reddy',
        fundName: 'Axis Small Cap Fund',
        amount: 25000,
        sipDate: '2024-12-30',
        daysUntil: 4,
        color: '#3B82F6',
    },
    {
        id: 3,
        clientName: 'Anita Mehta',
        fundName: 'Mirae Asset Large Cap',
        amount: 40000,
        sipDate: '2025-01-01',
        daysUntil: 6,
        color: '#8B5CF6',
    },
    {
        id: 4,
        clientName: 'Suresh Iyer',
        fundName: 'Kotak Emerging Equity',
        amount: 20000,
        sipDate: '2025-01-05',
        daysUntil: 10,
        color: '#F59E0B',
    },
    {
        id: 5,
        clientName: 'Priya Sharma',
        fundName: 'SBI Bluechip Fund',
        amount: 25000,
        sipDate: '2025-01-10',
        daysUntil: 15,
        color: '#EC4899',
    },
];

function formatCurrency(amount: number): string {
    if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function StakingCard() {
    const totalUpcoming = upcomingSIPs.reduce((sum, sip) => sum + sip.amount, 0);

    return (
        <div className="glass-card rounded-2xl p-6 h-full gradient-border mint-glow relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/10 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            {/* Header */}
            <div className="mb-6 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-[var(--accent-mint)]" />
                        <p className="text-[var(--text-secondary)] text-sm">Upcoming SIPs</p>
                    </div>
                    <span className="text-[var(--text-secondary)] text-xs px-2 py-1 bg-[var(--bg-hover)] rounded-full">
                        Next {upcomingSIPs.length} installments
                    </span>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                    {formatCurrency(totalUpcoming)}
                </h2>
                <p className="text-[var(--text-secondary)] text-xs mt-1">Total upcoming amount</p>
            </div>

            {/* Upcoming SIPs List */}
            <div className="space-y-3 relative z-10">
                {upcomingSIPs.map((sip, index) => (
                    <div
                        key={sip.id}
                        className={`p-3 rounded-xl bg-gradient-to-br from-[var(--bg-hover)] to-transparent backdrop-blur-sm border transition-all duration-300 hover:border-[var(--accent-mint)]/30 ${index === 0 ? 'border-[var(--accent-mint)]/30' : 'border-[var(--border-primary)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${sip.color}30, ${sip.color}10)`,
                                        boxShadow: `0 0 15px ${sip.color}20`
                                    }}
                                >
                                    <PiggyBank size={18} style={{ color: sip.color }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[var(--text-primary)] font-medium text-sm truncate">{sip.clientName}</p>
                                    <p className="text-[var(--text-secondary)] text-xs truncate">{sip.fundName}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-[var(--text-primary)] font-semibold text-sm">{formatCurrency(sip.amount)}</p>
                                <div className="flex items-center justify-end gap-1 text-xs">
                                    <Clock size={10} className="text-[var(--text-secondary)]" />
                                    <span className={`${sip.daysUntil <= 3 ? 'text-[var(--accent-mint)]' : 'text-[var(--text-secondary)]'}`}>
                                        {sip.daysUntil === 0 ? 'Today' : sip.daysUntil === 1 ? 'Tomorrow' : `${sip.daysUntil} days`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Date badge */}
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-[var(--text-secondary)] text-xs flex items-center gap-1">
                                <Calendar size={10} />
                                {formatDate(sip.sipDate)}
                            </span>
                            {index === 0 && (
                                <span className="text-[var(--accent-mint)] text-xs px-2 py-0.5 bg-[var(--accent-mint)]/10 rounded-full">
                                    Next SIP
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* View All Button */}
            <div className="mt-4 relative z-10">
                <Link
                    href="/clients?type=SIP"
                    className="block w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent-mint)]/20 to-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/30 text-[var(--accent-mint)] font-medium hover:from-[var(--accent-mint)]/30 hover:to-[var(--accent-mint)]/20 hover:shadow-lg hover:shadow-[var(--accent-mint)]/20 transition-all duration-300 text-center"
                >
                    View All SIPs
                </Link>
            </div>
        </div>
    );
}
