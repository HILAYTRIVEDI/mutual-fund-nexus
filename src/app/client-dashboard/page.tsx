'use client';

import { useAuth } from '@/context/AuthContext';
import { useClientContext } from '@/context/ClientContext';
import { useSettings } from '@/context/SettingsContext';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { TrendingUp, TrendingDown, PiggyBank, Calendar, Wallet, Target, Calculator } from 'lucide-react';
import { useState, useMemo } from 'react';
import AssetChartCard from '@/components/AssetChartCard';
import DistributionCard from '@/components/DistributionCard';

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ClientDashboard() {
    const { user } = useAuth();
    const { clients } = useClientContext();
    const { ltcgTax, stcgTax } = useSettings();
    const [showPostTax, setShowPostTax] = useState(false);

    // Get logged-in client's data
    const clientData = clients.find(c => c.id === user?.id);

    // Mock current value calculation (In production, fetch from API)
    const investedAmount = clientData?.amount || 0;
    const mockGrowthRate = clientData?.investmentType === 'SIP' ? 1.21 : 1.18;
    const currentValue = investedAmount * mockGrowthRate;

    // Generate Client Specific Chart Data (Mocking history based on current value)
    const chartData = useMemo(() => {
        if (!currentValue) return undefined;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonthIndex = new Date().getMonth();

        // Helper to generate a curve ending at currentValue
        const generateCurve = (monthsCount: number, volatility: number) => {
            const data = [];
            let val = currentValue;
            for (let i = 0; i < monthsCount; i++) {
                // Reverse iterate
                const date = new Date();
                date.setMonth(currentMonthIndex - i);
                const monthName = months[date.getMonth()];

                data.unshift({
                    name: monthName,
                    value: val
                });

                // Previous month was likely less
                val = val / (1 + (Math.random() * volatility));
            }
            return data;
        };

        const yearData = generateCurve(12, 0.02); // 2% avg monthly growth roughly
        const sixMonthData = yearData.slice(6);

        // Weekly data for 1M
        const oneMonthData = [
            { name: 'Week 1', value: currentValue * 0.95 },
            { name: 'Week 2', value: currentValue * 0.97 },
            { name: 'Week 3', value: currentValue * 0.98 },
            { name: 'Week 4', value: currentValue },
        ];

        return {
            '1Y': yearData,
            '6M': sixMonthData,
            '3M': yearData.slice(9),
            '1M': oneMonthData,
        };
    }, [currentValue]);



    const distributionData = [
        { name: 'Equity Funds', value: 70, color: '#48cae4' },
        { name: 'Debt Funds', value: 20, color: '#8B5CF6' },
        { name: 'Gold', value: 10, color: '#F59E0B' },
    ];

    if (!clientData) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <p className="text-[var(--text-secondary)]">Loading your dashboard...</p>
            </div>
        );
    }

    // Derived values requiring clientData
    // We mock these derived values for display since clientData is now guaranteed not null
    const grossReturns = currentValue - investedAmount;
    const grossReturnsPercentage = investedAmount > 0 ? (grossReturns / investedAmount) * 100 : 0;

    // Tax calculation
    const startDate = new Date(clientData.startDate || Date.now());
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const isLongTerm = startDate < oneYearAgo;
    const taxRate = isLongTerm ? ltcgTax : stcgTax;
    const taxAmount = grossReturns > 0 ? grossReturns * (taxRate / 100) : 0;
    const netReturns = grossReturns - taxAmount;
    const netReturnsPercentage = investedAmount > 0 ? (netReturns / investedAmount) * 100 : 0;

    const displayReturns = showPostTax ? netReturns : grossReturns;
    const displayReturnsPercentage = showPostTax ? netReturnsPercentage : grossReturnsPercentage;

    // SIP progress (mock)
    const sipMonths = clientData.investmentType === 'SIP'
        ? Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-6 md:mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold">
                                Welcome, <span className="bg-gradient-to-r from-[var(--accent-mint)] to-[var(--accent-blue)] bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>
                            </h1>
                            <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">
                                Here's your investment overview
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPostTax(!showPostTax)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${showPostTax
                                    ? 'bg-[var(--accent-mint)]/10 border-[var(--accent-mint)]/20 text-[var(--accent-mint)]'
                                    : 'bg-[var(--bg-hover)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                                    }`}
                            >
                                <Calculator size={14} />
                                <span className="text-xs font-medium hidden sm:inline">{showPostTax ? 'Post-Tax' : 'Pre-Tax'}</span>
                            </button>
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet size={16} className="text-[var(--accent-blue)]" />
                            <span className="text-[var(--text-secondary)] text-xs">Invested</span>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{formatCurrency(investedAmount)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Target size={16} className="text-[var(--accent-purple)]" />
                            <span className="text-[var(--text-secondary)] text-xs">Current Value</span>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{formatCurrency(currentValue)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div className="flex items-center gap-2 mb-2">
                            {displayReturns >= 0 ? <TrendingUp size={16} className="text-[var(--accent-mint)]" /> : <TrendingDown size={16} className="text-[var(--accent-red)]" />}
                            <span className="text-[var(--text-secondary)] text-xs">{showPostTax ? 'Net Returns' : 'Returns'}</span>
                        </div>
                        <p className={`text-lg md:text-xl font-bold ${displayReturns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {displayReturns >= 0 ? '+' : ''}{formatCurrency(displayReturns)}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div className="flex items-center gap-2 mb-2">
                            {displayReturnsPercentage >= 0 ? <TrendingUp size={16} className="text-[var(--accent-mint)]" /> : <TrendingDown size={16} className="text-[var(--accent-red)]" />}
                            <span className="text-[var(--text-secondary)] text-xs">Returns %</span>
                        </div>
                        <p className={`text-lg md:text-xl font-bold ${displayReturnsPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                            {displayReturnsPercentage >= 0 ? '+' : ''}{displayReturnsPercentage.toFixed(2)}%
                        </p>
                        {showPostTax && (
                            <span className="text-[10px] text-[var(--text-secondary)]">{isLongTerm ? 'LTCG' : 'STCG'} Applied</span>
                        )}
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <AssetChartCard 
                        customChartData={chartData} 
                        customAumValues={{
                            currentValue,
                            investedValue: investedAmount,
                            gainLoss: grossReturns
                        }} 
                    />
                    <div className="lg:col-span-1 h-[300px] lg:h-auto">
                        <DistributionCard customData={distributionData} />
                    </div>
                </div>

                {/* Holdings Card */}
                <div className="glass-card rounded-2xl p-4 md:p-6 mb-6">
                    <h3 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
                        <PiggyBank size={20} className="text-[var(--accent-mint)]" />
                        Your Holdings
                    </h3>
                    <div className="p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-mint)]/20 to-[var(--accent-blue)]/20 flex items-center justify-center flex-shrink-0">
                                <PiggyBank size={24} className="text-[var(--accent-mint)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[var(--text-primary)] font-medium">{clientData.portfolio || 'Investment Portfolio'}</p>
                                <p className="text-[var(--text-secondary)] text-xs mt-1">Scheme Code: {clientData.schemeCode || 'N/A'}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${clientData.investmentType === 'SIP'
                                        ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                        : 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]'
                                        }`}>
                                        {clientData.investmentType || 'Investment'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                                        Since {new Date(clientData.startDate || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[var(--text-primary)] font-bold">{formatCurrency(currentValue)}</p>
                                <p className={`text-xs ${displayReturnsPercentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                    {displayReturnsPercentage >= 0 ? '+' : ''}{displayReturnsPercentage.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIP Details (if applicable) */}
                {clientData.investmentType === 'SIP' && clientData.sipAmount && (
                    <div className="glass-card rounded-2xl p-4 md:p-6">
                        <h3 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
                            <Calendar size={20} className="text-[var(--accent-blue)]" />
                            SIP Details
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)] text-xs mb-1">Monthly SIP</p>
                                <p className="text-[var(--text-primary)] font-bold">{formatCurrency(clientData.sipAmount)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)] text-xs mb-1">SIPs Completed</p>
                                <p className="text-[var(--text-primary)] font-bold">{sipMonths}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)] text-xs mb-1">Next SIP Date</p>
                                <p className="text-[var(--text-primary)] font-bold">
                                    {new Date(clientData.startDate || Date.now()).getDate()}th of Month
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Sidebar />
        </div>
    );
}
