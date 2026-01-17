'use client';

import Link from 'next/link';
import { PiggyBank, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useHoldings } from '@/context/HoldingsContext';

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

const colors = ['var(--accent-mint)', 'var(--accent-blue)', 'var(--accent-purple)', '#F59E0B', '#EC4899'];

export default function PortfolioCard() {
    const { holdings, isLoading, error } = useHoldings();

    // Get top 5 holdings by value
    const topHoldings = [...holdings]
        .sort((a, b) => b.current_value - a.current_value)
        .slice(0, 5);

    if (isLoading) {
        return (
            <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-[var(--accent-mint)] mb-2" size={24} />
                    <p className="text-[var(--text-secondary)] text-sm">Loading holdings...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
                <p className="text-[var(--accent-red)] text-sm">{error}</p>
            </div>
        );
    }

    if (topHoldings.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/5 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <h3 className="text-[var(--text-primary)] font-semibold">Top Holdings</h3>
                    <Link href="/portfolio" className="text-[var(--accent-mint)] text-sm font-medium hover:underline transition-colors">
                        View All
                    </Link>
                </div>
                <div className="flex flex-col items-center justify-center py-8 relative z-10">
                    <PiggyBank size={40} className="text-[var(--text-secondary)] mb-3 opacity-50" />
                    <p className="text-[var(--text-secondary)] text-sm">No holdings yet</p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Add clients and investments to see them here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/5 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-[var(--text-primary)] font-semibold">Top Holdings</h3>
                <Link href="/portfolio" className="text-[var(--accent-mint)] text-sm font-medium hover:underline transition-colors">
                    View All
                </Link>
            </div>

            <div className="space-y-3 relative z-10">
                {topHoldings.map((holding, index) => {
                    const color = colors[index % colors.length];
                    const change = holding.gain_loss_percentage;
                    
                    return (
                        <div
                            key={holding.id}
                            className="p-4 rounded-xl bg-[var(--bg-hover)] hover:bg-gradient-to-r hover:from-[var(--bg-hover)] hover:to-transparent transition-all duration-300 cursor-pointer border border-[var(--border-primary)] hover:border-[var(--border-hover)] group"
                        >
                            {/* Fund Info - Row 1 */}
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 30%, transparent), color-mix(in srgb, ${color} 10%, transparent))`,
                                    }}
                                >
                                    <PiggyBank size={20} style={{ color }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[var(--text-primary)] font-medium text-sm truncate">
                                        {holding.scheme_code || 'Fund'}
                                    </p>
                                    <p className="text-[var(--text-secondary)] text-xs truncate">
                                        {holding.units.toFixed(2)} units
                                    </p>
                                </div>
                                <div
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 ${change >= 0
                                        ? 'text-[var(--accent-mint)] bg-[var(--accent-mint)]/10'
                                        : 'text-[var(--accent-red)] bg-[var(--accent-red)]/10'
                                        }`}
                                >
                                    {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                </div>
                            </div>

                            {/* Values - Row 2 */}
                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-primary)]">
                                <div>
                                    <p className="text-[var(--text-secondary)] text-xs">Value</p>
                                    <p className="text-[var(--text-primary)] font-semibold text-sm">
                                        {formatCurrency(holding.current_value)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-secondary)] text-xs">Invested</p>
                                    <p className="text-[var(--text-primary)] text-sm">
                                        {formatCurrency(holding.invested_amount)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-secondary)] text-xs">NAV</p>
                                    <p className="text-[var(--accent-mint)] text-sm">₹{holding.current_nav.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
