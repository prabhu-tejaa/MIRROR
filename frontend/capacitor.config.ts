import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prabhutejapamula.mirror',
  appName: 'Mirror',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: 'none',
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      launchFadeOutDuration: 500,
      backgroundColor: "#05050f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  ios: {
    plugins: {
      Keyboard: {
        resize: 'ionic',
      }
    }
  }
};

export default config;
