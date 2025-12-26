'use client';

import { useClientContext } from '@/context/ClientContext';
import { TrendingUp, Calendar, BarChart3, ArrowUpRight } from 'lucide-react';

interface MonthlySIPData {
    month: string;
    totalSIP: number;
    activeCount: number;
    growth: number;
}

// Mock monthly SIP data for history
const historicalSIPData: MonthlySIPData[] = [
    { month: 'Nov 2024', totalSIP: 1152000, activeCount: 42, growth: 5.2 },
    { month: 'Oct 2024', totalSIP: 1095000, activeCount: 40, growth: 3.8 },
    { month: 'Sep 2024', totalSIP: 1055000, activeCount: 38, growth: 2.1 },
];

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

export default function MonthlySIPCard() {
    const { clients } = useClientContext();

    // Calculate real-time stats
    const activeSIPs = clients.filter(c => c.investmentType === 'SIP');
    const totalSIPAmount = activeSIPs.reduce((sum, client) => sum + (client.sipAmount || 0), 0);
    const activeSIPCount = activeSIPs.length;
    const avgSIPAmount = activeSIPCount > 0 ? totalSIPAmount / activeSIPCount : 0;

    // Calculate growth compared to last month (mock comparison for now)
    const lastMonthAmount = historicalSIPData[0].totalSIP;
    const growth = ((totalSIPAmount - lastMonthAmount) / lastMonthAmount) * 100;

    // Target calculation (Example target: 20 Lakhs)
    const targetAmount = 2000000;
    const progressPercentage = Math.min((totalSIPAmount / targetAmount) * 100, 100);

    const currentMonthName = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });

    return (
        <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border relative overflow-hidden transition-colors duration-300 h-full">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-blue)]/10 via-transparent to-[var(--accent-mint)]/5 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 md:mb-6 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-blue)]/10">
                        <Calendar size={18} className="text-[var(--accent-blue)]" />
                    </div>
                    <div>
                        <h3 className="text-[var(--text-primary)] font-semibold text-sm md:text-base">Monthly SIP</h3>
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs">{currentMonthName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/20">
                    <TrendingUp size={12} className="text-[var(--accent-mint)]" />
                    <span className="text-[var(--accent-mint)] text-xs font-medium">
                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Main Amount */}
            <div className="mb-4 md:mb-6 relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                    {formatCurrency(totalSIPAmount)}
                </h2>
                <p className="text-[var(--text-secondary)] text-xs mt-1">Total monthly SIP collection</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6 relative z-10">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--bg-hover)] to-transparent border border-[var(--border-primary)]">
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart3 size={14} className="text-[var(--accent-purple)]" />
                        <span className="text-[var(--text-secondary)] text-[10px] md:text-xs">Active SIPs</span>
                    </div>
                    <p className="text-[var(--text-primary)] text-lg md:text-xl font-bold">{activeSIPCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--bg-hover)] to-transparent border border-[var(--border-primary)]">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight size={14} className="text-[var(--accent-mint)]" />
                        <span className="text-[var(--text-secondary)] text-[10px] md:text-xs">Avg Amount</span>
                    </div>
                    <p className="text-[var(--text-primary)] text-lg md:text-xl font-bold">{formatCurrency(avgSIPAmount)}</p>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="relative z-10">
                <p className="text-[var(--text-secondary)] text-xs mb-2">Recent Months</p>
                <div className="space-y-2">
                    {historicalSIPData.map((month) => (
                        <div
                            key={month.month}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                        >
                            <span className="text-[var(--text-secondary)] text-xs">{month.month}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[var(--text-primary)] text-xs font-medium">
                                    {formatCurrency(month.totalSIP)}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${month.growth > 0
                                    ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                    : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                                    }`}>
                                    {month.growth > 0 ? '+' : ''}{month.growth}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-4 pt-4 border-t border-[var(--border-primary)] relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[var(--text-secondary)] text-xs">Monthly Target</span>
                    <span className="text-[var(--text-primary)] text-xs font-medium">{progressPercentage.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-mint)]"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] mt-1 text-right">
                    Target: {formatCurrency(targetAmount)}
                </p>
            </div>
        </div>
    );
}
