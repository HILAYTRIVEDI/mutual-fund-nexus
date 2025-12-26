'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useClientContext } from './ClientContext';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'client';
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const { clients } = useClientContext();
    const router = useRouter();
    const pathname = usePathname();

    // Check for existing session (mock)
    useEffect(() => {
        const storedUser = localStorage.getItem('nexus_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Protect routes
    useEffect(() => {
        const publicRoutes = ['/login'];
        if (!user && !publicRoutes.includes(pathname)) {
            // Check localStorage again to avoid flash
            if (!localStorage.getItem('nexus_user')) {
                router.push('/login');
            }
        }
    }, [user, pathname, router]);

    const login = async (email: string, password: string) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // 1. Check Admin
        if (email === 'admin@nexus.com' && password === 'Nexus@2025') {
            const adminUser: User = {
                id: 'ADMIN001',
                name: 'Admin User',
                email: 'admin@nexus.com',
                role: 'admin',
            };
            setUser(adminUser);
            localStorage.setItem('nexus_user', JSON.stringify(adminUser));
            return { success: true };
        }

        // 2. Check Clients
        const client = clients.find(c => c.email === email);
        if (client) {
            // For client login, we verify the password
            // Note: In real app, hash comparison. Here simple string compare.
            if (client.password === password) {
                const clientUser: User = {
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    role: 'client',
                };
                setUser(clientUser);
                localStorage.setItem('nexus_user', JSON.stringify(clientUser));
                return { success: true };
            }
        }

        return { success: false, error: 'Invalid email or password' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('nexus_user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
