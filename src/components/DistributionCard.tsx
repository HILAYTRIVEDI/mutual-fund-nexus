'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const distributionData = [
    { name: 'Staking', value: 81, color: '#10B981' },
    { name: 'Spot', value: 19, color: '#8B5CF6' },
];

const legendData = [
    { name: 'USDT', percentage: 50, color: '#10B981' },
    { name: 'ETH', percentage: 31, color: '#10B981' },
    { name: 'USDT', percentage: 16, color: '#8B5CF6' },
    { name: 'BTC', percentage: 3, color: '#8B5CF6' },
];

export default function DistributionCard() {
    return (
        <div className="bg-[#151A21] rounded-2xl border border-white/5 p-6">
            <h3 className="text-white font-semibold mb-4">Distribution</h3>

            {/* Donut Chart */}
            <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={distributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {distributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">81%</span>
                    <span className="text-[#9CA3AF] text-xs">of total assets</span>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                        <span className="text-[#9CA3AF]">Staking</span>
                    </div>
                    <span className="text-white font-medium">81%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                        <span className="text-[#9CA3AF]">Spot</span>
                    </div>
                    <span className="text-white font-medium">19%</span>
                </div>
            </div>

            {/* Asset Breakdown */}
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                {legendData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-[#9CA3AF]">{item.name}</span>
                        </div>
                        <span className="text-white">{item.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
