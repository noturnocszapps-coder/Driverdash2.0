import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capacitor Imports
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { Analytics, AnalyticsEvents } from './lib/analytics.ts';

const initNative = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#09090b' });
      
      // Log app open
      await Analytics.logEvent(AnalyticsEvents.APP_OPEN);
    } catch (e) {
      console.warn('Native initialization error', e);
    }
  }
};

// Global Error Handler
window.onerror = (message, source, lineno, colno, error) => {
  Analytics.logError(`Global Error: ${message}`, error?.stack);
};

window.onunhandledrejection = (event) => {
  Analytics.logError(`Unhandled Promise Rejection: ${event.reason}`);
};

initNative();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
