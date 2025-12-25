'use client';

import { TrendingUp, Users, PiggyBank } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

interface QuickStat {
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    icon: React.ElementType;
    color: string;
}

const quickStats: QuickStat[] = [
    {
        label: 'Today\'s AUM Change',
        value: '+₹12.5L',
        change: '+0.10%',
        isPositive: true,
        icon: TrendingUp,
        color: 'var(--accent-mint)',
    },
    {
        label: 'New Clients (MTD)',
        value: '8',
        icon: Users,
        color: 'var(--accent-blue)',
    },
    {
        label: 'SIPs This Week',
        value: '23',
        change: '₹11.5L',
        isPositive: true,
        icon: PiggyBank,
        color: 'var(--accent-purple)',
    },
];

interface DashboardHeaderProps {
    title: string;
    subtitle: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
    return (
        <header className="mb-6 space-y-4">
            {/* Row 1: Title + Theme Toggle + Notifications */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
                    <p className="text-[var(--text-secondary)] text-sm">{subtitle}</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notification Bell */}
                    <NotificationBell />
                </div>
            </div>

            {/* Row 2: Search + Quick Stats */}
            <div className="flex items-center justify-between gap-4">
                {/* Global Search */}
                <div className="flex-1">
                    <GlobalSearch />
                </div>

                {/* Quick Stats Badges */}
                <div className="flex items-center gap-3">
                    {quickStats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={index}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] transition-colors duration-300"
                            >
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 20%, transparent)` }}
                                >
                                    <Icon size={16} style={{ color: stat.color }} />
                                </div>
                                <div>
                                    <p className="text-[var(--text-secondary)] text-xs">{stat.label}</p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[var(--text-primary)] font-semibold text-sm">{stat.value}</span>
                                        {stat.change && (
                                            <span className={`text-xs ${stat.isPositive ? 'text-[var(--accent-mint)]' : 'text-[var(--accent-red)]'}`}>
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
