'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    BarChart3,
    Scale,
    PiggyBank,
    Clock,
    Settings,
    HelpCircle,
    LogOut,
} from 'lucide-react';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: Users, label: 'Clients', href: '/clients' },
    { icon: UserPlus, label: 'Manage Clients', href: '/manage' },
    { icon: BarChart3, label: 'Portfolio', href: '/portfolio' },
    { icon: Scale, label: 'Compare Funds', href: '/compare' },
    { icon: PiggyBank, label: 'Mutual Funds', href: '/mutual-funds' },
    { icon: Clock, label: 'History', href: '/history' },
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: HelpCircle, label: 'Help Center', href: '/help' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-[280px] glass-card rounded-2xl p-6 flex flex-col mint-glow sticky top-6 h-fit max-h-[calc(100vh-48px)] overflow-y-auto transition-colors duration-300">
            {/* Logo */}
            <div className="mb-10">
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    <span className="bg-gradient-to-r from-[var(--accent-mint)] to-[#34D399] bg-clip-text text-transparent">MF</span> Nexus
                </h1>
                <p className="text-[var(--text-secondary)] text-xs mt-1">Mutual Fund Portfolio</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1">
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-gradient-to-r from-[var(--accent-mint)]/20 to-[var(--accent-mint)]/5 text-[var(--accent-mint)] border border-[var(--accent-mint)]/20'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Profile */}
            <div className="pt-6 border-t border-[var(--border-primary)]">
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-[var(--accent-mint)]/10 to-[var(--accent-purple)]/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-mint)] to-[var(--accent-purple)] flex items-center justify-center text-white font-semibold shadow-lg shadow-[var(--glow-mint)]">
                        HF
                    </div>
                    <div>
                        <p className="text-[var(--text-primary)] font-medium text-sm">Hedge Fund Admin</p>
                        <p className="text-[var(--accent-mint)] text-xs">Enterprise Account</p>
                    </div>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all duration-200">
                    <LogOut size={20} />
                    <span className="font-medium">Log Out</span>
                </button>
            </div>
        </aside>
    );
}
