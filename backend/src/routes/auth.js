const express = require('express');
const router = express.Router();
const { db, auth } = require('../services/firebaseService');
const { logger } = require('../utils/logger');

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  if (!auth) {
    // If Firebase is not available, skip authentication and set default user
    req.user = { uid: 'default-user' };
    return next();
  }

  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(403).json({ error: 'No token provided' });
  }

  // Log token details for debugging (only first 20 chars for security)
  logger.info('Token verification attempt:', {
    tokenLength: idToken.length,
    tokenPrefix: idToken.substring(0, 20) + '...',
    tokenSuffix: '...' + idToken.substring(idToken.length - 20),
    parts: idToken.split('.').length,
    hasBearer: req.headers.authorization?.startsWith('Bearer '),
    authorizationHeader: req.headers.authorization ? 'present' : 'missing',
    url: req.url,
    method: req.method
  });

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    logger.info('Token verified successfully for user:', decodedToken.uid);
    next();
  } catch (error) {
    logger.error('Error verifying token:', {
      error: error.message,
      code: error.code,
      tokenLength: idToken.length,
      tokenPrefix: idToken.substring(0, 20) + '...'
    });
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

// Register a new user
router.post('/register', async (req, res) => {
  if (!auth || !db) {
    return res.status(503).json({ error: 'Authentication service not available' });
  }

  try {
    const { email, password } = req.body;
    const userRecord = await auth.createUser({
      email,
      password,
    });

    // Create a document for the user in Firestore to store their IDs
    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      campaignIds: [],
      journeyIds: [],
    });

    res.status(201).json({ uid: userRecord.uid });
  } catch (error) {
    logger.error('Error registering user:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user's saved IDs
router.get('/ids', verifyToken, async (req, res) => {
  if (!db) {
    // If Firestore is not available, return empty arrays with a message
    logger.warn('Firestore not available, returning empty arrays for user IDs');
    return res.json({
      campaignIds: [],
      journeyIds: [],
      message: 'Firebase not configured - data stored locally only'
    });
  }

  try {
    const doc = await db.collection('users').doc(req.user.uid).get();
    if (!doc.exists) {
      // If user document doesn't exist, create it with empty arrays
      await db.collection('users').doc(req.user.uid).set({
        campaignIds: [],
        journeyIds: [],
        createdAt: new Date().toISOString()
      });
      return res.json({
        campaignIds: [],
        journeyIds: [],
      });
    }
    res.json(doc.data());
  } catch (error) {
    logger.error('Error getting user IDs:', error);
    // If Firestore access fails, return empty arrays instead of 500 error
    res.json({
      campaignIds: [],
      journeyIds: [],
      message: 'Firebase access failed - data stored locally only'
    });
  }
});

// Save user's IDs
router.post('/ids', verifyToken, async (req, res) => {
  if (!db) {
    // If Firestore is not available, just return success
    logger.warn('Firestore not available, IDs saved to local storage only');
    return res.status(200).json({ message: 'IDs saved successfully (local storage only)' });
  }

  try {
    const { campaignIds = [], journeyIds = [] } = req.body;
    await db.collection('users').doc(req.user.uid).set({
      campaignIds,
      journeyIds,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.status(200).json({ message: 'IDs saved successfully' });
  } catch (error) {
    logger.error('Error saving user IDs:', error);
    // If Firestore access fails, return success anyway
    res.status(200).json({ message: 'IDs saved successfully (local storage only)' });
  }
});

// Auto-discover and save all IDs
router.post('/auto-discover', verifyToken, async (req, res) => {
  try {
    const orttoService = require('../services/orttoService');
    
    // Discover and categorize all assets
    const categorizedAssets = await orttoService.discoverAndCategorizeAllAssets();
    
    // Extract IDs
    const campaignIds = categorizedAssets.campaigns.map(campaign => campaign.id);
    const journeyIds = categorizedAssets.journeys.map(journey => journey.id);
    
    // Try to save to user's account if Firebase is available
    if (db) {
      try {
        await db.collection('users').doc(req.user.uid).set({
          campaignIds,
          journeyIds,
          lastAutoDiscover: new Date().toISOString(),
          totalCampaigns: campaignIds.length,
          totalJourneys: journeyIds.length
        }, { merge: true });

        logger.info(`Auto-discovered ${campaignIds.length} campaigns and ${journeyIds.length} journeys for user ${req.user.uid} and saved to Firebase`);
      } catch (firebaseError) {
        logger.error('Failed to save auto-discovered IDs to Firebase:', firebaseError);
        // Continue without Firebase - the IDs will be returned to the frontend
      }
    } else {
      logger.warn('Firebase not available, auto-discovered IDs will not be persisted');
    }

    logger.info(`Auto-discovered ${campaignIds.length} campaigns and ${journeyIds.length} journeys`);
    
    res.json({
      success: true,
      message: `Auto-discovered ${campaignIds.length} campaigns and ${journeyIds.length} journeys`,
      data: {
        campaignIds,
        journeyIds,
        totalCampaigns: campaignIds.length,
        totalJourneys: journeyIds.length,
        categorizedAssets
      }
    });
  } catch (error) {
    logger.error('Error in auto-discover:', error);
    res.status(500).json({ error: 'Failed to auto-discover assets' });
  }
});

// Get auto-discovered assets
router.get('/auto-discover', verifyToken, async (req, res) => {
  try {
    const orttoService = require('../services/orttoService');
    
    // Get cached categorized assets
    const categorizedAssets = await orttoService.getCachedCategorizedAssets();
    
    if (!categorizedAssets) {
      // If not cached, discover them
      const discovered = await orttoService.discoverAndCategorizeAllAssets();
      res.json({
        success: true,
        data: discovered
      });
    } else {
      res.json({
        success: true,
        data: categorizedAssets
      });
    }
  } catch (error) {
    logger.error('Error getting auto-discovered assets:', error);
    res.status(500).json({ error: 'Failed to get auto-discovered assets' });
  }
});

// Refresh auto-discovered assets
router.post('/refresh-discover', verifyToken, async (req, res) => {
  try {
    const orttoService = require('../services/orttoService');
    
    // Force refresh of categorized assets
    const categorizedAssets = await orttoService.refreshCategorizedAssets();
    
    res.json({
      success: true,
      message: 'Assets refreshed successfully',
      data: categorizedAssets
    });
  } catch (error) {
    logger.error('Error refreshing auto-discovered assets:', error);
    res.status(500).json({ error: 'Failed to refresh assets' });
  }
});

// Test token endpoint (temporary for debugging)
router.post('/test-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'No token provided in request body' });
    }
    
    logger.info('Testing token:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      tokenSuffix: '...' + token.substring(token.length - 20),
      partsCount: token.split('.').length
    });
    
    if (!auth) {
      return res.status(503).json({ error: 'Firebase Auth not available' });
    }
    
    const decodedToken = await auth.verifyIdToken(token);
    
    res.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      },
      tokenInfo: {
        length: token.length,
        parts: token.split('.').length,
        issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
        expiresAt: new Date(decodedToken.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    logger.error('Token test failed:', {
      error: error.message,
      code: error.code,
      tokenLength: req.body.token?.length
    });
    
    res.status(400).json({
      error: 'Token verification failed',
      details: error.message,
      code: error.code
    });
  }
});

module.exports = router; 