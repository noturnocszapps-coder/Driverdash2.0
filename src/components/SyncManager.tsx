import React, { useEffect } from 'react';
import { useDriverStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SyncManager = () => {
  const { user, syncData, setSyncStatus } = useDriverStore();

  useEffect(() => {
    const check = async () => {
      if (user && isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('profiles').select('id').limit(1);
          if (error) {
            setSyncStatus('offline');
          } else {
            // Only set to online if we are not currently syncing or synced
            const currentStatus = useDriverStore.getState().syncStatus;
            if (currentStatus === 'offline' || currentStatus === 'idle') {
              setSyncStatus('online');
            }
          }
        } catch (err) {
          setSyncStatus('offline');
        }
      }
    };

    if (user && isSupabaseConfigured) {
      syncData();
      check();
    }
    
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);


  return null;
};
