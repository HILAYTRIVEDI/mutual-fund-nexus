'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Activity, Clock } from 'lucide-react';

interface MarketIndex {
    id: string;
    name: string;
    symbol: string;
    value: number;
    change: number;
    changePercent: number;
    previousClose: number;
    dayHigh: number;
    dayLow: number;
    open: number;
    color: string;
}

// Mock market indices data - In production, this would come from a live API
const mockIndices: MarketIndex[] = [
    {
        id: '1',
        name: 'NIFTY 50',
        symbol: 'NIFTY',
        value: 23587.50,
        change: 105.75,
        changePercent: 0.45,
        previousClose: 23481.75,
        dayHigh: 23625.40,
        dayLow: 23520.15,
        open: 23545.00,
        color: '#10B981',
    },
    {
        id: '2',
        name: 'SENSEX',
        symbol: 'SENSEX',
        value: 78041.25,
        change: 295.80,
        changePercent: 0.38,
        previousClose: 77745.45,
        dayHigh: 78156.30,
        dayLow: 77890.00,
        open: 77920.50,
        color: '#3B82F6',
    },
    {
        id: '3',
        name: 'NIFTY Bank',
        symbol: 'BANKNIFTY',
        value: 50234.70,
        change: -125.40,
        changePercent: -0.25,
        previousClose: 50360.10,
        dayHigh: 50450.00,
        dayLow: 50150.25,
        open: 50380.00,
        color: '#8B5CF6',
    },
    {
        id: '4',
        name: 'NIFTY IT',
        symbol: 'NIFTYIT',
        value: 38562.85,
        change: 456.20,
        changePercent: 1.20,
        previousClose: 38106.65,
        dayHigh: 38620.00,
        dayLow: 38250.40,
        open: 38350.00,
        color: '#F59E0B',
    },
    {
        id: '5',
        name: 'NIFTY Midcap 100',
        symbol: 'NIFTYMID',
        value: 52180.45,
        change: 245.60,
        changePercent: 0.47,
        previousClose: 51934.85,
        dayHigh: 52250.00,
        dayLow: 52000.10,
        open: 52050.00,
        color: '#EC4899',
    },
    {
        id: '6',
        name: 'India VIX',
        symbol: 'INDIAVIX',
        value: 13.25,
        change: -0.42,
        changePercent: -3.07,
        previousClose: 13.67,
        dayHigh: 13.85,
        dayLow: 13.10,
        open: 13.70,
        color: '#EF4444',
    },
];

function formatNumber(num: number, decimals = 2): string {
    return num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function MarketIndicesTracker() {
    const [indices, setIndices] = useState<MarketIndex[]>(mockIndices);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const refreshData = () => {
        setIsLoading(true);
        // Simulate API call with slight randomization
        setTimeout(() => {
            const updatedIndices = indices.map(index => ({
                ...index,
                value: index.value + (Math.random() - 0.5) * 10,
                change: index.change + (Math.random() - 0.5) * 5,
                changePercent: index.changePercent + (Math.random() - 0.5) * 0.1,
            }));
            setIndices(updatedIndices);
            setLastUpdated(new Date());
            setIsLoading(false);
        }, 1000);
    };

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const marketStatus = new Date().getHours() >= 9 && new Date().getHours() < 16 ? 'Market Open' : 'Market Closed';

    return (
        <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-blue)]/5 via-transparent to-[var(--accent-mint)]/5 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-[var(--accent-blue)]" />
                    <h3 className="text-[var(--text-primary)] font-semibold">Market Indices</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${marketStatus === 'Market Open'
                        ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                        : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                        }`}>
                        {marketStatus}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                        <Clock size={12} />
                        {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                        onClick={refreshData}
                        disabled={isLoading}
                        className={`p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all ${isLoading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Indices Grid */}
            <div className="grid grid-cols-3 gap-4 relative z-10">
                {indices.map((index) => {
                    const isPositive = index.change >= 0;
                    return (
                        <div
                            key={index.id}
                            className="p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] hover:border-[var(--accent-mint)]/30 transition-all cursor-pointer group"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: index.color }}
                                    />
                                    <span className="text-[var(--text-secondary)] text-xs font-medium">{index.symbol}</span>
                                </div>
                                {isPositive ? (
                                    <TrendingUp size={14} className="text-[var(--accent-mint)]" />
                                ) : (
                                    <TrendingDown size={14} className="text-[var(--accent-red)]" />
                                )}
                            </div>

                            {/* Value */}
                            <p className="text-[var(--text-primary)] text-lg font-bold mb-1">
                                {formatNumber(index.value)}
                            </p>

                            {/* Change */}
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                    {isPositive ? '+' : ''}{formatNumber(index.change)}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${isPositive
                                    ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                    : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                                    }`}>
                                    {isPositive ? '+' : ''}{formatNumber(index.changePercent)}%
                                </span>
                            </div>

                            {/* Day Range (shown on hover) */}
                            <div className="mt-3 pt-3 border-t border-[var(--border-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)]">L: {formatNumber(index.dayLow)}</span>
                                    <span className="text-[var(--text-secondary)]">H: {formatNumber(index.dayHigh)}</span>
                                </div>
                                <div className="h-1 bg-[var(--bg-primary)] rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${((index.value - index.dayLow) / (index.dayHigh - index.dayLow)) * 100}%`,
                                            backgroundColor: index.color,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-[var(--border-primary)] relative z-10">
                <p className="text-[var(--text-muted)] text-xs text-center">
                    Data is indicative and refreshes every 30 seconds. For real-time data, connect to NSE/BSE APIs.
                </p>
            </div>
        </div>
    );
}
