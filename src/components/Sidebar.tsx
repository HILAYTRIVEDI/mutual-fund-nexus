'use client';

import {
    LayoutDashboard,
    Wallet,
    TrendingUp,
    Shield,
    Clock,
    Settings,
    HelpCircle,
    LogOut,
} from 'lucide-react';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Wallet, label: 'Portfolio', active: false },
    { icon: TrendingUp, label: 'Trading', active: false },
    { icon: Shield, label: 'Security', active: false },
    { icon: Clock, label: 'History', active: false },
    { icon: Settings, label: 'Settings', active: false },
    { icon: HelpCircle, label: 'Help Center', active: false },
];

export default function Sidebar() {
    return (
        <aside className="w-[280px] bg-[#151A21] rounded-2xl border border-white/5 p-6 flex flex-col">
            {/* Logo */}
            <div className="mb-10">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                    <span className="text-[#10B981]">Z</span>EEX
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1">
                <ul className="space-y-2">
                    {menuItems.map((item) => (
                        <li key={item.label}>
                            <button
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${item.active
                                        ? 'bg-[#10B981]/10 text-[#10B981]'
                                        : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Profile */}
            <div className="pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10B981] to-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                        JD
                    </div>
                    <div>
                        <p className="text-white font-medium text-sm">John Doe</p>
                        <p className="text-[#9CA3AF] text-xs">Pro Account</p>
                    </div>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-all duration-200">
                    <LogOut size={20} />
                    <span className="font-medium">Log Out</span>
                </button>
            </div>
        </aside>
    );
}
