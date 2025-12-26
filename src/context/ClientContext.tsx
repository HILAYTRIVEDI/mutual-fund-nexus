'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    panCard: string;
    aadharCard: string;
    portfolio: string;
    schemeCode: number;
    investmentType: 'SIP' | 'Lumpsum';
    amount: number;
    sipAmount?: number;
    startDate: string;
    password?: string; // Generated from PAN + Aadhar
}

// Simple encryption simulation (Base64 of PAN + Last 4 of Aadhar)
const generatePassword = (pan: string, aadhar: string) => {
    const aadharLast4 = aadhar.replace(/\D/g, '').slice(-4);
    // Use btoa for browser compatibility instead of Buffer
    if (typeof window !== 'undefined') {
        return window.btoa(`${pan}${aadharLast4}`).slice(0, 10);
    }
    return Buffer.from(`${pan}${aadharLast4}`).toString('base64').slice(0, 10);
};

const initialClients: Client[] = [
    {
        id: 'CLT001',
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@email.com',
        phone: '+91 98765 43210',
        panCard: 'ABCDE1234F',
        aadharCard: '1234 5678 9012',
        portfolio: 'HDFC Top 100 Fund',
        schemeCode: 125497,
        investmentType: 'SIP',
        amount: 1500000,
        sipAmount: 50000,
        startDate: '2023-01-15',
        password: generatePassword('ABCDE1234F', '1234 5678 9012'),
    },
    {
        id: 'CLT002',
        name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        phone: '+91 87654 32109',
        panCard: 'FGHIJ5678K',
        aadharCard: '9876 5432 1098',
        portfolio: 'SBI Bluechip Fund',
        schemeCode: 119598,
        investmentType: 'Lumpsum',
        amount: 2500000,
        startDate: '2022-06-20',
        password: generatePassword('FGHIJ5678K', '9876 5432 1098'),
    },
];

interface ClientContextType {
    clients: Client[];
    addClient: (client: Client) => void;
    updateClient: (client: Client) => void;
    deleteClient: (id: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
    const [clients, setClients] = useState<Client[]>(initialClients);

    const addClient = (client: Client) => {
        setClients(prev => [...prev, client]);
    };

    const updateClient = (updatedClient: Client) => {
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    };

    const deleteClient = (id: string) => {
        setClients(prev => prev.filter(c => c.id !== id));
    };

    return (
        <ClientContext.Provider value={{ clients, addClient, updateClient, deleteClient }}>
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
