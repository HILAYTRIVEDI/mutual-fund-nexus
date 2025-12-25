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
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">Mutual Funds</h1>
                    <p className="text-[#9CA3AF] text-sm">Browse and explore all available mutual fund schemes</p>
                </header>

                {/* Search Bar */}
                <div className="glass-card rounded-2xl p-4 mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#48cae4]/5 via-transparent to-[#8B5CF6]/5 pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
                            <input
                                type="text"
                                placeholder="Search mutual funds by name (e.g., HDFC, SBI, ICICI)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 focus:ring-1 focus:ring-[#48cae4]/50 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        {(searchLoading || loading) && (
                            <Loader2 className="animate-spin text-[#48cae4]" size={24} />
                        )}
                    </div>
                </div>

                {/* Results Info */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[#9CA3AF] text-sm">
                        {searchQuery ? (
                            <>Showing {schemes.length} results for &quot;{searchQuery}&quot;</>
                        ) : (
                            <>Showing {offset + 1} - {offset + schemes.length} schemes</>
                        )}
                    </p>
                    {!searchQuery && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={offset === 0}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm text-[#9CA3AF] px-3">
                                Page {Math.floor(offset / ITEMS_PER_PAGE) + 1}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={!hasMore}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Schemes List */}
                <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 bg-white/5 border-b border-white/10">
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase">Code</div>
                        <div className="col-span-8 text-[#9CA3AF] text-xs font-medium uppercase">Scheme Name</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Action</div>
                    </div>

                    {/* Table Body */}
                    {loading && schemes.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-[#48cae4] mr-3" size={24} />
                            <span className="text-[#9CA3AF]">Loading schemes...</span>
                        </div>
                    ) : schemes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Search className="text-[#9CA3AF] mb-3" size={40} />
                            <p className="text-[#9CA3AF]">No schemes found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {schemes.map((scheme) => (
                                <div
                                    key={scheme.schemeCode}
                                    className="grid grid-cols-12 gap-4 p-4 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent transition-all duration-300 cursor-pointer group"
                                    onClick={() => handleViewScheme(scheme.schemeCode)}
                                >
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#48cae4]/20 to-[#48cae4]/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Building2 size={14} className="text-[#48cae4]" />
                                        </div>
                                        <span className="text-white text-sm font-mono">{scheme.schemeCode}</span>
                                    </div>
                                    <div className="col-span-8 flex items-center">
                                        <span className="text-white text-sm truncate">{scheme.schemeName}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end">
                                        <button className="px-3 py-1.5 rounded-lg bg-[#48cae4]/10 border border-[#48cae4]/20 text-[#48cae4] text-xs font-medium hover:bg-[#48cae4]/20 transition-colors flex items-center gap-1">
                                            <TrendingUp size={12} />
                                            View NAV
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Bottom */}
                {!searchQuery && schemes.length > 0 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={handlePrevPage}
                            disabled={offset === 0}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        <span className="text-[#9CA3AF]">
                            Page {Math.floor(offset / ITEMS_PER_PAGE) + 1}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={!hasMore}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#48cae4]/20 to-[#48cae4]/10 border border-[#48cae4]/30 text-[#48cae4] disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#48cae4]/30 hover:to-[#48cae4]/20 transition-colors flex items-center gap-2"
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </main>

            {/* Sidebar */}
            <Sidebar />

            {/* Scheme Details Modal */}
            {(selectedScheme || schemeLoading) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-2xl">
                        {schemeLoading ? (
                            <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
                                <Loader2 className="animate-spin text-[#48cae4] mr-3" size={32} />
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
