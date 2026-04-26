'use client';

import { PiggyBank, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useHoldings, HoldingWithValue } from '@/context/HoldingsContext';
import { useMemo } from 'react';

const COLORS = ['#C4A265', '#3B82F6', '#5B7FA4', '#F59E0B', '#EC4899', '#10B981'];

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function MarketSnapshot() {
    const { holdings, isLoading } = useHoldings();

    // Derive top performing funds from actual holdings, sorted by gain %
    const topFunds = useMemo(() => {
        if (!holdings || holdings.length === 0) return [];

        return [...holdings]
            .filter((h) => h.invested_amount > 0)
            .sort((a, b) => b.gain_loss_percentage - a.gain_loss_percentage)
            .slice(0, 5)
            .map((h: HoldingWithValue, i) => ({
                id: h.id,
                name: (h as any).mutual_fund?.name ?? `Fund ${h.scheme_code}`,
                category: (h as any).mutual_fund?.category ?? '—',
                change: h.gain_loss_percentage,
                isPositive: h.gain_loss >= 0,
                currentValue: formatCurrency(h.current_value),
                returns: `${h.gain_loss_percentage >= 0 ? '+' : ''}${h.gain_loss_percentage.toFixed(1)}%`,
                nav: `₹${h.current_nav.toFixed(2)}`,
                color: COLORS[i % COLORS.length],
            }));
    }, [holdings]);

    return (
        <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/5 via-transparent to-[var(--accent-slate)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-[var(--text-primary)] font-semibold">Top Performing Holdings</h3>
                <button className="text-[var(--accent-mint)] text-sm font-medium hover:underline transition-colors">
                    View All
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12 relative z-10">
                    <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
                </div>
            ) : topFunds.length === 0 ? (
                <div className="text-center py-8 relative z-10">
                    <p className="text-[var(--text-muted)] text-sm">No holdings yet. Add funds to see performance.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table Header - hidden on mobile */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[var(--text-secondary)] text-xs font-medium relative z-10">
                        <div className="col-span-4">Fund Name</div>
                        <div className="col-span-2 text-right">Returns</div>
                        <div className="col-span-2 text-right">Value</div>
                        <div className="col-span-2 text-right">Gain/Loss</div>
                        <div className="col-span-2 text-right">NAV</div>
                    </div>

                    {/* Table Body */}
                    <div className="space-y-2 relative z-10">
                        {topFunds.map((fund) => (
                            <div
                                key={fund.id}
                                className="p-3 md:p-4 rounded-xl hover:bg-gradient-to-r hover:from-[var(--bg-hover)] hover:to-transparent transition-all duration-300 cursor-pointer group border border-transparent hover:border-[var(--border-primary)]"
                            >
                                {/* Desktop layout */}
                                <div className="hidden md:grid grid-cols-12 gap-4">
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                            style={{
                                                background: `linear-gradient(135deg, ${fund.color}30, ${fund.color}10)`,
                                            }}
                                        >
                                            <PiggyBank size={14} style={{ color: fund.color }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[var(--text-primary)] text-sm font-medium truncate">{fund.name}</p>
                                            <p className="text-[var(--text-secondary)] text-xs">{fund.category}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end">
                                        <div
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${fund.isPositive
                                                    ? 'text-[var(--accent-mint)] bg-[var(--accent-mint)]/10'
                                                    : 'text-[var(--accent-red)] bg-[var(--accent-red)]/10'
                                                }`}
                                        >
                                            {fund.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            {fund.returns}
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end">
                                        <span className="text-[var(--text-primary)] text-sm">{fund.currentValue}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end">
                                        <span className={`text-sm font-medium ${fund.isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                            {fund.returns}
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end">
                                        <span className="text-[var(--text-primary)] text-sm font-medium">{fund.nav}</span>
                                    </div>
                                </div>

                                {/* Mobile layout - card style */}
                                <div className="md:hidden flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                            style={{
                                                background: `linear-gradient(135deg, ${fund.color}30, ${fund.color}10)`,
                                            }}
                                        >
                                            <PiggyBank size={14} style={{ color: fund.color }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[var(--text-primary)] text-sm font-medium">{fund.name}</p>
                                            <p className="text-[var(--text-secondary)] text-xs">{fund.category}</p>
                                        </div>
                                        <div
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium shrink-0 ${fund.isPositive
                                                    ? 'text-[var(--accent-mint)] bg-[var(--accent-mint)]/10'
                                                    : 'text-[var(--accent-red)] bg-[var(--accent-red)]/10'
                                                }`}
                                        >
                                            {fund.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            {fund.returns}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pl-11 text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-[var(--text-secondary)]">Value</span>
                                            <span className="text-[var(--text-primary)] font-medium">{fund.currentValue}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[var(--text-secondary)]">Gain/Loss</span>
                                            <span className={`font-medium ${fund.isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {fund.returns}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[var(--text-secondary)]">NAV</span>
                                            <span className="text-[var(--text-primary)] font-medium">{fund.nav}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
