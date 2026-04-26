'use client';

import { useAuth } from '@/context/AuthContext';
import { useHoldings } from '@/context/HoldingsContext';
import { useSIPs } from '@/context/SIPContext';
import { useSettings } from '@/context/SettingsContext';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { TrendingUp, TrendingDown, PiggyBank, Calendar, Wallet, Target, Calculator, Loader2, ArrowRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import AssetChartCard from '@/components/AssetChartCard';
import DistributionCard from '@/components/DistributionCard';
import MarketIndicesTracker from '@/components/MarketIndicesTracker';
import Link from 'next/link';

const COLORS = ['#C4A265', '#3B82F6', '#5B7FA4', '#F59E0B', '#EC4899', '#10B981', '#6366F1'];

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
    const { holdings, isLoading: isHoldingsLoading, totalCurrentValue, totalInvested, totalGainLoss } = useHoldings();
    const { activeSIPs, totalMonthlyAmount, isLoading: isSIPsLoading } = useSIPs();
    const { ltcgTax, stcgTax } = useSettings();
    const [showPostTax, setShowPostTax] = useState(false);

    const isLoading = isHoldingsLoading || isSIPsLoading;

    // Calculate Tax-Adjusted Returns
    const { netReturns, netReturnsPercentage, grossReturnsPercentage } = useMemo(() => {
        if (holdings.length === 0) return { netReturns: 0, netReturnsPercentage: 0, grossReturnsPercentage: 0 };

        const currentTotalInvested = holdings.reduce((sum, h) => sum + h.invested_amount, 0);

        // No tax when overall portfolio is in loss
        if (totalGainLoss <= 0) {
            return {
                netReturns: totalGainLoss,
                netReturnsPercentage: currentTotalInvested > 0 ? (totalGainLoss / currentTotalInvested) * 100 : 0,
                grossReturnsPercentage: currentTotalInvested > 0 ? (totalGainLoss / currentTotalInvested) * 100 : 0
            };
        }

        const totalAdjustedReturns = holdings.reduce((sum, h) => {
            const gross = h.current_value - h.invested_amount;
            if (gross <= 0) return sum + gross;

            const purchaseDate = new Date(h.created_at || new Date().toISOString());
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const isLongTerm = purchaseDate < oneYearAgo;
            const taxRate = isLongTerm ? ltcgTax : stcgTax;
            const taxAmount = gross * (taxRate / 100);
            return sum + (gross - taxAmount);
        }, 0);

        return {
            netReturns: totalAdjustedReturns,
            netReturnsPercentage: currentTotalInvested > 0 ? (totalAdjustedReturns / currentTotalInvested) * 100 : 0,
            grossReturnsPercentage: currentTotalInvested > 0 ? (totalGainLoss / currentTotalInvested) * 100 : 0
        };
    }, [holdings, ltcgTax, stcgTax, totalGainLoss]);

    // Generate Charts
    const chartData = useMemo(() => {
        if (!totalCurrentValue) return undefined;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonthIndex = new Date().getMonth();

        // Simulate a curve anchored to the REAL current value
        const generateCurve = (monthsCount: number, volatility: number) => {
            const data = [];
            let val = totalCurrentValue;
            for (let i = 0; i < monthsCount; i++) {
                const date = new Date();
                date.setMonth(currentMonthIndex - i);
                const monthName = months[date.getMonth()];
                data.unshift({ name: monthName, value: val });
                val = val / (1 + (Math.random() * volatility));
            }
            return data;
        };

        const yearData = generateCurve(12, 0.02);
        return {
            '1Y': yearData,
            '6M': yearData.slice(6),
            '3M': yearData.slice(9),
            '1M': [
                { name: 'Week 1', value: totalCurrentValue * 0.96 },
                { name: 'Week 2', value: totalCurrentValue * 0.98 },
                { name: 'Week 3', value: totalCurrentValue * 0.99 },
                { name: 'Week 4', value: totalCurrentValue },
            ]
        };
    }, [totalCurrentValue]);

    const distributionData = useMemo(() => {
        const dist: Record<string, number> = {};
        holdings.forEach(h => {
             // Use Name for allocation distribution
            const name = (h as any).mutual_fund?.name || (h as any).scheme_code || 'Other';
            
            // Or if we strictly want Fund Name:
            dist[name] = (dist[name] || 0) + h.current_value;
        });
        const total = totalCurrentValue || 1;
        return Object.entries(dist).map(([name, val], idx) => ({
            name,
            value: Number(((val / total) * 100).toFixed(1)),
            color: COLORS[idx % COLORS.length]
        })).sort((a, b) => b.value - a.value);
    }, [holdings, totalCurrentValue]);

    const displayReturns = showPostTax ? netReturns : totalGainLoss;
    const displayReturnsPercentage = showPostTax ? netReturnsPercentage : grossReturnsPercentage;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6">
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="animate-spin mx-auto text-[var(--accent-mint)] mb-2" size={32} />
                        <p className="text-[var(--text-secondary)]">Loading your dashboard...</p>
                    </div>
                </main>
                <Sidebar />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-6 md:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-14 md:pr-0">
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold">
                                Welcome, <span className="bg-gradient-to-r from-[var(--accent-mint)] to-[var(--accent-blue)] bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Investor'}</span>
                            </h1>
                            <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">
                                Your real-time investment overview
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPostTax(!showPostTax)}
                                className={`flex items-center gap-2 px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-0 rounded-lg border transition-all ${showPostTax
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

                {/* Live Market Indices */}
                <div className="mb-6">
                    <MarketIndicesTracker />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet size={16} className="text-[var(--accent-blue)]" />
                            <span className="text-[var(--text-secondary)] text-xs">Invested</span>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Target size={16} className="text-[var(--accent-purple)]" />
                            <span className="text-[var(--text-secondary)] text-xs">Current Value</span>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{formatCurrency(totalCurrentValue)}</p>
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
                            <span className="text-[10px] text-[var(--text-secondary)]">Tax Adjusted</span>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Charts */}
                    <div className="lg:col-span-2">
                         <AssetChartCard 
                            customChartData={chartData} 
                            customAumValues={{
                                currentValue: totalCurrentValue,
                                investedValue: totalInvested,
                                gainLoss: totalGainLoss
                            }} 
                        />
                    </div>
                    
                    {/* Right Column: Distribution & SIPs */}
                    <div className="space-y-6">
                        <DistributionCard customData={distributionData} />
                        
                        {/* Start investing nudge if empty */}
                        {holdings.length === 0 && (
                            <div className="glass-card p-6 rounded-2xl text-center">
                                <PiggyBank className="w-12 h-12 text-[var(--accent-mint)] mx-auto mb-3" />
                                <h3 className="font-semibold text-[var(--text-primary)]">Start Investing</h3>
                                <p className="text-sm text-[var(--text-secondary)] mt-1 mb-4">You haven't started your journey yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Key Holdings & SIP Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Holdings Preview */}
                    <div className="glass-card rounded-2xl p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
                                <PiggyBank size={20} className="text-[var(--accent-mint)]" />
                                Portfolio Highlights
                            </h3>
                            <Link href="/portfolio" className="text-xs text-[var(--accent-mint)] flex items-center hover:underline">
                                View All <ArrowRight size={12} className="ml-1"/>
                            </Link>
                        </div>
                        
                        {holdings.length > 0 ? (
                            <div className="space-y-3">
                                {holdings.slice(0, 3).map((h, idx) => (
                                    <div key={h.id} className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] flex justify-between items-center">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${COLORS[idx % COLORS.length]}20` }}>
                                                <PiggyBank size={14} style={{ color: COLORS[idx % COLORS.length] }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[150px]">{h.mutual_fund?.name || (h.scheme_code || 'Scheme Name')}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{formatCurrency(h.current_value)}</p>
                                            </div>
                                        </div>
                                        <div className={`text-xs font-medium ${h.gain_loss_percentage >= 0 ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                            {h.gain_loss_percentage >= 0 ? '+' : ''}{h.gain_loss_percentage.toFixed(1)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No holdings yet.</p>
                        )}
                    </div>

                    {/* SIP Summary */}
                    {activeSIPs.length > 0 && (
                        <div className="glass-card rounded-2xl p-4 md:p-6">
                            <h3 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-[var(--accent-blue)]" />
                                Active SIPs
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                    <p className="text-[var(--text-secondary)] text-xs mb-1">Monthly Invest</p>
                                    <p className="text-[var(--text-primary)] font-bold">{formatCurrency(totalMonthlyAmount)}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)]">
                                    <p className="text-[var(--text-secondary)] text-xs mb-1">Active Plans</p>
                                    <p className="text-[var(--text-primary)] font-bold">{activeSIPs.length}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] col-span-2">
                                    <p className="text-[var(--text-secondary)] text-xs mb-1">Next Due</p>
                                    <p className="text-[var(--text-primary)] font-bold">
                                         {activeSIPs[0].next_execution_date 
                                            ? new Date(activeSIPs[0].next_execution_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                            : 'N/A'
                                         }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Sidebar />
        </div>
    );
}
