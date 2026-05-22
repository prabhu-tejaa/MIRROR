import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prabhutejapamula.mirror',
  appName: 'Mirror',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: 'ionic',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
