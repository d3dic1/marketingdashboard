const admin = require('firebase-admin');

// Set the credentials path
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/Users/aldindedic/Documents/Email Marketing Reporting Dashboard/backend/src/credentials/serviceAccountKey.json';

try {
  const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  console.log('Firebase Admin SDK initialized successfully.');
  
  const db = admin.firestore();
  
  // Test Firestore access
  console.log('Testing Firestore access...');
  
  // Try to list collections (this should work even if empty)
  db.listCollections()
    .then(collections => {
      console.log('✅ Firestore access successful!');
      console.log('Collections found:', collections.length);
      collections.forEach(collection => {
        console.log('  -', collection.id);
      });
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Firestore access failed:', error.message);
      console.error('Error details:', error);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
} 