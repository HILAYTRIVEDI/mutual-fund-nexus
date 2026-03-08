'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useState, useMemo } from 'react';
import { useHoldings } from '@/context/HoldingsContext';
import { Loader2, TrendingUp } from 'lucide-react';

const timeFilters = ['1M', '3M', '6M', '1Y'] as const;
type TimeFilter = typeof timeFilters[number];

// Generate placeholder chart data based on current value
function generatePlaceholderChartData(currentValue: number, filter: TimeFilter) {
    const variance = 0.15; // 15% variance for visual effect
    const baseValue = currentValue * (1 - variance);

    const dataPoints: Record<TimeFilter, { name: string; value: number }[]> = {
        '1M': [
            { name: 'Week 1', value: baseValue * 0.96 },
            { name: 'Week 2', value: baseValue * 0.98 },
            { name: 'Week 3', value: baseValue * 0.97 },
            { name: 'Week 4', value: currentValue },
        ],
        '3M': [
            { name: 'Oct', value: baseValue * 0.92 },
            { name: 'Nov', value: baseValue * 0.96 },
            { name: 'Dec', value: currentValue },
        ],
        '6M': [
            { name: 'Jul', value: baseValue * 0.85 },
            { name: 'Aug', value: baseValue * 0.88 },
            { name: 'Sep', value: baseValue * 0.91 },
            { name: 'Oct', value: baseValue * 0.94 },
            { name: 'Nov', value: baseValue * 0.97 },
            { name: 'Dec', value: currentValue },
        ],
        '1Y': [
            { name: 'Jan', value: baseValue * 0.75 },
            { name: 'Feb', value: baseValue * 0.78 },
            { name: 'Mar', value: baseValue * 0.76 },
            { name: 'Apr', value: baseValue * 0.82 },
            { name: 'May', value: baseValue * 0.80 },
            { name: 'Jun', value: baseValue * 0.86 },
            { name: 'Jul', value: baseValue * 0.84 },
            { name: 'Aug', value: baseValue * 0.90 },
            { name: 'Sep', value: baseValue * 0.88 },
            { name: 'Oct', value: baseValue * 0.94 },
            { name: 'Nov', value: baseValue * 0.97 },
            { name: 'Dec', value: currentValue },
        ],
    };

    return dataPoints[filter];
}

// Format value for display
function formatAUM(value: number): string {
    if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)} Cr`;
    }
    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)} L`;
    }
    if (value >= 1000) {
        return `₹${(value / 1000).toFixed(2)} K`;
    }
    return `₹${value.toFixed(2)}`;
}

// ... existing imports

interface AssetChartCardProps {
    customChartData?: Record<TimeFilter, { name: string; value: number }[]>;
    customAumValues?: {
        currentValue: number;
        investedValue: number;
        gainLoss: number;
    };
}

export default function AssetChartCard({ customChartData, customAumValues }: AssetChartCardProps = {}) {
    const [activeFilter, setActiveFilter] = useState<TimeFilter>('1Y');
    const { totalCurrentValue: ctxTotalCurrentValue, totalGainLoss: ctxTotalGainLoss, totalInvested: ctxTotalInvested, isLoading: ctxLoading, error: ctxError } = useHoldings();

    const totalCurrentValue = customAumValues?.currentValue ?? ctxTotalCurrentValue;
    const totalGainLoss = customAumValues?.gainLoss ?? ctxTotalGainLoss;
    const totalInvested = customAumValues?.investedValue ?? ctxTotalInvested;
    const isLoading = customAumValues ? false : ctxLoading;
    const error = customAumValues ? null : ctxError;

    const chartData = useMemo(() => {
        if (customChartData) {
            return customChartData[activeFilter] || [];
        }
        if (totalCurrentValue === 0) return [];
        return generatePlaceholderChartData(totalCurrentValue, activeFilter);
    }, [totalCurrentValue, activeFilter, customChartData]);

    // Calculate gain/loss percentage
    const gainLossPercentage = totalInvested > 0
        ? ((totalGainLoss / totalInvested) * 100).toFixed(1)
        : '0.0';

    // Calculate period change from chart data (Removed unused code)

    if (isLoading) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 col-span-1 lg:col-span-2 gradient-border mint-glow relative overflow-hidden transition-colors duration-300 flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-[var(--accent-mint)] mb-2" size={32} />
                    <p className="text-[var(--text-secondary)] text-sm">Loading portfolio...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card rounded-2xl p-4 md:p-6 col-span-1 lg:col-span-2 gradient-border relative overflow-hidden transition-colors duration-300">
                <p className="text-[var(--accent-red)] text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-4 md:p-6 col-span-1 lg:col-span-2 gradient-border mint-glow relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/10 via-transparent to-[var(--accent-slate)]/5 pointer-events-none" />

            {/* Header */}
            <div className="flex items-start md:items-center justify-between mb-4 md:mb-6 relative z-10">
                <div>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-1">Portfolio Value (AUM)</p>
                    <div className="flex items-baseline gap-2 md:gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                            {formatAUM(totalCurrentValue)}
                        </h2>
                        <span className="text-[var(--text-secondary)] text-sm md:text-lg">INR</span>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full ${parseFloat(gainLossPercentage) >= 0
                        ? 'bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/20'
                        : 'bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20'
                    }`}>
                    <TrendingUp size={14} className={parseFloat(gainLossPercentage) >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'} />
                    <span className={`text-xs md:text-sm font-medium ${parseFloat(gainLossPercentage) >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'
                        }`}>
                        {parseFloat(gainLossPercentage) >= 0 ? '+' : ''}{gainLossPercentage}%
                    </span>
                </div>
            </div>

            {/* Time Filters */}
            <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6 relative z-10">
                {timeFilters.map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${activeFilter === filter
                            ? 'bg-gradient-to-r from-[var(--accent-gold)]/20 to-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 shadow-lg shadow-[var(--accent-gold)]/10'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-[160px] md:h-[200px] relative z-10">
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <TrendingUp size={40} className="mx-auto text-[var(--text-secondary)] opacity-50 mb-2" />
                            <p className="text-[var(--text-secondary)] text-sm">No holdings data yet</p>
                            <p className="text-[var(--text-muted)] text-xs mt-1">Add clients and investments to see your portfolio chart</p>
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#C4A265" stopOpacity={0.4} />
                                    <stop offset="50%" stopColor="#C4A265" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#C4A265" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#C4A265" />
                                    <stop offset="100%" stopColor="#D4B87A" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                tickFormatter={(value) => {
                                    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                                    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                                    return `₹${value}`;
                                }}
                                width={55}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    boxShadow: '0 4px 20px rgba(196, 162, 101, 0.2)',
                                }}
                                formatter={(value: number | undefined) => {
                                    const val = value ?? 0;
                                    return [formatAUM(val), 'Value'];
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="url(#strokeGradient)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Disclaimer for placeholder chart */}
            {chartData.length > 0 && (
                <p className="text-[var(--text-muted)] text-[10px] mt-2 text-center relative z-10">
                    * Historical chart data is illustrative. Current value is accurate.
                </p>
            )}
        </div>
    );
}
