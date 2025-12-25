'use client';

import Link from 'next/link';
import { PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';

const portfolioFunds = [
    {
        symbol: 'HDFC',
        name: 'HDFC Top 100 Fund',
        units: '15,234.56',
        nav: '₹892.45',
        value: '₹1.36 Cr',
        change: 2.4,
        color: 'var(--accent-mint)',
    },
    {
        symbol: 'SBI',
        name: 'SBI Bluechip Fund',
        units: '8,456.78',
        nav: '₹78.32',
        value: '₹66.25 L',
        change: 1.8,
        color: 'var(--accent-blue)',
    },
    {
        symbol: 'ICICI',
        name: 'ICICI Pru Liquid Fund',
        units: '25,000.00',
        nav: '₹345.67',
        value: '₹86.42 L',
        change: 0.02,
        color: 'var(--accent-purple)',
    },
];

export default function PortfolioCard() {
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
                {portfolioFunds.map((fund) => (
                    <div
                        key={fund.symbol}
                        className="p-4 rounded-xl bg-[var(--bg-hover)] hover:bg-gradient-to-r hover:from-[var(--bg-hover)] hover:to-transparent transition-all duration-300 cursor-pointer border border-[var(--border-primary)] hover:border-[var(--border-hover)] group"
                    >
                        {/* Fund Info - Row 1 */}
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
                                style={{
                                    background: `linear-gradient(135deg, color-mix(in srgb, ${fund.color} 30%, transparent), color-mix(in srgb, ${fund.color} 10%, transparent))`,
                                }}
                            >
                                <PiggyBank size={20} style={{ color: fund.color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[var(--text-primary)] font-medium text-sm">{fund.symbol}</p>
                                <p className="text-[var(--text-secondary)] text-xs truncate">{fund.name}</p>
                            </div>
                            <div
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 ${fund.change > 0
                                    ? 'text-[var(--accent-mint)] bg-[var(--accent-mint)]/10'
                                    : 'text-[var(--accent-red)] bg-[var(--accent-red)]/10'
                                    }`}
                            >
                                {fund.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {fund.change > 0 ? '+' : ''}{fund.change}%
                            </div>
                        </div>

                        {/* Values - Row 2 */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-primary)]">
                            <div>
                                <p className="text-[var(--text-secondary)] text-xs">Value</p>
                                <p className="text-[var(--text-primary)] font-semibold text-sm">{fund.value}</p>
                            </div>
                            <div>
                                <p className="text-[var(--text-secondary)] text-xs">Units</p>
                                <p className="text-[var(--text-primary)] text-sm">{fund.units}</p>
                            </div>
                            <div>
                                <p className="text-[var(--text-secondary)] text-xs">NAV</p>
                                <p className="text-[var(--accent-mint)] text-sm">{fund.nav}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
