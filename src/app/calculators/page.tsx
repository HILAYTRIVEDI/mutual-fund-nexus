'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, PiggyBank, Wallet, IndianRupee, Percent, Calendar, ArrowUpCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

type CalculatorType = 'sip' | 'lumpsum' | 'step-up-sip';

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CalculatorsPage() {
    const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('sip');
    
    // SIP Calculator State
    const [sipAmount, setSipAmount] = useState(10000);
    const [sipTenure, setSipTenure] = useState(10);
    const [sipRate, setSipRate] = useState(12);
    
    // Lumpsum Calculator State
    const [lumpsumAmount, setLumpsumAmount] = useState(100000);
    const [lumpsumTenure, setLumpsumTenure] = useState(10);
    const [lumpsumRate, setLumpsumRate] = useState(12);

    // Step-up SIP Calculator State
    const [stepUpAmount, setStepUpAmount] = useState(10000);
    const [stepUpRate, setStepUpRate] = useState(12);
    const [stepUpTenure, setStepUpTenure] = useState(10);
    const [stepUpIncrement, setStepUpIncrement] = useState(10); // annual increment %

    // SIP Calculation
    const sipResult = useMemo(() => {
        const P = sipAmount;
        const n = sipTenure * 12; // months
        const r = sipRate / 100 / 12; // monthly rate
        
        // Future Value of SIP: P * [(1+r)^n - 1] / r * (1+r)
        const futureValue = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        const totalInvested = P * n;
        const estimatedReturns = futureValue - totalInvested;
        
        // Absolute Return: (FV - P) / P * 100
        const absoluteReturn = ((futureValue - totalInvested) / totalInvested) * 100;
        
        // CAGR: (FV/P)^(1/n) - 1 (using years)
        const cagr = (Math.pow(futureValue / totalInvested, 1 / sipTenure) - 1) * 100;
        
        return {
            futureValue: Math.round(futureValue),
            totalInvested: Math.round(totalInvested),
            estimatedReturns: Math.round(estimatedReturns),
            returnsPercentage: ((estimatedReturns / totalInvested) * 100).toFixed(1),
            absoluteReturn: absoluteReturn.toFixed(2),
            cagr: cagr.toFixed(2),
        };
    }, [sipAmount, sipTenure, sipRate]);

    // Lumpsum Calculation
    const lumpsumResult = useMemo(() => {
        const P = lumpsumAmount;
        const n = lumpsumTenure;
        const r = lumpsumRate / 100;
        
        // Future Value: P * (1 + r)^n
        const futureValue = P * Math.pow(1 + r, n);
        const estimatedReturns = futureValue - P;
        
        // Absolute Return: (FV - P) / P * 100
        const absoluteReturn = ((futureValue - P) / P) * 100;
        
        // CAGR: (FV/P)^(1/n) - 1
        const cagr = (Math.pow(futureValue / P, 1 / n) - 1) * 100;
        
        return {
            futureValue: Math.round(futureValue),
            totalInvested: P,
            estimatedReturns: Math.round(estimatedReturns),
            returnsPercentage: ((estimatedReturns / P) * 100).toFixed(1),
            absoluteReturn: absoluteReturn.toFixed(2),
            cagr: cagr.toFixed(2),
        };
    }, [lumpsumAmount, lumpsumTenure, lumpsumRate]);

    // Step-up SIP Calculation (iterative, year-by-year increment)
    const stepUpResult = useMemo(() => {
        const monthlyRate = stepUpRate / 100 / 12;
        let balance = 0;
        let totalInvested = 0;

        for (let year = 0; year < stepUpTenure; year++) {
            const monthlyAmount = stepUpAmount * Math.pow(1 + stepUpIncrement / 100, year);
            for (let month = 0; month < 12; month++) {
                balance = (balance + monthlyAmount) * (1 + monthlyRate);
                totalInvested += monthlyAmount;
            }
        }

        const futureValue = Math.round(balance);
        const invested = Math.round(totalInvested);
        const estimatedReturns = futureValue - invested;
        const absoluteReturn = ((futureValue - invested) / invested) * 100;
        const cagr = (Math.pow(futureValue / invested, 1 / stepUpTenure) - 1) * 100;
        const lastYearSIP = stepUpAmount * Math.pow(1 + stepUpIncrement / 100, stepUpTenure - 1);

        return {
            futureValue,
            totalInvested: invested,
            estimatedReturns: Math.round(estimatedReturns),
            returnsPercentage: ((estimatedReturns / invested) * 100).toFixed(1),
            absoluteReturn: absoluteReturn.toFixed(2),
            cagr: cagr.toFixed(2),
            lastYearSIP: Math.round(lastYearSIP),
        };
    }, [stepUpAmount, stepUpRate, stepUpTenure, stepUpIncrement]);

    const currentResult = activeCalculator === 'sip' ? sipResult : activeCalculator === 'lumpsum' ? lumpsumResult : stepUpResult;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-6 pr-14 md:pr-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-mint)] to-[var(--accent-blue)] flex items-center justify-center">
                            <Calculator size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">Investment Calculators</h1>
                            <p className="text-[var(--text-secondary)] text-xs md:text-sm">
                                Plan your investments with SIP and Lumpsum calculators
                            </p>
                        </div>
                    </div>
                </header>

                {/* Calculator Type Toggle */}
                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-[var(--bg-hover)]/50 rounded-xl w-fit border border-[var(--border-primary)]">
                    <button
                        onClick={() => setActiveCalculator('sip')}
                        className={`px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                            activeCalculator === 'sip'
                                ? 'bg-gradient-to-r from-[var(--accent-mint)] to-[var(--accent-blue)] text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <PiggyBank size={16} />
                        SIP Calculator
                    </button>
                    <button
                        onClick={() => setActiveCalculator('lumpsum')}
                        className={`px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                            activeCalculator === 'lumpsum'
                                ? 'bg-gradient-to-r from-[var(--accent-purple)] to-[#D4B87A] text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <Wallet size={16} />
                        Lumpsum Calculator
                    </button>
                    <button
                        onClick={() => setActiveCalculator('step-up-sip')}
                        className={`px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                            activeCalculator === 'step-up-sip'
                                ? 'bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <ArrowUpCircle size={16} />
                        Step-up SIP
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <div className="glass-card rounded-2xl p-5 md:p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            {activeCalculator === 'sip' ? (
                                <>
                                    <PiggyBank size={20} className="text-[var(--accent-mint)]" />
                                    SIP Calculator
                                </>
                            ) : activeCalculator === 'lumpsum' ? (
                                <>
                                    <Wallet size={20} className="text-[var(--accent-purple)]" />
                                    Lumpsum Calculator
                                </>
                            ) : (
                                <>
                                    <ArrowUpCircle size={20} className="text-[#F59E0B]" />
                                    Step-up SIP Calculator
                                </>
                            )}
                        </h2>

                        <div className="space-y-6">
                            {/* Amount Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                                        <IndianRupee size={14} />
                                        {activeCalculator === 'lumpsum' ? 'Investment Amount' : 'Monthly Investment'}
                                    </label>
                                    <div className="flex items-center gap-1 bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                        <span className="text-[var(--text-secondary)] text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={activeCalculator === 'sip' ? sipAmount : activeCalculator === 'lumpsum' ? lumpsumAmount : stepUpAmount}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (activeCalculator === 'sip') setSipAmount(val);
                                                else if (activeCalculator === 'lumpsum') setLumpsumAmount(val);
                                                else setStepUpAmount(val);
                                            }}
                                            className="bg-transparent w-24 text-right text-[var(--text-primary)] font-medium focus:outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={activeCalculator === 'lumpsum' ? 10000 : 500}
                                    max={activeCalculator === 'lumpsum' ? 10000000 : 100000}
                                    step={activeCalculator === 'lumpsum' ? 10000 : 500}
                                    value={activeCalculator === 'sip' ? sipAmount : activeCalculator === 'lumpsum' ? lumpsumAmount : stepUpAmount}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (activeCalculator === 'sip') setSipAmount(val);
                                        else if (activeCalculator === 'lumpsum') setLumpsumAmount(val);
                                        else setStepUpAmount(val);
                                    }}
                                    className="w-full h-2 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-mint)]"
                                />
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                    <span>{activeCalculator === 'lumpsum' ? '₹10K' : '₹500'}</span>
                                    <span>{activeCalculator === 'lumpsum' ? '₹1Cr' : '₹1L'}</span>
                                </div>
                            </div>

                            {/* Annual Step-up Rate — only for step-up SIP */}
                            {activeCalculator === 'step-up-sip' && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                                            <ArrowUpCircle size={14} />
                                            Annual Step-up Rate
                                        </label>
                                        <div className="flex items-center gap-1 bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                            <input
                                                type="number"
                                                value={stepUpIncrement}
                                                onChange={(e) => setStepUpIncrement(parseFloat(e.target.value) || 0)}
                                                className="bg-transparent w-12 text-right text-[var(--text-primary)] font-medium focus:outline-none text-sm"
                                            />
                                            <span className="text-[var(--text-secondary)] text-sm">%</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={50}
                                        step={1}
                                        value={stepUpIncrement}
                                        onChange={(e) => setStepUpIncrement(parseInt(e.target.value))}
                                        className="w-full h-2 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer"
                                        style={{ accentColor: '#F59E0B' }}
                                    />
                                    <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                        <span>0%</span>
                                        <span>50%</span>
                                    </div>
                                    {stepUpIncrement > 0 && (
                                        <p className="text-[10px] text-[#F59E0B] mt-1">
                                            Your SIP grows from {formatCurrency(stepUpAmount)}/mo to {formatCurrency(stepUpResult.lastYearSIP)}/mo by year {stepUpTenure}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Expected Return Rate */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                                        <Percent size={14} />
                                        Expected Return Rate (p.a.)
                                    </label>
                                    <div className="flex items-center gap-1 bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                        <input
                                            type="number"
                                            value={activeCalculator === 'sip' ? sipRate : activeCalculator === 'lumpsum' ? lumpsumRate : stepUpRate}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (activeCalculator === 'sip') setSipRate(val);
                                                else if (activeCalculator === 'lumpsum') setLumpsumRate(val);
                                                else setStepUpRate(val);
                                            }}
                                            className="bg-transparent w-12 text-right text-[var(--text-primary)] font-medium focus:outline-none text-sm"
                                        />
                                        <span className="text-[var(--text-secondary)] text-sm">%</span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={30}
                                    step={0.5}
                                    value={activeCalculator === 'sip' ? sipRate : activeCalculator === 'lumpsum' ? lumpsumRate : stepUpRate}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (activeCalculator === 'sip') setSipRate(val);
                                        else if (activeCalculator === 'lumpsum') setLumpsumRate(val);
                                        else setStepUpRate(val);
                                    }}
                                    className="w-full h-2 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-mint)]"
                                />
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                    <span>1%</span>
                                    <span>30%</span>
                                </div>
                            </div>

                            {/* Time Period */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                                        <Calendar size={14} />
                                        Time Period
                                    </label>
                                    <div className="flex items-center gap-1 bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                        <input
                                            type="number"
                                            value={activeCalculator === 'sip' ? sipTenure : activeCalculator === 'lumpsum' ? lumpsumTenure : stepUpTenure}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                if (activeCalculator === 'sip') setSipTenure(val);
                                                else if (activeCalculator === 'lumpsum') setLumpsumTenure(val);
                                                else setStepUpTenure(val);
                                            }}
                                            className="bg-transparent w-8 text-right text-[var(--text-primary)] font-medium focus:outline-none text-sm"
                                        />
                                        <span className="text-[var(--text-secondary)] text-sm">Years</span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={30}
                                    step={1}
                                    value={activeCalculator === 'sip' ? sipTenure : activeCalculator === 'lumpsum' ? lumpsumTenure : stepUpTenure}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (activeCalculator === 'sip') setSipTenure(val);
                                        else if (activeCalculator === 'lumpsum') setLumpsumTenure(val);
                                        else setStepUpTenure(val);
                                    }}
                                    className="w-full h-2 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-mint)]"
                                />
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                    <span>1 Yr</span>
                                    <span>30 Yrs</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="glass-card rounded-2xl p-5 md:p-6 relative overflow-hidden">
                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${
                            activeCalculator === 'sip'
                                ? 'from-[var(--accent-mint)]/10 via-transparent to-[var(--accent-blue)]/5'
                                : activeCalculator === 'lumpsum'
                                ? 'from-[var(--accent-purple)]/10 via-transparent to-[var(--accent-mint)]/5'
                                : 'from-[#F59E0B]/10 via-transparent to-[#EF4444]/5'
                        } pointer-events-none`} />
                        
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 relative z-10">
                            <TrendingUp size={20} className={
                                activeCalculator === 'sip' ? 'text-[var(--accent-mint)]'
                                : activeCalculator === 'lumpsum' ? 'text-[var(--accent-purple)]'
                                : 'text-[#F59E0B]'
                            } />
                            Estimated Returns
                        </h2>

                        {/* Main Value */}
                        <div className="text-center mb-8 relative z-10">
                            <p className="text-[var(--text-secondary)] text-sm mb-2">Future Value</p>
                            <p className={`text-4xl md:text-5xl font-bold ${
                                activeCalculator === 'sip' ? 'text-[var(--accent-mint)]'
                                : activeCalculator === 'lumpsum' ? 'text-[var(--accent-purple)]'
                                : 'text-[#F59E0B]'
                            }`}>
                                {formatCurrency(currentResult.futureValue)}
                            </p>
                            <p className="text-[var(--text-secondary)] text-xs mt-2">
                                After {activeCalculator === 'sip' ? sipTenure : activeCalculator === 'lumpsum' ? lumpsumTenure : stepUpTenure} years
                            </p>
                        </div>

                        {/* Breakdown Cards */}
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)] text-[10px] mb-1">Invested Amount</p>
                                <p className="text-[var(--text-primary)] font-bold text-base">
                                    {formatCurrency(currentResult.totalInvested)}
                                </p>
                                {activeCalculator !== 'lumpsum' && (
                                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                                        {(activeCalculator === 'sip' ? sipTenure : stepUpTenure) * 12} monthly investments
                                    </p>
                                )}
                            </div>
                            <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)] text-[10px] mb-1">Est. Returns</p>
                                <p className={`font-bold text-base ${
                                    activeCalculator === 'sip' ? 'text-[var(--accent-mint)]'
                                    : activeCalculator === 'lumpsum' ? 'text-[var(--accent-purple)]'
                                    : 'text-[#F59E0B]'
                                }`}>
                                    +{formatCurrency(currentResult.estimatedReturns)}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)] text-[10px] mb-1">Absolute Return</p>
                                <p className={`font-bold text-base ${
                                    activeCalculator === 'sip' ? 'text-[var(--accent-mint)]'
                                    : activeCalculator === 'lumpsum' ? 'text-[var(--accent-purple)]'
                                    : 'text-[#F59E0B]'
                                }`}>
                                    +{currentResult.absoluteReturn}%
                                </p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Total growth</p>
                            </div>
                            <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)] text-[10px] mb-1">CAGR</p>
                                <p className={`font-bold text-base ${
                                    activeCalculator === 'sip' ? 'text-[var(--accent-mint)]'
                                    : activeCalculator === 'lumpsum' ? 'text-[var(--accent-purple)]'
                                    : 'text-[#F59E0B]'
                                }`}>
                                    {currentResult.cagr}%
                                </p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Annualized return</p>
                            </div>
                        </div>

                        {/* Visual Breakdown Bar */}
                        <div className="mt-6 relative z-10">
                            <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                                <div 
                                    className="bg-[var(--accent-blue)] transition-all duration-500"
                                    style={{ 
                                        width: `${(currentResult.totalInvested / currentResult.futureValue) * 100}%` 
                                    }}
                                />
                                <div
                                    className={`${
                                        activeCalculator === 'sip' ? 'bg-[var(--accent-mint)]'
                                        : activeCalculator === 'lumpsum' ? 'bg-[var(--accent-purple)]'
                                        : 'bg-[#F59E0B]'
                                    } transition-all duration-500`}
                                    style={{
                                        width: `${(currentResult.estimatedReturns / currentResult.futureValue) * 100}%`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)]" />
                                    <span className="text-[var(--text-secondary)]">Invested</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                        activeCalculator === 'sip' ? 'bg-[var(--accent-mint)]'
                                        : activeCalculator === 'lumpsum' ? 'bg-[var(--accent-purple)]'
                                        : 'bg-[#F59E0B]'
                                    }`} />
                                    <span className="text-[var(--text-secondary)]">Returns</span>
                                </div>
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <p className="text-[10px] text-[var(--text-muted)] text-center mt-6 relative z-10">
                            * Calculations are for illustration purposes only. Actual returns may vary.
                        </p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <PiggyBank size={16} className="text-[var(--accent-mint)]" />
                            What is SIP?
                        </h3>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                            A Systematic Investment Plan (SIP) allows you to invest a fixed amount regularly in mutual funds.
                            It helps in rupee cost averaging and building wealth over time through the power of compounding.
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Wallet size={16} className="text-[var(--accent-purple)]" />
                            What is Lumpsum?
                        </h3>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                            A lumpsum investment is a one-time investment where you invest a large amount at once.
                            It's suitable when you have surplus funds and want to benefit from market timing and long-term growth.
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <ArrowUpCircle size={16} className="text-[#F59E0B]" />
                            What is Step-up SIP?
                        </h3>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                            A Step-up SIP (also called Top-up SIP) lets you increase your monthly investment by a fixed percentage each year.
                            As your income grows, your SIP grows too — maximising the power of compounding over time.
                        </p>
                    </div>
                </div>
            </main>

            <Sidebar />
        </div>
    );
}
