'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
}

const initialNotifications: Notification[] = [
    {
        id: '1',
        type: 'warning',
        title: 'SIP Bounce Alert',
        message: 'Neha Gupta\'s SIP failed due to insufficient funds',
        timestamp: '2024-12-26T01:30:00',
        read: false,
    },
    {
        id: '2',
        type: 'success',
        title: 'New Client Added',
        message: 'Rajesh Kumar has been successfully onboarded',
        timestamp: '2024-12-26T01:25:00',
        read: false,
    },
    {
        id: '3',
        type: 'info',
        title: 'NAV Updated',
        message: '156 fund NAVs have been updated',
        timestamp: '2024-12-25T20:00:00',
        read: true,
    },
    {
        id: '4',
        type: 'error',
        title: 'KYC Expiry',
        message: 'Amit Patel\'s KYC expires in 7 days',
        timestamp: '2024-12-25T10:00:00',
        read: true,
    },
    {
        id: '5',
        type: 'success',
        title: 'SIP Executed',
        message: '₹50,000 invested in HDFC Top 100 for Rajesh Kumar',
        timestamp: '2024-12-25T09:30:00',
        read: true,
    },
];

const typeIcons: Record<NotificationType, React.ElementType> = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
};

const typeColors: Record<NotificationType, string> = {
    success: '#48cae4',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
};

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    };

    const clearNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
                <Bell size={20} className="text-[#9CA3AF]" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EF4444] text-white text-xs font-bold flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-80 bg-[#151A21] rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-white font-semibold">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[#48cae4] text-xs hover:underline"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="mx-auto text-[#9CA3AF] mb-2" size={32} />
                                <p className="text-[#9CA3AF] text-sm">No notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = typeIcons[notification.type];
                                const color = typeColors[notification.type];

                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-white/5' : ''
                                            }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${color}20` }}
                                            >
                                                <Icon size={16} style={{ color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-white text-sm font-medium">{notification.title}</p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            clearNotification(notification.id);
                                                        }}
                                                        className="text-[#9CA3AF] hover:text-white flex-shrink-0"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <p className="text-[#9CA3AF] text-xs mt-1 line-clamp-2">{notification.message}</p>
                                                <p className="text-[#9CA3AF]/60 text-xs mt-1">{getRelativeTime(notification.timestamp)}</p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-[#48cae4] flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/10">
                        <button className="w-full py-2 text-[#48cae4] text-sm font-medium hover:bg-[#48cae4]/10 rounded-lg transition-colors">
                            View All Notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
