'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Notification, NotificationInsert } from '@/lib/types/database';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    addNotification: (notification: Omit<NotificationInsert, 'user_id'>) => Promise<{ success: boolean; error?: string }>;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, isAuthenticated } = useAuth();
    const supabase = getSupabaseClient();

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (fetchError) {
                throw fetchError;
            }

            setNotifications(data || []);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, user, supabase]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Set up real-time subscription for new notifications
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated, user, supabase]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (id: string) => {
        try {
            await (supabase
                .from('notifications') as any)
                .update({ read: true })
                .eq('id', id);

            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        try {
            await (supabase
                .from('notifications') as any)
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    const addNotification = async (notificationData: Omit<NotificationInsert, 'user_id'>): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error: insertError } = await (supabase
                .from('notifications') as any)
                .insert({
                    ...notificationData,
                    user_id: user.id,
                })
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            if (data) {
                setNotifications(prev => [data, ...prev]);
                return { success: true };
            }

            return { success: false, error: 'Failed to add notification' };
        } catch (err) {
            console.error('Error adding notification:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add notification' };
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            error,
            markAsRead,
            markAllAsRead,
            addNotification,
            refreshNotifications: fetchNotifications,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
