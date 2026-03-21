import React, { useEffect } from 'react';
import { useDriverStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SyncManager = () => {
  const { user, syncData, setSyncStatus } = useDriverStore();

  useEffect(() => {
    const check = async () => {
      if (user && isSupabaseConfigured) {
        try {
          // Simple health check - use a query that should always work if online
          // We use auth.getSession() as a lightweight check for connectivity
          const { error } = await supabase.auth.getSession();
          
          if (error) {
            // Only set offline if it's a network-related error
            const isNetworkError = error.message.toLowerCase().includes('fetch') || 
                                 error.message.toLowerCase().includes('network') ||
                                 error.message.toLowerCase().includes('failed to fetch');
            if (isNetworkError) {
              setSyncStatus('offline');
            }
          } else {
            // If we were offline or idle, set to online
            const currentStatus = useDriverStore.getState().syncStatus;
            const hasSynced = useDriverStore.getState().hasSynced;
            
            if (currentStatus === 'offline' || currentStatus === 'idle') {
              setSyncStatus('online');
              // If we haven't synced yet, or if we were offline, trigger a sync
              if (!hasSynced || currentStatus === 'offline') {
                syncData();
              }
            }
          }
        } catch (err) {
          // Catch any unexpected fetch errors
          setSyncStatus('offline');
        }
      }
    };

    if (user && isSupabaseConfigured) {
      const hasSynced = useDriverStore.getState().hasSynced;
      if (!hasSynced) {
        syncData();
      }
      check();
    }
    
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);


  return null;
};
