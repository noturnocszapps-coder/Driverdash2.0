import React, { useEffect } from 'react';
import { useDriverStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SyncManager = () => {
  const { user, syncData, setSyncStatus } = useDriverStore();

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      if (!user) setSyncStatus('offline');
      return;
    }

    syncData();
  }, [user?.id]); // Only re-run if user ID changes


  return null;
};
