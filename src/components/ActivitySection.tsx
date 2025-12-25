'use client';

import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

const transactions = [
    {
        id: 1,
        type: 'SIP Executed',
        fund: 'HDFC Top 100',
        amount: '+₹50,000',
        units: '56.02 units',
        time: '5th Dec',
        icon: ArrowDownLeft,
        isPositive: true,
    },
    {
        id: 2,
        type: 'Redemption',
        fund: 'Axis Liquid Fund',
        amount: '-₹2,00,000',
        units: '1,823.45 units',
        time: '2 Dec',
        icon: ArrowUpRight,
        isPositive: false,
    },
    {
        id: 3,
        type: 'Switch',
        fund: 'ICICI → HDFC',
        amount: '₹1,50,000',
        units: 'Direct Plan',
        time: '28 Nov',
        icon: ArrowLeftRight,
        isPositive: true,
    },
    {
        id: 4,
        type: 'SIP Executed',
        fund: 'SBI Bluechip Fund',
        amount: '+₹25,000',
        units: '319.12 units',
        time: '25 Nov',
        icon: ArrowDownLeft,
        isPositive: true,
    },
    {
        id: 5,
        type: 'Lumpsum',
        fund: 'Parag Parikh Flexi',
        amount: '+₹5,00,000',
        units: '8,006.41 units',
        time: '20 Nov',
        icon: ArrowDownLeft,
        isPositive: true,
    },
];

export default function ActivitySection() {
    return (
        <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-mint)]/5 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-[var(--text-primary)] font-semibold">Recent Transactions</h3>
                <button className="text-[var(--accent-mint)] text-sm font-medium hover:underline hover:text-[var(--accent-mint)] transition-colors">
                    View All
                </button>
            </div>

            <div className="space-y-3 relative z-10">
                {transactions.map((tx) => (
                    <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-[var(--bg-hover)] hover:to-transparent transition-all duration-300 group"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${tx.isPositive
                                        ? 'bg-gradient-to-br from-[var(--accent-mint)]/20 to-[var(--accent-mint)]/5 shadow-lg shadow-[var(--accent-mint)]/20'
                                        : 'bg-gradient-to-br from-[var(--accent-red)]/20 to-[var(--accent-red)]/5 shadow-lg shadow-[var(--accent-red)]/20'
                                    }`}
                            >
                                <tx.icon
                                    size={18}
                                    className={tx.isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}
                                />
                            </div>
                            <div>
                                <p className="text-[var(--text-primary)] text-sm font-medium">{tx.type}</p>
                                <p className="text-[var(--text-secondary)] text-xs">{tx.fund}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p
                                className={`text-sm font-medium ${tx.isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'
                                    }`}
                            >
                                {tx.amount}
                            </p>
                            <p className="text-[var(--text-secondary)] text-xs">{tx.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
