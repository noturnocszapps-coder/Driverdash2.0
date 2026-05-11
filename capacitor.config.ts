import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.ntaplicacoes.driverdash',
  appName: 'DriverDash',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#09090b',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#00FFBB'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#09090b'
    },
    Keyboard: {
      resize: 'body' as any,
      style: 'dark' as any
    }
  }
};

export default config;
