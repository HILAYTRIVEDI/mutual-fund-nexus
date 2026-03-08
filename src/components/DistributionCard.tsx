'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useHoldings } from '@/context/HoldingsContext';
import { Loader2, PieChart as PieChartIcon } from 'lucide-react';

// Color palette for categories
const categoryColors: Record<string, string> = {
    'Equity': '#C4A265',
    'Debt': '#5B7FA4',
    'Hybrid': '#D4B87A',
    'ELSS': '#10B981',
    'Index': '#7A9DBF',
    'Sectoral': '#8B7355',
    'Liquid': '#A0C4E8',
    'Other': '#64748B',
};

// Normalize category names
function normalizeCategory(category: string | null | undefined): string {
    if (!category) return 'Other';

    const lower = category.toLowerCase();

    if (lower.includes('equity') || lower.includes('small cap') || lower.includes('mid cap') || lower.includes('large cap') || lower.includes('flexi cap') || lower.includes('multi cap')) {
        return 'Equity';
    }
    if (lower.includes('debt') || lower.includes('gilt') || lower.includes('bond') || lower.includes('income') || lower.includes('credit')) {
        return 'Debt';
    }
    if (lower.includes('hybrid') || lower.includes('balanced') || lower.includes('aggressive') || lower.includes('conservative')) {
        return 'Hybrid';
    }
    if (lower.includes('elss') || lower.includes('tax')) {
        return 'ELSS';
    }
    if (lower.includes('index') || lower.includes('etf') || lower.includes('nifty') || lower.includes('sensex')) {
        return 'Index';
    }
    if (lower.includes('sector') || lower.includes('thematic') || lower.includes('infrastructure') || lower.includes('pharma') || lower.includes('banking') || lower.includes('technology')) {
        return 'Sectoral';
    }
    if (lower.includes('liquid') || lower.includes('money market') || lower.includes('overnight')) {
        return 'Liquid';
    }

    return 'Other';
}

// ... types
export interface DistributionData {
    name: string;
    value: number;
    color: string;
    amount?: number;
}

interface DistributionCardProps {
    customData?: DistributionData[];
}

export default function DistributionCard({ customData }: DistributionCardProps = {}) {
    const { holdings, totalCurrentValue, isLoading: ctxLoading, error: ctxError } = useHoldings();

    const isLoading = customData ? false : ctxLoading;
    const error = customData ? null : ctxError;

    const chartData: DistributionData[] = useMemo(() => {
        if (customData) return customData;
        if (holdings.length === 0 || totalCurrentValue === 0) return [];

        // Aggregate holdings by normalized category
        const categoryTotals: Record<string, number> = {};

        holdings.forEach((holding) => {
            const category = normalizeCategory(holding.mutual_fund?.category || holding.mutual_fund?.type);
            categoryTotals[category] = (categoryTotals[category] || 0) + holding.current_value;
        });

        // Convert to chart data format with percentages
        const result: DistributionData[] = Object.entries(categoryTotals)
            .map(([name, amount]) => ({
                name: `${name} Funds`,
                value: Math.round((amount / totalCurrentValue) * 100),
                color: categoryColors[name] || categoryColors['Other'],
                amount,
            }))
            .sort((a, b) => b.value - a.value); // Sort by percentage descending

        return result;
    }, [holdings, totalCurrentValue, customData]);

    // Use the largest category for center display
    const focusItem = chartData[0];

    if (isLoading) {
        return (
            <div className="glass-card rounded-2xl p-6 h-full gradient-border relative overflow-hidden transition-colors duration-300 flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-[var(--accent-purple)] mb-2" size={24} />
                    <p className="text-[var(--text-secondary)] text-sm">Loading allocation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card rounded-2xl p-6 h-full gradient-border relative overflow-hidden transition-colors duration-300">
                <p className="text-[var(--accent-red)] text-sm">{error}</p>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6 h-full gradient-border relative overflow-hidden transition-colors duration-300">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/10 via-transparent to-[var(--accent-slate)]/5 pointer-events-none" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-[var(--text-primary)] font-semibold">Asset Allocation</h3>
                </div>

                <div className="flex flex-col items-center justify-center py-12 relative z-10">
                    <PieChartIcon size={40} className="text-[var(--text-secondary)] opacity-50 mb-3" />
                    <p className="text-[var(--text-secondary)] text-sm">No holdings data</p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Add investments to see allocation</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/10 via-transparent to-[var(--accent-slate)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-[var(--text-primary)] font-semibold">Asset Allocation</h3>
            </div>

            <div className="h-[200px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData as unknown as Record<string, unknown>[]}
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
                            {chartData.map((entry, index) => (
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none w-[90px] text-center">
                    <p className="text-[var(--text-secondary)] text-[10px] truncate w-full" title={focusItem.name}>{focusItem.name.replace(' Funds', '')}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{focusItem.value}%</p>
                </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 mt-4 relative z-10">
                {chartData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-4 cursor-pointer hover:opacity-80 transition-opacity duration-200">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="text-[var(--text-secondary)] text-sm truncate" title={entry.name}>{entry.name}</span>
                        </div>
                        <span className="text-[var(--text-primary)] font-medium shrink-0">{entry.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
