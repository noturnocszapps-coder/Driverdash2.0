import { useEffect, useRef } from 'react';
import { useDriverStore } from '../store';

export function useWakeLock() {
  const { settings } = useDriverStore();
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      console.log('[WAKELOCK] unsupported by browser');
      return;
    }
    
    try {
      if (settings.keepScreenOn) {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('[WAKELOCK] requested successfully');
          
          wakeLockRef.current.addEventListener('release', () => {
            console.log('[WAKELOCK] released automatically (system or visibility)');
            wakeLockRef.current = null;
          });
        } else {
          console.log('[WAKELOCK] already active');
        }
      } else {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          console.log('[WAKELOCK] released manually');
          wakeLockRef.current = null;
        }
      }
    } catch (err: any) {
      console.error(`[WAKELOCK] error: ${err.name}, ${err.message}`);
    }
  };

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (settings.keepScreenOn && document.visibilityState === 'visible') {
        console.log('[WAKELOCK] reacquired on visibility change');
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [settings.keepScreenOn]);
}
