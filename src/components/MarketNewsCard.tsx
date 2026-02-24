'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Newspaper, Clock, ExternalLink, ArrowRight, RefreshCw } from 'lucide-react';
import { getMarketNews, type NewsItem } from '@/app/actions/getNews';

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

export default function MarketNewsCard() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNews = async () => {
        setIsLoading(true);
        try {
            const data = await getMarketNews();
            // Show top 4 items on dashboard
            setNews(data.slice(0, 4));
        } catch (error) {
            console.error('Failed to fetch news:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    return (
        <div className="glass-card rounded-2xl p-6 h-full flex flex-col relative overflow-hidden group">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#C4A265]/5 via-transparent to-[#5B7FA4]/5 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-50" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C4A265]/20 to-[#C4A265]/5 flex items-center justify-center">
                        <Newspaper size={20} className="text-[#C4A265]" />
                    </div>
                    <div>
                        <h3 className="text-[var(--text-primary)] font-semibold">Market News</h3>
                        <p className="text-[var(--text-secondary)] text-xs">Latest updates</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchNews}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <Link
                        href="/news"
                        className="flex items-center gap-1 text-xs font-medium text-[#C4A265] hover:text-[#C4A265]/80 transition-colors"
                    >
                        View All <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
                {isLoading && news.length === 0 ? (
                    // Skeleton loading
                    [1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-white/5 rounded w-1/2"></div>
                        </div>
                    ))
                ) : news.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        <p>No news available</p>
                    </div>
                ) : (
                    news.map((item) => (
                        <div key={item.id} className="group/item pb-4 border-b border-[var(--border-primary)] last:border-0 last:pb-0">
                            <div className="flex items-start justify-between mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#C4A265]/10 text-[#C4A265]">
                                    {item.source}
                                </span>
                                <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1">
                                    <Clock size={10} />
                                    {getRelativeTime(item.timestamp)}
                                </span>
                            </div>
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group-hover/item:translate-x-1 transition-transform duration-300"
                            >
                                <h4 className="text-[var(--text-primary)] text-sm font-medium leading-snug mb-1 group-hover/item:text-[#C4A265] transition-colors line-clamp-2">
                                    {item.title}
                                </h4>
                            </a>
                            <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-1 text-[var(--text-secondary)] text-[10px] opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    Read more <ExternalLink size={10} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer ticker or extra info */}
            {news.length > 0 && !isLoading && (
                <div className="mt-4 pt-4 border-t border-[var(--border-primary)] relative z-10">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Live Feed
                        </span>
                        <span>Google News RSS</span>
                    </div>
                </div>
            )}
        </div>
    );
}
