'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await login(email, password);
            if (result.success) {
                router.push('/');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--accent-mint)]/10 blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--accent-purple)]/10 blur-[100px]" />
            </div>

            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md glass-card p-8 rounded-3xl relative z-10 border border-[var(--border-primary)] shadow-2xl shadow-black/20">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[var(--accent-mint)] to-[var(--accent-blue)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent-mint)]/20 mb-4">
                        <ShieldCheck size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-2">
                        Secure Client Portal Access
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 flex items-start gap-3 animate-fade-in">
                            <AlertCircle size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
                            <p className="text-[var(--accent-red)] text-xs">{error}</p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-mint)] transition-colors" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[var(--bg-hover)]/50 border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-mint)] focus:ring-1 focus:ring-[var(--accent-mint)]/50 transition-all text-sm"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-mint)] transition-colors" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[var(--bg-hover)]/50 border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-mint)] focus:ring-1 focus:ring-[var(--accent-mint)]/50 transition-all text-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-[var(--accent-mint)] to-[#90e0ef] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[var(--accent-mint)]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Sign In
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-[var(--border-primary)] pt-6">
                    <p className="text-[var(--text-secondary)] text-xs">
                        Don't have an account?
                    </p>
                    <p className="text-[var(--text-primary)] text-xs mt-1 font-medium">
                        Contact your relationship manager to request access.
                    </p>
                </div>
            </div>

            {/* Quick Helper for Demo - Remove in production */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-full border border-[var(--border-primary)] opacity-50 hover:opacity-100 transition-opacity">
                Demo Admin: admin@nexus.com / Nexus@2025
            </div>
        </div>
    );
}
