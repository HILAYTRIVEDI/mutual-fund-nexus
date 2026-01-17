'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types/database';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'advisor' | 'viewer' | 'client';
    avatarUrl?: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map Supabase user + profile to our User type
function mapToUser(supabaseUser: SupabaseUser, profile: Profile | null): User {
    return {
        id: supabaseUser.id,
        name: profile?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        role: profile?.role || 'advisor',
        avatarUrl: profile?.avatar_url || undefined,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = getSupabaseClient();

    // Fetch profile from database
    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            // Only log actual errors, not "no rows found" (PGRST116)
            if (error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }
            return null;
        }
        return data;
    }, [supabase]);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            console.log('[AuthContext] Initializing auth...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log('[AuthContext] Session:', session ? 'Found' : 'Not found', session?.user?.email);
                
                if (session?.user) {
                    const userProfile = await fetchProfile(session.user.id);
                    console.log('[AuthContext] Profile:', userProfile);
                    setProfile(userProfile);
                    setUser(mapToUser(session.user, userProfile));
                } else {
                    console.log('[AuthContext] No session found');
                }
            } catch (error) {
                console.error('[AuthContext] Auth initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthContext] Auth state changed:', event, session?.user?.email);
            if (event === 'SIGNED_IN' && session?.user) {
                const userProfile = await fetchProfile(session.user.id);
                setProfile(userProfile);
                setUser(mapToUser(session.user, userProfile));
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    // Protect routes
    useEffect(() => {
        console.log('[AuthContext] Route protection check:', { isLoading, user: user?.email, pathname });
        
        if (isLoading) {
            console.log('[AuthContext] Still loading, skipping route protection');
            return;
        }

        const publicRoutes = ['/login', '/signup', '/forgot-password'];
        const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

        console.log('[AuthContext] Route check:', { isPublicRoute, shouldRedirectToLogin: !user && !isPublicRoute });

        if (!user && !isPublicRoute) {
            console.log('[AuthContext] Redirecting to /login');
            router.push('/login');
        } else if (user && pathname === '/login') {
            // Redirect based on role
            if (user.role === 'client') {
                router.push('/client-dashboard');
            } else {
                router.push('/admin-dashboard');
            }
        }
    }, [user, pathname, router, isLoading]);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                const userProfile = await fetchProfile(data.user.id);
                setProfile(userProfile);
                setUser(mapToUser(data.user, userProfile));
                
                // Redirect based on role
                if (userProfile?.role === 'admin' || userProfile?.role === 'advisor') {
                    router.push('/admin-dashboard');
                } else {
                    router.push('/client-dashboard');
                }
                
                return { success: true };
            }

            return { success: false, error: 'Login failed' };
        } catch (error) {
            const authError = error as AuthError;
            return { success: false, error: authError.message || 'An unexpected error occurred' };
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                // Manually create profile as fallback (in case DB trigger doesn't exist)
                // The trigger should handle this, but this is a safety net
                try {
                    const existingProfile = await fetchProfile(data.user.id);
                    if (!existingProfile) {
                        const { error: profileError } = await (supabase
                            .from('profiles') as any)
                            .insert({
                                id: data.user.id,
                                email: email,
                                full_name: fullName,
                                role: 'advisor',
                            });
                        
                        if (profileError && profileError.code !== '23505') { // 23505 = unique violation (already exists)
                            console.warn('Could not create profile:', profileError);
                        }
                    }
                } catch (profileErr) {
                    console.warn('Profile creation fallback failed:', profileErr);
                }
                
                return { success: true };
            }

            return { success: false, error: 'Sign up failed' };
        } catch (error) {
            const authError = error as AuthError;
            return { success: false, error: authError.message || 'An unexpected error occurred' };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            profile, 
            isLoading, 
            login, 
            signUp, 
            logout, 
            isAuthenticated: !!user 
        }}>
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
