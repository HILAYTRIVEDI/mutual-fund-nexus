'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, TrendingUp, Building2, Loader2, X } from 'lucide-react';
import { getAllSchemes, searchSchemes, getSchemeLatestNAV, type MutualFundScheme, type SchemeLatestResponse } from '@/lib/mfapi';
import Sidebar from '@/components/Sidebar';
import MutualFundCard from '@/components/MutualFundCard';

const ITEMS_PER_PAGE = 20;

export default function MutualFundsPage() {
    const [schemes, setSchemes] = useState<MutualFundScheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [selectedScheme, setSelectedScheme] = useState<SchemeLatestResponse | null>(null);
    const [schemeLoading, setSchemeLoading] = useState(false);

    // Fetch schemes
    const fetchSchemes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllSchemes(ITEMS_PER_PAGE, offset);
            setSchemes(data);
            setHasMore(data.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Failed to fetch schemes:', error);
        } finally {
            setLoading(false);
        }
    }, [offset]);

    // Search schemes
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            fetchSchemes();
            return;
        }
        setSearchLoading(true);
        try {
            const data = await searchSchemes(searchQuery);
            setSchemes(data);
            setHasMore(false);
        } catch (error) {
            console.error('Failed to search schemes:', error);
        } finally {
            setSearchLoading(false);
        }
    }, [searchQuery, fetchSchemes]);

    // Initial load
    useEffect(() => {
        if (!searchQuery) {
            fetchSchemes();
        }
    }, [fetchSchemes, searchQuery]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                handleSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    // View scheme details
    const handleViewScheme = async (schemeCode: number) => {
        setSchemeLoading(true);
        try {
            const data = await getSchemeLatestNAV(schemeCode);
            setSelectedScheme(data);
        } catch (error) {
            console.error('Failed to fetch scheme details:', error);
        } finally {
            setSchemeLoading(false);
        }
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        if (selectedScheme || schemeLoading) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedScheme, schemeLoading]);

    const handlePrevPage = () => {
        if (offset >= ITEMS_PER_PAGE) {
            setOffset(offset - ITEMS_PER_PAGE);
        }
    };

    const handleNextPage = () => {
        if (hasMore) {
            setOffset(offset + ITEMS_PER_PAGE);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setOffset(0);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-4 md:mb-6 pr-12 md:pr-0">
                    <h1 className="text-xl md:text-2xl font-bold">Mutual Funds</h1>
                    <p className="text-[#9CA3AF] text-xs md:text-sm">Browse and explore all available mutual fund schemes</p>
                </header>

                {/* Search Bar */}
                <div className="glass-card rounded-2xl p-3 md:p-4 mb-4 md:mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#C4A265]/5 via-transparent to-[#5B7FA4]/5 pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-2 md:gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
                            <input
                                type="text"
                                placeholder="Search funds (HDFC, SBI, ICICI)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 md:pl-12 pr-10 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 focus:ring-1 focus:ring-[#C4A265]/50 transition-all text-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {(searchLoading || loading) && (
                            <Loader2 className="animate-spin text-[#C4A265] flex-shrink-0" size={20} />
                        )}
                    </div>
                </div>

                {/* Results Info & Pagination */}
                <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                    <p className="text-[#9CA3AF] text-xs md:text-sm truncate">
                        {searchQuery ? (
                            <>Showing {schemes.length} results</>
                        ) : (
                            <>Showing {offset + 1} - {offset + schemes.length}</>
                        )}
                    </p>
                    {!searchQuery && (
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                            <button
                                onClick={handlePrevPage}
                                disabled={offset === 0}
                                className="p-1.5 md:p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs md:text-sm text-[#9CA3AF] px-2">
                                {Math.floor(offset / ITEMS_PER_PAGE) + 1}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={!hasMore}
                                className="p-1.5 md:p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Schemes List */}
                <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                    {/* Desktop Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-white/5 border-b border-white/10">
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase">Code</div>
                        <div className="col-span-8 text-[#9CA3AF] text-xs font-medium uppercase">Scheme Name</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Action</div>
                    </div>

                    {/* Table Body */}
                    {loading && schemes.length === 0 ? (
                        <div className="flex items-center justify-center py-12 md:py-20">
                            <Loader2 className="animate-spin text-[#C4A265] mr-3" size={24} />
                            <span className="text-[#9CA3AF] text-sm">Loading schemes...</span>
                        </div>
                    ) : schemes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 md:py-20">
                            <Search className="text-[#9CA3AF] mb-3" size={32} />
                            <p className="text-[#9CA3AF] text-sm">No schemes found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {schemes.map((scheme) => (
                                <div
                                    key={scheme.schemeCode}
                                    className="p-3 md:p-4 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent transition-all duration-300 cursor-pointer group"
                                    onClick={() => handleViewScheme(scheme.schemeCode)}
                                >
                                    {/* Mobile Layout */}
                                    <div className="md:hidden">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C4A265]/20 to-[#C4A265]/5 flex items-center justify-center flex-shrink-0">
                                                    <Building2 size={14} className="text-[#C4A265]" />
                                                </div>
                                                <span className="text-white text-xs font-mono">{scheme.schemeCode}</span>
                                            </div>
                                            <button className="px-2.5 py-1 rounded-lg bg-[#C4A265]/10 border border-[#C4A265]/20 text-[#C4A265] text-[10px] font-medium flex items-center gap-1 flex-shrink-0">
                                                <TrendingUp size={10} />
                                                NAV
                                            </button>
                                        </div>
                                        <p className="text-white text-sm line-clamp-2">{scheme.schemeName}</p>
                                    </div>

                                    {/* Desktop Layout */}
                                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-2 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C4A265]/20 to-[#C4A265]/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Building2 size={14} className="text-[#C4A265]" />
                                            </div>
                                            <span className="text-white text-sm font-mono">{scheme.schemeCode}</span>
                                        </div>
                                        <div className="col-span-8">
                                            <span className="text-white text-sm truncate block">{scheme.schemeName}</span>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end">
                                            <button className="px-3 py-1.5 rounded-lg bg-[#C4A265]/10 border border-[#C4A265]/20 text-[#C4A265] text-xs font-medium hover:bg-[#C4A265]/20 transition-colors flex items-center gap-1">
                                                <TrendingUp size={12} />
                                                View NAV
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Bottom */}
                {!searchQuery && schemes.length > 0 && (
                    <div className="flex items-center justify-center gap-3 md:gap-4 mt-4 md:mt-6">
                        <button
                            onClick={handlePrevPage}
                            disabled={offset === 0}
                            className="px-3 md:px-4 py-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors flex items-center gap-1 md:gap-2 text-sm"
                        >
                            <ChevronLeft size={14} />
                            <span className="hidden sm:inline">Previous</span>
                        </button>
                        <span className="text-[#9CA3AF] text-sm">
                            Page {Math.floor(offset / ITEMS_PER_PAGE) + 1}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={!hasMore}
                            className="px-3 md:px-4 py-2 rounded-lg bg-gradient-to-r from-[#C4A265]/20 to-[#C4A265]/10 border border-[#C4A265]/30 text-[#C4A265] disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#C4A265]/30 hover:to-[#C4A265]/20 transition-colors flex items-center gap-1 md:gap-2 text-sm"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </main>

            {/* Sidebar */}
            <Sidebar />

            {/* Scheme Details Modal */}
            {(selectedScheme || schemeLoading) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
                    <div className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        {schemeLoading ? (
                            <div className="glass-card rounded-t-2xl sm:rounded-2xl p-8 flex items-center justify-center">
                                <Loader2 className="animate-spin text-[#C4A265] mr-3" size={32} />
                                <span className="text-white text-lg">Loading scheme details...</span>
                            </div>
                        ) : selectedScheme && (
                            <MutualFundCard
                                scheme={selectedScheme}
                                onClose={() => setSelectedScheme(null)}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
