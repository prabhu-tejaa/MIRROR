import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Mirror',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true
    }
  }
};

export default config;
