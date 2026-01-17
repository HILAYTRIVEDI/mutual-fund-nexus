'use client';

import { useSIPs } from '@/context/SIPContext';
import { useTransactions } from '@/context/TransactionsContext';
import { TrendingUp, Calendar, BarChart3, ArrowUpRight, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

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
    const { activeSIPs, totalMonthlyAmount, isLoading: sipLoading, error: sipError } = useSIPs();
    const { transactions, isLoading: txLoading } = useTransactions();

    const historicalData = useMemo(() => {
        if (!transactions) return [];

        const sipTransactions = transactions.filter(t => t.type === 'sip');
        
        // Group by month YYYY-MM
        const grouped = sipTransactions.reduce((acc, tx) => {
            const date = new Date(tx.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`; // stable key
            
            if (!acc[key]) {
                acc[key] = {
                    date: date,
                    monthName: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                    totalSIP: 0,
                    count: 0
                };
            }
            acc[key].totalSIP += tx.amount;
            acc[key].count += 1;
            return acc;
        }, {} as Record<string, { date: Date, monthName: string, totalSIP: number, count: number }>);

        // Convert to array and sort by date descending
        const sortedMonths = Object.values(grouped).sort((a, b) => b.date.getTime() - a.date.getTime());
        
        // Calculate growth for each month vs previous month in the list (which is next in sorted array)
        return sortedMonths.slice(0, 3).map((item, index, array) => {
            const prevMonth = array[index + 1];
            let growth = 0;
            if (prevMonth && prevMonth.totalSIP > 0) {
                growth = ((item.totalSIP - prevMonth.totalSIP) / prevMonth.totalSIP) * 100;
            }
            return {
                ...item,
                growth
            };
        });
    }, [transactions]);

    // Calculate stats from real data
    const activeSIPCount = activeSIPs.length;
    const avgSIPAmount = activeSIPCount > 0 ? totalMonthlyAmount / activeSIPCount : 0;
    
    // Calculate overall growth (current month vs previous month from historical data)
    const currentGrowth = historicalData.length > 0 ? historicalData[0].growth : 0;
    const currentMonthName = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });

    if (sipLoading || txLoading) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-[var(--accent-blue)] mb-2" size={32} />
                    <p className="text-[var(--text-secondary)] text-sm">Loading SIP data...</p>
                </div>
            </div>
        );
    }

    if (sipError) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border flex items-center justify-center h-full min-h-[300px]">
                <p className="text-[var(--accent-red)] text-sm">{sipError}</p>
            </div>
        );
    }

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
                {historicalData.length > 1 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/20">
                        <TrendingUp size={12} className="text-[var(--accent-mint)]" />
                        <span className="text-[var(--accent-mint)] text-xs font-medium">
                            {currentGrowth > 0 ? '+' : ''}{currentGrowth.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Main Amount */}
            <div className="mb-4 md:mb-6 relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                    {formatCurrency(totalMonthlyAmount)}
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
                <p className="text-[var(--text-secondary)] text-xs mb-2">Recent Execution History</p>
                {historicalData.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-xs italic">No SIP transactions yet.</p>
                ) : (
                    <div className="space-y-2">
                        {historicalData.map((month) => (
                            <div
                                key={month.monthName}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                            >
                                <span className="text-[var(--text-secondary)] text-xs">{month.monthName}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-[var(--text-primary)] text-xs font-medium">
                                        {formatCurrency(month.totalSIP)}
                                    </span>
                                    {month.growth !== 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${month.growth > 0
                                            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                            : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                                            }`}>
                                            {month.growth > 0 ? '+' : ''}{month.growth.toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
