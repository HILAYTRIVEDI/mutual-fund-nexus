'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
    Newspaper,
    Menu,
    X,
    Calculator,
} from 'lucide-react';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin-dashboard', roles: ['admin', 'advisor'] },
    { icon: LayoutDashboard, label: 'My Dashboard', href: '/client-dashboard', roles: ['client'] },
    { icon: Users, label: 'Clients', href: '/clients', roles: ['admin', 'advisor'] },
    { icon: UserPlus, label: 'Manage Clients', href: '/manage', roles: ['admin', 'advisor'] },
    { icon: BarChart3, label: 'Portfolio', href: '/portfolio', roles: ['admin', 'advisor', 'client'] },
    { icon: Scale, label: 'Compare Funds', href: '/compare', roles: ['admin', 'advisor'] },
    { icon: Calculator, label: 'Calculators', href: '/calculators', roles: ['admin', 'advisor', 'client'] },
    { icon: PiggyBank, label: 'Mutual Funds', href: '/mutual-funds', roles: ['admin', 'advisor'] },
    { icon: Clock, label: 'History', href: '/history', roles: ['admin', 'advisor'] },
    { icon: Settings, label: 'Settings', href: '/settings', roles: ['admin', 'advisor', 'client'] },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout, isLoading } = useAuth();

    // Close sidebar on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('menu-open');
        } else {
            document.body.classList.remove('menu-open');
        }
        return () => {
            document.body.classList.remove('menu-open');
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="mb-8 md:mb-10">
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    <span className="bg-gradient-to-r from-[var(--accent-mint)] to-[#90e0ef] bg-clip-text text-transparent">MF</span> Nexus
                </h1>
                <p className="text-[var(--text-secondary)] text-xs mt-1">Mutual Fund Portfolio</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1">
                <ul className="space-y-1 md:space-y-2">
                    {menuItems
                        .filter((item) => {
                            // Filter based on role
                            if (isLoading) return true; // Show all while loading
                            if (!user?.role) return false; // Hide all if no role
                            return item.roles.includes(user.role);
                        })
                        .map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
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
            <div className="pt-4 md:pt-6 border-t border-[var(--border-primary)]">
                {user && (
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-[var(--accent-mint)]/10 to-[var(--accent-purple)]/10">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-mint)] to-[var(--accent-purple)] flex items-center justify-center text-white font-semibold shadow-lg shadow-[var(--glow-mint)]">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[var(--text-primary)] font-medium text-sm truncate">{user.name}</p>
                            <p className="text-[var(--accent-mint)] text-xs truncate capitalize">{user.role} Account</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Log Out</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Hamburger Button - Fixed Position */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 z-50 md:hidden w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-primary)] shadow-lg hover:bg-[var(--bg-hover)] transition-all"
                aria-label="Open menu"
            >
                <Menu size={24} />
            </button>

            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay md:hidden ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Mobile Drawer */}
            <aside
                className={`fixed inset-y-0 right-0 z-50 w-[85%] max-w-[320px] bg-[var(--bg-card)] p-6 flex flex-col md:hidden transform transition-transform duration-300 ease-out safe-area-inset safe-area-bottom overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>

                <SidebarContent />
            </aside>

            {/* Desktop Sidebar - Static Position */}
            <aside className="hidden md:flex w-[280px] glass-card rounded-2xl p-6 flex-col mint-glow sticky top-6 h-fit max-h-[calc(100vh-48px)] overflow-y-auto transition-colors duration-300 flex-shrink-0">
                <SidebarContent />
            </aside>
        </>
    );
}
