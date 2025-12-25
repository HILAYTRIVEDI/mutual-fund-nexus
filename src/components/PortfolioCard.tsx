'use client';

import { Coins, TrendingUp, TrendingDown } from 'lucide-react';

const portfolioAssets = [
    {
        symbol: 'USDT',
        name: 'Tether USD',
        amount: '45,000.00',
        value: '$45,000.00',
        change: 0,
        color: '#26A17B',
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        amount: '12.5',
        value: '$42,500.00',
        change: 2.4,
        color: '#627EEA',
    },
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        amount: '0.85',
        value: '$35,500.00',
        change: -1.2,
        color: '#F7931A',
    },
];

export default function PortfolioCard() {
    return (
        <div className="bg-[#151A21] rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Portfolio</h3>
                <button className="text-[#10B981] text-sm font-medium hover:underline">
                    View All
                </button>
            </div>

            <div className="space-y-4">
                {portfolioAssets.map((asset) => (
                    <div
                        key={asset.symbol}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
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
                            <div className="flex items-center justify-end gap-1 text-xs">
                                <span className="text-[#9CA3AF]">{asset.amount}</span>
                                {asset.change !== 0 && (
                                    <span
                                        className={`flex items-center gap-0.5 ${asset.change > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                                            }`}
                                    >
                                        {asset.change > 0 ? (
                                            <TrendingUp size={12} />
                                        ) : (
                                            <TrendingDown size={12} />
                                        )}
                                        {Math.abs(asset.change)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
