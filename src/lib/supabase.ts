import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Validate that the URL is actually a URL
const isValidUrl = (url: string) => {
  try {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(isValidUrl(rawUrl) && rawKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured or has an invalid URL. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY correctly.');
}

export const supabase = createClient(
  isValidUrl(rawUrl) ? rawUrl : 'https://placeholder-project.supabase.co',
  rawKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Global error listener for Supabase Auth errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
      const msg = event.reason.message;
      if (
        msg.includes('Refresh Token Not Found') || 
        msg.includes('refresh_token_not_found') ||
        msg.includes('Invalid Refresh Token')
      ) {
        console.warn('[Supabase] Refresh token error detected, signing out...');
        supabase.auth.signOut().then(() => {
          // Force reload or redirect if necessary
          // window.location.href = '/login';
        });
      }
    }
  });
}
