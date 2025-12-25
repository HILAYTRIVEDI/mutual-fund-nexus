'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, User, PiggyBank, Clock, FileText } from 'lucide-react';

type SearchResultType = 'client' | 'fund' | 'transaction' | 'page';

interface SearchResult {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle: string;
    href: string;
}

// Mock search data
const searchData: SearchResult[] = [
    // Clients
    { id: 'c1', type: 'client', title: 'Rajesh Kumar', subtitle: 'CLT001 • ₹31.2L invested', href: '/clients/CLT001' },
    { id: 'c2', type: 'client', title: 'Priya Sharma', subtitle: 'CLT002 • ₹18.5L invested', href: '/clients/CLT002' },
    { id: 'c3', type: 'client', title: 'Amit Patel', subtitle: 'CLT003 • ₹45.8L invested', href: '/clients/CLT003' },
    { id: 'c4', type: 'client', title: 'Sneha Reddy', subtitle: 'CLT004 • ₹22.3L invested', href: '/clients/CLT004' },
    { id: 'c5', type: 'client', title: 'Vikram Singh', subtitle: 'CLT005 • ₹56.7L invested', href: '/clients/CLT005' },
    // Funds
    { id: 'f1', type: 'fund', title: 'HDFC Top 100 Fund', subtitle: 'Large Cap • NAV ₹892.45', href: '/mutual-funds?search=HDFC' },
    { id: 'f2', type: 'fund', title: 'SBI Bluechip Fund', subtitle: 'Large Cap • NAV ₹78.32', href: '/mutual-funds?search=SBI' },
    { id: 'f3', type: 'fund', title: 'Axis Small Cap Fund', subtitle: 'Small Cap • NAV ₹68.45', href: '/mutual-funds?search=Axis' },
    { id: 'f4', type: 'fund', title: 'ICICI Prudential Liquid Fund', subtitle: 'Liquid • NAV ₹345.67', href: '/mutual-funds?search=ICICI' },
    { id: 'f5', type: 'fund', title: 'Kotak Emerging Equity', subtitle: 'Mid Cap • NAV ₹89.75', href: '/mutual-funds?search=Kotak' },
    // Pages
    { id: 'p1', type: 'page', title: 'Dashboard', subtitle: 'Portfolio overview and analytics', href: '/' },
    { id: 'p2', type: 'page', title: 'Clients', subtitle: 'View and manage all clients', href: '/clients' },
    { id: 'p3', type: 'page', title: 'Manage Clients', subtitle: 'Add or remove clients', href: '/manage' },
    { id: 'p4', type: 'page', title: 'Portfolio', subtitle: 'All holdings and comparison', href: '/portfolio' },
    { id: 'p5', type: 'page', title: 'Mutual Funds', subtitle: 'Browse fund catalog', href: '/mutual-funds' },
    { id: 'p6', type: 'page', title: 'History', subtitle: 'Activity logs and timeline', href: '/history' },
];

const typeIcons: Record<SearchResultType, React.ElementType> = {
    client: User,
    fund: PiggyBank,
    transaction: Clock,
    page: FileText,
};

const typeLabels: Record<SearchResultType, string> = {
    client: 'Client',
    fund: 'Fund',
    transaction: 'Transaction',
    page: 'Page',
};

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return searchData.filter(
            item =>
                item.title.toLowerCase().includes(lowerQuery) ||
                item.subtitle.toLowerCase().includes(lowerQuery)
        ).slice(0, 8);
    }, [query]);

    // Keyboard shortcut to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            router.push(results[selectedIndex].href);
            setIsOpen(false);
            setQuery('');
        }
    };

    const handleSelect = (href: string) => {
        router.push(href);
        setIsOpen(false);
        setQuery('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-all"
            >
                <div className="flex items-center gap-2">
                    <Search size={18} />
                    <span className="text-sm">Search clients, funds, pages...</span>
                </div>
                <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                    ⌘K
                </kbd>
            </button>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={() => setIsOpen(false)}
            />

            {/* Search Modal */}
            <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50">
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-[var(--border-primary)]">
                        <Search size={20} className="text-[var(--text-secondary)]" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search clients, funds, pages..."
                            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none text-lg"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Results */}
                    {query && (
                        <div className="max-h-80 overflow-y-auto">
                            {results.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-[var(--text-secondary)]">No results found for &quot;{query}&quot;</p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {results.map((result, index) => {
                                        const Icon = typeIcons[result.type];
                                        return (
                                            <button
                                                key={result.id}
                                                onClick={() => handleSelect(result.href)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                                    ? 'bg-[var(--accent-mint)]/10'
                                                    : 'hover:bg-[var(--bg-hover)]'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.type === 'client' ? 'bg-[var(--accent-blue)]/10' :
                                                    result.type === 'fund' ? 'bg-[var(--accent-mint)]/10' :
                                                        result.type === 'page' ? 'bg-[var(--accent-purple)]/10' :
                                                            'bg-[var(--bg-hover)]'
                                                    }`}>
                                                    <Icon size={16} className={
                                                        result.type === 'client' ? 'text-[var(--accent-blue)]' :
                                                            result.type === 'fund' ? 'text-[var(--accent-mint)]' :
                                                                result.type === 'page' ? 'text-[var(--accent-purple)]' :
                                                                    'text-[var(--text-secondary)]'
                                                    } />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[var(--text-primary)] font-medium truncate">{result.title}</p>
                                                    <p className="text-[var(--text-secondary)] text-xs truncate">{result.subtitle}</p>
                                                </div>
                                                <span className="text-[var(--text-muted)] text-xs">{typeLabels[result.type]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-[var(--border-primary)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border-primary)]">↑↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border-primary)]">↵</kbd>
                            select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border-primary)]">esc</kbd>
                            close
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
