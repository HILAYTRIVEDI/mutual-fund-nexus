'use client';

import { TrendingUp, Coins } from 'lucide-react';

const stakedAssets = [
    {
        symbol: 'USDT',
        name: 'Tether USD',
        amount: '50,000.00',
        value: '$50,000.00',
        apy: '8.5%',
        rewards: '$125.50',
        color: '#26A17B',
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        amount: '10.5',
        value: '$35,700.00',
        apy: '5.2%',
        rewards: '$89.25',
        color: '#627EEA',
    },
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        amount: '0.25',
        value: '$10,300.00',
        apy: '3.8%',
        rewards: '$45.80',
        color: '#F7931A',
    },
];

export default function StakingCard() {
    return (
        <div className="bg-[#151A21] rounded-2xl border border-white/5 p-6 h-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[#9CA3AF] text-sm">Total Staked</p>
                    <div className="flex items-center gap-1 text-[#10B981] text-sm font-medium">
                        <TrendingUp size={14} />
                        +22.01%
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white">$96,000 USD</h2>
            </div>

            {/* Staked Assets List */}
            <div className="space-y-4">
                {stakedAssets.map((asset) => (
                    <div
                        key={asset.symbol}
                        className="p-4 rounded-xl bg-white/5 border border-white/5"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${asset.color}20` }}
                                >
                                    <Coins size={20} style={{ color: asset.color }} />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">{asset.symbol}</p>
                                    <p className="text-[#9CA3AF] text-xs">{asset.name}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white font-medium text-sm">{asset.value}</p>
                                <p className="text-[#9CA3AF] text-xs">{asset.amount} staked</p>
                            </div>
                        </div>

                        {/* APY and Rewards */}
                        <div className="flex items-center justify-between py-2 border-t border-white/5">
                            <div>
                                <p className="text-[#9CA3AF] text-xs">APY</p>
                                <p className="text-[#10B981] text-sm font-medium">{asset.apy}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[#9CA3AF] text-xs">Available Rewards</p>
                                <p className="text-[#10B981] text-sm font-medium">{asset.rewards}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                            <button className="flex-1 py-2 rounded-lg border border-white/10 text-[#9CA3AF] text-sm font-medium hover:bg-white/5 hover:text-white transition-colors">
                                Unstake
                            </button>
                            <button className="flex-1 py-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-sm font-medium hover:bg-[#10B981]/20 transition-colors">
                                Claim reward
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Rewards */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#10B981]/10 to-[#8B5CF6]/10 border border-[#10B981]/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[#9CA3AF] text-xs">Total Claimable Rewards</p>
                        <p className="text-white text-lg font-bold">$260.55</p>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-[#10B981] text-white text-sm font-medium hover:bg-[#10B981]/90 transition-colors">
                        Claim All
                    </button>
                </div>
            </div>
        </div>
    );
}
