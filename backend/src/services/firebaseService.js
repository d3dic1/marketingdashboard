const admin = require('firebase-admin');
const { logger } = require('../utils/logger');
const path = require('path');

// Always use the user-specified service account key path
const credentialsPath = '/Users/aldindedic/Documents/Email Marketing Reporting Dashboard/backend/src/credentials/serviceAccountKey.json';

// Only initialize if credentials are present
let db = null;
let auth = null;

if (credentialsPath) {
  try {
    const fs = require('fs');
    if (fs.existsSync(credentialsPath)) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(require(credentialsPath)),
        });
      }
      db = admin.firestore();
      auth = admin.auth();
      logger.info('Firebase initialized successfully with credentials from:', credentialsPath);
    } else {
      logger.warn(`Firebase credentials file not found at: ${credentialsPath}`);
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
  }
} else {
  logger.warn('No Firebase credentials path available. Firebase not initialized.');
}

module.exports = { db, auth };