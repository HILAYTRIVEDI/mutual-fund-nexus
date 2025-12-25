'use client';

import { useState } from 'react';
import { Newspaper, TrendingUp, TrendingDown, Clock, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';

interface MarketNews {
    id: string;
    title: string;
    summary: string;
    source: string;
    timestamp: string;
    impact: 'positive' | 'negative' | 'neutral';
    category: 'RBI' | 'SEBI' | 'Budget' | 'Global' | 'Economy' | 'Earnings';
}

// Mock market news - In production, this would come from a news API
const mockMarketNews: MarketNews[] = [
    {
        id: '1',
        title: 'RBI Keeps Repo Rate Unchanged at 6.5%',
        summary: 'The Reserve Bank of India maintained the status quo on interest rates, signaling focus on inflation control.',
        source: 'Economic Times',
        timestamp: '2024-12-26T09:30:00',
        impact: 'neutral',
        category: 'RBI',
    },
    {
        id: '2',
        title: 'FIIs Turn Net Buyers After 3 Months',
        summary: 'Foreign institutional investors invested ₹5,200 crore in Indian equities, boosting market sentiment.',
        source: 'Moneycontrol',
        timestamp: '2024-12-25T18:00:00',
        impact: 'positive',
        category: 'Global',
    },
    {
        id: '3',
        title: 'Q3 GDP Growth Expected at 6.8%',
        summary: 'India\'s economy shows resilience with strong domestic consumption and manufacturing growth.',
        source: 'Business Standard',
        timestamp: '2024-12-25T14:30:00',
        impact: 'positive',
        category: 'Economy',
    },
    {
        id: '4',
        title: 'SEBI Introduces New Mutual Fund Rules',
        summary: 'New guidelines mandate greater transparency in expense ratios and commission disclosures.',
        source: 'Mint',
        timestamp: '2024-12-24T16:00:00',
        impact: 'neutral',
        category: 'SEBI',
    },
    {
        id: '5',
        title: 'Global Markets Cautious Amid Fed Rate Outlook',
        summary: 'US Fed signals fewer rate cuts in 2025, impacting emerging market flows.',
        source: 'Reuters',
        timestamp: '2024-12-24T10:00:00',
        impact: 'negative',
        category: 'Global',
    },
];

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

const impactColors = {
    positive: 'var(--accent-mint)',
    negative: 'var(--accent-red)',
    neutral: 'var(--accent-blue)',
};

const impactIcons = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: AlertTriangle,
};

const categoryColors: Record<string, string> = {
    RBI: '#10B981',
    SEBI: '#8B5CF6',
    Budget: '#F59E0B',
    Global: '#3B82F6',
    Economy: '#EC4899',
    Earnings: '#6366F1',
};

export default function MarketNewsCard() {
    const [news, setNews] = useState<MarketNews[]>(mockMarketNews);
    const [isLoading, setIsLoading] = useState(false);

    const refreshNews = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setNews([...mockMarketNews]);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="glass-card rounded-2xl p-6 gradient-border relative overflow-hidden transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-blue)]/5 via-transparent to-[var(--accent-purple)]/5 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Newspaper size={18} className="text-[var(--accent-blue)]" />
                    <h3 className="text-[var(--text-primary)] font-semibold">Market News & Events</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshNews}
                        className={`p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all ${isLoading ? 'animate-spin' : ''}`}
                        disabled={isLoading}
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button className="text-[var(--accent-mint)] text-sm font-medium hover:underline transition-colors">
                        View All
                    </button>
                </div>
            </div>

            {/* News List */}
            <div className="space-y-3 relative z-10">
                {news.slice(0, 4).map((item) => {
                    const ImpactIcon = impactIcons[item.impact];
                    return (
                        <div
                            key={item.id}
                            className="p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-gradient-to-r hover:from-[var(--bg-hover)] hover:to-transparent transition-all cursor-pointer group border border-transparent hover:border-[var(--border-primary)]"
                        >
                            <div className="flex items-start gap-3">
                                {/* Impact Indicator */}
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ backgroundColor: `color-mix(in srgb, ${impactColors[item.impact]} 20%, transparent)` }}
                                >
                                    <ImpactIcon size={14} style={{ color: impactColors[item.impact] }} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-[var(--text-primary)] text-sm font-medium line-clamp-1 group-hover:text-[var(--accent-mint)] transition-colors">
                                            {item.title}
                                        </h4>
                                        <ExternalLink size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </div>
                                    <p className="text-[var(--text-secondary)] text-xs mt-1 line-clamp-2">
                                        {item.summary}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span
                                            className="px-2 py-0.5 rounded text-xs font-medium"
                                            style={{
                                                backgroundColor: `color-mix(in srgb, ${categoryColors[item.category]} 15%, transparent)`,
                                                color: categoryColors[item.category],
                                            }}
                                        >
                                            {item.category}
                                        </span>
                                        <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                                            <Clock size={10} />
                                            {getRelativeTime(item.timestamp)}
                                        </span>
                                        <span className="text-[var(--text-muted)] text-xs">
                                            {item.source}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Market Indices Footer */}
            <div className="mt-4 pt-4 border-t border-[var(--border-primary)] relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-secondary)] text-xs">NIFTY 50</span>
                            <span className="text-[var(--text-primary)] text-sm font-medium">23,587.50</span>
                            <span className="text-[var(--accent-mint)] text-xs flex items-center gap-0.5">
                                <TrendingUp size={10} />
                                +0.45%
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-secondary)] text-xs">SENSEX</span>
                            <span className="text-[var(--text-primary)] text-sm font-medium">78,041.25</span>
                            <span className="text-[var(--accent-mint)] text-xs flex items-center gap-0.5">
                                <TrendingUp size={10} />
                                +0.38%
                            </span>
                        </div>
                    </div>
                    <span className="text-[var(--text-muted)] text-xs">
                        Last updated: 3:30 PM IST
                    </span>
                </div>
            </div>
        </div>
    );
}
