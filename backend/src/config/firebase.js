const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

let isInitialized = false;

if (privateKey) {
  // Trim whitespace first
  privateKey = privateKey.trim();
  
  // Strip outer quotes if present
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }
  
  // Replace escaped newlines with actual newline characters
  privateKey = privateKey.replace(/\\n/g, '\n');
}

// Check if credentials are placeholders or invalid PEM format
const isPlaceholder = !privateKey || privateKey.includes('your_private_key_here') || projectId === 'your_firebase_project_id_here';
const isValidPem = privateKey && privateKey.includes('-----BEGIN PRIVATE KEY-----') && privateKey.includes('-----END PRIVATE KEY-----');

if (projectId && clientEmail && privateKey && !isPlaceholder && isValidPem) {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      console.log('Firebase Admin Initialized Successfully');
    }
    isInitialized = true;
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
  }
} else {
  console.warn('Firebase Admin credentials missing, invalid, or using placeholders. Firebase OAuth route will be disabled.');
}

module.exports = {
  admin,
  isInitialized: () => isInitialized && admin.apps.length > 0
};
