import React, { useEffect } from 'react';
import { useDriverStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SyncManager = () => {
  const { user, syncData, setSyncStatus } = useDriverStore();

  useEffect(() => {
    const check = async () => {
      if (user && isSupabaseConfigured) {
        try {
          // Simple health check
          const { error } = await supabase.from('profiles').select('id').limit(1);
          
          if (error) {
            setSyncStatus('offline');
          } else {
            // If we were offline, try to sync
            const currentStatus = useDriverStore.getState().syncStatus;
            const hasSynced = useDriverStore.getState().hasSynced;
            
            if (currentStatus === 'offline') {
              setSyncStatus('online');
              if (!hasSynced) {
                syncData();
              }
            } else if (currentStatus === 'idle') {
              setSyncStatus('online');
            }
          }
        } catch (err) {
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
