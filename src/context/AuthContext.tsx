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
    role: 'advisor' | 'client';
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
        role: (profile?.role === 'client') ? 'client' : 'advisor', // Default to advisor if unknown
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

    // Centralized function to load user and profile
    const loadUserSession = useCallback(async (sessionUser: SupabaseUser) => {
        try {
            let userProfile = await fetchProfile(sessionUser.id);
            
            // If no profile exists, create one (fallback for when trigger didn't fire)
            if (!userProfile) {
                console.log('[AuthContext] No profile found, creating one...');
                const { error: insertError } = await (supabase
                    .from('profiles') as any)
                    .insert({
                        id: sessionUser.id,
                        email: sessionUser.email || '',
                        full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
                        role: 'advisor',
                    });
                
                if (!insertError) {
                    userProfile = await fetchProfile(sessionUser.id);
                } else if (insertError.code !== '23505') {
                    console.error('[AuthContext] Failed to create profile:', insertError);
                }
            }
            
            setProfile(userProfile);
            setUser(mapToUser(sessionUser, userProfile));
        } catch (error) {
            console.error('[AuthContext] Error loading user session:', error);
        }
    }, [supabase, fetchProfile]);

    // Initialize auth state via listener
    useEffect(() => {
        console.log('[AuthContext] Setting up auth listener...');
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthContext] Auth state changed:', event, session?.user?.email);
            
            try {
                if (session?.user) {
                    // Load user data if not loaded or if user changed
                    // We check against the current state setter to avoid closure staleness if possible, 
                    // but here we just rely on the event.
                    // Note: We deliberately reload on SIGNED_IN/INITIAL_SESSION to ensure freshness.
                    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
                         await loadUserSession(session.user);
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log('[AuthContext] User signed out');
                    setUser(null);
                    setProfile(null);
                }
            } catch (err) {
                console.error('[AuthContext] Auth listener error:', err);
            } finally {
                // Critical: Always clear loading state after processing an event
                // This prevents the "stuck on loading" issue
                setIsLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase, loadUserSession]);

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
                // Ensure profile is loaded
                await loadUserSession(data.user);
                
                // Get the latest user state (from context or freshly derived)
                // Note: state updates are async, so we use the just-fetched profile logic
                // But for redirect we can just look at what we know the profile WILL be.
                // We'll rely on the listener to update state, but we can redirect now.
                // Re-fetch profile just to be sure for redirect decision? 
                // loadUserSession already did it.
                // We can't access 'user' state here immediately.
                // Let's fetch profile directly for the decision.
                const { data: profileData } = await (supabase
                    .from('profiles') as any) // Use any to bypass old types
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                
                const role = profileData?.role || 'advisor';

                // Redirect based on role
                if (role === 'advisor') {
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
        console.log('[AuthContext] Logging out...');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('[AuthContext] Logout error:', error);
            }
        } catch (err) {
            console.error('[AuthContext] Logout exception:', err);
        }
        // Always clear local state and redirect, even if signOut fails
        setUser(null);
        setProfile(null);
        console.log('[AuthContext] Logged out, redirecting to /login');
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
