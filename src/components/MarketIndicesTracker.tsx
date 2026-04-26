'use client';

import { useState, useEffect, useCallback } from 'react';
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

// Index definitions — symbol maps to NSE API index name
const INDEX_CONFIG: { symbol: string; name: string; nseIndex: string; color: string }[] = [
    { symbol: 'NIFTY', name: 'NIFTY 50', nseIndex: 'NIFTY 50', color: '#C4A265' },
    { symbol: 'BANKNIFTY', name: 'NIFTY Bank', nseIndex: 'NIFTY BANK', color: '#5B7FA4' },
    { symbol: 'NIFTYIT', name: 'NIFTY IT', nseIndex: 'NIFTY IT', color: '#F59E0B' },
    { symbol: 'NIFTYMID', name: 'NIFTY Midcap 100', nseIndex: 'NIFTY MIDCAP 100', color: '#EC4899' },
    { symbol: 'NIFTYNEXT', name: 'NIFTY Next 50', nseIndex: 'NIFTY NEXT 50', color: '#3B82F6' },
    { symbol: 'INDIAVIX', name: 'India VIX', nseIndex: 'INDIA VIX', color: '#EF4444' },
];

function formatNumber(num: number, decimals = 2): string {
    return num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function MarketIndicesTracker() {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchIndices = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const results: MarketIndex[] = [];

            // Fetch all indices in parallel
            const fetches = INDEX_CONFIG.map(async (cfg) => {
                try {
                    const res = await fetch(`/api/nse/indices?index=${encodeURIComponent(cfg.nseIndex)}`);
                    if (!res.ok) return null;
                    const data = await res.json();

                    // India VIX has a flat response shape
                    if (cfg.nseIndex === 'INDIA VIX') {
                        return {
                            id: cfg.symbol,
                            name: cfg.name,
                            symbol: cfg.symbol,
                            value: data.lastPrice ?? 0,
                            change: data.change ?? 0,
                            changePercent: data.pChange ?? 0,
                            previousClose: data.previousClose ?? 0,
                            dayHigh: data.dayHigh ?? 0,
                            dayLow: data.dayLow ?? 0,
                            open: data.open ?? 0,
                            color: cfg.color,
                        } as MarketIndex;
                    }

                    // Standard index — metadata contains index-level data
                    const meta = data.metadata ?? data.data?.[0];
                    if (!meta) return null;

                    return {
                        id: cfg.symbol,
                        name: cfg.name,
                        symbol: cfg.symbol,
                        value: meta.last ?? meta.lastPrice ?? 0,
                        change: meta.change ?? 0,
                        changePercent: meta.percChange ?? meta.pChange ?? 0,
                        previousClose: meta.previousClose ?? 0,
                        dayHigh: meta.high ?? meta.dayHigh ?? 0,
                        dayLow: meta.low ?? meta.dayLow ?? 0,
                        open: meta.open ?? 0,
                        color: cfg.color,
                    } as MarketIndex;
                } catch {
                    return null;
                }
            });

            const settled = await Promise.all(fetches);
            for (const r of settled) {
                if (r) results.push(r);
            }

            if (results.length > 0) {
                setIndices(results);
                setLastUpdated(new Date());
            } else {
                setFetchError('Unable to fetch market data');
            }
        } catch {
            setFetchError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch + auto-refresh every 60 seconds
    useEffect(() => {
        fetchIndices();
        const interval = setInterval(fetchIndices, 60000);
        return () => clearInterval(interval);
    }, [fetchIndices]);

    return (
        <div className="glass-card rounded-2xl p-4 md:p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-blue)]/5 via-transparent to-[var(--accent-mint)]/5 pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 relative z-10">
                <div className="flex items-center gap-2 flex-wrap">
                    <Activity size={18} className="text-[var(--accent-blue)]" />
                    <h3 className="text-[var(--text-primary)] font-semibold text-sm md:text-base">Market Indices</h3>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                            <Clock size={12} />
                            {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={fetchIndices}
                        disabled={isLoading}
                        className={`p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all ${isLoading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Error / Empty State */}
            {fetchError && indices.length === 0 && (
                <div className="text-center py-8 relative z-10">
                    <p className="text-[var(--text-muted)] text-sm">{fetchError}</p>
                    <button onClick={fetchIndices} className="mt-2 text-[var(--accent-blue)] text-sm hover:underline">
                        Try again
                    </button>
                </div>
            )}

            {/* Indices Grid - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 relative z-10">
                {indices.map((index) => {
                    const isPositive = index.change >= 0;
                    return (
                        <div
                            key={index.id}
                            className="p-3 md:p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] hover:border-[var(--accent-mint)]/30 transition-all cursor-pointer group"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1 md:mb-2">
                                <div className="flex items-center gap-1.5 md:gap-2">
                                    <div
                                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                                        style={{ backgroundColor: index.color }}
                                    />
                                    <span className="text-[var(--text-secondary)] text-[10px] md:text-xs font-medium">{index.symbol}</span>
                                </div>
                                {isPositive ? (
                                    <TrendingUp size={12} className="md:w-3.5 md:h-3.5 text-[var(--accent-mint)]" />
                                ) : (
                                    <TrendingDown size={12} className="md:w-3.5 md:h-3.5 text-[var(--accent-red)]" />
                                )}
                            </div>

                            {/* Value */}
                            <p className="text-[var(--text-primary)] text-sm md:text-lg font-bold mb-0.5 md:mb-1 truncate">
                                {formatNumber(index.value)}
                            </p>

                            {/* Change */}
                            <div className="flex flex-wrap items-center gap-1 md:gap-2">
                                <span className={`text-xs md:text-sm font-medium ${isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                    {isPositive ? '+' : ''}{formatNumber(index.change)}
                                </span>
                                <span className={`text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded ${isPositive
                                    ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                    : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                                    }`}>
                                    {isPositive ? '+' : ''}{formatNumber(index.changePercent)}%
                                </span>
                            </div>

                            {/* Day Range (shown on hover - hidden on mobile) */}
                            <div className="hidden md:block mt-3 pt-3 border-t border-[var(--border-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[var(--border-primary)] relative z-10">
                <p className="text-[var(--text-muted)] text-[10px] md:text-xs text-center">
                    Live data from NSE India. Auto-refreshes every 60 seconds during market hours.
                </p>
            </div>
        </div>
    );
}
