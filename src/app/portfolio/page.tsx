'use client';

import { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, PiggyBank, BarChart3, ArrowUpDown } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

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
}

const portfolioHoldings: PortfolioHolding[] = [
    {
        id: '1',
        fundName: 'HDFC Top 100 Fund - Direct Growth',
        fundHouse: 'HDFC',
        category: 'Large Cap',
        units: 15234.56,
        avgNav: 756.23,
        currentNav: 892.45,
        investedValue: 11520000,
        currentValue: 13600000,
        returns: 2080000,
        returnsPercentage: 18.05,
        xirr: 22.5,
        allocation: 28.5,
        color: '#48cae4',
    },
    {
        id: '2',
        fundName: 'SBI Bluechip Fund - Direct Growth',
        fundHouse: 'SBI',
        category: 'Large Cap',
        units: 8456.78,
        avgNav: 65.45,
        currentNav: 78.32,
        investedValue: 5535000,
        currentValue: 6625000,
        returns: 1090000,
        returnsPercentage: 19.69,
        xirr: 24.2,
        allocation: 13.9,
        color: '#3B82F6',
    },
    {
        id: '3',
        fundName: 'ICICI Prudential Liquid Fund - Direct Growth',
        fundHouse: 'ICICI',
        category: 'Liquid',
        units: 25000.00,
        avgNav: 340.12,
        currentNav: 345.67,
        investedValue: 8503000,
        currentValue: 8641750,
        returns: 138750,
        returnsPercentage: 1.63,
        xirr: 6.8,
        allocation: 18.1,
        color: '#8B5CF6',
    },
    {
        id: '4',
        fundName: 'Axis Small Cap Fund - Direct Growth',
        fundHouse: 'Axis',
        category: 'Small Cap',
        units: 12500.00,
        avgNav: 52.30,
        currentNav: 68.45,
        investedValue: 6537500,
        currentValue: 8556250,
        returns: 2018750,
        returnsPercentage: 30.88,
        xirr: 35.2,
        allocation: 17.9,
        color: '#F59E0B',
    },
    {
        id: '5',
        fundName: 'Parag Parikh Flexi Cap Fund - Direct Growth',
        fundHouse: 'PPFAS',
        category: 'Flexi Cap',
        units: 10200.00,
        avgNav: 48.75,
        currentNav: 62.45,
        investedValue: 4972500,
        currentValue: 6369900,
        returns: 1397400,
        returnsPercentage: 28.10,
        xirr: 28.5,
        allocation: 13.3,
        color: '#EC4899',
    },
    {
        id: '6',
        fundName: 'Kotak Emerging Equity Fund - Direct Growth',
        fundHouse: 'Kotak',
        category: 'Mid Cap',
        units: 5600.00,
        avgNav: 72.50,
        currentNav: 89.75,
        investedValue: 4060000,
        currentValue: 5026000,
        returns: 966000,
        returnsPercentage: 23.79,
        xirr: 26.8,
        allocation: 10.5,
        color: '#6366F1',
    },
];

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
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('allocation');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const filteredAndSortedHoldings = useMemo(() => {
        const result = portfolioHoldings.filter(holding =>
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
    }, [searchQuery, sortKey, sortDirection]);

    // Summary calculations
    const totalInvested = portfolioHoldings.reduce((sum, h) => sum + h.investedValue, 0);
    const totalCurrent = portfolioHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalReturns = totalCurrent - totalInvested;
    const totalReturnsPercentage = ((totalReturns / totalInvested) * 100).toFixed(2);

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
                        <span className="text-[var(--accent-purple)] text-[10px] md:text-xs px-2 md:px-3 py-1 bg-[var(--accent-purple)]/10 rounded-full border border-[var(--accent-purple)]/20 self-start sm:self-auto whitespace-nowrap">
                            Sample Data
                        </span>
                    </div>
                </header>

                {/* Summary Cards - Scrollable on mobile */}
                <div className="flex md:grid md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">Total Invested</p>
                        <p className="text-[var(--text-primary)] text-lg md:text-xl font-bold">{formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">Current Value</p>
                        <p className="text-[var(--text-primary)] text-lg md:text-xl font-bold">{formatCurrency(totalCurrent)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">Total Returns</p>
                        <p className={`text-lg md:text-xl font-bold ${totalReturns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-1">Overall Returns %</p>
                        <p className={`text-lg md:text-xl font-bold ${parseFloat(totalReturnsPercentage) >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
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
                                                <p className="text-[var(--text-secondary)] mb-1">Returns</p>
                                                <div className={`flex items-center gap-1 ${holding.returnsPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                    {holding.returnsPercentage >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                    <span className="font-medium">{holding.returnsPercentage >= 0 ? '+' : ''}{holding.returnsPercentage.toFixed(2)}%</span>
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
                                            <div className={`flex items-center gap-1 ${holding.returnsPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {holding.returnsPercentage >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                <span className="text-sm font-medium">{holding.returnsPercentage >= 0 ? '+' : ''}{holding.returnsPercentage.toFixed(2)}%</span>
                                            </div>
                                            <p className={`text-xs ${holding.returns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {holding.returns >= 0 ? '+' : ''}{formatCurrency(holding.returns)}
                                            </p>
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
