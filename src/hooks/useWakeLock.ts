import { useEffect, useRef } from 'react';
import { useDriverStore } from '../store';

export function useWakeLock() {
  const { settings } = useDriverStore();
  const wakeLockRef = useRef<any>(null);

  const hasFailedRef = useRef(false);

  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      console.log('[WAKELOCK] Unsupported');
      return;
    }
    
    if (hasFailedRef.current) return;
    
    try {
      if (settings.keepScreenOn) {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('[WAKELOCK] Requested');
          
          wakeLockRef.current.addEventListener('release', () => {
            console.log('[WAKELOCK] Released');
            wakeLockRef.current = null;
          });
        }
      } else {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          console.log('[WAKELOCK] Released');
          wakeLockRef.current = null;
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.warn('[WAKELOCK] Permission denied by policy (likely iframe restriction)');
        hasFailedRef.current = true;
      } else {
        console.error(`[WAKELOCK] Error: ${err.name}, ${err.message}`);
      }
    }
  };

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (settings.keepScreenOn && document.visibilityState === 'visible') {
        console.log('[WAKELOCK] Reacquired');
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (e) {
          console.error('[WAKELOCK] Cleanup error:', e);
        }
      }
    };
  }, [settings.keepScreenOn]);
}
