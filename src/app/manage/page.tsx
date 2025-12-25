'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Trash2, X, UserPlus, PiggyBank, Loader2, Check } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { searchSchemes, type MutualFundScheme } from '@/lib/mfapi';

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    portfolio: string;
    schemeCode: number;
    investmentType: 'SIP' | 'Lumpsum';
    amount: number;
    sipAmount?: number;
    startDate: string;
}

// Mock initial clients data
const initialClients: Client[] = [
    {
        id: 'CLT001',
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@email.com',
        phone: '+91 98765 43210',
        portfolio: 'HDFC Top 100 Fund',
        schemeCode: 125497,
        investmentType: 'SIP',
        amount: 1500000,
        sipAmount: 50000,
        startDate: '2023-01-15',
    },
    {
        id: 'CLT002',
        name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        phone: '+91 87654 32109',
        portfolio: 'SBI Bluechip Fund',
        schemeCode: 119598,
        investmentType: 'Lumpsum',
        amount: 2500000,
        startDate: '2022-06-20',
    },
];

function generateClientId(): string {
    return `CLT${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ManageClientsPage() {
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        investmentType: 'SIP' as 'SIP' | 'Lumpsum',
        amount: '',
        sipAmount: '',
        startDate: '',
        schemeCode: 0,
        schemeName: '',
    });

    // Fund search state
    const [fundSearch, setFundSearch] = useState('');
    const [fundResults, setFundResults] = useState<MutualFundScheme[]>([]);
    const [fundSearching, setFundSearching] = useState(false);
    const [showFundDropdown, setShowFundDropdown] = useState(false);
    const fundDropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler for fund dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (fundDropdownRef.current && !fundDropdownRef.current.contains(event.target as Node)) {
                setShowFundDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search funds from API
    const handleFundSearch = useCallback(async () => {
        if (!fundSearch.trim() || fundSearch.length < 2) {
            setFundResults([]);
            return;
        }
        setFundSearching(true);
        try {
            const results = await searchSchemes(fundSearch);
            setFundResults(results.slice(0, 10)); // Limit to 10 results
        } catch (error) {
            console.error('Failed to search funds:', error);
        } finally {
            setFundSearching(false);
        }
    }, [fundSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (fundSearch.length >= 2) {
                handleFundSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [fundSearch, handleFundSearch]);

    const handleSelectFund = (fund: MutualFundScheme) => {
        setFormData(prev => ({
            ...prev,
            schemeCode: fund.schemeCode,
            schemeName: fund.schemeName,
        }));
        setFundSearch(fund.schemeName);
        setShowFundDropdown(false);
    };

    const handleAddClient = () => {
        if (!formData.name || !formData.schemeCode || !formData.amount || !formData.startDate) {
            alert('Please fill in all required fields');
            return;
        }

        const newClient: Client = {
            id: generateClientId(),
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            portfolio: formData.schemeName,
            schemeCode: formData.schemeCode,
            investmentType: formData.investmentType,
            amount: parseFloat(formData.amount),
            sipAmount: formData.investmentType === 'SIP' ? parseFloat(formData.sipAmount) : undefined,
            startDate: formData.startDate,
        };

        setClients(prev => [...prev, newClient]);
        setShowAddModal(false);
        resetForm();
    };

    const handleDeleteClient = (clientId: string) => {
        if (confirm('Are you sure you want to remove this client?')) {
            setClients(prev => prev.filter(c => c.id !== clientId));
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            investmentType: 'SIP',
            amount: '',
            sipAmount: '',
            startDate: '',
            schemeCode: 0,
            schemeName: '',
        });
        setFundSearch('');
        setFundResults([]);
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.portfolio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Manage Clients</h1>
                        <p className="text-[#9CA3AF] text-sm">Add, edit, and remove client investments</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#48cae4] to-[#90e0ef] text-white font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-[#48cae4]/30 transition-all"
                    >
                        <Plus size={20} />
                        Add Client
                    </button>
                </header>

                {/* Search */}
                <div className="glass-card rounded-2xl p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 transition-all"
                        />
                    </div>
                </div>

                {/* Clients List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 bg-white/5 border-b border-white/10">
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Client</div>
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Mutual Fund</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">Type</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Amount</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">Actions</div>
                    </div>

                    {/* Body */}
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <UserPlus className="text-[#9CA3AF] mb-3" size={48} />
                            <p className="text-[#9CA3AF]">No clients found</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 text-[#48cae4] hover:underline"
                            >
                                Add your first client
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredClients.map((client) => (
                                <div
                                    key={client.id}
                                    className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-all"
                                >
                                    <div className="col-span-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#48cae4] to-[#8B5CF6] flex items-center justify-center text-white font-semibold text-sm">
                                                {client.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">{client.name}</p>
                                                <p className="text-[#9CA3AF] text-xs">{client.id}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-3 flex items-center">
                                        <p className="text-white text-sm truncate">{client.portfolio}</p>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-center">
                                        <span
                                            className={`px-3 py-1 rounded-md text-xs font-medium ${client.investmentType === 'SIP'
                                                ? 'bg-[#48cae4]/10 text-[#48cae4]'
                                                : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                                                }`}
                                        >
                                            {client.investmentType}
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end">
                                        <div className="text-right">
                                            <p className="text-white text-sm font-medium">{formatCurrency(client.amount)}</p>
                                            {client.sipAmount && (
                                                <p className="text-[#9CA3AF] text-xs">{formatCurrency(client.sipAmount)}/mo</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleDeleteClient(client.id)}
                                            className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <Sidebar />

            {/* Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-xl glass-card rounded-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#48cae4]/20 flex items-center justify-center">
                                    <UserPlus size={20} className="text-[#48cae4]" />
                                </div>
                                <div>
                                    <h2 className="text-white text-lg font-semibold">Add New Client</h2>
                                    <p className="text-[#9CA3AF] text-xs">Enter client investment details</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X size={20} className="text-[#9CA3AF]" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Client Name */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Client Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter client name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50"
                                />
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50"
                                    />
                                </div>
                            </div>

                            {/* Mutual Fund Search */}
                            <div className="relative" ref={fundDropdownRef}>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Select Mutual Fund *</label>
                                <div className="relative">
                                    <PiggyBank className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search mutual funds (e.g., HDFC, SBI)..."
                                        value={fundSearch}
                                        onChange={(e) => { setFundSearch(e.target.value); setShowFundDropdown(true); }}
                                        onFocus={() => setShowFundDropdown(true)}
                                        className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50"
                                    />
                                    {fundSearching && (
                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#48cae4] animate-spin" size={18} />
                                    )}
                                    {formData.schemeCode > 0 && !fundSearching && (
                                        <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-[#48cae4]" size={18} />
                                    )}
                                </div>

                                {/* Fund Results Dropdown */}
                                {showFundDropdown && fundResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-[#151A21] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {fundResults.map((fund) => (
                                            <button
                                                key={fund.schemeCode}
                                                onClick={() => handleSelectFund(fund)}
                                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                            >
                                                <p className="text-white text-sm truncate">{fund.schemeName}</p>
                                                <p className="text-[#9CA3AF] text-xs">Code: {fund.schemeCode}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Investment Type */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Investment Type *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, investmentType: 'SIP' }))}
                                        className={`p-4 rounded-xl border transition-all ${formData.investmentType === 'SIP'
                                            ? 'bg-[#48cae4]/20 border-[#48cae4]/50 text-[#48cae4]'
                                            : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:bg-white/10'
                                            }`}
                                    >
                                        <p className="font-medium">SIP</p>
                                        <p className="text-xs opacity-70">Monthly Investment</p>
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, investmentType: 'Lumpsum' }))}
                                        className={`p-4 rounded-xl border transition-all ${formData.investmentType === 'Lumpsum'
                                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-[#8B5CF6]'
                                            : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:bg-white/10'
                                            }`}
                                    >
                                        <p className="font-medium">Lumpsum</p>
                                        <p className="text-xs opacity-70">One-time Investment</p>
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">
                                        {formData.investmentType === 'SIP' ? 'Total Investment *' : 'Investment Amount *'}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="₹ Amount"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50"
                                    />
                                </div>
                                {formData.investmentType === 'SIP' && (
                                    <div>
                                        <label className="text-[#9CA3AF] text-xs mb-2 block">Monthly SIP Amount</label>
                                        <input
                                            type="number"
                                            placeholder="₹ Monthly"
                                            value={formData.sipAmount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sipAmount: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Start Date *</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#48cae4]/50"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/10 flex gap-3">
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[#9CA3AF] font-medium hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddClient}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#48cae4] to-[#90e0ef] text-white font-medium hover:shadow-lg hover:shadow-[#48cae4]/30 transition-all"
                            >
                                Add Client
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
