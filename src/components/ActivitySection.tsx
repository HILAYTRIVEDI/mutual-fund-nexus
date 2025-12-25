'use client';

import { Smartphone, AlertTriangle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

const securityAlerts = [
    {
        id: 1,
        title: 'New device logged in!',
        device: 'iPhone X',
        location: 'New York, US',
        time: '2 hours ago',
    },
    {
        id: 2,
        title: 'New device logged in!',
        device: 'MacBook Pro',
        location: 'London, UK',
        time: '1 day ago',
    },
];

const transactions = [
    {
        id: 1,
        type: 'Deposit',
        asset: 'ETH',
        amount: '+2.5 ETH',
        value: '$8,500.00',
        time: '10 min ago',
        icon: ArrowDownLeft,
        isPositive: true,
    },
    {
        id: 2,
        type: 'Withdrawal',
        asset: 'USDT',
        amount: '-1,000 USDT',
        value: '$1,000.00',
        time: '2 hours ago',
        icon: ArrowUpRight,
        isPositive: false,
    },
    {
        id: 3,
        type: 'Swap',
        asset: 'BTC → ETH',
        amount: '0.1 BTC → 1.5 ETH',
        value: '$4,200.00',
        time: '5 hours ago',
        icon: ArrowLeftRight,
        isPositive: true,
    },
];

export default function ActivitySection() {
    return (
        <div className="space-y-4">
            {/* Security Alerts */}
            <div className="bg-[#151A21] rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Security Alerts</h3>
                    <span className="text-[#EF4444] text-xs font-medium px-2 py-1 bg-[#EF4444]/10 rounded-full">
                        2 New
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {securityAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
                                    <Smartphone size={18} className="text-[#EF4444]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                        <AlertTriangle size={12} className="text-[#EF4444]" />
                                        <p className="text-[#EF4444] text-xs font-medium truncate">
                                            {alert.title}
                                        </p>
                                    </div>
                                    <p className="text-white text-sm font-medium">{alert.device}</p>
                                    <p className="text-[#9CA3AF] text-xs">
                                        {alert.location} • {alert.time}
                                    </p>
                                </div>
                            </div>
                            <button className="w-full mt-3 py-2 rounded-lg border border-[#EF4444]/30 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/10 transition-colors">
                                Log Out Device
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-[#151A21] rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Recent Transactions</h3>
                    <button className="text-[#10B981] text-sm font-medium hover:underline">
                        View All
                    </button>
                </div>

                <div className="space-y-3">
                    {transactions.map((tx) => (
                        <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.isPositive ? 'bg-[#10B981]/10' : 'bg-[#EF4444]/10'
                                        }`}
                                >
                                    <tx.icon
                                        size={18}
                                        className={tx.isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}
                                    />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">{tx.type}</p>
                                    <p className="text-[#9CA3AF] text-xs">{tx.asset}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p
                                    className={`text-sm font-medium ${tx.isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
                                        }`}
                                >
                                    {tx.amount}
                                </p>
                                <p className="text-[#9CA3AF] text-xs">{tx.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
