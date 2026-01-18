'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Transaction, TransactionInsert } from '@/lib/types/database';

interface TransactionsContextType {
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    getClientTransactions: (clientId: string) => Transaction[];
    getRecentTransactions: (limit?: number) => Transaction[];
    addTransaction: (transaction: TransactionInsert) => Promise<{ success: boolean; error?: string }>;
    refreshTransactions: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseClient();

    const fetchTransactions = useCallback(async () => {
        // Wait for auth to finish loading first
        if (authLoading) {
            return;
        }
        
        if (!isAuthenticated) {
            setTransactions([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('transactions')
                .select(`
                    *,
                    mutual_fund:mutual_funds(*)
                `)
                .order('date', { ascending: false });

            // Handle errors gracefully - empty table is not an error
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.warn('[TransactionsContext] Fetch warning:', fetchError.message);
            }

            setTransactions(data || []);
        } catch (err) {
            // Log but don't throw - just set empty array
            console.warn('[TransactionsContext] Fetch error (ignored):', err);
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, supabase, authLoading]);

    // Fetch when auth finishes loading
    useEffect(() => {
        if (!authLoading) {
            fetchTransactions();
        }
    }, [authLoading, isAuthenticated, fetchTransactions]);

    const getClientTransactions = (clientId: string) => {
        return transactions.filter(t => t.user_id === clientId);
    };

    const getRecentTransactions = (limit = 10) => {
        return transactions.slice(0, limit);
    };

    const addTransaction = async (transactionData: TransactionInsert): Promise<{ success: boolean; error?: string }> => {
        console.log('[TransactionsContext] addTransaction called with:', transactionData);
        try {
            const { data, error: insertError } = await (supabase
                .from('transactions') as any)
                .insert(transactionData)
                .select()
                .single();

            if (insertError) {
                console.error('[TransactionsContext] Insert error:', insertError);
                throw insertError;
            }

            console.log('[TransactionsContext] Transaction inserted successfully:', data);

            if (data) {
                setTransactions(prev => [data, ...prev]);
                return { success: true };
            }

            return { success: false, error: 'Failed to add transaction' };
        } catch (err) {
            console.error('[TransactionsContext] Error adding transaction:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add transaction' };
        }
    };

    return (
        <TransactionsContext.Provider value={{
            transactions,
            isLoading,
            error,
            getClientTransactions,
            getRecentTransactions,
            addTransaction,
            refreshTransactions: fetchTransactions,
        }}>
            {children}
        </TransactionsContext.Provider>
    );
}

export function useTransactions() {
    const context = useContext(TransactionsContext);
    if (context === undefined) {
        throw new Error('useTransactions must be used within a TransactionsProvider');
    }
    return context;
}
