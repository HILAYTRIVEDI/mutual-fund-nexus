'use server';

import Parser from 'rss-parser';

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    link: string;
    timestamp: string;
    impact: 'neutral'; // Google News doesn't provide sentiment, defaulting to neutral
    category: string;
}

const parser = new Parser();

export async function getMarketNews(): Promise<NewsItem[]> {
    try {
        const feed = await parser.parseURL(
            'https://news.google.com/rss/search?q=Indian+Stock+Market+Mutual+Funds+SEBI+RBI&hl=en-IN&gl=IN&ceid=IN:en'
        );

        return feed.items.slice(0, 20).map((item) => {
            // Extract source from title if possible (Google News format: "Title - Source")
            let title = item.title || '';
            let source = item.source?.title || 'Google News';

            if (title.includes(' - ')) {
                const parts = title.split(' - ');
                source = parts.pop() || source;
                title = parts.join(' - ');
            }

            return {
                id: item.guid || item.link || Math.random().toString(),
                title: title,
                summary: item.contentSnippet || item.content || '',
                source: source,
                link: item.link || '',
                timestamp: item.pubDate || new Date().toISOString(),
                impact: 'neutral' as const,
                category: 'Market',
            };
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}
