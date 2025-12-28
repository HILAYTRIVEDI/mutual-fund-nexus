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

// Different data for each time period
const chartDataSets = {
    '1M': [
        { name: 'Week 1', value: 11800000 },
        { name: 'Week 2', value: 12100000 },
        { name: 'Week 3', value: 11950000 },
        { name: 'Week 4', value: 12300000 },
    ],
    '3M': [
        { name: 'Oct', value: 10500000 },
        { name: 'Nov', value: 11200000 },
        { name: 'Dec', value: 12300000 },
    ],
    '6M': [
        { name: 'Jul', value: 9200000 },
        { name: 'Aug', value: 9800000 },
        { name: 'Sep', value: 10100000 },
        { name: 'Oct', value: 10500000 },
        { name: 'Nov', value: 11200000 },
        { name: 'Dec', value: 12300000 },
    ],
    '1Y': [
        { name: 'Jan', value: 8500000 },
        { name: 'Feb', value: 9200000 },
        { name: 'Mar', value: 8800000 },
        { name: 'Apr', value: 10500000 },
        { name: 'May', value: 9800000 },
        { name: 'Jun', value: 11000000 },
        { name: 'Jul', value: 10300000 },
        { name: 'Aug', value: 11500000 },
        { name: 'Sep', value: 10800000 },
        { name: 'Oct', value: 11800000 },
        { name: 'Nov', value: 12000000 },
        { name: 'Dec', value: 12300000 },
    ],
};

// AUM values for each period
const aumValues = {
    '1M': { current: 12.3, change: 4.2 },
    '3M': { current: 12.3, change: 17.1 },
    '6M': { current: 12.3, change: 33.7 },
    '1Y': { current: 12.3, change: 44.7 },
};

const timeFilters = ['1M', '3M', '6M', '1Y'] as const;
type TimeFilter = typeof timeFilters[number];

// Data interfaces
interface ChartDataPoint {
    name: string;
    value: number;
}

interface AumInfo {
    current: number;
    change: number;
}

interface AssetChartCardProps {
    customChartData?: Record<string, ChartDataPoint[]>;
    customAumValues?: Record<string, AumInfo>;
}

export default function AssetChartCard({ customChartData, customAumValues }: AssetChartCardProps) {
    const [activeFilter, setActiveFilter] = useState<TimeFilter>('1Y');

    const chartData = useMemo(() => {
        if (customChartData) return customChartData[activeFilter];
        return chartDataSets[activeFilter];
    }, [activeFilter, customChartData]);

    const aumInfo = useMemo(() => {
        if (customAumValues) return customAumValues[activeFilter];
        return aumValues[activeFilter];
    }, [activeFilter, customAumValues]);

    // Calculate starting value for the period
    const startValue = chartData[0]?.value || 0;
    const endValue = chartData[chartData.length - 1]?.value || 0;
    const periodChange = ((endValue - startValue) / startValue * 100).toFixed(1);

    return (
        <div className="glass-card rounded-2xl p-4 md:p-6 col-span-1 lg:col-span-2 gradient-border mint-glow relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/10 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            {/* Header */}
            <div className="flex items-start md:items-center justify-between mb-4 md:mb-6 relative z-10">
                <div>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-1">Portfolio Value (AUM)</p>
                    <div className="flex items-baseline gap-2 md:gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">₹{aumInfo.current} Cr</h2>
                        <span className="text-[var(--text-secondary)] text-sm md:text-lg">INR</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/20">
                    <span className="text-[var(--accent-mint)] text-xs md:text-sm font-medium">+{periodChange}%</span>
                    <span className="text-[var(--text-secondary)] text-[10px] md:text-xs">{activeFilter}</span>
                </div>
            </div>

            {/* Time Filters */}
            <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6 relative z-10">
                {timeFilters.map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${activeFilter === filter
                            ? 'bg-gradient-to-r from-[var(--accent-mint)]/20 to-[var(--accent-mint)]/10 text-[var(--accent-mint)] border border-[var(--accent-mint)]/30 shadow-lg shadow-[var(--accent-mint)]/10'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-[160px] md:h-[200px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#48cae4" stopOpacity={0.4} />
                                <stop offset="50%" stopColor="#48cae4" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#48cae4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#48cae4" />
                                <stop offset="100%" stopColor="#90e0ef" />
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
                            tickFormatter={(value) => `₹${(value / 10000000).toFixed(1)}Cr`}
                            width={55}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-secondary)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '12px',
                                color: 'var(--text-primary)',
                                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)',
                            }}
                            formatter={(value: number | undefined) => {
                                const val = value ?? 0;
                                return [`₹${(val / 10000000).toFixed(2)} Cr`, 'AUM'];
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
            </div>
        </div>
    );
}
