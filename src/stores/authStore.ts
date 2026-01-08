import { create } from 'zustand';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { logger } from '../utils';

// Get redirect URL based on platform
const getRedirectUrl = (path: string = ''): string => {
  if (Platform.OS === 'web') {
    // For web, use the current origin
    return typeof window !== 'undefined'
      ? `${window.location.origin}${path}`
      : `http://localhost:8081${path}`;
  }
  // For native apps, use deep link
  return `atsume://${path.replace(/^\//, '')}`;
};

const getEmailConfirmRedirectUrl = (): string => getRedirectUrl('/');
const getPasswordResetRedirectUrl = (): string => getRedirectUrl('/reset-password');

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  isPasswordRecovery: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'display_name' | 'skill_level'>>) => Promise<void>;
  updateAvatar: (imageUri: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
  clearPasswordRecovery: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  isPasswordRecovery: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session?.user) {
        // Fetch user profile from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          throw userError;
        }

        set({
          session,
          user: userData || null,
          isInitialized: true,
          isLoading: false
        });
      } else {
        set({
          session: null,
          user: null,
          isInitialized: true,
          isLoading: false
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        logger.log('[Auth] Auth state changed:', event);

        if (event === 'PASSWORD_RECOVERY') {
          // User clicked password reset link
          set({ isPasswordRecovery: true, session });
        } else if (event === 'SIGNED_IN' && session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          set({ session, user: userData || null });
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, isPasswordRecovery: false });
        }
      });
    } catch (error: any) {
      set({
        error: error.message,
        isInitialized: true,
        isLoading: false
      });
    }
  },

  signUp: async (email: string, password: string, displayName: string) => {
    try {
      set({ isLoading: true, error: null });

      // Sign up with Supabase Auth
      // User profile is created automatically by database trigger
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailConfirmRedirectUrl(),
          data: {
            display_name: displayName,
          },
        },
      });

      if (authError) throw authError;

      // User profile is created by database trigger (handle_new_user)
      // User needs to confirm email before they can sign in
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      logger.log('[Auth] Signing in');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      logger.log('[Auth] Sign in result:', { userId: data?.user?.id, error: error?.message });

      if (error) throw error;

      if (data.user) {
        logger.log('[Auth] Fetching user profile');

        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        logger.log('[Auth] User profile fetched:', { hasData: !!userData, error: userError?.message });

        if (userError && userError.code !== 'PGRST116') {
          throw userError;
        }

        set({
          user: userData || null,
          session: data.session,
          isLoading: false
        });

        logger.log('[Auth] Sign in complete');
      }
    } catch (error: any) {
      logger.error('[Auth] Sign in error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({ user: null, session: null, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) throw error;

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateProfile: async (data: Partial<Pick<User, 'display_name' | 'skill_level'>>) => {
    try {
      const { user } = get();
      if (!user) throw new Error('ユーザーがログインしていません');

      set({ isLoading: true, error: null });

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      set({ user: updatedUser, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateAvatar: async (imageUri: string) => {
    try {
      const { user } = get();
      if (!user) throw new Error('ユーザーがログインしていません');

      set({ isLoading: true, error: null });

      // Generate unique file name
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Convert URI to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update user profile with new avatar URL
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      set({ user: updatedUser, isLoading: false });
    } catch (error: any) {
      logger.error('[Auth] Avatar update error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePassword: async (newPassword: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Sign out after password update so user can log in with new password
      await supabase.auth.signOut();

      set({
        isLoading: false,
        isPasswordRecovery: false,
        user: null,
        session: null,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateEmail: async (newEmail: string) => {
    try {
      const { user } = get();
      if (!user) throw new Error('ユーザーがログインしていません');

      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteAccount: async () => {
    try {
      const { user } = get();
      if (!user) throw new Error('ユーザーがログインしていません');

      set({ isLoading: true, error: null });

      // Delete user's data from database
      // Note: In a real app, you might want to use a database function
      // that handles cascading deletes properly
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;

      // Sign out the user
      await supabase.auth.signOut();

      set({
        user: null,
        session: null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearPasswordRecovery: () => set({ isPasswordRecovery: false }),
}));
