'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, TrendingUp, TrendingDown, Users, ChevronDown, X, Calendar, Download } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ClientData {
    id: string;
    name: string;
    email: string;
    phone: string;
    portfolio: string;
    fundHouse: string;
    investmentAmount: number;
    currentValue: number;
    investmentType: 'SIP' | 'Lumpsum';
    sipAmount?: number;
    startDate: string;
    pnl: number;
    pnlPercentage: number;
}

const clientsData: ClientData[] = [
    {
        id: 'CLT001',
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@email.com',
        phone: '+91 98765 43210',
        portfolio: 'HDFC Top 100 Fund',
        fundHouse: 'HDFC',
        investmentAmount: 1500000,
        currentValue: 1825000,
        investmentType: 'SIP',
        sipAmount: 50000,
        startDate: '2023-01-15',
        pnl: 325000,
        pnlPercentage: 21.67,
    },
    {
        id: 'CLT002',
        name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        phone: '+91 87654 32109',
        portfolio: 'SBI Bluechip Fund',
        fundHouse: 'SBI',
        investmentAmount: 2500000,
        currentValue: 2875000,
        investmentType: 'Lumpsum',
        startDate: '2022-06-20',
        pnl: 375000,
        pnlPercentage: 15.0,
    },
    {
        id: 'CLT003',
        name: 'Amit Patel',
        email: 'amit.patel@email.com',
        phone: '+91 76543 21098',
        portfolio: 'ICICI Pru Liquid Fund',
        fundHouse: 'ICICI',
        investmentAmount: 500000,
        currentValue: 485000,
        investmentType: 'Lumpsum',
        startDate: '2024-03-10',
        pnl: -15000,
        pnlPercentage: -3.0,
    },
    {
        id: 'CLT004',
        name: 'Sneha Reddy',
        email: 'sneha.reddy@email.com',
        phone: '+91 65432 10987',
        portfolio: 'Axis Small Cap Fund',
        fundHouse: 'Axis',
        investmentAmount: 800000,
        currentValue: 1120000,
        investmentType: 'SIP',
        sipAmount: 25000,
        startDate: '2022-11-05',
        pnl: 320000,
        pnlPercentage: 40.0,
    },
    {
        id: 'CLT005',
        name: 'Vikram Singh',
        email: 'vikram.singh@email.com',
        phone: '+91 54321 09876',
        portfolio: 'Parag Parikh Flexi Cap',
        fundHouse: 'PPFAS',
        investmentAmount: 3000000,
        currentValue: 3450000,
        investmentType: 'Lumpsum',
        startDate: '2023-08-15',
        pnl: 450000,
        pnlPercentage: 15.0,
    },
    {
        id: 'CLT006',
        name: 'Anita Mehta',
        email: 'anita.mehta@email.com',
        phone: '+91 43210 98765',
        portfolio: 'Mirae Asset Large Cap',
        fundHouse: 'Mirae',
        investmentAmount: 1200000,
        currentValue: 1380000,
        investmentType: 'SIP',
        sipAmount: 40000,
        startDate: '2023-04-01',
        pnl: 180000,
        pnlPercentage: 15.0,
    },
    {
        id: 'CLT007',
        name: 'Suresh Iyer',
        email: 'suresh.iyer@email.com',
        phone: '+91 32109 87654',
        portfolio: 'Kotak Emerging Equity',
        fundHouse: 'Kotak',
        investmentAmount: 600000,
        currentValue: 720000,
        investmentType: 'SIP',
        sipAmount: 20000,
        startDate: '2023-02-10',
        pnl: 120000,
        pnlPercentage: 20.0,
    },
    {
        id: 'CLT008',
        name: 'Neha Gupta',
        email: 'neha.gupta@email.com',
        phone: '+91 21098 76543',
        portfolio: 'HDFC Mid-Cap Opportunities',
        fundHouse: 'HDFC',
        investmentAmount: 1800000,
        currentValue: 1710000,
        investmentType: 'Lumpsum',
        startDate: '2024-01-05',
        pnl: -90000,
        pnlPercentage: -5.0,
    },
];

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

export default function ClientsPage() {
    const searchParams = useSearchParams();
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

    const filteredClients = useMemo(() => {
        return clientsData.filter((client) => {
            // Search filter
            const matchesSearch =
                searchQuery === '' ||
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.portfolio.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.id.toLowerCase().includes(searchQuery.toLowerCase());

            // Fund house filter
            const matchesFundHouse =
                fundHouseFilter === 'All' || client.fundHouse === fundHouseFilter;

            // Investment type filter
            const matchesType =
                typeFilter === 'All' || client.investmentType === typeFilter;

            // P&L filter
            const matchesPnl =
                pnlFilter === 'All' ||
                (pnlFilter === 'Profit' && client.pnl >= 0) ||
                (pnlFilter === 'Loss' && client.pnl < 0);

            return matchesSearch && matchesFundHouse && matchesType && matchesPnl;
        });
    }, [searchQuery, fundHouseFilter, typeFilter, pnlFilter]);

    const totalAUM = filteredClients.reduce((sum, c) => sum + c.currentValue, 0);
    const totalPnL = filteredClients.reduce((sum, c) => sum + c.pnl, 0);

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
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Clients Portfolio</h1>
                        <p className="text-[#9CA3AF] text-sm">
                            Manage and monitor all client investments
                        </p>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] font-medium flex items-center gap-2 hover:from-[#10B981]/30 hover:to-[#10B981]/20 hover:shadow-lg hover:shadow-[#10B981]/20 transition-all"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
                                <Users size={20} className="text-[#10B981]" />
                            </div>
                            <div>
                                <p className="text-[#9CA3AF] text-xs">Total Clients</p>
                                <p className="text-white text-xl font-bold">{filteredClients.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div>
                            <p className="text-[#9CA3AF] text-xs">Total AUM</p>
                            <p className="text-white text-xl font-bold">{formatCurrency(totalAUM)}</p>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div>
                            <p className="text-[#9CA3AF] text-xs">Total P&L</p>
                            <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                            </p>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div>
                            <p className="text-[#9CA3AF] text-xs">SIP Clients</p>
                            <p className="text-[#10B981] text-xl font-bold">
                                {filteredClients.filter(c => c.investmentType === 'SIP').length}
                            </p>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border">
                        <div>
                            <p className="text-[#9CA3AF] text-xs">Lumpsum Clients</p>
                            <p className="text-[#8B5CF6] text-xl font-bold">
                                {filteredClients.filter(c => c.investmentType === 'Lumpsum').length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="glass-card rounded-2xl p-4 mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/5 via-transparent to-[#8B5CF6]/5 pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
                            <input
                                type="text"
                                placeholder="Search by client name, portfolio, or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#10B981]/50 transition-all"
                            />
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all ${showFilters || hasActiveFilters
                                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                                : 'bg-white/5 text-[#9CA3AF] border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <Filter size={18} />
                            Filters
                            {hasActiveFilters && (
                                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                            )}
                        </button>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-3 rounded-xl bg-white/5 text-[#9CA3AF] border border-white/10 hover:bg-white/10 flex items-center gap-2"
                            >
                                <X size={18} />
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="relative z-10 grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                            {/* Fund House Filter */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Fund House</label>
                                <div className="relative">
                                    <select
                                        value={fundHouseFilter}
                                        onChange={(e) => setFundHouseFilter(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#10B981]/50"
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
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#10B981]/50"
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
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#10B981]/50"
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

                {/* Clients Table */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-14 gap-3 p-4 bg-white/5 border-b border-white/10">
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase">Client</div>
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Portfolio</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Investment</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">Date</div>
                        <div className="col-span-1 text-[#9CA3AF] text-xs font-medium uppercase text-center">Type</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Current Value</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">P&L</div>
                    </div>

                    {/* Table Body */}
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Users className="text-[#9CA3AF] mb-3" size={48} />
                            <p className="text-[#9CA3AF]">No clients found matching your filters</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredClients.map((client) => (
                                <Link
                                    href={`/clients/${client.id}`}
                                    key={client.id}
                                    className="grid grid-cols-14 gap-3 p-4 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent transition-all duration-300 cursor-pointer block"
                                >
                                    {/* Client Info */}
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#8B5CF6] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                {client.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-medium text-sm truncate">{client.name}</p>
                                                <p className="text-[#9CA3AF] text-xs">{client.id}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Portfolio */}
                                    <div className="col-span-3 flex items-center">
                                        <div>
                                            <p className="text-white text-sm">{client.portfolio}</p>
                                            <p className="text-[#9CA3AF] text-xs">{client.fundHouse}</p>
                                        </div>
                                    </div>

                                    {/* Investment Amount */}
                                    <div className="col-span-2 flex items-center justify-end">
                                        <div className="text-right">
                                            <p className="text-white text-sm font-medium">{formatCurrency(client.investmentAmount)}</p>
                                            {client.sipAmount && (
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
                                                ? 'bg-[#10B981]/10 text-[#10B981]'
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
                                        <div className={`flex items-center gap-1 ${client.pnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                            {client.pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            <div className="text-right">
                                                <span className="text-sm font-medium block">
                                                    {client.pnlPercentage >= 0 ? '+' : ''}{client.pnlPercentage}%
                                                </span>
                                                <span className="text-xs">
                                                    {formatCurrency(Math.abs(client.pnl))}
                                                </span>
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
