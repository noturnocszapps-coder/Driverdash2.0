import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  }
};

export const triggerHapticNotification = async (type: 'SUCCESS' | 'WARNING' | 'ERROR') => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type: type as any });
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  }
};
