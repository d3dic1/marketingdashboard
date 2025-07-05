import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmbb8zuxjS0_urUQGI636oILFDAv3e-hs",
  authDomain: "marketingdashboard-cdab5.firebaseapp.com",
  projectId: "marketingdashboard-cdab5",
  storageBucket: "marketingdashboard-cdab5.firebasestorage.app",
  messagingSenderId: "826133771740",
  appId: "1:826133771740:web:b3c64516fc65271b27cb19"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Test function to check token generation
async function testTokenGeneration() {
  try {
    console.log('Testing Firebase token generation...');
    
    // Check if user is already signed in
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('User already signed in:', currentUser.email);
      const token = await currentUser.getIdToken();
      console.log('Token details:');
      console.log('- Length:', token.length);
      console.log('- Prefix:', token.substring(0, 20) + '...');
      console.log('- Suffix:', '...' + token.substring(token.length - 20));
      console.log('- Contains dots:', token.includes('.'));
      console.log('- Parts count:', token.split('.').length);
      
      // Test token format (should be 3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length === 3) {
        console.log('✅ Token format is correct (3 parts)');
      } else {
        console.log('❌ Token format is incorrect:', parts.length, 'parts');
      }
      
      return token;
    } else {
      console.log('No user signed in');
      return null;
    }
  } catch (error) {
    console.error('Error testing token generation:', error);
    return null;
  }
}

// Export for use in browser console
window.testTokenGeneration = testTokenGeneration;

console.log('Token test script loaded. Run testTokenGeneration() in the browser console to test.'); 