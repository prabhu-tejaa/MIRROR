const fs = require('fs');
const path = require('path');

const dir = 'src/environments';
const prodFile = 'environment.prod.ts';
const devFile = 'environment.ts';
const prodPath = path.join(__dirname, '..', dir, prodFile);
const devPath = path.join(__dirname, '..', dir, devFile);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const generateContent = (isProduction) => `export const environment = {
  production: ${isProduction},
  apiUrl: "${process.env.API_URL || ''}",
  firebaseConfig: {
    apiKey: "${process.env.FIREBASE_API_KEY || ''}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
    projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
    appId: "${process.env.FIREBASE_APP_ID || ''}",
    measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || ''}"
  }
};
`;

try {
  fs.writeFileSync(prodPath, generateContent(true));
  console.log(`[SetEnv] Successfully generated ${prodFile}`);
  
  fs.writeFileSync(devPath, generateContent(false));
  console.log(`[SetEnv] Successfully generated ${devFile}`);
} catch (err) {
  console.error('[SetEnv] Error writing file:', err);
  process.exit(1);
}
