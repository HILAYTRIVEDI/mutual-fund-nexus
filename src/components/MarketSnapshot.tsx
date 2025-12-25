'use client';

import { PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';

const topFunds = [
    {
        id: 1,
        name: 'HDFC Mid-Cap Opportunities',
        category: 'Mid Cap',
        change: 2.45,
        isPositive: true,
        aum: '₹45,234 Cr',
        returns1Y: '+28.5%',
        nav: '₹156.78',
        color: '#10B981',
    },
    {
        id: 2,
        name: 'SBI Small Cap Fund',
        category: 'Small Cap',
        change: 1.82,
        isPositive: true,
        aum: '₹22,456 Cr',
        returns1Y: '+35.2%',
        nav: '₹142.34',
        color: '#3B82F6',
    },
    {
        id: 3,
        name: 'Axis Bluechip Fund',
        category: 'Large Cap',
        change: -0.45,
        isPositive: false,
        aum: '₹38,765 Cr',
        returns1Y: '+18.6%',
        nav: '₹52.18',
        color: '#8B5CF6',
    },
    {
        id: 4,
        name: 'ICICI Pru Technology',
        category: 'Sectoral',
        change: 3.21,
        isPositive: true,
        aum: '₹12,543 Cr',
        returns1Y: '+42.8%',
        nav: '₹178.90',
        color: '#F59E0B',
    },
];

export default function MarketSnapshot() {
    return (
        <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/5 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-[var(--text-primary)] font-semibold">Top Performing Funds</h3>
                <button className="text-[var(--accent-mint)] text-sm font-medium hover:underline transition-colors">
                    View All
                </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[var(--text-secondary)] text-xs font-medium relative z-10">
                <div className="col-span-4">Fund Name</div>
                <div className="col-span-2 text-right">Today</div>
                <div className="col-span-2 text-right">AUM</div>
                <div className="col-span-2 text-right">1Y Returns</div>
                <div className="col-span-2 text-right">NAV</div>
            </div>

            {/* Table Body */}
            <div className="space-y-2 relative z-10">
                {topFunds.map((fund) => (
                    <div
                        key={fund.id}
                        className="grid grid-cols-12 gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-[var(--bg-hover)] hover:to-transparent transition-all duration-300 cursor-pointer group border border-transparent hover:border-[var(--border-primary)]"
                    >
                        <div className="col-span-4 flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{
                                    background: `linear-gradient(135deg, ${fund.color}30, ${fund.color}10)`,
                                }}
                            >
                                <PiggyBank size={14} style={{ color: fund.color }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[var(--text-primary)] text-sm font-medium truncate max-w-[150px]">{fund.name}</p>
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
                                {fund.isPositive ? '+' : ''}{fund.change}%
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                            <span className="text-[var(--text-primary)] text-sm">{fund.aum}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                            <span className="text-[var(--accent-mint)] text-sm font-medium">{fund.returns1Y}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                            <span className="text-[var(--text-primary)] text-sm font-medium">{fund.nav}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
