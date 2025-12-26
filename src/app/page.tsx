'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Redirect based on role
        if (user?.role === 'admin') {
            router.push('/admin-dashboard');
        } else if (user?.role === 'client') {
            router.push('/client-dashboard');
        } else {
            router.push('/login');
        }
    }, [user, isAuthenticated, router]);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-[var(--accent-mint)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--text-secondary)] text-sm">Redirecting...</p>
            </div>
        </div>
    );
}
