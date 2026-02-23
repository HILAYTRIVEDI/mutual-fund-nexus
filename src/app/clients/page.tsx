'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, TrendingUp, TrendingDown, Users, ChevronDown, X, Calendar, Download, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useClientContext } from '@/context/ClientContext';
import { useHoldings } from '@/context/HoldingsContext';
import { useSIPs } from '@/context/SIPContext';
import { useTransactions } from '@/context/TransactionsContext';
import { formatNAV } from '@/lib/mfapi';

function formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const fundHouses = ['All', 'HDFC', 'SBI', 'ICICI', 'Axis', 'PPFAS', 'Mirae', 'Kotak'];
const investmentTypes = ['All', 'SIP', 'Lumpsum'];
const pnlFilters = ['All', 'Profit', 'Loss'];

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

function ClientsPageContent() {
    const searchParams = useSearchParams();
    const { clients, isLoading: clientsLoading } = useClientContext();
    const { holdings, isLoading: holdingsLoading, getClientHoldings } = useHoldings();
    const { sips, isLoading: sipsLoading, getClientSIPs } = useSIPs();
    const { transactions, isLoading: txLoading, getClientTransactions } = useTransactions();

    const [searchQuery, setSearchQuery] = useState('');
    const [fundHouseFilter, setFundHouseFilter] = useState('All');
    const initialType = searchParams.get('type');
    const [typeFilter, setTypeFilter] = useState(
        initialType === 'SIP' || initialType === 'Lumpsum' ? initialType : 'All'
    );
    const [pnlFilter, setPnlFilter] = useState('All');
    const [showFilters, setShowFilters] = useState(
        initialType === 'SIP' || initialType === 'Lumpsum'
    );

    const clientDisplayData = useMemo(() => {
        return clients.flatMap(client => {
            const clientHoldings = getClientHoldings(client.id);
            const clientSips = getClientSIPs(client.id);
            const clientTxs = getClientTransactions(client.id);

            const totalInvested = clientHoldings.reduce((sum, h) => sum + h.invested_amount, 0);
            const totalCurrentValue = clientHoldings.reduce((sum, h) => sum + h.current_value, 0);

            // Calculate ratios based on transactions
            let sipInvestedRaw = clientTxs.filter(t => t.type === 'sip').reduce((s, t) => s + t.amount, 0);
            let lumpInvestedRaw = clientTxs.filter(t => t.type === 'buy').reduce((s, t) => s + t.amount, 0);

            // Fallback for migrated data (no tx)
            if (sipInvestedRaw === 0 && lumpInvestedRaw === 0 && totalInvested > 0) {
                lumpInvestedRaw = totalInvested;
            }

            const totalRaw = sipInvestedRaw + lumpInvestedRaw;
            const sipRatio = totalRaw > 0 ? sipInvestedRaw / totalRaw : 0;
            const lumpRatio = totalRaw > 0 ? lumpInvestedRaw / totalRaw : 0;

            const totalSipAmount = clientSips
                .filter(s => s.status === 'active')
                .reduce((sum, s) => sum + s.amount, 0);

            // Shared Data
            const topHolding = [...clientHoldings].sort((a, b) => b.current_value - a.current_value)[0];
            const portfolioName = topHolding ? (topHolding.mutual_fund?.name || topHolding.scheme_code || 'Unknown') : 'No Holdings';
            const fundHouse = topHolding ? topHolding.mutual_fund?.fund_house : '-';
            const dates = clientHoldings.map(h => new Date(h.created_at).getTime());
            const startDate = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : client.created_at;

            const entries = [];

            // Only split into SIP/Lumpsum if they actually have a current balance, 
            // OR if they have no balance but an active SIP is set up.
            const hasActiveBalance = totalInvested > 0;
            const hasActiveSIPRecord = clientSips.some(s => s.status === 'active');

            // Add SIP Entry if applicable
            if ((sipInvestedRaw > 0 && hasActiveBalance) || hasActiveSIPRecord) {
                // Determine metrics (Pro-rated)
                const invested = totalInvested * sipRatio;
                const current = totalCurrentValue * sipRatio;
                const pnl = current - invested;
                const pnlPercentage = invested > 0 ? (pnl / invested) * 100 : 0;

                entries.push({
                    ...client,
                    uniqueKey: `${client.id}-SIP`,
                    portfolio: portfolioName,
                    fundHouse: fundHouse || 'Unknown',
                    investmentAmount: invested,
                    currentValue: current,
                    investmentType: 'SIP', 
                    startDate,
                    pnl,
                    pnlPercentage,
                    sipAmount: totalSipAmount
                });
            }

            // Add Lumpsum Entry if applicable
            if (lumpInvestedRaw > 0 && hasActiveBalance) {
                 const invested = totalInvested * lumpRatio;
                 const current = totalCurrentValue * lumpRatio;
                 const pnl = current - invested;
                 const pnlPercentage = invested > 0 ? (pnl / invested) * 100 : 0;

                 entries.push({
                    ...client,
                    uniqueKey: `${client.id}-Lumpsum`,
                    portfolio: portfolioName,
                    fundHouse: fundHouse || 'Unknown',
                    investmentAmount: invested,
                    currentValue: current,
                    investmentType: 'Lumpsum', 
                    startDate,
                    pnl,
                    pnlPercentage,
                    sipAmount: 0
                 });
            }

            // Default if no entries
            if (entries.length === 0) {
                 entries.push({
                    ...client,
                    uniqueKey: `${client.id}-Default`,
                    portfolio: portfolioName,
                    fundHouse: fundHouse || 'Unknown',
                    investmentAmount: totalInvested,
                    currentValue: totalCurrentValue,
                    investmentType: '-',
                    startDate,
                    pnl: totalCurrentValue - totalInvested,
                    pnlPercentage: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0,
                    sipAmount: 0 // Default to 0? Or totalSipAmount if they have SIPs but no transactions?
                                 // If they have active SIPs but no transactions, they fall into 'Default' if sipInvestedRaw==0.
                                 // Actually earlier fallback sets lumpInvestedRaw.
                                 // What if active SIPs exist but no tx and no holdings? (New client).
                                 // Then sipInvestedRaw=0, lumpInvestedRaw=0. totalInvested=0.
                                 // Fallback doesn't trigger.
                                 // entries empty.
                                 // Default entry added.
                                 // Should show sipAmount if they have active SIPs?
                                 // Yes.
                 });
                 // Fix: Update Default entry sipAmount
                 entries[0].sipAmount = totalSipAmount; 
            }

            return entries;
        });
    }, [clients, getClientHoldings, getClientSIPs, getClientTransactions]);

    const filteredClients = useMemo(() => {
        return clientDisplayData.filter((client) => {
            // Search filter
            const matchesSearch =
                searchQuery === '' ||
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.portfolio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.id.toLowerCase().includes(searchQuery.toLowerCase());

            // Fund house filter
            const matchesFundHouse =
                fundHouseFilter === 'All' || 
                (client.fundHouse && client.fundHouse.includes(fundHouseFilter));

            // Investment type filter
            const matchesType =
                typeFilter === 'All' || 
                (typeFilter === 'SIP' && client.investmentType.includes('SIP')) ||
                (typeFilter === 'Lumpsum' && client.investmentType.includes('Lumpsum'));

            // P&L filter
            const matchesPnl =
                pnlFilter === 'All' ||
                (pnlFilter === 'Profit' && client.pnl >= 0) ||
                (pnlFilter === 'Loss' && client.pnl < 0);

            return matchesSearch && matchesFundHouse && matchesType && matchesPnl;
        });
    }, [clientDisplayData, searchQuery, fundHouseFilter, typeFilter, pnlFilter]);

    const totalAUM = filteredClients.reduce((sum, c) => sum + c.currentValue, 0);
    const totalPnL = filteredClients.reduce((sum, c) => sum + c.pnl, 0);
    const isLoading = clientsLoading || holdingsLoading || sipsLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <Loader2 className="animate-spin text-[var(--accent-mint)]" size={32} />
            </div>
        );
    }

    const clearFilters = () => {
        setSearchQuery('');
        setFundHouseFilter('All');
        setTypeFilter('All');
        setPnlFilter('All');
    };

    const hasActiveFilters =
        searchQuery !== '' ||
        fundHouseFilter !== 'All' ||
        typeFilter !== 'All' ||
        pnlFilter !== 'All';

    const exportToCSV = () => {
        const headers = ['ID', 'Client Name', 'Email', 'Phone', 'Portfolio', 'Fund House', 'Investment Amount', 'Current Value', 'Investment Type', 'Start Date', 'P&L', 'P&L %'];
        const csvData = filteredClients.map(client => [
            client.id,
            client.name,
            client.email,
            client.phone,
            client.portfolio,
            client.fundHouse,
            client.investmentAmount,
            client.currentValue,
            client.investmentType,
            client.startDate,
            client.pnl,
            client.pnlPercentage
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `clients_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="pr-12 md:pr-0">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                            <h1 className="text-xl md:text-2xl font-bold">Clients Portfolio</h1>
                            
                        </div>
                        <p className="text-[#9CA3AF] text-xs md:text-sm">
                            Manage and monitor all client investments
                        </p>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-[#48cae4]/20 to-[#48cae4]/10 border border-[#48cae4]/30 text-[#48cae4] font-medium flex items-center justify-center gap-2 hover:from-[#48cae4]/30 hover:to-[#48cae4]/20 hover:shadow-lg hover:shadow-[#48cae4]/20 transition-all text-sm self-start sm:self-auto"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Export CSV</span>
                        <span className="sm:hidden">Export</span>
                    </button>
                </header>

                {/* Stats Cards - Scrollable on mobile */}
                <div className="flex md:grid md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#48cae4]/20 flex items-center justify-center">
                                <Users size={16} className="md:w-5 md:h-5 text-[#48cae4]" />
                            </div>
                            <div>
                                <p className="text-[#9CA3AF] text-[10px] md:text-xs">Total Clients</p>
                                <p className="text-white text-lg md:text-xl font-bold">{filteredClients.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[#9CA3AF] text-[10px] md:text-xs">Total AUM</p>
                        <p className="text-white text-lg md:text-xl font-bold">{formatCurrency(totalAUM)}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[#9CA3AF] text-[10px] md:text-xs">Total P&L</p>
                        <p className={`text-lg md:text-xl font-bold ${totalPnL >= 0 ? 'text-[#48cae4]' : 'text-[#EF4444]'}`}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[#9CA3AF] text-[10px] md:text-xs">SIP Clients</p>

                        <p className="text-[#48cae4] text-lg md:text-xl font-bold">
                            {filteredClients.filter(c => c.investmentType.includes('SIP')).length}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-3 md:p-4 gradient-border flex-shrink-0 w-[140px] md:w-auto">
                        <p className="text-[#9CA3AF] text-[10px] md:text-xs">Lumpsum</p>
                        <p className="text-[#8B5CF6] text-lg md:text-xl font-bold">
                            {filteredClients.filter(c => c.investmentType.includes('Lumpsum')).length}
                        </p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="glass-card rounded-2xl p-3 md:p-4 mb-4 md:mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#48cae4]/5 via-transparent to-[#8B5CF6]/5 pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 transition-all text-sm"
                            />
                        </div>

                        {/* Filter Toggle */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex-1 sm:flex-none px-3 md:px-4 py-2.5 md:py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm ${showFilters || hasActiveFilters
                                    ? 'bg-[#48cae4]/20 text-[#48cae4] border border-[#48cae4]/30'
                                    : 'bg-white/5 text-[#9CA3AF] border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <Filter size={16} />
                                <span>Filters</span>
                                {hasActiveFilters && (
                                    <span className="w-2 h-2 rounded-full bg-[#48cae4]" />
                                )}
                            </button>

                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 text-[#9CA3AF] border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 text-sm"
                                >
                                    <X size={16} />
                                    <span className="hidden sm:inline">Clear</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-4 pt-4 border-t border-white/10">
                            {/* Fund House Filter */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Fund House</label>
                                <div className="relative">
                                    <select
                                        value={fundHouseFilter}
                                        onChange={(e) => setFundHouseFilter(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                    >
                                        {fundHouses.map((fh) => (
                                            <option key={fh} value={fh} className="bg-[#151A21]">
                                                {fh}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Investment Type Filter */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Investment Type</label>
                                <div className="relative">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                    >
                                        {investmentTypes.map((type) => (
                                            <option key={type} value={type} className="bg-[#151A21]">
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* P&L Filter */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">P&L Status</label>
                                <div className="relative">
                                    <select
                                        value={pnlFilter}
                                        onChange={(e) => setPnlFilter(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                    >
                                        {pnlFilters.map((pnl) => (
                                            <option key={pnl} value={pnl} className="bg-[#151A21]">
                                                {pnl}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Clients List - Cards on mobile, Table on desktop */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Desktop Table Header - Hidden on mobile */}
                    <div className="hidden lg:grid grid-cols-14 gap-3 p-4 bg-white/5 border-b border-white/10">
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase">Client</div>
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Portfolio</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Investment</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">Date</div>
                        <div className="col-span-1 text-[#9CA3AF] text-xs font-medium uppercase text-center">Type</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Current Value</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">P&L</div>
                    </div>

                    {/* Empty State */}
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 md:py-16">
                            <Users className="text-[#9CA3AF] mb-3" size={40} />
                            <p className="text-[#9CA3AF] text-sm">No clients found matching your filters</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredClients.map((client) => (
                                <Link
                                    href={`/clients/${client.id}`}
                                    key={(client as any).uniqueKey || client.id}
                                    className="block"
                                >
                                    {/* Mobile Card View */}
                                    <div className="lg:hidden p-4 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent transition-all duration-300">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#48cae4] to-[#8B5CF6] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                    {client.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium text-sm">{client.name}</p>
                                                    <p className="text-[#9CA3AF] text-xs">{client.id}</p>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 ${client.investmentType === 'SIP'
                                                    ? 'bg-[#48cae4]/10 text-[#48cae4]'
                                                    : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                                                    }`}
                                            >
                                                {client.investmentType}
                                            </span>
                                        </div>
                                        <p className="text-white text-sm mb-3">{client.portfolio}</p>
                                        <div className="flex items-center justify-between text-xs">
                                            <div>
                                                <p className="text-[#9CA3AF] mb-1">Current Value</p>
                                                <p className="text-white font-medium">{formatCurrency(client.currentValue)}</p>
                                            </div>
                                            <div className={`text-right flex items-center gap-1 ${client.pnl >= 0 ? 'text-[#48cae4]' : 'text-[#EF4444]'}`}>
                                                {client.pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                <div>
                                                    <p className="font-medium">{client.pnlPercentage >= 0 ? '+' : ''}{client.pnlPercentage.toFixed(2)}%</p>
                                                    <p className="text-[10px]">{formatCurrency(Math.abs(client.pnl))}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Table Row */}
                                    <div className="hidden lg:grid grid-cols-14 gap-3 p-4 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent transition-all duration-300">
                                        {/* Client Info */}
                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#48cae4] to-[#8B5CF6] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                    {client.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white font-medium text-sm truncate">{client.name}</p>
                                                    <p className="text-[#9CA3AF] text-xs">{client.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Portfolio */}
                                        <div className="col-span-3 flex items-center">
                                            <div>
                                                <p className="text-white text-sm line-clamp-1">{client.portfolio}</p>
                                                <p className="text-[#9CA3AF] text-xs">{client.fundHouse}</p>
                                            </div>
                                        </div>

                                        {/* Investment Amount */}
                                        <div className="col-span-2 flex items-center justify-end">
                                            <div className="text-right">
                                                <p className="text-white text-sm font-medium">{formatCurrency(client.investmentAmount)}</p>
                                                {client.sipAmount > 0 && (
                                                    <p className="text-[#9CA3AF] text-xs">{formatCurrency(client.sipAmount)}/mo</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Investment Date */}
                                        <div className="col-span-2 flex items-center justify-center">
                                            <div className="flex items-center gap-1 text-[#9CA3AF] text-sm">
                                                <Calendar size={14} />
                                                {formatDate(client.startDate)}
                                            </div>
                                        </div>

                                        {/* Type */}
                                        <div className="col-span-1 flex items-center justify-center">
                                            <span
                                                className={`px-2 py-1 rounded-md text-xs font-medium ${client.investmentType === 'SIP'
                                                    ? 'bg-[#48cae4]/10 text-[#48cae4]'
                                                    : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                                                    }`}
                                            >
                                                {client.investmentType}
                                            </span>
                                        </div>

                                        {/* Current Value */}
                                        <div className="col-span-2 flex items-center justify-end">
                                            <p className="text-white text-sm font-medium">{formatCurrency(client.currentValue)}</p>
                                        </div>

                                        {/* P&L */}
                                        <div className="col-span-2 flex items-center justify-end">
                                            <div className={`flex items-center gap-1 ${client.pnl >= 0 ? 'text-[#48cae4]' : 'text-[#EF4444]'}`}>
                                                {client.pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                <div className="text-right">
                                                    <span className="text-sm font-medium block">
                                                        {client.pnlPercentage >= 0 ? '+' : ''}{client.pnlPercentage.toFixed(2)}%
                                                    </span>
                                                    <span className="text-xs">
                                                        {formatCurrency(Math.abs(client.pnl))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}

export default function ClientsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <Loader2 className="animate-spin text-[var(--accent-mint)]" size={32} />
            </div>
        }>
            <ClientsPageContent />
        </Suspense>
    );
}
