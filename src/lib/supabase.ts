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

// Selective cleanup of session-related data
export const clearInvalidSessionData = async () => {
  console.warn('[AUTH] invalid refresh token detected');
  
  try {
    // 1. Sign out from Supabase (clears internal memory)
    await supabase.auth.signOut();
    
    // 2. Selective localStorage cleanup
    const keysToClear = [
      'driver-dash-storage', // Main app state (contains user data)
      'driverdash_active_vehicle_id', // Current vehicle
      'supabase.auth.token', // Legacy Supabase key
    ];

    // Also clear any keys starting with 'sb-' (Supabase auth keys)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || keysToClear.includes(key))) {
        localStorage.removeItem(key);
      }
    }

    console.log('[AUTH] selective cleanup executed');
    console.log('[AUTH] store reset completed');
    console.log('[AUTH] redirecting to login');

    // 3. Force reload to ensure a clean state
    window.location.reload();
  } catch (err) {
    console.error('[AUTH] Error during cleanup:', err);
    // Fallback to full clear if selective fails
    localStorage.clear();
    window.location.reload();
  }
};

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
        clearInvalidSessionData();
      }
    }
  });
}
