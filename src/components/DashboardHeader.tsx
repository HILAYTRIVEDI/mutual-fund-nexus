'use client';

import Link from 'next/link';
import { TrendingUp, Users, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import { useClientContext } from '@/context/ClientContext';
import { useHoldings } from '@/context/HoldingsContext';
import { useSIPs } from '@/context/SIPContext';
import { useMemo } from 'react';

interface QuickStat {
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    icon: React.ElementType;
    color: string;
}

interface DashboardHeaderProps {
    title: string;
    subtitle: string;
}

function formatCurrency(amount: number): string {
    if (Math.abs(amount) >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (Math.abs(amount) >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
    const { clients } = useClientContext();
    const { totalCurrentValue, totalGainLoss, totalInvested } = useHoldings();
    const { sips } = useSIPs();

    const stats = useMemo(() => {
        // 1. New Clients (MTD)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newClientsCount = clients.filter(c => new Date(c.created_at) >= startOfMonth).length;

        // 2. SIPs This Week (Count of active SIPs started this week)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        
        const newSipsThisWeek = sips.filter(s => new Date(s.created_at) >= startOfWeek).length;
        // Total SIP volume this week (amount)
        const newSipsVolume = sips
            .filter(s => new Date(s.created_at) >= startOfWeek)
            .reduce((sum, s) => sum + s.amount, 0);

        // 3. Portfolio Performance (Total Gain/Loss)
        // Since we can't easily get "Today's Change" without history, we'll show Total Gain/Loss
        const isPositive = totalGainLoss >= 0;
        const pnlPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

        return [
            {
                label: 'Total P&L',
                value: (totalGainLoss >= 0 ? '+' : '') + formatCurrency(totalGainLoss),
                change: (pnlPercentage >= 0 ? '+' : '') + pnlPercentage.toFixed(2) + '%',
                isPositive: isPositive,
                icon: TrendingUp,
                color: 'var(--accent-mint)',
            },
            {
                label: 'New Clients (MTD)',
                value: newClientsCount.toString(),
                icon: Users,
                color: 'var(--accent-blue)',
            },
            {
                label: 'New SIPs (Week)',
                value: newSipsThisWeek.toString(),
                change: formatCurrency(newSipsVolume),
                isPositive: true,
                icon: PiggyBank,
                color: 'var(--accent-purple)',
            },
        ];
    }, [clients, sips, totalGainLoss, totalInvested]);

    return (
        <header className="mb-4 md:mb-6 space-y-3 md:space-y-4">
            {/* Row 1: Title + Theme Toggle + Notifications */}
            <div className="flex items-start md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0 pr-12 md:pr-0">
                    <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] ">{title}</h1>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm line-clamp-2 md:line-clamp-1">{subtitle}</p>
                </div>

                <div className="hidden md:flex items-center gap-3">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notification Bell */}
                    <NotificationBell />
                </div>
            </div>

            {/* Mobile: Theme & Notifications Row */}
            <div className="flex md:hidden items-center gap-2">
                <ThemeToggle />
                <NotificationBell />
            </div>

            {/* Row 2: Search + Quick Stats */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 md:gap-4">
                {/* Global Search */}
                <div className="w-full lg:flex-1 lg:max-w-md">
                    <GlobalSearch />
                </div>

                {/* Quick Stats Badges - Scrollable on mobile */}
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={index}
                                className="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] transition-colors duration-300 flex-shrink-0"
                            >
                                <div
                                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 20%, transparent)` }}
                                >
                                    <Icon size={14} className="md:w-4 md:h-4" style={{ color: stat.color }} />
                                </div>
                                <div>
                                    <p className="text-[var(--text-secondary)] text-[10px] md:text-xs whitespace-nowrap">{stat.label}</p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[var(--text-primary)] font-semibold text-xs md:text-sm">{stat.value}</span>
                                        {stat.change && (
                                            <span className={`text-[10px] md:text-xs ${stat.isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
                                                {stat.change}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </header>
    );
}
