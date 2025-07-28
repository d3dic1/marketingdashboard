const express = require('express');
const GoogleAnalyticsService = require('../services/googleAnalyticsService');
const GA4PropertyService = require('../services/ga4PropertyService');
const { logger } = require('../utils/logger');
const path = require('path'); // Added for path module

const router = express.Router();

// Test route for LLM analytics
router.get('/llm-test', (req, res) => {
  res.json({ 
    message: 'LLM Analytics test route is working',
    timestamp: new Date().toISOString()
  });
});

// Initialize Google Analytics service
let analyticsService;
try {
  analyticsService = new GoogleAnalyticsService();
} catch (error) {
  logger.error('Failed to initialize GoogleAnalyticsService:', error.message);
}

// Get Google Analytics data for Ortto source
router.get('/ortto-data', async (req, res) => {
  try {
    if (!analyticsService) {
      return res.status(500).json({ 
        error: 'Google Analytics service not configured. Please check your environment variables.',
        details: 'GOOGLE_APPLICATION_CREDENTIALS is required.',
        help: 'Make sure you have set the correct service account credentials in your environment variables.'
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', propertyId } = req.query;
    
    // Use provided propertyId or default property
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      const defaultProperty = GA4PropertyService.getDefaultProperty();
      if (!defaultProperty) {
        return res.status(400).json({
          error: 'No GA4 Property configured',
          details: 'Please add a GA4 Property ID first.',
          help: 'Use the "Add GA4 Property" button to configure your first property.'
        });
      }
      targetPropertyId = defaultProperty.propertyId;
    }

    logger.info('Fetching Google Analytics data:', { startDate, endDate, propertyId: targetPropertyId });

    const data = await analyticsService.fetchOrttoData(startDate, endDate, targetPropertyId);
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching Google Analytics data:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to fetch Google Analytics data';
    let details = error.message;
    let help = null;
    
    if (error.message.includes('Invalid Property ID format')) {
      errorMessage = 'Invalid Google Analytics Property ID';
      help = 'Please ensure the Property ID is numeric (not a Measurement ID starting with G-).';
    } else if (error.message.includes('PERMISSION_DENIED')) {
      errorMessage = 'Insufficient permissions for Google Analytics';
      help = 'Please ensure your service account has access to this GA4 property. Go to Google Analytics Admin → Property access management and add your service account email as a Viewer.';
    } else if (error.message.includes('authentication')) {
      errorMessage = 'Google Analytics authentication failed';
      help = 'Please check your GOOGLE_APPLICATION_CREDENTIALS environment variable and ensure the service account has access to Google Analytics.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details,
      help
    });
  }
});

// Get custom date range data
router.get('/custom-range', async (req, res) => {
  try {
    if (!analyticsService) {
      return res.status(500).json({ 
        error: 'Google Analytics service not configured. Please check your environment variables.',
        details: 'GOOGLE_APPLICATION_CREDENTIALS is required.',
        help: 'Make sure you have set the correct service account credentials in your environment variables.'
      });
    }

    const { startDate, endDate, propertyId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required' 
      });
    }

    // Use provided propertyId or default property
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      const defaultProperty = GA4PropertyService.getDefaultProperty();
      if (!defaultProperty) {
        return res.status(400).json({
          error: 'No GA4 Property configured',
          details: 'Please add a GA4 Property ID first.',
          help: 'Use the "Add GA4 Property" button to configure your first property.'
        });
      }
      targetPropertyId = defaultProperty.propertyId;
    }

    logger.info('Fetching custom date range data:', { startDate, endDate, propertyId: targetPropertyId });

    const data = await analyticsService.fetchCustomDateRange(startDate, endDate, targetPropertyId);
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching custom date range data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch custom date range data',
      details: error.message 
    });
  }
});

// Discover source/medium combinations
router.get('/discover-sources', async (req, res) => {
  try {
    if (!analyticsService) {
      return res.status(500).json({ 
        error: 'Google Analytics service not configured. Please check your environment variables.',
        details: 'GOOGLE_APPLICATION_CREDENTIALS is required.',
        help: 'Make sure you have set the correct service account credentials in your environment variables.'
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', propertyId } = req.query;
    
    // Use provided propertyId or default property
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      const defaultProperty = GA4PropertyService.getDefaultProperty();
      if (!defaultProperty) {
        return res.status(400).json({
          error: 'No GA4 Property configured',
          details: 'Please add a GA4 Property ID first.',
          help: 'Use the "Add GA4 Property" button to configure your first property.'
        });
      }
      targetPropertyId = defaultProperty.propertyId;
    }

    logger.info('Discovering source/medium combinations:', { startDate, endDate, propertyId: targetPropertyId });

    const combinations = await analyticsService.discoverSourceMediumCombinations(targetPropertyId, startDate, endDate);
    
    res.json({
      success: true,
      data: combinations,
      dateRange: { startDate, endDate },
      propertyId: targetPropertyId,
      note: 'Top 50 source/medium combinations by event count'
    });
  } catch (error) {
    logger.error('Error discovering source/medium combinations:', error);
    res.status(500).json({ 
      error: 'Failed to discover source/medium combinations',
      details: error.message 
    });
  }
});

// GA4 Property Management Routes

// Get all GA4 properties
router.get('/properties', async (req, res) => {
  try {
    const properties = GA4PropertyService.getProperties();
    res.json(properties);
  } catch (error) {
    logger.error('Error getting GA4 properties:', error);
    res.status(500).json({ 
      error: 'Failed to get GA4 properties',
      details: error.message 
    });
  }
});

// Add new GA4 property
router.post('/properties', async (req, res) => {
  try {
    const { propertyId, label } = req.body;
    
    if (!propertyId) {
      return res.status(400).json({ 
        error: 'Property ID is required' 
      });
    }

    const newProperty = await GA4PropertyService.addProperty(propertyId, label);
    res.status(201).json(newProperty);
  } catch (error) {
    logger.error('Error adding GA4 property:', error);
    res.status(400).json({ 
      error: 'Failed to add GA4 property',
      details: error.message 
    });
  }
});

// Update GA4 property
router.put('/properties/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const updates = req.body;

    const updatedProperty = await GA4PropertyService.updateProperty(propertyId, updates);
    res.json(updatedProperty);
  } catch (error) {
    logger.error('Error updating GA4 property:', error);
    res.status(400).json({ 
      error: 'Failed to update GA4 property',
      details: error.message 
    });
  }
});

// Delete GA4 property
router.delete('/properties/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const deletedProperty = await GA4PropertyService.deleteProperty(propertyId);
    res.json({ 
      message: 'Property deleted successfully',
      deletedProperty 
    });
  } catch (error) {
    logger.error('Error deleting GA4 property:', error);
    res.status(400).json({ 
      error: 'Failed to delete GA4 property',
      details: error.message 
    });
  }
});

// Set default GA4 property
router.post('/properties/:propertyId/default', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const defaultProperty = await GA4PropertyService.setDefaultProperty(propertyId);
    res.json({ 
      message: 'Default property set successfully',
      defaultProperty 
    });
  } catch (error) {
    logger.error('Error setting default GA4 property:', error);
    res.status(400).json({ 
      error: 'Failed to set default GA4 property',
      details: error.message 
    });
  }
});

// Check for backup files
router.get('/properties/backups', async (req, res) => {
  try {
    const backups = GA4PropertyService.checkBackupFiles();
    res.json({
      success: true,
      backups,
      message: `Found ${backups.length} backup files`
    });
  } catch (error) {
    logger.error('Error checking backup files:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check backup files',
      details: error.message 
    });
  }
});

// Restore from backup
router.post('/properties/restore/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const dataDir = path.dirname(GA4PropertyService.configPath || path.join(__dirname, '../../data/ga4-properties.json'));
    const backupPath = path.join(dataDir, filename);
    
    const restoredProperties = await GA4PropertyService.restoreFromBackup(backupPath);
    res.json({
      success: true,
      properties: restoredProperties,
      message: 'Properties restored successfully'
    });
  } catch (error) {
    logger.error('Error restoring from backup:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to restore from backup',
      details: error.message 
    });
  }
});

// Debug Ortto data issues
router.get('/debug-ortto', async (req, res) => {
  try {
    if (!analyticsService) {
      return res.status(500).json({ 
        error: 'Google Analytics service not configured. Please check your environment variables.',
        details: 'GOOGLE_APPLICATION_CREDENTIALS is required.',
        help: 'Make sure you have set the correct service account credentials in your environment variables.'
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', propertyId } = req.query;
    
    // Use provided propertyId or default property
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      const defaultProperty = GA4PropertyService.getDefaultProperty();
      if (!defaultProperty) {
        return res.status(400).json({
          error: 'No GA4 Property configured',
          details: 'Please add a GA4 Property ID first.',
          help: 'Use the "Add GA4 Property" button to configure your first property.'
        });
      }
      targetPropertyId = defaultProperty.propertyId;
    }

    logger.info('Debugging Ortto data issues:', { startDate, endDate, propertyId: targetPropertyId });

    // Get available source/medium combinations
    const combinations = await analyticsService.discoverSourceMediumCombinations(targetPropertyId, startDate, endDate);
    
    // Look for Ortto-related combinations
    const orttoCombinations = combinations.filter(combo => 
      combo.sourceMedium.toLowerCase().includes('ortto') ||
      combo.sourceMedium.toLowerCase().includes('email') ||
      combo.sourceMedium.toLowerCase().includes('mail')
    );

    // Try to fetch Ortto data to see what happens
    let orttoDataResult = null;
    let orttoError = null;
    try {
      orttoDataResult = await analyticsService.fetchOrttoData(startDate, endDate, targetPropertyId);
    } catch (error) {
      orttoError = error.message;
    }

    const debugInfo = {
      propertyId: targetPropertyId,
      dateRange: { startDate, endDate },
      availableSourceMediums: combinations.slice(0, 20), // Top 20
      orttoRelatedCombinations: orttoCombinations,
      orttoDataResult: orttoDataResult,
      orttoError: orttoError,
      recommendations: []
    };

    // Generate recommendations
    if (orttoCombinations.length === 0) {
      debugInfo.recommendations.push('No Ortto-related source/medium combinations found. Check your tracking setup.');
      debugInfo.recommendations.push('Common Ortto source/medium values: "ortto / email", "ortto/email", "email"');
    } else {
      debugInfo.recommendations.push(`Found ${orttoCombinations.length} Ortto-related combinations. The system should automatically use these.`);
    }

    if (combinations.length === 0) {
      debugInfo.recommendations.push('No source/medium combinations found at all. This might indicate a tracking issue.');
    }

    res.json({
      success: true,
      debugInfo,
      note: 'Use this endpoint to debug Ortto data issues and see what source/medium combinations are available.'
    });
  } catch (error) {
    logger.error('Error debugging Ortto data:', error);
    res.status(500).json({ 
      error: 'Failed to debug Ortto data',
      details: error.message 
    });
  }
});

// Get analytics configuration status
router.get('/status', async (req, res) => {
  try {
    const properties = GA4PropertyService.getProperties();
    const defaultProperty = GA4PropertyService.getDefaultProperty();
    
    const status = {
      configured: !!analyticsService,
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Configured' : 'Not configured',
      properties: {
        count: properties.properties.length,
        defaultProperty: defaultProperty ? {
          propertyId: defaultProperty.propertyId,
          label: defaultProperty.label
        } : null,
        activeCount: properties.properties.filter(p => p.isActive).length
      }
    };

    res.json(status);
  } catch (error) {
    logger.error('Error getting analytics status:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics status',
      details: error.message 
    });
  }
});

module.exports = router; 