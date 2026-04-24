'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, PiggyBank, Wallet, IndianRupee, Percent, Calendar, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

type CalculatorType = 'sip' | 'lumpsum' | 'step-up-sip' | 'swp';

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

    // SWP Calculator State
    const [swpCorpus, setSwpCorpus] = useState(1000000);
    const [swpWithdrawal, setSwpWithdrawal] = useState(10000);
    const [swpRate, setSwpRate] = useState(8);
    const [swpTenure, setSwpTenure] = useState(10);

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

    // SWP Calculation
    const swpResult = useMemo(() => {
        const monthlyRate = swpRate / 100 / 12;
        let balance = swpCorpus;
        const totalMonths = swpTenure * 12;
        let totalWithdrawn = 0;
        let fundLasted = totalMonths;

        for (let m = 1; m <= totalMonths; m++) {
            balance = balance * (1 + monthlyRate);
            balance -= swpWithdrawal;
            totalWithdrawn += swpWithdrawal;
            if (balance <= 0) {
                balance = 0;
                fundLasted = m;
                break;
            }
        }

        const remainingBalance = Math.round(Math.max(balance, 0));
        const totalReturnsEarned = remainingBalance + Math.round(totalWithdrawn) - swpCorpus;

        return {
            futureValue: remainingBalance,
            totalInvested: swpCorpus,
            totalWithdrawn: Math.round(totalWithdrawn),
            estimatedReturns: Math.round(totalReturnsEarned),
            returnsPercentage: ((totalReturnsEarned / swpCorpus) * 100).toFixed(1),
            absoluteReturn: ((totalReturnsEarned / swpCorpus) * 100).toFixed(2),
            cagr: swpTenure > 0 && remainingBalance > 0
                ? ((Math.pow((remainingBalance + totalWithdrawn) / swpCorpus, 1 / swpTenure) - 1) * 100).toFixed(2)
                : '0.00',
            fundLasted,
            fundExhausted: balance <= 0,
        };
    }, [swpCorpus, swpWithdrawal, swpRate, swpTenure]);

    const currentResult = activeCalculator === 'sip' ? sipResult : activeCalculator === 'lumpsum' ? lumpsumResult : activeCalculator === 'swp' ? swpResult : stepUpResult;

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

                {/* Disclaimer */}
                <div className="mt-6 mb-6 p-4 rounded-xl bg-[var(--accent-gold)]/5 border border-[var(--accent-gold)]/15 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-[var(--accent-gold)] shrink-0 mt-0.5" />
                    <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                        <span className="font-semibold text-[var(--accent-gold)]">Disclaimer:</span> Please note that these calculators are for illustrations only and do not represent actual returns. Stock Market does not have a fixed rate of return and it is not possible to predict the rate of return.
                    </p>
                </div>

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
                    <button
                        onClick={() => setActiveCalculator('swp')}
                        className={`px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                            activeCalculator === 'swp'
                                ? 'bg-gradient-to-r from-[#EF4444] to-[#EC4899] text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <ArrowDownCircle size={16} />
                        SWP
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
                            ) : activeCalculator === 'swp' ? (
                                <>
                                    <ArrowDownCircle size={20} className="text-[#EF4444]" />
                                    SWP Calculator
                                </>
                            ) : (
                                <>
                                    <ArrowUpCircle size={20} className="text-[#F59E0B]" />
                                    Step-up SIP Calculator
                                </>
                            )}
                        </h2>

                        <div className="space-y-6">
                            {/* SWP-specific inputs */}
                            {activeCalculator === 'swp' ? (
                                <>
                                    {/* Total Corpus */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                                                <Wallet size={14} />
                                                Total Investment (Corpus)
                                            </label>
                                            <div className="flex items-center gap-1 bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                                <span className="text-[var(--text-secondary)] text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    value={swpCorpus}
                                                    onChange={(e) => setSwpCorpus(parseInt(e.target.value) || 0)}
                                                    className="bg-transparent w-24 text-right text-[var(--text-primary)] font-medium focus:outline-none text-sm"
                                                />
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min={100000}
                                            max={50000000}
                                            step={100000}
                                            value={swpCorpus}
                                            onChange={(e) => setSwpCorpus(parseInt(e.target.value))}
                                            className="w-full h-2 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer"
                                            style={{ accentColor: '#EF4444' }}
                                        />
                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                            <span>₹1L</span>
                                            <span>₹5Cr</span>
                                        </div>
                                    </div>

                                    {/* Monthly Withdrawal */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                                                <ArrowDownCircle size={14} />
                                                Monthly Withdrawal
                                            </label>
                                            <div className="flex items-center gap-1 bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                                <span className="text-[var(--text-secondary)] text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    value={swpWithdrawal}
                                                    onChange={(e) => setSwpWithdrawal(parseInt(e.target.value) || 0)}
                                                    className="bg-transparent w-24 text-right text-[var(--text-primary)] font-medium focus:outline-none text-sm"
                                                />
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min={1000}
                                            max={500000}
                                            step={1000}
                                            value={swpWithdrawal}
                                            onChange={(e) => setSwpWithdrawal(parseInt(e.target.value))}
                                            className="w-full h-2 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer"
                                            style={{ accentColor: '#EF4444' }}
                                        />
                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                            <span>₹1K</span>
                                            <span>₹5L</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Amount Slider — SIP / Lumpsum / Step-up */
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
                            )}

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
                                            value={activeCalculator === 'sip' ? sipRate : activeCalculator === 'lumpsum' ? lumpsumRate : activeCalculator === 'swp' ? swpRate : stepUpRate}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (activeCalculator === 'sip') setSipRate(val);
                                                else if (activeCalculator === 'lumpsum') setLumpsumRate(val);
                                                else if (activeCalculator === 'swp') setSwpRate(val);
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
                                    value={activeCalculator === 'sip' ? sipRate : activeCalculator === 'lumpsum' ? lumpsumRate : activeCalculator === 'swp' ? swpRate : stepUpRate}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (activeCalculator === 'sip') setSipRate(val);
                                        else if (activeCalculator === 'lumpsum') setLumpsumRate(val);
                                        else if (activeCalculator === 'swp') setSwpRate(val);
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
                                        {activeCalculator === 'swp' ? 'Withdrawal Period' : 'Time Period'}
                                    </label>
                                    <div className="flex items-center gap-1 bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                        <input
                                            type="number"
                                            value={activeCalculator === 'sip' ? sipTenure : activeCalculator === 'lumpsum' ? lumpsumTenure : activeCalculator === 'swp' ? swpTenure : stepUpTenure}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                if (activeCalculator === 'sip') setSipTenure(val);
                                                else if (activeCalculator === 'lumpsum') setLumpsumTenure(val);
                                                else if (activeCalculator === 'swp') setSwpTenure(val);
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
                                    value={activeCalculator === 'sip' ? sipTenure : activeCalculator === 'lumpsum' ? lumpsumTenure : activeCalculator === 'swp' ? swpTenure : stepUpTenure}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (activeCalculator === 'sip') setSipTenure(val);
                                        else if (activeCalculator === 'lumpsum') setLumpsumTenure(val);
                                        else if (activeCalculator === 'swp') setSwpTenure(val);
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
                                : activeCalculator === 'swp'
                                ? 'from-[#EF4444]/10 via-transparent to-[#EC4899]/5'
                                : 'from-[#F59E0B]/10 via-transparent to-[#EF4444]/5'
                        } pointer-events-none`} />
                        
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 relative z-10">
                            <TrendingUp size={20} className={
                                activeCalculator === 'sip' ? 'text-[var(--accent-mint)]'
                                : activeCalculator === 'lumpsum' ? 'text-[var(--accent-purple)]'
                                : activeCalculator === 'swp' ? 'text-[#EF4444]'
                                : 'text-[#F59E0B]'
                            } />
                            {activeCalculator === 'swp' ? 'Withdrawal Summary' : 'Estimated Returns'}
                        </h2>

                        {/* Main Value */}
                        <div className="text-center mb-8 relative z-10">
                            <p className="text-[var(--text-secondary)] text-sm mb-2">
                                {activeCalculator === 'swp' ? (swpResult.fundExhausted ? 'Fund Exhausted After' : 'Remaining Balance') : 'Future Value'}
                            </p>
                            <p className={`text-4xl md:text-5xl font-bold ${
                                activeCalculator === 'sip' ? 'text-[var(--accent-mint)]'
                                : activeCalculator === 'lumpsum' ? 'text-[var(--accent-purple)]'
                                : activeCalculator === 'swp' ? 'text-[#EF4444]'
                                : 'text-[#F59E0B]'
                            }`}>
                                {activeCalculator === 'swp' && swpResult.fundExhausted
                                    ? `${Math.floor(swpResult.fundLasted / 12)}y ${swpResult.fundLasted % 12}m`
                                    : formatCurrency(currentResult.futureValue)}
                            </p>
                            <p className="text-[var(--text-secondary)] text-xs mt-2">
                                {activeCalculator === 'swp'
                                    ? (swpResult.fundExhausted
                                        ? `Corpus of ${formatCurrency(swpCorpus)} runs out before ${swpTenure} years`
                                        : `After ${swpTenure} years of withdrawal`)
                                    : `After ${activeCalculator === 'sip' ? sipTenure : activeCalculator === 'lumpsum' ? lumpsumTenure : stepUpTenure} years`}
                            </p>
                        </div>

                        {/* Breakdown Cards */}
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            {activeCalculator === 'swp' ? (
                                <>
                                    <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                        <p className="text-[var(--text-secondary)] text-[10px] mb-1">Initial Corpus</p>
                                        <p className="text-[var(--text-primary)] font-bold text-base">
                                            {formatCurrency(swpCorpus)}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                        <p className="text-[var(--text-secondary)] text-[10px] mb-1">Total Withdrawn</p>
                                        <p className="text-[#EF4444] font-bold text-base">
                                            {formatCurrency(swpResult.totalWithdrawn)}
                                        </p>
                                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                                            {formatCurrency(swpWithdrawal)}/month × {swpResult.fundExhausted ? swpResult.fundLasted : swpTenure * 12} months
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                        <p className="text-[var(--text-secondary)] text-[10px] mb-1">Returns Earned</p>
                                        <p className={`font-bold text-base ${swpResult.estimatedReturns >= 0 ? 'text-[var(--accent-mint)]' : 'text-[#EF4444]'}`}>
                                            {swpResult.estimatedReturns >= 0 ? '+' : ''}{formatCurrency(swpResult.estimatedReturns)}
                                        </p>
                                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">While withdrawing</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-hover)]/50 border border-[var(--border-primary)]">
                                        <p className="text-[var(--text-secondary)] text-[10px] mb-1">Remaining Balance</p>
                                        <p className={`font-bold text-base ${swpResult.fundExhausted ? 'text-[#EF4444]' : 'text-[var(--accent-mint)]'}`}>
                                            {swpResult.fundExhausted ? '₹0' : formatCurrency(swpResult.futureValue)}
                                        </p>
                                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                                            {swpResult.fundExhausted ? 'Fund exhausted' : `After ${swpTenure} years`}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>

                        {/* Visual Breakdown Bar */}
                        <div className="mt-6 relative z-10">
                            {activeCalculator === 'swp' ? (
                                <>
                                    <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                                        <div
                                            className="bg-[#EF4444] transition-all duration-500"
                                            style={{
                                                width: `${(swpResult.totalWithdrawn / (swpResult.totalWithdrawn + swpResult.futureValue || 1)) * 100}%`
                                            }}
                                        />
                                        <div
                                            className="bg-[var(--accent-mint)] transition-all duration-500"
                                            style={{
                                                width: `${(swpResult.futureValue / (swpResult.totalWithdrawn + swpResult.futureValue || 1)) * 100}%`
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-2 text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                            <span className="text-[var(--text-secondary)]">Withdrawn</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-mint)]" />
                                            <span className="text-[var(--text-secondary)]">Remaining</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* SWP Fund Exhaustion Warning */}
                {activeCalculator === 'swp' && swpResult.fundExhausted && (
                    <div className="mt-6 p-4 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/20 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[#EF4444] text-sm font-semibold">Fund will be exhausted early!</p>
                            <p className="text-[var(--text-secondary)] text-xs leading-relaxed mt-1">
                                At a withdrawal of {formatCurrency(swpWithdrawal)}/month with {swpRate}% annual returns, your corpus of {formatCurrency(swpCorpus)} will
                                last only <span className="font-semibold text-[var(--text-primary)]">{Math.floor(swpResult.fundLasted / 12)} years and {swpResult.fundLasted % 12} months</span>.
                                Consider reducing the withdrawal amount or increasing the corpus.
                            </p>
                        </div>
                    </div>
                )}

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <ArrowDownCircle size={16} className="text-[#EF4444]" />
                            What is SWP?
                        </h3>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                            A Systematic Withdrawal Plan (SWP) lets you withdraw a fixed amount regularly from your mutual fund investment.
                            Your remaining corpus continues to earn returns, making it ideal for generating regular income in retirement.
                        </p>
                    </div>
                </div>
            </main>

            <Sidebar />
        </div>
    );
}
