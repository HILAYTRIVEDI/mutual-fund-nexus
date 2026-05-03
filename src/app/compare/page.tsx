'use client';

import { useState, useCallback } from 'react';
import { Search, X, Plus, Scale, BarChart3, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { searchSchemes, getSchemeLatestNAV, getSchemeHistory, type MutualFundScheme, type SchemeLatestResponse } from '@/lib/mfapi';

interface FundData {
    schemeCode: number;
    schemeName: string;
    fundHouse: string;
    schemeCategory: string;
    schemeType: string;
    latestNav: number;
    navDate: string;
    returns1M: number | null;
    returns1Y: number | null;
    returns3Y: number | null;
    isinGrowth: string | null;
    [key: string]: string | number | null;
}

interface ComparisonMetric {
    key: string;
    label: string;
    format: (v: unknown) => string;
    highlight?: 'high' | 'low';
}

const comparisonMetrics: ComparisonMetric[] = [
    { key: 'latestNav', label: 'Latest NAV', format: (v) => `₹${(v as number).toFixed(4)}` },
    { key: 'navDate', label: 'NAV Date', format: (v) => v as string },
    { key: 'fundHouse', label: 'Fund House', format: (v) => v as string },
    { key: 'schemeCategory', label: 'Category', format: (v) => v as string },
    { key: 'schemeType', label: 'Scheme Type', format: (v) => v as string },
    { key: 'returns1M', label: '1 Month Return', format: (v) => v !== null ? `${(v as number) >= 0 ? '+' : ''}${(v as number).toFixed(2)}%` : 'N/A', highlight: 'high' },
    { key: 'returns1Y', label: '1 Year Return', format: (v) => v !== null ? `${(v as number) >= 0 ? '+' : ''}${(v as number).toFixed(2)}%` : 'N/A', highlight: 'high' },
    { key: 'returns3Y', label: '3 Year CAGR', format: (v) => v !== null ? `${(v as number) >= 0 ? '+' : ''}${(v as number).toFixed(2)}%` : 'N/A', highlight: 'high' },
    { key: 'isinGrowth', label: 'ISIN', format: (v) => (v as string) || 'N/A' },
];

function calculateReturns(currentNav: number, historicalNav: number, years: number = 1): number {
    if (historicalNav === 0) return 0;
    if (years === 1) {
        return ((currentNav - historicalNav) / historicalNav) * 100;
    }
    // CAGR calculation for multi-year returns
    return (Math.pow(currentNav / historicalNav, 1 / years) - 1) * 100;
}

export default function CompareFundsPage() {
    const [selectedFunds, setSelectedFunds] = useState<FundData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<MutualFundScheme[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [loadingFunds, setLoadingFunds] = useState<Set<number>>(new Set());

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchSchemes(query);
            // Filter out already selected funds
            const filtered = results.filter(
                r => !selectedFunds.find(f => f.schemeCode === r.schemeCode)
            );
            setSearchResults(filtered.slice(0, 20)); // Limit to 20 results
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [selectedFunds]);

    const addFund = async (scheme: MutualFundScheme) => {
        if (selectedFunds.length >= 4) return;

        setLoadingFunds(prev => new Set(prev).add(scheme.schemeCode));
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchOpen(false);

        try {
            // Fetch latest NAV and metadata
            const latestData: SchemeLatestResponse = await getSchemeLatestNAV(scheme.schemeCode);

            // Calculate date ranges for returns
            const today = new Date();
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const threeYearsAgo = new Date(today);
            threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

            const formatDate = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            // Fetch historical data for returns calculation
            let returns1M: number | null = null;
            let returns1Y: number | null = null;
            let returns3Y: number | null = null;

            const currentNav = parseFloat(latestData.data[0].nav);

            try {
                // Get 3 years of history (covers all return periods)
                const history = await getSchemeHistory(
                    scheme.schemeCode,
                    formatDate(threeYearsAgo),
                    formatDate(today)
                );

                if (history.data && history.data.length > 0) {
                    // Find NAV closest to 1 month ago
                    const oneMonthData = history.data.find(d => {
                        const navDate = new Date(d.date.split('-').reverse().join('-'));
                        const diffDays = Math.abs((today.getTime() - navDate.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays >= 28 && diffDays <= 35;
                    });
                    if (oneMonthData) {
                        returns1M = calculateReturns(currentNav, parseFloat(oneMonthData.nav), 1 / 12);
                    }

                    // Find NAV closest to 1 year ago
                    const oneYearData = history.data.find(d => {
                        const navDate = new Date(d.date.split('-').reverse().join('-'));
                        const diffDays = Math.abs((today.getTime() - navDate.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays >= 360 && diffDays <= 370;
                    });
                    if (oneYearData) {
                        returns1Y = calculateReturns(currentNav, parseFloat(oneYearData.nav), 1);
                    }

                    // Find NAV closest to 3 years ago
                    const threeYearData = history.data.find(d => {
                        const navDate = new Date(d.date.split('-').reverse().join('-'));
                        const diffDays = Math.abs((today.getTime() - navDate.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays >= 1090 && diffDays <= 1100;
                    });
                    if (threeYearData) {
                        returns3Y = calculateReturns(currentNav, parseFloat(threeYearData.nav), 3);
                    }
                }
            } catch (historyError) {
                console.error('Failed to fetch history:', historyError);
            }

            const fundData: FundData = {
                schemeCode: latestData.meta.scheme_code,
                schemeName: latestData.meta.scheme_name,
                fundHouse: latestData.meta.fund_house,
                schemeCategory: latestData.meta.scheme_category,
                schemeType: latestData.meta.scheme_type,
                latestNav: currentNav,
                navDate: latestData.data[0].date,
                returns1M,
                returns1Y,
                returns3Y,
                isinGrowth: latestData.meta.isin_growth,
            };

            setSelectedFunds(prev => [...prev, fundData]);
        } catch (error) {
            console.error('Failed to fetch fund data:', error);
        } finally {
            setLoadingFunds(prev => {
                const next = new Set(prev);
                next.delete(scheme.schemeCode);
                return next;
            });
        }
    };

    const removeFund = (schemeCode: number) => {
        setSelectedFunds(selectedFunds.filter(f => f.schemeCode !== schemeCode));
    };

    const getBestValue = (metricKey: string, highlightType?: 'high' | 'low') => {
        if (!highlightType || selectedFunds.length < 2) return null;
        const values = selectedFunds
            .map(f => (f as Record<string, unknown>)[metricKey] as number)
            .filter(v => v !== null && typeof v === 'number');
        if (values.length === 0) return null;
        if (highlightType === 'high') return Math.max(...values);
        if (highlightType === 'low') return Math.min(...values);
        return null;
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-4 md:mb-6 pr-12 md:pr-0">
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                        <Scale size={24} className="md:w-7 md:h-7 text-[var(--accent-mint)]" />
                        <h1 className="text-xl md:text-2xl font-bold">Fund Comparison</h1>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm">
                        Compare up to 4 mutual funds with real-time data from MFAPI.in
                    </p>
                </header>

                {/* Fund Selector */}
                <div className="glass-card rounded-2xl p-3 md:p-4 mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                        {/* Selected Funds */}
                        {selectedFunds.map((fund) => (
                            <div
                                key={fund.schemeCode}
                                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-xl bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/30"
                            >
                                <span className="text-[var(--text-primary)] text-xs md:text-sm font-medium">{fund.fundHouse.split(' ')[0]}</span>
                                <span className="hidden sm:inline text-[var(--text-secondary)] text-[10px] md:text-xs">{fund.schemeCategory?.split(' - ')[0] || 'Fund'}</span>
                                <button
                                    onClick={() => removeFund(fund.schemeCode)}
                                    className="p-0.5 md:p-1 rounded-full hover:bg-[var(--accent-red)]/20 text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-colors"
                                >
                                    <X size={12} className="md:w-3.5 md:h-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Loading indicators for funds being added */}
                        {Array.from(loadingFunds).map((code) => (
                            <div
                                key={code}
                                className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]"
                            >
                                <Loader2 size={12} className="animate-spin text-[var(--accent-mint)]" />
                                <span className="text-[var(--text-secondary)] text-xs">Loading...</span>
                            </div>
                        ))}

                        {/* Add Fund Button */}
                        {selectedFunds.length + loadingFunds.size < 4 && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border-2 border-dashed border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-mint)]/50 hover:text-[var(--accent-mint)] transition-all"
                                >
                                    <Plus size={16} />
                                    <span className="text-xs md:text-sm">Add ({selectedFunds.length}/4)</span>
                                </button>

                                {/* Search Dropdown */}
                                {isSearchOpen && (
                                    <div className="absolute top-full mt-2 left-0 right-0 sm:right-auto w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-[var(--bg-secondary)] rounded-xl shadow-xl border border-[var(--border-primary)] z-50">
                                        <div className="p-3 border-b border-[var(--border-primary)]">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search funds (e.g., HDFC, SBI)..."
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                    autoFocus
                                                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] text-sm placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50"
                                                />
                                                {isSearching && (
                                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--accent-mint)]" size={16} />
                                                )}
                                            </div>
                                        </div>
                                        <div className="max-h-60 md:max-h-72 overflow-y-auto">
                                            {!searchQuery ? (
                                                <p className="p-4 text-[var(--text-secondary)] text-xs md:text-sm text-center">
                                                    Type at least 2 characters to search
                                                </p>
                                            ) : isSearching ? (
                                                <div className="p-4 flex items-center justify-center gap-2">
                                                    <Loader2 className="animate-spin text-[var(--accent-mint)]" size={20} />
                                                    <span className="text-[var(--text-secondary)] text-sm">Searching...</span>
                                                </div>
                                            ) : searchResults.length === 0 ? (
                                                <p className="p-4 text-[var(--text-secondary)] text-sm text-center">No funds found</p>
                                            ) : (
                                                searchResults.map((scheme) => (
                                                    <button
                                                        key={scheme.schemeCode}
                                                        onClick={() => addFund(scheme)}
                                                        disabled={loadingFunds.has(scheme.schemeCode)}
                                                        className="w-full p-3 text-left hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
                                                    >
                                                        <p className="text-[var(--text-primary)] text-sm font-medium ">{scheme.schemeName}</p>
                                                        <p className="text-[var(--text-secondary)] text-xs">Code: {scheme.schemeCode}</p>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Comparison Content */}
                {selectedFunds.length === 0 ? (
                    <div className="glass-card rounded-2xl p-8 md:p-16 text-center">
                        <BarChart3 className="mx-auto text-[var(--text-secondary)] mb-4" size={48} />
                        <h3 className="text-[var(--text-primary)] font-semibold text-base md:text-lg mb-2">No Funds Selected</h3>
                        <p className="text-[var(--text-secondary)] text-sm mb-4">
                            Click &quot;Add&quot; above to start comparing mutual funds
                        </p>
                        <p className="text-[var(--text-muted)] text-xs">
                            All data is fetched live from MFAPI.in
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-4">
                            {selectedFunds.map((fund) => (
                                <div key={fund.schemeCode} className="glass-card rounded-2xl p-4">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div>
                                            <p className="text-[var(--text-primary)] font-semibold text-sm">{fund.schemeName}</p>
                                            <p className="text-[var(--accent-mint)] text-xs mt-1">Code: {fund.schemeCode}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFund(fund.schemeCode)}
                                            className="p-1.5 rounded-lg bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        {comparisonMetrics.map((metric) => {
                                            const value = (fund as Record<string, unknown>)[metric.key];
                                            const isReturn = metric.key.includes('returns');
                                            const numValue = typeof value === 'number' ? value : null;

                                            return (
                                                <div key={metric.key} className="p-2 bg-[var(--bg-hover)] rounded-lg">
                                                    <p className="text-[var(--text-secondary)] text-[10px] mb-1">{metric.label}</p>
                                                    <div className="flex items-center gap-1">
                                                        {isReturn && numValue !== null && (
                                                            numValue >= 0
                                                                ? <TrendingUp size={10} className="text-[var(--accent-mint)]" />
                                                                : <TrendingDown size={10} className="text-[var(--accent-red)]" />
                                                        )}
                                                        <span className={`font-medium ${isReturn && numValue !== null && numValue > 0 ? 'text-[var(--accent-mint)]' :
                                                                isReturn && numValue !== null && numValue < 0 ? 'text-[var(--accent-red)]' :
                                                                    'text-[var(--text-primary)]'
                                                            }`}>
                                                            {metric.format(value)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block glass-card rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                {/* Fund Names Header */}
                                <div className="grid min-w-[600px]" style={{ gridTemplateColumns: `180px repeat(${selectedFunds.length}, minmax(180px, 1fr))` }}>
                                    <div className="p-4 bg-[var(--bg-hover)] border-b border-r border-[var(--border-primary)]">
                                        <span className="text-[var(--text-secondary)] text-sm font-medium">Metric</span>
                                    </div>
                                    {selectedFunds.map((fund) => (
                                        <div key={fund.schemeCode} className="p-4 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                                            <p className="text-[var(--text-primary)] font-semibold text-sm">{fund.schemeName}</p>
                                            <p className="text-[var(--accent-mint)] text-xs mt-1">Code: {fund.schemeCode}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Comparison Rows */}
                                {comparisonMetrics.map((metric) => {
                                    const bestValue = getBestValue(metric.key, metric.highlight);
                                    return (
                                        <div
                                            key={metric.key}
                                            className="grid hover:bg-[var(--bg-hover)] transition-colors min-w-[600px]"
                                            style={{ gridTemplateColumns: `180px repeat(${selectedFunds.length}, minmax(180px, 1fr))` }}
                                        >
                                            <div className="p-4 border-b border-r border-[var(--border-primary)]">
                                                <span className="text-[var(--text-secondary)] text-sm">{metric.label}</span>
                                            </div>
                                            {selectedFunds.map((fund) => {
                                                const value = (fund as Record<string, unknown>)[metric.key];
                                                const isBest = bestValue !== null && value === bestValue;
                                                const isReturn = metric.key.includes('returns');
                                                const numValue = typeof value === 'number' ? value : null;

                                                return (
                                                    <div key={fund.schemeCode} className="p-4 border-b border-[var(--border-primary)]">
                                                        <div className="flex items-center gap-1">
                                                            {isReturn && numValue !== null && (
                                                                numValue >= 0
                                                                    ? <TrendingUp size={14} className="text-[var(--accent-mint)]" />
                                                                    : <TrendingDown size={14} className="text-[var(--accent-red)]" />
                                                            )}
                                                            <span
                                                                className={`text-sm font-medium ${isBest ? 'text-[var(--accent-mint)]' :
                                                                    isReturn && numValue !== null && numValue > 0 ? 'text-[var(--accent-mint)]' :
                                                                        isReturn && numValue !== null && numValue < 0 ? 'text-[var(--accent-red)]' :
                                                                            'text-[var(--text-primary)]'
                                                                    }`}
                                                            >
                                                                {metric.format(value)}
                                                                {isBest && <span className="ml-1">✓</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
