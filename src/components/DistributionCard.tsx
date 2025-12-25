'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Equity Funds', value: 65, color: '#48cae4' },
    { name: 'Debt Funds', value: 25, color: '#8B5CF6' },
    { name: 'Hybrid Funds', value: 10, color: '#F59E0B' },
];

export default function DistributionCard() {
    return (
        <div className="glass-card rounded-2xl p-6 h-full gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-purple)]/10 via-transparent to-[var(--accent-mint)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-[var(--text-primary)] font-semibold">Asset Allocation</h3>
                <span className="text-[var(--accent-purple)] text-xs px-2 py-0.5 bg-[var(--accent-purple)]/10 rounded-full border border-[var(--accent-purple)]/20">
                    Sample Data
                </span>
            </div>

            <div className="h-[200px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    style={{
                                        filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.3))',
                                    }}
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[var(--text-secondary)] text-xs">Equity Exposure</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">65%</p>
                </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#48cae4]" />
                        <span className="text-[var(--text-secondary)] text-sm">Equity Funds</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">65%</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                        <span className="text-[var(--text-secondary)] text-sm">Debt Funds</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">25%</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                        <span className="text-[var(--text-secondary)] text-sm">Hybrid Funds</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">10%</span>
                </div>
            </div>
        </div>
    );
}
