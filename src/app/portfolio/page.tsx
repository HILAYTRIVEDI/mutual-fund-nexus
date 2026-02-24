'use client';

import { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, PiggyBank, BarChart3, ArrowUpDown, Calculator } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
// import { useClientContext } from '@/context/ClientContext'; // Removed as unused

interface PortfolioHolding {
    id: string;
    fundName: string;
    fundHouse: string;
    category: string;
    units: number;
    avgNav: number;
    currentNav: number;
    investedValue: number;
    currentValue: number;
    returns: number;
    returnsPercentage: number;
    xirr: number;
    allocation: number;
    color: string;
    investedDate: string; // Added for tax calculation
}

const colors = ['#C4A265', '#3B82F6', '#5B7FA4', '#F59E0B', '#EC4899', '#6366F1'];

import { useHoldings } from '@/context/HoldingsContext';
import { Loader2 } from 'lucide-react';

const getRandomColor = (index: number) => colors[index % colors.length];

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

type SortKey = 'fundName' | 'currentValue' | 'returnsPercentage' | 'xirr' | 'allocation';
type SortDirection = 'asc' | 'desc';

export default function PortfolioPage() {
    const { ltcgTax, stcgTax } = useSettings();
    const { user } = useAuth();
    const { holdings, isLoading } = useHoldings();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('allocation');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [showPostTax, setShowPostTax] = useState(false);

    // Transform and filter holdings data
    const holdingsData = useMemo(() => {
        if (!holdings || holdings.length === 0) return [];

        let filteredHoldings = holdings;
        

        const totalValue = filteredHoldings.reduce((sum, h) => sum + h.current_value, 0);

        return filteredHoldings.map((h, index) => {
            const fundName = (h as any).mutual_fund?.name || h.scheme_code || 'Mutual Fund Scheme';
            const fundHouse = (h as any).mutual_fund?.fund_house || fundName.split(' ')[0] || 'Fund House';
            const returns = h.current_value - h.invested_amount;
            const returnsPercentage = h.invested_amount > 0 ? (returns / h.invested_amount) * 100 : 0;
            const allocation = totalValue > 0 ? (h.current_value / totalValue) * 100 : 0;

            return {
                id: h.id,
                fundName: fundName,
                fundHouse: fundHouse,
                category: (h as any).mutual_fund?.category || 'Equity',
                units: h.units,
                avgNav: h.average_price,
                currentNav: h.current_nav,
                investedValue: h.invested_amount,
                currentValue: h.current_value,
                returns: returns,
                returnsPercentage: returnsPercentage,
                xirr: 0, 
                allocation: parseFloat(allocation.toFixed(2)),
                color: getRandomColor(index),
                investedDate: h.created_at || new Date().toISOString(), 
            };
        });
    }, [holdings, user]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const filteredAndSortedHoldings = useMemo(() => {
        const result = holdingsData.filter(holding =>
            holding.fundName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            holding.fundHouse.toLowerCase().includes(searchQuery.toLowerCase()) ||
            holding.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        result.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        return result;
    }, [searchQuery, sortKey, sortDirection, holdingsData]);

    if (isLoading) {
        return (
             <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
                <main className="flex-1 min-w-0 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="animate-spin mx-auto text-[var(--accent-mint)] mb-2" size={32} />
                        <p className="text-[var(--text-secondary)]">Loading portfolio...</p>
                    </div>
                </main>
                <Sidebar />
            </div>
        );
    }

    // Summary calculations
    // Summary calculations with Tax logic
    const calculateReturns = (holding: PortfolioHolding) => {
        const grossReturns = holding.currentValue - holding.investedValue;
        if (!showPostTax || grossReturns <= 0) return { returns: grossReturns, returnsPercentage: (grossReturns / holding.investedValue) * 100 };

        // Determine tax rate
        const purchaseDate = new Date(holding.investedDate);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const isLongTerm = purchaseDate < oneYearAgo;
        const taxRate = isLongTerm ? ltcgTax : stcgTax;

        const taxAmount = grossReturns * (taxRate / 100);
        const netReturns = grossReturns - taxAmount;

        return {
            returns: netReturns,
            returnsPercentage: (netReturns / holding.investedValue) * 100
        };
    };

    const totalInvested = holdingsData.reduce((sum, h) => sum + h.investedValue, 0);
    const totalCurrent = holdingsData.reduce((sum, h) => sum + h.currentValue, 0);

    // Calculate total adjusted returns
    const totalAdjustedReturns = holdingsData.reduce((sum, h) => sum + calculateReturns(h).returns, 0);
    const totalReturnsPercentage = totalInvested > 0 ? ((totalAdjustedReturns / totalInvested) * 100).toFixed(2) : '0.00';

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-4 md:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-12 md:pr-0">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">Portfolio Holdings</h1>
                            <p className="text-[var(--text-secondary)] text-xs md:text-sm">
                                Compare and analyze all your mutual fund investments
                            </p>
                        </div>
                        <div className="flex items-center gap-3 self-start sm:self-auto">
                            {/* Tax Toggle */}
                            <button
                                onClick={() => setShowPostTax(!showPostTax)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${showPostTax
                                    ? 'bg-[var(--accent-mint)]/10 border-[var(--accent-mint)]/20 text-[var(--accent-mint)]'
                                    : 'bg-[var(--bg-hover)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                                    }`}
                            >
                                <Calculator size={14} />
                                <span className="text-xs font-medium">{showPostTax ? 'Post-Tax' : 'Pre-Tax'}</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Summary Cards - Scrollable on mobile */}
                <div className="flex lg:grid lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 min-w-[140px] lg:min-w-0">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">Total Invested</p>
                        <p className="text-[var(--text-primary)] text-lg md:text-xl font-bold truncate">{formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 min-w-[140px] lg:min-w-0">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">Current Value</p>
                        <p className="text-[var(--text-primary)] text-lg md:text-xl font-bold truncate">{formatCurrency(totalCurrent)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 min-w-[140px] lg:min-w-0">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">
                            {showPostTax ? 'Returns (Post-Tax)' : 'Total Returns'}
                        </p>
                        <p className={`text-lg md:text-xl font-bold truncate ${totalAdjustedReturns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {totalAdjustedReturns >= 0 ? '+' : ''}{formatCurrency(totalAdjustedReturns)}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 min-w-[140px] lg:min-w-0">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">Overall Returns %</p>
                        <p className={`text-lg md:text-xl font-bold truncate ${parseFloat(totalReturnsPercentage) >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {parseFloat(totalReturnsPercentage) >= 0 ? '+' : ''}{totalReturnsPercentage}%
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="glass-card rounded-2xl p-3 md:p-4 mb-4 md:mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="text"
                            placeholder="Search by fund name, house, or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-mint)]/50 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Holdings List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Desktop Table Header */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 bg-[var(--bg-hover)] border-b border-[var(--border-primary)]">
                        <button
                            onClick={() => handleSort('fundName')}
                            className="col-span-4 flex items-center gap-1 text-[var(--text-secondary)] text-xs font-medium uppercase hover:text-[var(--text-primary)]"
                        >
                            Fund Name
                            {sortKey === 'fundName' && <ArrowUpDown size={12} />}
                        </button>
                        <div className="col-span-2 text-[var(--text-secondary)] text-xs font-medium uppercase text-right">
                            Invested
                        </div>
                        <button
                            onClick={() => handleSort('currentValue')}
                            className="col-span-2 flex items-center justify-end gap-1 text-[var(--text-secondary)] text-xs font-medium uppercase hover:text-[var(--text-primary)]"
                        >
                            Current Value
                            {sortKey === 'currentValue' && <ArrowUpDown size={12} />}
                        </button>
                        <button
                            onClick={() => handleSort('returnsPercentage')}
                            className="col-span-2 flex items-center justify-end gap-1 text-[var(--text-secondary)] text-xs font-medium uppercase hover:text-[var(--text-primary)]"
                        >
                            Returns
                            {sortKey === 'returnsPercentage' && <ArrowUpDown size={12} />}
                        </button>
                        <button
                            onClick={() => handleSort('allocation')}
                            className="col-span-2 flex items-center justify-end gap-1 text-[var(--text-secondary)] text-xs font-medium uppercase hover:text-[var(--text-primary)]"
                        >
                            Allocation
                            {sortKey === 'allocation' && <ArrowUpDown size={12} />}
                        </button>
                    </div>

                    {/* Mobile Sort Options */}
                    <div className="lg:hidden flex items-center gap-2 p-3 bg-[var(--bg-hover)] border-b border-[var(--border-primary)] overflow-x-auto">
                        <span className="text-[var(--text-secondary)] text-xs whitespace-nowrap">Sort:</span>
                        {(['allocation', 'returnsPercentage', 'currentValue'] as SortKey[]).map((key) => (
                            <button
                                key={key}
                                onClick={() => handleSort(key)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${sortKey === key
                                    ? 'bg-[var(--accent-mint)]/20 text-[var(--accent-mint)]'
                                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                                    }`}
                            >
                                {key === 'allocation' ? 'Allocation' : key === 'returnsPercentage' ? 'Returns' : 'Value'}
                            </button>
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredAndSortedHoldings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 md:py-16">
                            <BarChart3 className="text-[var(--text-secondary)] mb-3" size={40} />
                            <p className="text-[var(--text-secondary)] text-sm">No holdings found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-primary)]">
                            {filteredAndSortedHoldings.map((holding) => (
                                <div key={holding.id}>
                                    {/* Mobile Card View */}
                                    <div className="lg:hidden p-4 hover:bg-[var(--bg-hover)] transition-all">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: `linear-gradient(135deg, ${holding.color}30, ${holding.color}10)`,
                                                }}
                                            >
                                                <PiggyBank size={18} style={{ color: holding.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[var(--text-primary)] font-medium text-sm line-clamp-2">{holding.fundName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[var(--text-secondary)] text-xs">{holding.fundHouse}</span>
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                                                        {holding.category}
                                                    </span>
                                                    {showPostTax && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                                                            Tax: {(new Date(holding.investedDate) < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) ? 'LTCG' : 'STCG'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <p className="text-[var(--text-secondary)] mb-1">Invested</p>
                                                <p className="text-[var(--text-primary)] font-medium">{formatCurrency(holding.investedValue)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[var(--text-secondary)] mb-1">Current</p>
                                                <p className="text-[var(--text-primary)] font-medium">{formatCurrency(holding.currentValue)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[var(--text-secondary)] mb-1">{showPostTax ? 'Net Returns' : 'Returns'}</p>
                                                <div className={`flex items-center gap-1 ${calculateReturns(holding).returnsPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                    {calculateReturns(holding).returnsPercentage >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                    <span className="font-medium">{calculateReturns(holding).returnsPercentage >= 0 ? '+' : ''}{calculateReturns(holding).returnsPercentage.toFixed(2)}%</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[var(--text-secondary)] mb-1">Allocation</p>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[var(--text-primary)] font-medium">{holding.allocation}%</span>
                                                    <div className="w-12 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${holding.allocation}%`,
                                                                backgroundColor: holding.color
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Table Row */}
                                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 hover:bg-[var(--bg-hover)] transition-all group">
                                        {/* Fund Info */}
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: `linear-gradient(135deg, ${holding.color}30, ${holding.color}10)`,
                                                }}
                                            >
                                                <PiggyBank size={18} style={{ color: holding.color }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[var(--text-primary)] font-medium text-sm truncate">{holding.fundName}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[var(--text-secondary)] text-xs">{holding.fundHouse}</span>
                                                    <span className="px-1.5 py-0.5 rounded text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                                                        {holding.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Invested */}
                                        <div className="col-span-2 flex flex-col items-end justify-center">
                                            <p className="text-[var(--text-primary)] text-sm">{formatCurrency(holding.investedValue)}</p>
                                            <p className="text-[var(--text-secondary)] text-xs">{holding.units.toLocaleString()} units</p>
                                        </div>

                                        {/* Current Value */}
                                        <div className="col-span-2 flex flex-col items-end justify-center">
                                            <p className="text-[var(--text-primary)] text-sm font-medium">{formatCurrency(holding.currentValue)}</p>
                                            <p className="text-[var(--text-secondary)] text-xs">NAV: ₹{holding.currentNav.toFixed(2)}</p>
                                        </div>

                                        {/* Returns */}
                                        <div className="col-span-2 flex flex-col items-end justify-center">
                                            <div className={`flex items-center gap-1 ${calculateReturns(holding).returnsPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {calculateReturns(holding).returnsPercentage >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                <span className="text-sm font-medium">{calculateReturns(holding).returnsPercentage >= 0 ? '+' : ''}{calculateReturns(holding).returnsPercentage.toFixed(2)}%</span>
                                            </div>
                                            <p className={`text-xs ${calculateReturns(holding).returns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {calculateReturns(holding).returns >= 0 ? '+' : ''}{formatCurrency(calculateReturns(holding).returns)}
                                            </p>
                                            {showPostTax && (
                                                <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                                                    {(new Date(holding.investedDate) < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) ? 'LTCG' : 'STCG'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Allocation */}
                                        <div className="col-span-2 flex flex-col items-end justify-center">
                                            <p className="text-[var(--text-primary)] text-sm font-medium">{holding.allocation}%</p>
                                            <div className="w-16 h-1.5 bg-[var(--bg-hover)] rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${holding.allocation}%`,
                                                        backgroundColor: holding.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
