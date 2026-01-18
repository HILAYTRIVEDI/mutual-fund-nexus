'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Profile } from '@/lib/types/database';

// Client is a profile with role='client'
export interface Client extends Profile {
    // Backwards compatibility aliases
    name: string;  // Maps to full_name
    panCard?: string;
    status?: 'active' | 'inactive';  // Derived from kyc_status or always 'active'
}

interface ClientContextType {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    addClient: (clientData: { name: string; email: string; phone?: string; pan?: string; password: string }) => Promise<{ success: boolean; error?: string; data?: Client }>;
    updateClient: (id: string, updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
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

    // Fetch clients = profiles where advisor_id = current user's id
    const fetchClients = useCallback(async () => {
        console.log('[ClientContext] fetchClients called', { authLoading, userId: user?.id });
        
        if (authLoading) {
            return;
        }
        
        if (!isAuthenticated || !user) {
            setClients([]);
            setIsLoading(false);
            return;
        }

        // Only admins can fetch clients
        if (user.role !== 'admin') {
            setClients([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            console.log('[ClientContext] Fetching clients from profiles where advisor_id =', user.id);
            
            // Clients are profiles where advisor_id = this admin's id
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('advisor_id', user.id)
                .eq('role', 'client')
                .order('created_at', { ascending: false });

            // Handle errors gracefully - empty table is not an error
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.warn('[ClientContext] Fetch warning:', fetchError.message);
            }

            console.log('[ClientContext] Fetch result:', { count: data?.length || 0 });

            // Map to Client type (or empty array)
            const mappedClients: Client[] = (data || []).map((profile: any) => ({
                ...profile,
                name: profile.full_name || profile.email?.split('@')[0] || 'Client',
                panCard: profile.pan,
                status: 'active' as const,
            }));

            setClients(mappedClients);
        } catch (err) {
            // Log but don't throw - just set empty array
            console.warn('[ClientContext] Fetch error (ignored):', err);
            setClients([]);
        } finally {
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, user, supabase]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchClients();
        }
    }, [authLoading, user, fetchClients]);

    // Add client - calls API to create auth user, trigger creates profile
    const addClient = async (clientData: { name: string; email: string; phone?: string; pan?: string; password: string }): Promise<{ success: boolean; error?: string; data?: Client }> => {
        console.log('[ClientContext] addClient called', { userId: user?.id, clientData: { ...clientData, password: '***' } });
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Call API to create auth user (this triggers profile creation)
            const response = await fetch('/api/clients/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: clientData.name,
                    email: clientData.email,
                    password: clientData.password,
                    phone: clientData.phone,
                    pan: clientData.pan,
                    advisorId: user.id,  // Link to this admin
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create client');
            }

            console.log('[ClientContext] Client created via API:', result);

            // Refresh clients list
            await fetchClients();

            // Find the newly created client
            const newClient = clients.find(c => c.email === clientData.email);

            return { success: true, data: newClient };
        } catch (err) {
            console.error('[ClientContext] Error adding client:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add client' };
        }
    };

    const updateClient = async (id: string, updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error: updateError } = await (supabase
                .from('profiles') as any)
                .update(updates)
                .eq('id', id)
                .eq('advisor_id', user?.id); // Security: only update own clients

            if (updateError) {
                throw updateError;
            }

            await fetchClients();
            return { success: true };
        } catch (err) {
            console.error('[ClientContext] Error updating client:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update client' };
        }
    };

    const deleteClient = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Note: Deleting a profile requires deleting the auth user first (service role)
            // For now, we just remove advisor_id to unlink them
            const { error: updateError } = await (supabase
                .from('profiles') as any)
                .update({ advisor_id: null })
                .eq('id', id);

            if (updateError) {
                throw updateError;
            }

            setClients(prev => prev.filter(c => c.id !== id));
            return { success: true };
        } catch (err) {
            console.error('[ClientContext] Error deleting client:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete client' };
        }
    };

    return (
        <ClientContext.Provider value={{ 
            clients, 
            isLoading, 
            error, 
            addClient, 
            updateClient, 
            deleteClient,
            refreshClients: fetchClients 
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
