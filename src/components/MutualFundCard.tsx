'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Building2, Tag, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getSchemeHistory, formatNAV, calculateChange, type SchemeLatestResponse, type NAVData } from '@/lib/mfapi';

interface MutualFundCardProps {
    scheme: SchemeLatestResponse;
    onClose: () => void;
}

export default function MutualFundCard({ scheme, onClose }: MutualFundCardProps) {
    const [historyData, setHistoryData] = useState<NAVData[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [change1M, setChange1M] = useState<number | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setHistoryLoading(true);
            try {
                // Get last 1 year of data
                const endDate = new Date();
                const startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);

                const formatDate = (d: Date) =>
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const response = await getSchemeHistory(
                    scheme.meta.scheme_code,
                    formatDate(startDate),
                    formatDate(endDate)
                );

                // Reverse to show oldest first for chart
                const reversed = [...response.data].reverse();
                setHistoryData(reversed);

                // Calculate 1 month change
                if (response.data.length > 20) {
                    const change = calculateChange(response.data[0].nav, response.data[20].nav);
                    setChange1M(change);
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [scheme.meta.scheme_code]);

    const latestNAV = scheme.data[0];
    const chartData = historyData.map(d => ({
        date: d.date,
        nav: parseFloat(d.nav)
    }));

    return (
        <div className="glass-card rounded-2xl overflow-hidden relative">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/10 via-transparent to-[#8B5CF6]/5 pointer-events-none" />

            {/* Header */}
            <div className="p-6 border-b border-white/10 relative z-10">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 flex items-center justify-center">
                                <Building2 size={20} className="text-[#10B981]" />
                            </div>
                            <span className="text-[#9CA3AF] text-sm font-mono">#{scheme.meta.scheme_code}</span>
                        </div>
                        <h2 className="text-white text-lg font-semibold mb-1 pr-8">
                            {scheme.meta.scheme_name}
                        </h2>
                        <p className="text-[#10B981] text-sm font-medium">{scheme.meta.fund_house}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X size={20} className="text-[#9CA3AF]" />
                    </button>
                </div>
            </div>

            {/* NAV Info */}
            <div className="p-6 border-b border-white/10 relative z-10">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-[#9CA3AF] text-xs mb-1">Latest NAV</p>
                        <p className="text-white text-2xl font-bold">{formatNAV(latestNAV.nav)}</p>
                        <p className="text-[#9CA3AF] text-xs mt-1">{latestNAV.date}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-[#9CA3AF] text-xs mb-1">1M Change</p>
                        {change1M !== null ? (
                            <div className={`flex items-center gap-1 ${change1M >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                {change1M >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                <span className="text-2xl font-bold">{change1M >= 0 ? '+' : ''}{change1M.toFixed(2)}%</span>
                            </div>
                        ) : (
                            <span className="text-[#9CA3AF]">--</span>
                        )}
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-[#9CA3AF] text-xs mb-1">Category</p>
                        <p className="text-white text-sm font-medium">{scheme.meta.scheme_category || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-6 relative z-10">
                <h3 className="text-white font-semibold mb-4">NAV History (1 Year)</h3>
                {historyLoading ? (
                    <div className="h-[200px] flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#10B981] mr-2" size={24} />
                        <span className="text-[#9CA3AF]">Loading chart...</span>
                    </div>
                ) : chartData.length > 0 ? (
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                    tickFormatter={(value) => {
                                        const parts = value.split('-');
                                        return `${parts[1]}/${parts[2]?.slice(2) || ''}`;
                                    }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                                    domain={['dataMin - 10', 'dataMax + 10']}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(21, 26, 33, 0.95)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        borderRadius: '12px',
                                        color: '#fff',
                                    }}
                                    formatter={(value: number | undefined) => {
                                        const val = value ?? 0;
                                        return [`₹${val.toFixed(4)}`, 'NAV'];
                                    }}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="nav"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    fill="url(#navGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[200px] flex items-center justify-center">
                        <span className="text-[#9CA3AF]">No history data available</span>
                    </div>
                )}
            </div>

            {/* Metadata */}
            <div className="p-6 pt-0 relative z-10">
                <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-full text-[#8B5CF6] text-xs">
                        <Tag size={12} />
                        {scheme.meta.scheme_type}
                    </span>
                    {scheme.meta.isin_growth && (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[#9CA3AF] text-xs">
                            ISIN: {scheme.meta.isin_growth}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
