'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Client as DBClient, ClientInsert } from '@/lib/types/database';

// Frontend Client interface (extends DB type with computed fields)
export interface Client extends DBClient {
    // Computed/joined fields for backwards compatibility
    panCard?: string;
    aadharCard?: string;
    portfolio?: string;
    schemeCode?: number;
    investmentType?: 'SIP' | 'Lumpsum';
    amount?: number;
    sipAmount?: number;
    startDate?: string;
}

interface ClientContextType {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    addClient: (client: Omit<ClientInsert, 'advisor_id'>) => Promise<{ success: boolean; error?: string; data?: Client }>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<{ success: boolean; error?: string }>;
    deleteClient: (id: string) => Promise<{ success: boolean; error?: string }>;
    refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseClient();

    // Fetch clients from Supabase
    const fetchClients = useCallback(async () => {
        console.log('[ClientContext] fetchClients called', { isAuthenticated, userId: user?.id, authLoading });
        
        // Wait for auth to finish loading
        if (authLoading) {
            console.log('[ClientContext] Auth still loading, waiting...');
            return;
        }
        
        if (!isAuthenticated || !user) {
            console.log('[ClientContext] Not authenticated, clearing clients');
            setClients([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            console.log('[ClientContext] Fetching clients from Supabase...');
            const { data, error: fetchError } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('[ClientContext] Supabase response:', { 
                dataCount: data?.length ?? 0, 
                error: fetchError?.message,
                rawData: data 
            });

            if (fetchError) {
                throw fetchError;
            }

            // Map to frontend Client type
            const mappedClients: Client[] = (data || []).map((client: any) => ({
                id: client.id,
                advisor_id: client.advisor_id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                pan: client.pan,
                panCard: client.pan, // Alias for backwards compatibility
                status: client.status,
                kyc_status: client.kyc_status,
                notes: client.notes,
                created_at: client.created_at,
                updated_at: client.updated_at,
            }));

            console.log('[ClientContext] Mapped clients:', mappedClients.length);
            setClients(mappedClients);
        } catch (err) {
            console.error('[ClientContext] Error fetching clients:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch clients');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, user, supabase, authLoading]);

    // Fetch clients when auth finishes loading
    useEffect(() => {
        // Only fetch after auth has finished loading
        if (!authLoading) {
            console.log('[ClientContext] Auth finished loading, triggering fetch. User:', user?.id);
            fetchClients();
        }
    }, [authLoading, user, fetchClients]);

    const addClient = async (clientData: Omit<ClientInsert, 'advisor_id'>): Promise<{ success: boolean; error?: string; data?: Client }> => {
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Validate PAN card (required field in database)
        if (!clientData.pan || clientData.pan.trim().length === 0) {
            return { success: false, error: 'PAN Card is required' };
        }

        try {
            const { data, error: insertError } = await (supabase
                .from('clients') as any)
                .insert({
                    ...clientData,
                    advisor_id: user.id,
                })
                .select()
                .single();

            if (insertError) {
                console.error('Supabase insert error:', insertError.message, insertError.code, insertError.details);
                throw new Error(insertError.message || 'Database error');
            }

            if (data) {
                const newClient = { ...data, panCard: data.pan };
                setClients(prev => [newClient, ...prev]);
                return { success: true, data: newClient };
            }

            return { success: false, error: 'Failed to add client' };
        } catch (err) {
            console.error('Error adding client:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to add client';
            return { success: false, error: errorMessage };
        }
    };

    const updateClient = async (id: string, updates: Partial<Client>): Promise<{ success: boolean; error?: string }> => {
        try {
            // Extract only DB fields from updates
            const dbUpdates: Partial<DBClient> = {
                name: updates.name,
                email: updates.email,
                phone: updates.phone,
                pan: updates.pan || updates.panCard,
                status: updates.status,
                kyc_status: updates.kyc_status,
                notes: updates.notes,
            };

            // Remove undefined values
            Object.keys(dbUpdates).forEach(key => {
                if (dbUpdates[key as keyof typeof dbUpdates] === undefined) {
                    delete dbUpdates[key as keyof typeof dbUpdates];
                }
            });

            const { data, error: updateError } = await (supabase
                .from('clients') as any)
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            if (data) {
                setClients(prev => prev.map(c => 
                    c.id === id ? { ...c, ...data, panCard: data.pan } : c
                ));
                return { success: true };
            }

            return { success: false, error: 'Failed to update client' };
        } catch (err) {
            console.error('Error updating client:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update client' };
        }
    };

    const deleteClient = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error: deleteError } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw deleteError;
            }

            setClients(prev => prev.filter(c => c.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting client:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete client' };
        }
    };

    const refreshClients = async () => {
        await fetchClients();
    };

    return (
        <ClientContext.Provider value={{ 
            clients, 
            isLoading, 
            error, 
            addClient, 
            updateClient, 
            deleteClient,
            refreshClients 
        }}>
            {children}
        </ClientContext.Provider>
    );
}

export function useClientContext() {
    const context = useContext(ClientContext);
    if (context === undefined) {
        throw new Error('useClientContext must be used within a ClientProvider');
    }
    return context;
}
