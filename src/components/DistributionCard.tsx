'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useHoldings } from '@/context/HoldingsContext';
import { Loader2, PieChart as PieChartIcon } from 'lucide-react';

// Distinct color palette for individual funds
const FUND_COLORS = [
    '#C4A265', // gold
    '#5B7FA4', // slate blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#8B5CF6', // violet
    '#EF4444', // red
    '#06B6D4', // cyan
    '#F97316', // orange
    '#84CC16', // lime
    '#EC4899', // pink
    '#14B8A6', // teal
    '#A78BFA', // purple
];

function shortFundName(name: string): string {
    return name
        .replace(/ - (Regular|Direct) (Growth|IDCW|Dividend)( Plan)?$/i, '')
        .replace(/ (Growth Plan|Regular Plan|Direct Plan)$/i, '')
        .replace(/\s*-\s*$/, '') // strip trailing " -"
        .trim();
}

interface TooltipPayloadItem {
    name: string;
    value: number;
    payload: DistributionData;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.amount ?? 0);
    return (
        <div
            role="tooltip"
            aria-live="polite"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '10px',
                padding: '10px 14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                maxWidth: '220px',
                pointerEvents: 'none',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                    aria-hidden="true"
                    style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: item.color,
                        flexShrink: 0,
                    }}
                />
                <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600, lineHeight: 1.3 }}>
                    {item.name}
                </span>
            </div>
            <div style={{ paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '11px', lineHeight: 1.6 }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>{item.value}%</strong> of portfolio</div>
                {item.amount ? <div>{formatted}</div> : null}
            </div>
        </div>
    );
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

        // Show top N funds individually; group the rest as "Others"
        const MAX_SLICES = 8;

        const sorted = [...holdings]
            .filter(h => h.current_value > 0)
            .sort((a, b) => b.current_value - a.current_value);

        const top = sorted.slice(0, MAX_SLICES);
        const rest = sorted.slice(MAX_SLICES);

        const result: DistributionData[] = top.map((h, i) => {
            const name = shortFundName(h.mutual_fund?.name || h.scheme_code || `Fund ${i + 1}`);
            const pct = Math.round((h.current_value / totalCurrentValue) * 1000) / 10; // 1 decimal
            return {
                name,
                value: pct,
                color: FUND_COLORS[i % FUND_COLORS.length],
                amount: h.current_value,
            };
        });

        if (rest.length > 0) {
            const othersValue = rest.reduce((s, h) => s + h.current_value, 0);
            const pct = Math.round((othersValue / totalCurrentValue) * 1000) / 10;
            result.push({
                name: `Others (${rest.length})`,
                value: pct,
                color: '#475569',
                amount: othersValue,
            });
        }

        return result;
    }, [holdings, totalCurrentValue]);

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
                            data={chartData as any}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none w-[100px] text-center">
                    <p className="text-[var(--text-secondary)] text-[9px] leading-tight line-clamp-2 w-full" title={focusItem.name}>{focusItem.name}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{focusItem.value}%</p>
                </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-4 relative z-10 max-h-[180px] overflow-y-auto pr-1">
                {chartData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="text-[var(--text-secondary)] text-xs truncate" title={entry.name}>{entry.name}</span>
                        </div>
                        <span className="text-[var(--text-primary)] text-xs font-medium shrink-0">{entry.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
