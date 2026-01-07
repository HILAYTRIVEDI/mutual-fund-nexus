'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, ChevronRight, AlertCircle, ShieldCheck, User, CheckCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { login, signUp } = useAuth();
    const router = useRouter();

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setError('');
        setSuccessMessage('');
    };

    const switchMode = (newMode: AuthMode) => {
        resetForm();
        setMode(newMode);
    };

    const handleLogin = async (e: React.FormEvent) => {
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        // Validate password strength
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        // Validate full name
        if (fullName.trim().length < 2) {
            setError('Please enter your full name');
            setIsLoading(false);
            return;
        }

        try {
            const result = await signUp(email, password, fullName.trim());
            if (result.success) {
                setSuccessMessage('Registration successful! Please check your email to verify your account.');
                // Clear form after successful registration
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setFullName('');
            } else {
                setError(result.error || 'Registration failed');
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

            {/* Auth Card */}
            <div className="w-full max-w-md glass-card p-8 rounded-3xl relative z-10 border border-[var(--border-primary)] shadow-2xl shadow-black/20">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[var(--accent-mint)] to-[var(--accent-blue)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent-mint)]/20 mb-4">
                        <ShieldCheck size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-2">
                        {mode === 'login' ? 'Secure Client Portal Access' : 'Join our investment community'}
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex mb-6 p-1 bg-[var(--bg-hover)]/50 rounded-xl border border-[var(--border-primary)]">
                    <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                            mode === 'login'
                                ? 'bg-gradient-to-r from-[var(--accent-mint)] to-[var(--accent-blue)] text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => switchMode('register')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                            mode === 'register'
                                ? 'bg-gradient-to-r from-[var(--accent-mint)] to-[var(--accent-blue)] text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-4 p-3 rounded-xl bg-[var(--accent-mint)]/10 border border-[var(--accent-mint)]/20 flex items-start gap-3 animate-fade-in">
                        <CheckCircle size={18} className="text-[var(--accent-mint)] shrink-0 mt-0.5" />
                        <p className="text-[var(--accent-mint)] text-xs">{successMessage}</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 flex items-start gap-3 animate-fade-in">
                        <AlertCircle size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
                        <p className="text-[var(--accent-red)] text-xs">{error}</p>
                    </div>
                )}

                {/* Login Form */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
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
                )}

                {/* Registration Form */}
                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-mint)] transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-[var(--bg-hover)]/50 border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-mint)] focus:ring-1 focus:ring-[var(--accent-mint)]/50 transition-all text-sm"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

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
                                    minLength={8}
                                />
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] ml-1">Minimum 8 characters</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-mint)] transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                                    Create Account
                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <p className="text-[10px] text-center text-[var(--text-muted)] mt-4">
                            By creating an account, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </form>
                )}

                {/* Footer */}
                <div className="mt-6 text-center border-t border-[var(--border-primary)] pt-5">
                    {mode === 'login' ? (
                        <p className="text-[var(--text-secondary)] text-xs">
                            New to our platform?{' '}
                            <button
                                type="button"
                                onClick={() => switchMode('register')}
                                className="text-[var(--accent-mint)] font-medium hover:underline"
                            >
                                Create an account
                            </button>
                        </p>
                    ) : (
                        <p className="text-[var(--text-secondary)] text-xs">
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => switchMode('login')}
                                className="text-[var(--accent-mint)] font-medium hover:underline"
                            >
                                Sign in
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
