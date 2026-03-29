const fs = require('fs');
const path = require('path');

// Target directory for generated environment files
const dir = 'src/environments';
const prodFile = 'environment.prod.ts';
const fullPath = path.join(__dirname, '..', dir, prodFile);

// Check if the directory exists, if not, create it
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Generate the environment content from system variables
const content = `export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: "${process.env.FIREBASE_API_KEY || 'AIzaSyBcFEonW9yCE3OfDFxuo7mAMHxKeeShMAM'}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || 'project-mir-ror.firebaseapp.com'}",
    projectId: "${process.env.FIREBASE_PROJECT_ID || 'project-mir-ror'}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || 'project-mir-ror.firebasestorage.app'}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || '668633747148'}",
    appId: "${process.env.FIREBASE_APP_ID || '1:668633747148:web:2365326648a5762f21bc69'}",
    measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || 'G-4ZCWVRH2BC'}"
  }
};
`;

// Write the file
try {
  fs.writeFileSync(fullPath, content);
  console.log(`[SetEnv] Successfully generated ${prodFile}`);
} catch (err) {
  console.error('[SetEnv] Error writing file:', err);
  process.exit(1);
}
