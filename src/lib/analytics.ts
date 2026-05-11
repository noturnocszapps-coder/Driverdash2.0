import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

export const Analytics = {
  logEvent: async (name: string, params: any = {}) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseAnalytics.logEvent({ name, params });
      } catch (e) {
        console.error('[Analytics] Failed to log event', name, e);
      }
    } else {
      console.log('[Analytics Log] (Web):', name, params);
    }
  },

  setUserId: async (userId: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseAnalytics.setUserId({ userId });
        await FirebaseCrashlytics.setUserId({ userId });
      } catch (e) {
        console.error('[Analytics] Failed to set userId', e);
      }
    }
  },

  logError: async (message: string, stack?: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Log to Crashlytics
        await FirebaseCrashlytics.log({ message: `${message}${stack ? `\nStack: ${stack}` : ''}` });
        
        // Record as non-fatal exception if it seems like a real error
        await FirebaseCrashlytics.recordException({ 
          message,
          // stacktrace is optional and requires StackFrame[] objects
        });
      } catch (e) {
        console.error('[Crashlytics] Failed to log error', e);
      }
    } else {
      console.error('[Crashlytics Log] (Web Error):', message, stack);
    }
  }
};

export const enum AnalyticsEvents {
  APP_OPEN = 'app_open',
  START_SHIFT = 'start_shift',
  CLOSE_SHIFT = 'close_shift',
  IA_IMPORT = 'ia_import',
  GPS_FAILURE = 'gps_failure',
  SYNC_FAILURE = 'sync_failure',
  SUPABASE_FAILURE = 'supabase_failure',
  NAVIGATION = 'screen_view'
}
