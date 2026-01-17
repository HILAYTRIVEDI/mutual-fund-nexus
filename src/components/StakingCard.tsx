'use client';

import Link from 'next/link';
import { Calendar, PiggyBank, Clock, Loader2 } from 'lucide-react';
import { useSIPs } from '@/context/SIPContext';

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

const colors = ['#48cae4', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

export default function StakingCard() {
    const { upcomingSIPs, activeSIPs, isLoading, error } = useSIPs();
    
    // Get next 4 upcoming SIPs
    const displaySIPs = activeSIPs
        .filter(sip => sip.next_execution_date)
        .sort((a, b) => {
            const dateA = new Date(a.next_execution_date!).getTime();
            const dateB = new Date(b.next_execution_date!).getTime();
            return dateA - dateB;
        })
        .slice(0, 4)
        .map((sip, index) => ({
            ...sip,
            color: colors[index % colors.length],
            daysUntil: sip.days_until_next ?? 0
        }));

    const totalUpcoming = displaySIPs.reduce((sum, sip) => sum + sip.amount, 0);

    if (isLoading) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 h-full gradient-border mint-glow relative overflow-hidden transition-colors duration-300 flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-[var(--accent-mint)] mb-2" size={32} />
                    <p className="text-[var(--text-secondary)] text-sm">Loading SIPs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 h-full gradient-border mint-glow relative overflow-hidden transition-colors duration-300">
                <p className="text-[var(--accent-red)] text-sm">{error}</p>
            </div>
        );
    }

    if (displaySIPs.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 h-full gradient-border mint-glow relative overflow-hidden transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/10 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />
                
                <div className="mb-4 md:mb-6 relative z-10">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                        <Calendar size={16} className="text-[var(--accent-mint)]" />
                        <p className="text-[var(--text-secondary)] text-xs md:text-sm">Upcoming SIPs</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center justify-center py-8 relative z-10">
                    <PiggyBank size={40} className="text-[var(--text-secondary)] mb-3 opacity-50" />
                    <p className="text-[var(--text-secondary)] text-sm">No SIPs scheduled</p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Set up SIPs for your clients</p>
                </div>

                <div className="mt-3 md:mt-4 relative z-10">
                    <Link
                        href="/clients?type=SIP"
                        className="block w-full py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-[var(--accent-mint)]/20 to-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/30 text-[var(--accent-mint)] font-medium hover:from-[var(--accent-mint)]/30 hover:to-[var(--accent-mint)]/20 hover:shadow-lg hover:shadow-[var(--accent-mint)]/20 transition-all duration-300 text-center text-sm"
                    >
                        Manage SIPs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-4 md:p-6 h-full gradient-border mint-glow relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/10 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            {/* Header */}
            <div className="mb-4 md:mb-6 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <Calendar size={16} className="text-[var(--accent-mint)]" />
                        <p className="text-[var(--text-secondary)] text-xs md:text-sm">Upcoming SIPs</p>
                    </div>
                    <span className="text-[var(--text-secondary)] text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 bg-[var(--bg-hover)] rounded-full">
                        Next {displaySIPs.length}
                    </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                    {formatCurrency(totalUpcoming)}
                </h2>
                <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mt-1">Total upcoming amount</p>
            </div>

            {/* Upcoming SIPs List */}
            <div className="space-y-2 md:space-y-3 relative z-10">
                {displaySIPs.map((sip, index) => (
                    <div
                        key={sip.id}
                        className={`p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-[var(--bg-hover)] to-transparent backdrop-blur-sm border transition-all duration-300 hover:border-[var(--accent-mint)]/30 ${index === 0 ? 'border-[var(--accent-mint)]/30' : 'border-[var(--border-primary)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${sip.color}30, ${sip.color}10)`,
                                        boxShadow: `0 0 15px ${sip.color}20`
                                    }}
                                >
                                    <PiggyBank size={14} className="md:w-[18px] md:h-[18px]" style={{ color: sip.color }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[var(--text-primary)] font-medium text-xs md:text-sm truncate">
                                        {sip.client_name || 'Client'}
                                    </p>
                                    <p className="text-[var(--text-secondary)] text-[10px] md:text-xs truncate">
                                        {sip.scheme_name || sip.scheme_code || 'Fund'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-[var(--text-primary)] font-semibold text-xs md:text-sm">{formatCurrency(sip.amount)}</p>
                                <div className="flex items-center justify-end gap-1 text-[10px] md:text-xs">
                                    <Clock size={8} className="md:w-2.5 md:h-2.5 text-[var(--text-secondary)]" />
                                    <span className={`${sip.daysUntil <= 3 ? 'text-[var(--accent-mint)]' : 'text-[var(--text-secondary)]'}`}>
                                        {sip.daysUntil === 0 ? 'Today' : sip.daysUntil === 1 ? 'Tomorrow' : `${sip.daysUntil}d`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Date badge - Hidden on very small screens */}
                        <div className="hidden sm:flex mt-2 items-center justify-between">
                            <span className="text-[var(--text-secondary)] text-[10px] md:text-xs flex items-center gap-1">
                                <Calendar size={8} className="md:w-2.5 md:h-2.5" />
                                {sip.next_execution_date ? formatDate(sip.next_execution_date) : '-'}
                            </span>
                            {index === 0 && (
                                <span className="text-[var(--accent-mint)] text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 bg-[var(--accent-mint)]/10 rounded-full">
                                    Next SIP
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* View All Button */}
            <div className="mt-3 md:mt-4 relative z-10">
                <Link
                    href="/clients?type=SIP"
                    className="block w-full py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-[var(--accent-mint)]/20 to-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/30 text-[var(--accent-mint)] font-medium hover:from-[var(--accent-mint)]/30 hover:to-[var(--accent-mint)]/20 hover:shadow-lg hover:shadow-[var(--accent-mint)]/20 transition-all duration-300 text-center text-sm"
                >
                    View All SIPs
                </Link>
            </div>
        </div>
    );
}
