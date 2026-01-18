'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, User, PiggyBank, Clock, FileText, Loader2 } from 'lucide-react';
import { searchSchemes, getSchemeLatestNAV, type MutualFundScheme } from '@/lib/mfapi';
import { useAuth } from '@/context/AuthContext';

type SearchResultType = 'client' | 'fund' | 'transaction' | 'page';

interface SearchResult {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle: string;
    href: string;
    adminOnly?: boolean;
    clientOnly?: boolean;
}

// Static search data (clients & pages - require database for real data)
const staticSearchData: SearchResult[] = [
    // Clients (Demo Data)
    { id: 'c1', type: 'client', title: 'Rajesh Kumar', subtitle: 'CLT001 • Demo', href: '/clients/CLT001' },
    { id: 'c2', type: 'client', title: 'Priya Sharma', subtitle: 'CLT002 • Demo', href: '/clients/CLT002' },
    { id: 'c3', type: 'client', title: 'Amit Patel', subtitle: 'CLT003 • Demo', href: '/clients/CLT003' },
    { id: 'c4', type: 'client', title: 'Sneha Reddy', subtitle: 'CLT004 • Demo', href: '/clients/CLT004' },
    { id: 'c5', type: 'client', title: 'Vikram Singh', subtitle: 'CLT005 • Demo', href: '/clients/CLT005' },
    // Pages
    { id: 'p1', type: 'page', title: 'Dashboard', subtitle: 'Portfolio overview and analytics', href: '/' },
    { id: 'p2', type: 'page', title: 'Clients', subtitle: 'View and manage all clients', href: '/clients' },
    { id: 'p3', type: 'page', title: 'Manage Clients', subtitle: 'Add or remove clients', href: '/manage' },
    { id: 'p4', type: 'page', title: 'Portfolio', subtitle: 'All holdings and comparison', href: '/portfolio' },
    { id: 'p5', type: 'page', title: 'Mutual Funds', subtitle: 'Browse fund catalog', href: '/mutual-funds' },
    { id: 'p6', type: 'page', title: 'Fund Comparison', subtitle: 'Compare funds side by side', href: '/compare' },
    { id: 'p7', type: 'page', title: 'History', subtitle: 'Activity logs and timeline', href: '/history' },
    { id: 'p8', type: 'page', title: 'Help Center', subtitle: 'Guides and documentation', href: '/help', adminOnly: true },
];

const typeIcons: Record<SearchResultType, React.ElementType> = {
    client: User,
    fund: PiggyBank,
    transaction: Clock,
    page: FileText,
};

const typeLabels: Record<SearchResultType, string> = {
    client: 'Client',
    fund: 'Fund (Live)',
    transaction: 'Transaction',
    page: 'Page',
};

export default function GlobalSearch() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [fundResults, setFundResults] = useState<SearchResult[]>([]);
    const [isLoadingFunds, setIsLoadingFunds] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Search static data + live funds from API
    const staticResults = query.trim()
        ? staticSearchData.filter(
            (item) => {
                if (item.adminOnly && user?.role !== 'admin') return false;
                if (item.clientOnly && user?.role !== 'client') return false;
                return item.title.toLowerCase().includes(query.toLowerCase()) ||
                    item.subtitle.toLowerCase().includes(query.toLowerCase());
            }
        )
        : [];

    // Combine static and API results
    const results = [...fundResults, ...staticResults];

    // Fetch funds from MFAPI when query changes
    const fetchFunds = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setFundResults([]);
            return;
        }

        setIsLoadingFunds(true);
        try {
            const schemes = await searchSchemes(searchQuery);
            // Limit to top 8 results and fetch NAV for top 3
            const topSchemes = schemes.slice(0, 8);

            const fundSearchResults: SearchResult[] = await Promise.all(
                topSchemes.map(async (scheme: MutualFundScheme, index: number) => {
                    let subtitle = `Code: ${scheme.schemeCode}`;

                    // Fetch NAV for top 3 results only (to avoid rate limiting)
                    if (index < 3) {
                        try {
                            const navData = await getSchemeLatestNAV(scheme.schemeCode);
                            const nav = parseFloat(navData.data[0].nav).toFixed(2);
                            subtitle = `NAV: ₹${nav} (${navData.data[0].date}) • Code: ${scheme.schemeCode}`;
                        } catch {
                            // Use scheme code as fallback
                        }
                    }

                    return {
                        id: `fund-${scheme.schemeCode}`,
                        type: 'fund' as SearchResultType,
                        title: scheme.schemeName,
                        subtitle,
                        href: `/mutual-funds?search=${encodeURIComponent(scheme.schemeName.split(' ')[0])}`,
                    };
                })
            );

            setFundResults(fundSearchResults);
        } catch (error) {
            console.error('Fund search failed:', error);
            setFundResults([]);
        } finally {
            setIsLoadingFunds(false);
        }
    }, []);

    // Debounced fund search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                fetchFunds(query);
            } else {
                setFundResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, fetchFunds]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Lock body scroll on mobile when search is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open on Cmd/Ctrl + K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            // Close on Escape
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (result: SearchResult) => {
        router.push(result.href);
        setIsOpen(false);
        setQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    return (
        <>
            {/* Search Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:border-[var(--accent-mint)]/30 transition-all group"
            >
                <Search size={16} />
                <span className="text-sm flex-1 text-left">Search...</span>
                <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 bg-[var(--bg-hover)] rounded text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-mint)]">
                    ⌘K
                </kbd>
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 md:pt-24 px-4"
                    onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                    }}
                >
                    {/* Search Modal */}
                    <div
                        className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 p-3 md:p-4 border-b border-[var(--border-primary)]">
                            <Search size={18} className="text-[var(--text-secondary)] flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search funds, clients, pages..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none text-sm md:text-base"
                            />
                            {isLoadingFunds && (
                                <Loader2 size={16} className="animate-spin text-[var(--accent-mint)] flex-shrink-0" />
                            )}
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] flex-shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Results */}
                        {query && (
                            <div className="flex-1 overflow-y-auto">
                                {results.length === 0 && !isLoadingFunds ? (
                                    <div className="p-6 md:p-8 text-center">
                                        <p className="text-[var(--text-secondary)] text-sm">No results found for &quot;{query}&quot;</p>
                                    </div>
                                ) : (
                                    <div className="py-2">
                                        {results.map((result, index) => {
                                            const Icon = typeIcons[result.type];
                                            return (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleSelect(result)}
                                                    className={`w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 text-left transition-colors ${index === selectedIndex
                                                        ? 'bg-[var(--accent-mint)]/10'
                                                        : 'hover:bg-[var(--bg-hover)]'
                                                        }`}
                                                >
                                                    <div
                                                        className={`p-1.5 md:p-2 rounded-lg flex-shrink-0 ${result.type === 'fund'
                                                            ? 'bg-[var(--accent-mint)]/10'
                                                            : 'bg-[var(--bg-hover)]'
                                                            }`}
                                                    >
                                                        <Icon
                                                            size={16}
                                                            className={
                                                                result.type === 'fund'
                                                                    ? 'text-[var(--accent-mint)]'
                                                                    : 'text-[var(--text-secondary)]'
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[var(--text-primary)] font-medium truncate text-sm">
                                                            {result.title}
                                                        </p>
                                                        <p className="text-[var(--text-secondary)] text-xs truncate">
                                                            {result.subtitle}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`hidden sm:inline text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full flex-shrink-0 ${result.type === 'fund'
                                                            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                                                            : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                                                            }`}
                                                    >
                                                        {typeLabels[result.type]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="p-2 md:p-3 border-t border-[var(--border-primary)] flex items-center justify-between text-[var(--text-muted)] text-[10px] md:text-xs">
                            <div className="hidden sm:flex items-center gap-3 md:gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 md:px-1.5 py-0.5 bg-[var(--bg-hover)] rounded">↑↓</kbd>
                                    Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 md:px-1.5 py-0.5 bg-[var(--bg-hover)] rounded">↵</kbd>
                                    Select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 md:px-1.5 py-0.5 bg-[var(--bg-hover)] rounded">Esc</kbd>
                                    Close
                                </span>
                            </div>
                            <span className="text-[var(--accent-mint)]">Fund data from MFAPI.in</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
