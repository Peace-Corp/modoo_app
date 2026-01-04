import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.modoo.app',
  appName: 'Modoo',
  webDir: 'out',

  server: {
    // Use for local development - uncomment when testing with live reload
    // url: 'http://localhost:3000',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
  },

  ios: {
    contentInset: 'automatic',
  },

  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
