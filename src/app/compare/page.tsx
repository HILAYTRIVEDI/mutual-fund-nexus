'use client';

import { useState, useMemo } from 'react';
import { Search, X, Plus, Scale, BarChart3 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface Fund {
    id: string;
    name: string;
    fundHouse: string;
    category: string;
    nav: number;
    aum: string;
    expenseRatio: number;
    returns1Y: number;
    returns3Y: number;
    returns5Y: number;
    riskLevel: 'Low' | 'Moderate' | 'High';
    minInvestment: number;
    exitLoad: string;
    [key: string]: string | number;
}

const allFunds: Fund[] = [
    {
        id: '1',
        name: 'HDFC Top 100 Fund - Direct Growth',
        fundHouse: 'HDFC',
        category: 'Large Cap',
        nav: 892.45,
        aum: '₹32,500 Cr',
        expenseRatio: 0.95,
        returns1Y: 18.5,
        returns3Y: 15.2,
        returns5Y: 14.8,
        riskLevel: 'Moderate',
        minInvestment: 5000,
        exitLoad: '1% if redeemed within 1 year',
    },
    {
        id: '2',
        name: 'SBI Bluechip Fund - Direct Growth',
        fundHouse: 'SBI',
        category: 'Large Cap',
        nav: 78.32,
        aum: '₹45,200 Cr',
        expenseRatio: 0.85,
        returns1Y: 16.8,
        returns3Y: 14.5,
        returns5Y: 13.9,
        riskLevel: 'Moderate',
        minInvestment: 5000,
        exitLoad: '1% if redeemed within 1 year',
    },
    {
        id: '3',
        name: 'Axis Small Cap Fund - Direct Growth',
        fundHouse: 'Axis',
        category: 'Small Cap',
        nav: 68.45,
        aum: '₹18,800 Cr',
        expenseRatio: 0.48,
        returns1Y: 32.5,
        returns3Y: 28.2,
        returns5Y: 22.5,
        riskLevel: 'High',
        minInvestment: 5000,
        exitLoad: '1% if redeemed within 1 year',
    },
    {
        id: '4',
        name: 'ICICI Prudential Liquid Fund - Direct Growth',
        fundHouse: 'ICICI',
        category: 'Liquid',
        nav: 345.67,
        aum: '₹52,100 Cr',
        expenseRatio: 0.20,
        returns1Y: 7.2,
        returns3Y: 6.1,
        returns5Y: 5.8,
        riskLevel: 'Low',
        minInvestment: 100,
        exitLoad: 'Nil',
    },
    {
        id: '5',
        name: 'Kotak Emerging Equity Fund - Direct Growth',
        fundHouse: 'Kotak',
        category: 'Mid Cap',
        nav: 89.75,
        aum: '₹28,600 Cr',
        expenseRatio: 0.55,
        returns1Y: 28.5,
        returns3Y: 22.8,
        returns5Y: 18.2,
        riskLevel: 'High',
        minInvestment: 5000,
        exitLoad: '1% if redeemed within 1 year',
    },
    {
        id: '6',
        name: 'Parag Parikh Flexi Cap Fund - Direct Growth',
        fundHouse: 'PPFAS',
        category: 'Flexi Cap',
        nav: 62.45,
        aum: '₹42,800 Cr',
        expenseRatio: 0.63,
        returns1Y: 24.8,
        returns3Y: 20.5,
        returns5Y: 19.2,
        riskLevel: 'Moderate',
        minInvestment: 1000,
        exitLoad: '2% if redeemed within 365 days',
    },
    {
        id: '7',
        name: 'Mirae Asset Large Cap Fund - Direct Growth',
        fundHouse: 'Mirae',
        category: 'Large Cap',
        nav: 95.28,
        aum: '₹38,200 Cr',
        expenseRatio: 0.52,
        returns1Y: 19.2,
        returns3Y: 16.8,
        returns5Y: 15.5,
        riskLevel: 'Moderate',
        minInvestment: 5000,
        exitLoad: '1% if redeemed within 1 year',
    },
];

const comparisonMetrics = [
    { key: 'nav', label: 'NAV', format: (v: number) => `₹${v.toFixed(2)}` },
    { key: 'aum', label: 'AUM', format: (v: string) => v },
    { key: 'expenseRatio', label: 'Expense Ratio', format: (v: number) => `${v}%`, highlight: 'low' },
    { key: 'returns1Y', label: '1Y Returns', format: (v: number) => `${v > 0 ? '+' : ''}${v}%`, highlight: 'high' },
    { key: 'returns3Y', label: '3Y Returns', format: (v: number) => `${v > 0 ? '+' : ''}${v}%`, highlight: 'high' },
    { key: 'returns5Y', label: '5Y Returns', format: (v: number) => `${v > 0 ? '+' : ''}${v}%`, highlight: 'high' },
    { key: 'riskLevel', label: 'Risk Level', format: (v: string) => v },
    { key: 'minInvestment', label: 'Min Investment', format: (v: number) => `₹${v.toLocaleString()}` },
    { key: 'exitLoad', label: 'Exit Load', format: (v: string) => v },
];

export default function CompareFundsPage() {
    const [selectedFunds, setSelectedFunds] = useState<Fund[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return allFunds.filter(
            fund =>
                !selectedFunds.find(f => f.id === fund.id) &&
                (fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    fund.fundHouse.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    fund.category.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [searchQuery, selectedFunds]);

    const addFund = (fund: Fund) => {
        if (selectedFunds.length < 4) {
            setSelectedFunds([...selectedFunds, fund]);
            setSearchQuery('');
            setIsSearchOpen(false);
        }
    };

    const removeFund = (fundId: string) => {
        setSelectedFunds(selectedFunds.filter(f => f.id !== fundId));
    };

    const getBestValue = (metricKey: string, highlightType?: string) => {
        if (!highlightType || selectedFunds.length < 2) return null;
        const values = selectedFunds.map(f => (f as Record<string, unknown>)[metricKey] as number);
        if (highlightType === 'high') return Math.max(...values);
        if (highlightType === 'low') return Math.min(...values);
        return null;
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Scale size={28} className="text-[var(--accent-mint)]" />
                        <h1 className="text-2xl font-bold">Fund Comparison Tool</h1>
                    </div>
                    <p className="text-[var(--text-secondary)]">
                        Compare up to 4 mutual funds side by side to make informed investment decisions
                    </p>
                </header>

                {/* Fund Selector */}
                <div className="glass-card rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Selected Funds */}
                        {selectedFunds.map((fund) => (
                            <div
                                key={fund.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/30"
                            >
                                <span className="text-[var(--text-primary)] text-sm font-medium">{fund.fundHouse}</span>
                                <span className="text-[var(--text-secondary)] text-xs">{fund.category}</span>
                                <button
                                    onClick={() => removeFund(fund.id)}
                                    className="p-1 rounded-full hover:bg-[var(--accent-red)]/20 text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        {/* Add Fund Button */}
                        {selectedFunds.length < 4 && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-mint)]/50 hover:text-[var(--accent-mint)] transition-all"
                                >
                                    <Plus size={18} />
                                    <span className="text-sm">Add Fund ({selectedFunds.length}/4)</span>
                                </button>

                                {/* Search Dropdown */}
                                {isSearchOpen && (
                                    <div className="absolute top-full mt-2 left-0 w-80 bg-[var(--bg-secondary)] rounded-xl shadow-xl border border-[var(--border-primary)] z-50">
                                        <div className="p-3 border-b border-[var(--border-primary)]">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search funds..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    autoFocus
                                                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] text-sm placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {searchQuery && searchResults.length === 0 ? (
                                                <p className="p-4 text-[var(--text-secondary)] text-sm text-center">No funds found</p>
                                            ) : (
                                                searchResults.map((fund) => (
                                                    <button
                                                        key={fund.id}
                                                        onClick={() => addFund(fund)}
                                                        className="w-full p-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
                                                    >
                                                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{fund.name}</p>
                                                        <p className="text-[var(--text-secondary)] text-xs">{fund.category} • {fund.aum}</p>
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

                {/* Comparison Table */}
                {selectedFunds.length === 0 ? (
                    <div className="glass-card rounded-2xl p-16 text-center">
                        <BarChart3 className="mx-auto text-[var(--text-secondary)] mb-4" size={64} />
                        <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-2">No Funds Selected</h3>
                        <p className="text-[var(--text-secondary)]">
                            Click &quot;Add Fund&quot; above to start comparing mutual funds
                        </p>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        {/* Fund Names Header */}
                        <div className="grid" style={{ gridTemplateColumns: `200px repeat(${selectedFunds.length}, 1fr)` }}>
                            <div className="p-4 bg-[var(--bg-hover)] border-b border-r border-[var(--border-primary)]">
                                <span className="text-[var(--text-secondary)] text-sm font-medium">Metric</span>
                            </div>
                            {selectedFunds.map((fund) => (
                                <div key={fund.id} className="p-4 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                                    <p className="text-[var(--text-primary)] font-semibold text-sm truncate">{fund.name}</p>
                                    <p className="text-[var(--text-secondary)] text-xs">{fund.category}</p>
                                </div>
                            ))}
                        </div>

                        {/* Comparison Rows */}
                        {comparisonMetrics.map((metric) => {
                            const bestValue = getBestValue(metric.key, metric.highlight);
                            return (
                                <div
                                    key={metric.key}
                                    className="grid hover:bg-[var(--bg-hover)] transition-colors"
                                    style={{ gridTemplateColumns: `200px repeat(${selectedFunds.length}, 1fr)` }}
                                >
                                    <div className="p-4 border-b border-r border-[var(--border-primary)]">
                                        <span className="text-[var(--text-secondary)] text-sm">{metric.label}</span>
                                    </div>
                                    {selectedFunds.map((fund) => {
                                        const value = (fund as Record<string, unknown>)[metric.key];
                                        const isBest = bestValue !== null && value === bestValue;
                                        const isReturn = metric.key.includes('returns');
                                        const numValue = typeof value === 'number' ? value : 0;

                                        return (
                                            <div key={fund.id} className="p-4 border-b border-[var(--border-primary)]">
                                                <span
                                                    className={`text-sm font-medium ${isBest ? 'text-[var(--accent-mint)]' :
                                                        isReturn && numValue > 0 ? 'text-[var(--accent-mint)]' :
                                                            isReturn && numValue < 0 ? 'text-[var(--accent-red)]' :
                                                                'text-[var(--text-primary)]'
                                                        }`}
                                                >
                                                    {metric.format(value as never)}
                                                    {isBest && <span className="ml-1">✓</span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
