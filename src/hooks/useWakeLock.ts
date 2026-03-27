import { useEffect, useRef } from 'react';
import { useDriverStore } from '../store';

export function useWakeLock() {
  const { settings } = useDriverStore();
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      console.log('[WAKELOCK] unsupported');
      return;
    }
    
    try {
      if (settings.keepScreenOn) {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('[WAKELOCK] requested');
          
          wakeLockRef.current.addEventListener('release', () => {
            console.log('[WAKELOCK] released');
            wakeLockRef.current = null;
          });
        }
      } else {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          console.log('[WAKELOCK] released');
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
        console.log('[WAKELOCK] reacquired');
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
