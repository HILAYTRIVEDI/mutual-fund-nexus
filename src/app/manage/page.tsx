'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Trash2, X, UserPlus, PiggyBank, Loader2, Check, Edit2, Key, Copy, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { searchSchemes, type MutualFundScheme } from '@/lib/mfapi';
import { useClientContext, type Client } from '@/context/ClientContext';
import { getSupabaseClient } from '@/lib/supabase';

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

const generatePassword = (pan: string, aadhar: string) => {
    // Simple mock encryption: Base64 of PAN + Last 4 of Aadhar
    const aadharLast4 = aadhar.replace(/\D/g, '').slice(-4);
    try {
        return btoa(`${pan}${aadharLast4}`).slice(0, 10);
    } catch (e) {
        return 'pass1234'; // Fallback
    }
};

export default function ManageClientsPage() {
    const { clients, addClient, updateClient, deleteClient } = useClientContext();
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState<{email: string, password: string} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        panCard: '',
        aadharCard: '',
        password: '', // Admin-defined password for client
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

    // Lock body scroll when modal is open
    useEffect(() => {
        if (showAddModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showAddModal]);

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

    const handleAddClient = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            alert('Please fill in Name, Email, and Password (required for login)');
            return;
        }

        if (formData.password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingClient) {
                updateClient(editingClient.id, {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    panCard: formData.panCard,
                    aadharCard: formData.aadharCard,
                    portfolio: formData.schemeName,
                    schemeCode: formData.schemeCode,
                    investmentType: formData.investmentType,
                    amount: parseFloat(formData.amount) || 0,
                    sipAmount: formData.investmentType === 'SIP' ? parseFloat(formData.sipAmount) : undefined,
                    startDate: formData.startDate,
                });
                setShowAddModal(false);
                resetForm();
            } else {
                // Create user in Supabase Auth
                const supabase = getSupabaseClient();
                
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.name,
                        },
                        emailRedirectTo: undefined, // Don't send confirmation email
                    }
                });

                if (authError) {
                    throw new Error(authError.message);
                }

                if (authData.user) {
                    // Create profile for the user (using type assertion since tables aren't typed)
                    await (supabase.from('profiles') as any).insert({
                        id: authData.user.id,
                        email: formData.email,
                        full_name: formData.name,
                        role: 'client',
                    });

                    // Create client record
                    await addClient({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone || null,
                        pan: formData.panCard,
                        status: 'active' as const,
                        kyc_status: 'pending' as const,
                        notes: null,
                    });

                    // Store credentials to show in modal
                    const savedCredentials = { email: formData.email, password: formData.password };
                    
                    setShowAddModal(false);
                    resetForm();
                    
                    // Show credentials modal after form closes
                    setShowCredentialsModal(savedCredentials);
                }
            }
        } catch (error) {
            console.error('Error creating client:', error);
            alert(error instanceof Error ? error.message : 'Failed to create client');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            email: client.email || '',
            phone: client.phone || '',
            panCard: client.panCard || '',
            aadharCard: client.aadharCard || '',
            password: '', // Password not editable for existing clients
            investmentType: client.investmentType || 'SIP',
            amount: (client.amount || 0).toString(),
            sipAmount: client.sipAmount?.toString() || '',
            startDate: client.startDate || '',
            schemeCode: client.schemeCode || 0,
            schemeName: client.portfolio || '',
        });
        setFundSearch(client.portfolio || '');
        setShowAddModal(true);
    };

    const handleDeleteClient = (clientId: string) => {
        if (confirm('Are you sure you want to remove this client?')) {
            deleteClient(clientId);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            panCard: '',
            aadharCard: '',
            password: '',
            investmentType: 'SIP',
            amount: '',
            sipAmount: '',
            startDate: '',
            schemeCode: 0,
            schemeName: '',
        });
        setFundSearch('');
        setFundResults([]);
        setEditingClient(null);
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.portfolio || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Header */}
                <header className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="pr-12 md:pr-0">
                        <h1 className="text-xl md:text-2xl font-bold">Manage Clients</h1>
                        <p className="text-[#9CA3AF] text-xs md:text-sm">Add, edit, and remove client investments</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 md:px-5 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-[#48cae4] to-[#90e0ef] text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#48cae4]/30 transition-all text-sm self-start sm:self-auto"
                    >
                        <Plus size={18} />
                        Add Client
                    </button>
                </header>

                {/* Search */}
                <div className="glass-card rounded-2xl p-3 md:p-4 mb-4 md:mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Clients List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Desktop Header */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 bg-white/5 border-b border-white/10">
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Client</div>
                        <div className="col-span-3 text-[#9CA3AF] text-xs font-medium uppercase">Mutual Fund</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">Type</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-right">Amount</div>
                        <div className="col-span-2 text-[#9CA3AF] text-xs font-medium uppercase text-center">Actions</div>
                    </div>

                    {/* Body */}
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 md:py-16">
                            <UserPlus className="text-[#9CA3AF] mb-3" size={40} />
                            <p className="text-[#9CA3AF] text-sm">No clients found</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 text-[#48cae4] hover:underline text-sm"
                            >
                                Add your first client
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredClients.map((client) => (
                                <div key={client.id}>
                                    {/* Mobile Card View */}
                                    <div className="lg:hidden p-4 hover:bg-white/5 transition-all">
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
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditClient(client)}
                                                    className="p-2 rounded-lg bg-[#48cae4]/10 text-[#48cae4] hover:bg-[#48cae4]/20 transition-colors flex-shrink-0"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClient(client.id)}
                                                    className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors flex-shrink-0"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-white text-sm mb-3 line-clamp-2">{client.portfolio || 'Investment'}</p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span
                                                className={`px-2.5 py-1 rounded-md font-medium ${client.investmentType === 'SIP'
                                                    ? 'bg-[#48cae4]/10 text-[#48cae4]'
                                                    : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                                                    }`}
                                            >
                                                {client.investmentType || 'Investment'}
                                            </span>
                                            <div className="text-right">
                                                <p className="text-white font-medium">{formatCurrency(client.amount || 0)}</p>
                                                {client.sipAmount && (
                                                    <p className="text-[#9CA3AF] text-[10px]">{formatCurrency(client.sipAmount)}/mo</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Row */}
                                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-all">
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
                                            <p className="text-white text-sm truncate">{client.portfolio || 'Investment'}</p>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-center">
                                            <span
                                                className={`px-3 py-1 rounded-md text-xs font-medium ${client.investmentType === 'SIP'
                                                    ? 'bg-[#48cae4]/10 text-[#48cae4]'
                                                    : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                                                    }`}
                                            >
                                                {client.investmentType || 'Investment'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end">
                                            <div className="text-right">
                                                <p className="text-white text-sm font-medium">{formatCurrency(client.amount || 0)}</p>
                                                {client.sipAmount && (
                                                    <p className="text-[#9CA3AF] text-xs">{formatCurrency(client.sipAmount)}/mo</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEditClient(client)}
                                                className="p-2 rounded-lg bg-[#48cae4]/10 text-[#48cae4] hover:bg-[#48cae4]/20 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClient(client.id)}
                                                className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <Sidebar />

            {/* Credentials Modal */}
            {showCredentialsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="w-full max-w-sm glass-card rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowCredentialsModal(null)}
                            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <ShieldCheck size={24} className="text-[var(--accent-purple)]" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Client Credentials</h3>
                            <p className="text-[#9CA3AF] text-xs mt-1">Share these details securely with the client</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-[#9CA3AF] text-[10px] uppercase font-medium mb-1">Login ID / Email</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-white font-mono text-sm">{showCredentialsModal.email || 'N/A'}</p>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(showCredentialsModal.email || '')}
                                        className="text-[var(--accent-mint)] hover:text-white"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-[#9CA3AF] text-[10px] uppercase font-medium mb-1">Authentication</p>
                                <p className="text-white text-sm">Managed via Supabase</p>
                                <p className="text-[10px] text-[#9CA3AF] mt-2 italic">
                                    Client will receive a password reset link via email
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowCredentialsModal(null)}
                            className="w-full mt-6 py-2.5 rounded-xl bg-[var(--accent-purple)] text-white font-medium hover:bg-[var(--accent-purple)]/90 transition-colors text-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
                    <div className="w-full sm:max-w-xl glass-card rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#48cae4]/20 flex items-center justify-center">
                                    <UserPlus size={20} className="text-[#48cae4]" />
                                </div>
                                <div>
                                    <h2 className="text-white text-base md:text-lg font-semibold">
                                        {editingClient ? 'Edit Client' : 'Add New Client'}
                                    </h2>
                                    <p className="text-[#9CA3AF] text-xs">
                                        {editingClient ? 'Update client investment details' : 'Enter client investment details'}
                                    </p>
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
                        <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Client Name */}
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Client Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter client name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                />
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                    />
                                </div>
                            </div>

                            {/* PAN Card & Aadhar Card */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">PAN Card *</label>
                                    <input
                                        type="text"
                                        placeholder="ABCDE1234F"
                                        value={formData.panCard}
                                        onChange={(e) => setFormData(prev => ({ ...prev, panCard: e.target.value.toUpperCase() }))}
                                        maxLength={10}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">Aadhar Card *</label>
                                    <input
                                        type="text"
                                        placeholder="XXXX XXXX XXXX"
                                        value={formData.aadharCard}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                                            // Format as 1234 5678 9012
                                            const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                                            setFormData(prev => ({ ...prev, aadharCard: formatted }));
                                        }}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
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
                                        placeholder="Search mutual funds..."
                                        value={fundSearch}
                                        onChange={(e) => { setFundSearch(e.target.value); setShowFundDropdown(true); }}
                                        onFocus={() => setShowFundDropdown(true)}
                                        className="w-full pl-12 pr-10 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
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
                                        className={`p-3 md:p-4 rounded-xl border transition-all ${formData.investmentType === 'SIP'
                                            ? 'bg-[#48cae4]/20 border-[#48cae4]/50 text-[#48cae4]'
                                            : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:bg-white/10'
                                            }`}
                                    >
                                        <p className="font-medium text-sm">SIP</p>
                                        <p className="text-[10px] opacity-70">Monthly Investment</p>
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, investmentType: 'Lumpsum' }))}
                                        className={`p-3 md:p-4 rounded-xl border transition-all ${formData.investmentType === 'Lumpsum'
                                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-[#8B5CF6]'
                                            : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:bg-white/10'
                                            }`}
                                    >
                                        <p className="font-medium text-sm">Lumpsum</p>
                                        <p className="text-[10px] opacity-70">One-time Investment</p>
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[#9CA3AF] text-xs mb-2 block">
                                        {formData.investmentType === 'SIP' ? 'Total Investment *' : 'Investment Amount *'}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="₹ Amount"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
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
                                            className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#48cae4]/50 text-sm"
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
                                    className="w-full px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#48cae4]/50 text-sm"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 md:p-6 border-t border-white/10 flex gap-3 safe-area-bottom">
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="flex-1 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-[#9CA3AF] font-medium hover:bg-white/10 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddClient}
                                className="flex-1 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-[#48cae4] to-[#90e0ef] text-white font-medium hover:shadow-lg hover:shadow-[#48cae4]/30 transition-all text-sm"
                            >
                                {editingClient ? 'Update Client' : 'Add Client'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
