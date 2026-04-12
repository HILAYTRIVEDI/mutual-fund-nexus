'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, ChevronDown, X, UserPlus, UserMinus, PiggyBank, TrendingUp, TrendingDown, ArrowRightLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useTransactions } from '@/context/TransactionsContext';

type LogType = 'client_added' | 'client_removed' | 'investment_sip' | 'investment_lumpsum' | 'redemption' | 'switch' | 'nav_update' | 'sip_executed' | 'dividend';
type LogStatus = 'success' | 'pending' | 'failed';

interface ActivityLog {
    id: string;
    type: LogType;
    title: string;
    description: string;
    clientName?: string;
    fundName?: string;
    amount?: number;
    status: LogStatus;
    timestamp: string;
    metadata?: Record<string, string>;
}

const logTypeLabels: Record<LogType, string> = {
    client_added: 'Client Added',
    client_removed: 'Client Removed',
    investment_sip: 'SIP Investment',
    investment_lumpsum: 'Lumpsum Investment',
    redemption: 'Redemption',
    switch: 'Fund Switch',
    nav_update: 'NAV Update',
    sip_executed: 'SIP Executed',
    dividend: 'Dividend',
};

const logTypeIcons: Record<LogType, React.ElementType> = {
    client_added: UserPlus,
    client_removed: UserMinus,
    investment_sip: TrendingUp,
    investment_lumpsum: PiggyBank,
    redemption: TrendingDown,
    switch: ArrowRightLeft,
    nav_update: Clock,
    sip_executed: CheckCircle,
    dividend: PiggyBank,
};

const logTypeColors: Record<LogType, string> = {
    client_added: '#C4A265',
    client_removed: '#EF4444',
    investment_sip: '#C4A265',
    investment_lumpsum: '#5B7FA4',
    redemption: '#F59E0B',
    switch: '#3B82F6',
    nav_update: '#9CA3AF',
    sip_executed: '#C4A265',
    dividend: '#5B7FA4',
};

const statusIcons: Record<LogStatus, React.ElementType> = {
    success: CheckCircle,
    pending: Clock,
    failed: XCircle,
};

const statusColors: Record<LogStatus, string> = {
    success: '#C4A265',
    pending: '#F59E0B',
    failed: '#EF4444',
};

function formatCurrency(amount: number): string {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
}

export default function HistoryPage() {
    const { transactions, isLoading, refreshTransactions } = useTransactions();
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<LogType | 'All'>('All');
    const [statusFilter, setStatusFilter] = useState<LogStatus | 'All'>('All');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const hasSynced = useRef(false);

    // Auto-trigger allotment sync on page load if any pending transactions have an NSE order ID
    useEffect(() => {
        if (isLoading || hasSynced.current) return;
        const pendingWithOrderId = transactions.filter(
            t => t.status === 'pending' && t.nse_order_id
        );
        if (pendingWithOrderId.length === 0) return;

        hasSynced.current = true;
        fetch('/api/nse/sync-allotment', { method: 'POST', body: JSON.stringify({}) })
            .then(r => r.json())
            .then(result => {
                if (result.synced > 0) {
                    refreshTransactions();
                }
            })
            .catch(() => { /* silent — sync is best-effort */ });
    }, [isLoading, transactions, refreshTransactions]);

    const activityLogs: ActivityLog[] = useMemo(() => {
        return transactions.map(tx => {
            let type: LogType = 'investment_lumpsum';
            let title = 'Investment';
            let description = 'Investment processed';
            
            if (tx.type === 'sip') {
                type = 'investment_sip';
                title = 'SIP Executed';
                description = 'Monthly SIP installment processed';
            } else if (tx.type === 'buy') {
                type = 'investment_lumpsum';
                title = 'Lumpsum Investment';
                description = 'One-time investment made';
            } else if (tx.type === 'sell') {
                type = 'redemption';
                title = 'Redemption Processed';
                description = 'Partial or full redemption completed';
            } else if (tx.type === 'switch') {
                type = 'switch';
                title = 'Fund Switch';
                description = 'Switched from one fund to another';
            }

            const allottedNav = (tx.nav != null && tx.nav > 0) ? tx.nav : (tx.units > 0 ? tx.amount / tx.units : 0);

            return {
                id: tx.id,
                type,
                title,
                description,
                clientName: tx.profile?.full_name || tx.profile?.email || 'Unknown Client',
                fundName: tx.mutual_fund?.name || tx.scheme_code || 'Unknown Fund',
                amount: tx.amount,
                status: tx.status === 'completed' ? 'success' : tx.status as LogStatus,
                timestamp: tx.date || tx.created_at,
                metadata: {
                    'Allotted NAV': `₹${allottedNav.toFixed(2)}`,
                    'Units Allotted': tx.units > 0 ? tx.units.toFixed(4) : '—',
                    'Transaction Date': tx.date ? formatDate(tx.date) : '—',
                    'Order ID': tx.nse_order_id || '—',
                }
            };
        });
    }, [transactions]);

    const filteredLogs = useMemo(() => {
        return activityLogs.filter((log) => {
            const matchesSearch =
                searchQuery === '' ||
                log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.fundName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = typeFilter === 'All' || log.type === typeFilter;
            const matchesStatus = statusFilter === 'All' || log.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [activityLogs, searchQuery, typeFilter, statusFilter]);

    const hasActiveFilters = typeFilter !== 'All' || statusFilter !== 'All' || searchQuery !== '';

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('All');
        setStatusFilter('All');
    };

    // Stats
    const todayLogs = activityLogs.filter(log => {
        const logDate = new Date(log.timestamp).toDateString();
        const today = new Date().toDateString();
        return logDate === today;
    }).length;

    const successLogs = activityLogs.filter(log => log.status === 'success').length;
    const failedLogs = activityLogs.filter(log => log.status === 'failed').length;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex gap-6 transition-colors duration-300">
            {/* Main Content */}
            <main className="flex-1">
                {/* Header */}
                <header className="mb-6 pr-14 md:pr-0">
                    <h1 className="text-2xl font-bold">Activity History</h1>
                    <p className="text-[#9CA3AF] text-sm">Complete log of all operations and transactions</p>
                </header>

                {/* Stats */}
                <div className="flex lg:grid lg:grid-cols-4 gap-3 md:gap-4 mb-6 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
                    <div className="glass-card rounded-2xl p-4 gradient-border flex-shrink-0 min-w-[130px] lg:min-w-0">
                        <p className="text-[#9CA3AF] text-xs">Total Logs</p>
                        <p className="text-white text-xl font-bold">{activityLogs.length}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border flex-shrink-0 min-w-[130px] lg:min-w-0">
                        <p className="text-[#9CA3AF] text-xs">Today</p>
                        <p className="text-white text-xl font-bold">{todayLogs}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border flex-shrink-0 min-w-[130px] lg:min-w-0">
                        <p className="text-[#9CA3AF] text-xs">Successful</p>
                        <p className="text-[#C4A265] text-xl font-bold">{successLogs}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 gradient-border flex-shrink-0 min-w-[130px] lg:min-w-0">
                        <p className="text-[#9CA3AF] text-xs">Failed</p>
                        <p className="text-[#EF4444] text-xl font-bold">{failedLogs}</p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="glass-card rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
                            <input
                                type="text"
                                placeholder="Search logs by title, client, or fund..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4A265]/50 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all ${showFilters || hasActiveFilters
                                ? 'bg-[#C4A265]/20 text-[#C4A265] border border-[#C4A265]/30'
                                : 'bg-white/5 text-[#9CA3AF] border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <Filter size={18} />
                            Filters
                            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#C4A265]" />}
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

                    {showFilters && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Log Type</label>
                                <div className="relative">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value as LogType | 'All')}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none"
                                    >
                                        <option value="All" className="bg-[#151A21]">All Types</option>
                                        {Object.entries(logTypeLabels).map(([key, label]) => (
                                            <option key={key} value={key} className="bg-[#151A21]">{label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[#9CA3AF] text-xs mb-2 block">Status</label>
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as LogStatus | 'All')}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none"
                                    >
                                        <option value="All" className="bg-[#151A21]">All Status</option>
                                        <option value="success" className="bg-[#151A21]">Success</option>
                                        <option value="pending" className="bg-[#151A21]">Pending</option>
                                        <option value="failed" className="bg-[#151A21]">Failed</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity Timeline */}
                <div className="glass-card rounded-2xl p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Clock className="animate-spin text-[#9CA3AF] mb-3" size={32} />
                            <p className="text-[#9CA3AF]">Loading activities...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Clock className="text-[#9CA3AF] mb-3" size={48} />
                            <p className="text-[#9CA3AF]">No activity logs found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLogs.map((log, index) => {
                                const Icon = logTypeIcons[log.type];
                                const color = logTypeColors[log.type];
                                const StatusIcon = statusIcons[log.status];
                                const statusColor = statusColors[log.status];
                                const isExpanded = expandedLog === log.id;

                                return (
                                    <div
                                        key={log.id}
                                        className={`relative pl-12 pb-4 ${index !== filteredLogs.length - 1 ? 'border-b border-white/5' : ''}`}
                                    >
                                        {/* Timeline dot and line */}
                                        <div
                                            className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${color}20` }}
                                        >
                                            <Icon size={16} style={{ color }} />
                                        </div>
                                        {index !== filteredLogs.length - 1 && (
                                            <div className="absolute left-4 top-10 w-px h-[calc(100%-24px)] bg-white/10" />
                                        )}

                                        {/* Log Content */}
                                        <div
                                            className="cursor-pointer hover:bg-white/5 rounded-xl p-3 -ml-3 transition-colors"
                                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-white font-medium">{log.title}</span>
                                                        <span
                                                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                            style={{ backgroundColor: `${color}20`, color }}
                                                        >
                                                            {logTypeLabels[log.type]}
                                                        </span>
                                                        <span
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                                                        >
                                                            <StatusIcon size={10} />
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[#9CA3AF] text-sm">{log.description}</p>
                                                    {(log.clientName || log.fundName || log.amount) && (
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                                                            {log.clientName && (
                                                                <span className="text-[#9CA3AF]">
                                                                    Client: <span className="text-white">{log.clientName}</span>
                                                                </span>
                                                            )}
                                                            {log.fundName && (
                                                                <span className="text-[#9CA3AF]">
                                                                    Fund: <span className="text-white">{log.fundName}</span>
                                                                </span>
                                                            )}
                                                            {log.amount && (
                                                                <span className="text-[#C4A265] font-medium">
                                                                    {formatCurrency(log.amount)}
                                                                </span>
                                                            )}
                                                            {log.metadata?.['Allotted NAV'] && log.metadata['Allotted NAV'] !== '₹0.00' && (
                                                                <span className="text-[#9CA3AF]">
                                                                    NAV: <span className="text-white font-medium">{log.metadata['Allotted NAV']}</span>
                                                                </span>
                                                            )}
                                                            {log.metadata?.['Units Allotted'] && log.metadata['Units Allotted'] !== '—' && (
                                                                <span className="text-[#9CA3AF]">
                                                                    Units: <span className="text-white font-medium">{log.metadata['Units Allotted']}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-[#9CA3AF] flex-shrink-0">
                                                    <p>{getRelativeTime(log.timestamp)}</p>
                                                    <p className="text-[#9CA3AF]/60">{formatTime(log.timestamp)}</p>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && log.metadata && (
                                                <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                                                    <p className="text-[#9CA3AF] text-xs mb-2">Additional Details</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.entries(log.metadata).map(([key, value]) => (
                                                            <div key={key}>
                                                                <span className="text-[#9CA3AF] text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                                                                <span className="text-white text-xs">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-[#9CA3AF]/60 text-xs mt-2">
                                                        Log ID: {log.id} • {formatDate(log.timestamp)} at {formatTime(log.timestamp)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
