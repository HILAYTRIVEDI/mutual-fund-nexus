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
import { useState } from 'react';

const chartData = [
    { name: 'Jan', value: 85000 },
    { name: 'Feb', value: 92000 },
    { name: 'Mar', value: 88000 },
    { name: 'Apr', value: 105000 },
    { name: 'May', value: 98000 },
    { name: 'Jun', value: 110000 },
    { name: 'Jul', value: 103000 },
    { name: 'Aug', value: 115000 },
    { name: 'Sep', value: 108000 },
    { name: 'Oct', value: 118000 },
    { name: 'Nov', value: 120000 },
    { name: 'Dec', value: 123000 },
];

const timeFilters = ['24H', '7D', '30D', '1Y'];

export default function AssetChartCard() {
    const [activeFilter, setActiveFilter] = useState('1Y');

    return (
        <div className="bg-[#151A21] rounded-2xl border border-white/5 p-6 col-span-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[#9CA3AF] text-sm mb-1">Total Asset Value</p>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-3xl font-bold text-white">$123,000</h2>
                        <span className="text-[#9CA3AF] text-lg">USD</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[#10B981] text-sm font-medium">+12.5%</span>
                    <span className="text-[#9CA3AF] text-sm">vs last month</span>
                </div>
            </div>

            {/* Time Filters */}
            <div className="flex gap-2 mb-6">
                {timeFilters.map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeFilter === filter
                                ? 'bg-[#10B981]/10 text-[#10B981]'
                                : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#151A21',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
