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
    const { isAuthenticated } = useAuth();
    const supabase = getSupabaseClient();

    const fetchTransactions = useCallback(async () => {
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
                    mutual_fund:mutual_funds(*),
                    client:clients(id, name)
                `)
                .order('date', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            setTransactions(data || []);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, supabase]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const getClientTransactions = (clientId: string) => {
        return transactions.filter(t => t.client_id === clientId);
    };

    const getRecentTransactions = (limit = 10) => {
        return transactions.slice(0, limit);
    };

    const addTransaction = async (transactionData: TransactionInsert): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error: insertError } = await (supabase
                .from('transactions') as any)
                .insert(transactionData)
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            if (data) {
                setTransactions(prev => [data, ...prev]);
                return { success: true };
            }

            return { success: false, error: 'Failed to add transaction' };
        } catch (err) {
            console.error('Error adding transaction:', err);
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
