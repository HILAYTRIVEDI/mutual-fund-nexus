'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

const marketData = [
    {
        name: 'Bitcoin',
        symbol: 'BTC',
        price: '$41,823.00',
        change: 2.34,
        marketCap: '$819.2B',
        volume: '$28.4B',
        color: '#F7931A',
    },
    {
        name: 'Ethereum',
        symbol: 'ETH',
        price: '$2,245.00',
        change: -1.56,
        marketCap: '$269.8B',
        volume: '$12.1B',
        color: '#627EEA',
    },
    {
        name: 'Tether',
        symbol: 'USDT',
        price: '$1.00',
        change: 0.01,
        marketCap: '$91.2B',
        volume: '$45.2B',
        color: '#26A17B',
    },
    {
        name: 'Solana',
        symbol: 'SOL',
        price: '$102.45',
        change: 5.67,
        marketCap: '$44.8B',
        volume: '$2.8B',
        color: '#9945FF',
    },
];

export default function MarketSnapshot() {
    return (
        <div className="bg-[#151A21] rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Market Snapshot</h3>
                <button className="text-[#10B981] text-sm font-medium hover:underline">
                    View All
                </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 pb-3 border-b border-white/5">
                <span className="text-[#9CA3AF] text-xs font-medium">Coin</span>
                <span className="text-[#9CA3AF] text-xs font-medium text-right">Change</span>
                <span className="text-[#9CA3AF] text-xs font-medium text-right">Market Cap</span>
                <span className="text-[#9CA3AF] text-xs font-medium text-right">24h Volume</span>
                <span className="text-[#9CA3AF] text-xs font-medium text-right">Price</span>
            </div>

            {/* Table Body */}
            <div className="space-y-1">
                {marketData.map((coin) => (
                    <div
                        key={coin.symbol}
                        className="grid grid-cols-5 gap-4 py-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: `${coin.color}30` }}
                            >
                                {coin.symbol.slice(0, 2)}
                            </div>
                            <div>
                                <p className="text-white text-sm font-medium">{coin.name}</p>
                                <p className="text-[#9CA3AF] text-xs">{coin.symbol}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end">
                            <span
                                className={`flex items-center gap-1 text-sm font-medium ${coin.change >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                                    }`}
                            >
                                {coin.change >= 0 ? (
                                    <TrendingUp size={14} />
                                ) : (
                                    <TrendingDown size={14} />
                                )}
                                {coin.change >= 0 ? '+' : ''}
                                {coin.change}%
                            </span>
                        </div>
                        <div className="flex items-center justify-end">
                            <span className="text-white text-sm">{coin.marketCap}</span>
                        </div>
                        <div className="flex items-center justify-end">
                            <span className="text-white text-sm">{coin.volume}</span>
                        </div>
                        <div className="flex items-center justify-end">
                            <span className="text-white text-sm font-medium">{coin.price}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
