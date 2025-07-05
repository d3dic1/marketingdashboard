import axios from 'axios';
import { auth } from './firebase';

// Use Cloud Run URL directly since Firebase proxy has permission issues
const getApiUrl = () => {
  // Check if we're in production (deployed environment)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // In production, use the deployed backend URL
    return 'https://your-backend-url.com/api'; // Replace with your actual backend URL
  }
  // In development, use localhost backend
  return 'http://localhost:5001/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout and other configurations
  timeout: 60000, // Increase timeout to 60 seconds
});

// Helper to set the Authorization header with the Firebase token
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Central authorized request function
export async function authorizedRequest(config) {
  const user = auth.currentUser;
  if (!user) {
    console.error('No authenticated user found');
    throw new Error('Not authenticated');
  }
  
  console.log('Getting token for user:', user.email, user.uid);
  let token = await user.getIdToken();
  
  // Debug logging
  console.log('Token details:', {
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 20) + '...',
    tokenSuffix: '...' + token.substring(token.length - 20),
    parts: token.split('.').length,
    userUid: user.uid,
    userEmail: user.email
  });
  
  // Validate token format
  if (token.split('.').length !== 3) {
    console.error('Invalid token format - should have 3 parts');
    throw new Error('Invalid token format');
  }
  
  try {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    console.log('Making request with token:', config.url);
    return await api(config);
  } catch (err) {
    console.error('Request failed:', err.response?.status, err.response?.data);
    // If token expired or unauthorized, force refresh and retry once
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      console.log('Token expired, refreshing...');
      token = await user.getIdToken(true);
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      return await api(config);
    }
    throw err;
  }
}

// Add request interceptor to log requests in development
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(request => {
    console.log('API Request:', request.method?.toUpperCase(), request.url);
    return request;
  });
}

export default api; 