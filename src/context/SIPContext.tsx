'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { SIP, SIPInsert } from '@/lib/types/database';

// SIP with additional computed/joined data
export interface SIPWithDetails extends SIP {
    scheme_name?: string;
    client_name?: string;
    days_until_next?: number;
}

interface SIPContextType {
    sips: SIPWithDetails[];
    isLoading: boolean;
    error: string | null;
    activeSIPs: SIPWithDetails[];
    upcomingSIPs: SIPWithDetails[];
    totalMonthlyAmount: number;
    getClientSIPs: (clientId: string) => SIPWithDetails[];
    addSIP: (sip: SIPInsert) => Promise<{ success: boolean; error?: string }>;
    updateSIP: (id: string, updates: Partial<SIP>) => Promise<{ success: boolean; error?: string }>;
    pauseSIP: (id: string) => Promise<{ success: boolean; error?: string }>;
    cancelSIP: (id: string) => Promise<{ success: boolean; error?: string }>;
    refreshSIPs: () => Promise<void>;
}

const SIPContext = createContext<SIPContextType | undefined>(undefined);

export function SIPProvider({ children }: { children: ReactNode }) {
    const [sips, setSips] = useState<SIPWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseClient();

    const fetchSIPs = useCallback(async () => {
        console.log('[SIPContext] fetchSIPs called', { authLoading, isAuthenticated });

        // Wait for auth to finish loading
        if (authLoading) {
            console.log('[SIPContext] Auth loading, returning');
            return;
        }

        if (!isAuthenticated) {
            console.log('[SIPContext] Not authenticated, clearing');
            setSips([]);
            setIsLoading(false);
            return;
        }

        try {
            console.log('[SIPContext] Fetching SIPs...');
            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('sips')
                .select(`
                    *,
                    mutual_fund:mutual_funds(name),
                    client:clients(name)
                `)
                .order('next_execution_date', { ascending: true });

            if (fetchError) {
                throw fetchError;
            }

            // Calculate days until next execution
            const today = new Date();
            const sipsWithDetails: SIPWithDetails[] = (data || []).map((sip: any) => {
                const nextDate = sip.next_execution_date ? new Date(sip.next_execution_date) : null;
                const daysUntilNext = nextDate 
                    ? Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                return {
                    ...sip,
                    scheme_name: sip.mutual_fund?.name,
                    client_name: sip.client?.name,
                    days_until_next: daysUntilNext ?? undefined,
                };
            });

            setSips(sipsWithDetails);
        } catch (err) {
            console.error('Error fetching SIPs:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch SIPs');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, supabase, authLoading]);

    // Fetch SIPs when auth finishes loading
    useEffect(() => {
        if (!authLoading) {
            console.log('[SIPContext] Auth finished loading, triggering fetch');
            fetchSIPs();
        }
    }, [authLoading, isAuthenticated, fetchSIPs]);

    // Computed values
    const activeSIPs = sips.filter(s => s.status === 'active');
    const upcomingSIPs = activeSIPs
        .filter(s => s.days_until_next !== undefined && s.days_until_next <= 7 && s.days_until_next >= 0)
        .sort((a, b) => (a.days_until_next || 0) - (b.days_until_next || 0));
    const totalMonthlyAmount = activeSIPs
        .filter(s => s.frequency === 'monthly')
        .reduce((sum, s) => sum + s.amount, 0);

    const getClientSIPs = (clientId: string) => {
        return sips.filter(s => s.client_id === clientId);
    };

    const addSIP = async (sipData: SIPInsert): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error: insertError } = await (supabase
                .from('sips') as any)
                .insert(sipData)
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            if (data) {
                await fetchSIPs();
                return { success: true };
            }

            return { success: false, error: 'Failed to add SIP' };
        } catch (err) {
            console.error('Error adding SIP:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add SIP' };
        }
    };

    const updateSIP = async (id: string, updates: Partial<SIP>): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error: updateError } = await (supabase
                .from('sips') as any)
                .update(updates)
                .eq('id', id);

            if (updateError) {
                throw updateError;
            }

            await fetchSIPs();
            return { success: true };
        } catch (err) {
            console.error('Error updating SIP:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update SIP' };
        }
    };

    const pauseSIP = async (id: string) => {
        return updateSIP(id, { status: 'paused' });
    };

    const cancelSIP = async (id: string) => {
        return updateSIP(id, { status: 'cancelled' });
    };

    return (
        <SIPContext.Provider value={{
            sips,
            isLoading,
            error,
            activeSIPs,
            upcomingSIPs,
            totalMonthlyAmount,
            getClientSIPs,
            addSIP,
            updateSIP,
            pauseSIP,
            cancelSIP,
            refreshSIPs: fetchSIPs,
        }}>
            {children}
        </SIPContext.Provider>
    );
}

export function useSIPs() {
    const context = useContext(SIPContext);
    if (context === undefined) {
        throw new Error('useSIPs must be used within a SIPProvider');
    }
    return context;
}
