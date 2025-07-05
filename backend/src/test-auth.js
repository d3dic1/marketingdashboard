const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const credentialsPath = '/Users/aldindedic/Documents/Email Marketing Reporting Dashboard/backend/src/credentials/serviceAccountKey.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(credentialsPath)),
  });
}

const auth = admin.auth();

// Test function to verify Firebase is working
async function testFirebaseAuth() {
  try {
    console.log('Firebase Admin initialized successfully');
    console.log('Project ID:', admin.app().options.projectId);
    
    // List users to verify connection
    const listUsersResult = await auth.listUsers(1);
    console.log('Successfully connected to Firebase Auth');
    console.log('User count:', listUsersResult.users.length);
    
    return true;
  } catch (error) {
    console.error('Firebase Auth test failed:', error);
    return false;
  }
}

// Test token verification with a sample token
async function testTokenVerification(sampleToken) {
  try {
    console.log('Testing token verification...');
    console.log('Token length:', sampleToken.length);
    console.log('Token prefix:', sampleToken.substring(0, 20) + '...');
    
    const decodedToken = await auth.verifyIdToken(sampleToken);
    console.log('Token verified successfully!');
    console.log('User UID:', decodedToken.uid);
    console.log('User email:', decodedToken.email);
    return true;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

// Run tests
testFirebaseAuth().then(success => {
  if (success) {
    console.log('Firebase Auth is working correctly');
  } else {
    console.log('Firebase Auth has issues');
  }
});

module.exports = { testFirebaseAuth, testTokenVerification }; 