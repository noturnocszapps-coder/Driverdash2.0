import { useEffect, useRef } from 'react';
import { useDriverStore } from '../store';

export function useWakeLock() {
  const { settings, tracking } = useDriverStore();
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      
      try {
        // Only request if the setting is enabled
        if (settings.keepScreenOn) {
          if (!wakeLockRef.current) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            console.log('[WakeLock] Screen Wake Lock is active');
            
            wakeLockRef.current.addEventListener('release', () => {
              console.log('[WakeLock] Screen Wake Lock was released');
              wakeLockRef.current = null;
            });
          }
        } else {
          // If setting is disabled, release if active
          if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
          }
        }
      } catch (err: any) {
        console.error(`[WakeLock] ${err.name}, ${err.message}`);
      }
    };

    requestWakeLock();

    // Re-request on visibility change if setting is enabled
    const handleVisibilityChange = () => {
      if (settings.keepScreenOn && document.visibilityState === 'visible') {
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
  }, [settings.keepScreenOn, tracking.isActive]);
}
