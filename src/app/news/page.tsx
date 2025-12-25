'use client';

import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { getMarketNews, type NewsItem } from '@/app/actions/getNews';
import Sidebar from '@/components/Sidebar';

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

export default function NewsPage() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const data = await getMarketNews();
            setNews(data);
        } catch (error) {
            console.error('Failed to load news:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Market News</h1>
                        <p className="text-[#9CA3AF] text-sm">
                            Latest updates from Indian and Global markets
                        </p>
                    </div>
                    <button
                        onClick={fetchNews}
                        disabled={loading}
                        className="p-2 rounded-xl bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-mint)] transition-colors disabled:opacity-50"
                        title="Refresh News"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </header>

                {/* News Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading && news.length === 0 ? (
                        // Skeletons
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="glass-card rounded-2xl p-6 h-48 animate-pulse">
                                <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-white/10 rounded w-1/2 mb-6"></div>
                                <div className="h-20 bg-white/5 rounded w-full"></div>
                            </div>
                        ))
                    ) : news.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-[var(--text-secondary)]">
                            <Newspaper size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No news available at the moment.</p>
                        </div>
                    ) : (
                        news.map((item) => (
                            <div key={item.id} className="glass-card rounded-2xl p-6 group hover:bg-[var(--bg-hover)] transition-all duration-300 flex flex-col">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]">
                                        {item.source}
                                    </span>
                                    <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                                        <Clock size={12} />
                                        {getRelativeTime(item.timestamp)}
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 line-clamp-3 group-hover:text-[var(--accent-mint)] transition-colors">
                                    {item.title}
                                </h3>

                                <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-3 flex-1">
                                    {item.summary}
                                </p>

                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-[var(--accent-mint)] font-medium mt-auto hover:underline"
                                >
                                    Read full story
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        ))
                    )}
                </div>
            </main>

            <Sidebar />
        </div>
    );
}
