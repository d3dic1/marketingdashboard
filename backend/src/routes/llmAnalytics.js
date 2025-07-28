const express = require('express');
const LLMAnalyticsService = require('../services/llmAnalyticsService');
const GA4PropertyService = require('../services/ga4PropertyService');
const { logger } = require('../utils/logger');

const router = express.Router();

// Initialize services
let llmAnalyticsService;
let ga4PropertyService;

// Initialize services asynchronously
(async () => {
  try {
    llmAnalyticsService = new LLMAnalyticsService();
    ga4PropertyService = new GA4PropertyService();
    // Wait for GA4PropertyService to load properties
    await ga4PropertyService.loadProperties();
    logger.info('LLM Analytics services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error.message);
  }
})();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'LLM Analytics routes are working',
    services: {
      llmAnalytics: !!llmAnalyticsService,
      ga4Property: !!ga4PropertyService
    }
  });
});

// Get LLM referral data
router.get('/referrals', async (req, res) => {
  try {
    if (!llmAnalyticsService) {
      return res.status(500).json({ 
        error: 'LLM Analytics service not configured. Please check your environment variables.',
        details: 'GOOGLE_APPLICATION_CREDENTIALS is required.',
        help: 'Make sure you have set the correct service account credentials in your environment variables.'
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', propertyId } = req.query;
    
    // Use provided propertyId or default property
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      if (!ga4PropertyService) {
        return res.status(500).json({
          error: 'GA4 Property service not initialized',
          details: 'Service failed to initialize during startup.'
        });
      }
      const defaultProperty = ga4PropertyService.getDefaultProperty();
      if (!defaultProperty) {
        return res.status(400).json({
          error: 'No GA4 Property configured',
          details: 'Please add a GA4 Property ID first.',
          help: 'Use the "Add GA4 Property" button to configure your first property.'
        });
      }
      targetPropertyId = defaultProperty.propertyId;
    }

    logger.info('Fetching LLM referral data:', { startDate, endDate, propertyId: targetPropertyId });

    const data = await llmAnalyticsService.fetchLLMReferrals(targetPropertyId, startDate, endDate);
    
    res.json(data);
  } catch (error) {
    logger.error('Error in LLM referrals endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch LLM referral data',
      message: error.message 
    });
  }
});

// Get citation monitoring data
router.get('/citations', async (req, res) => {
  try {
    if (!llmAnalyticsService) {
      return res.status(500).json({ 
        error: 'LLM Analytics service not configured. Please check your environment variables.',
        details: 'GOOGLE_APPLICATION_CREDENTIALS is required.',
        help: 'Make sure you have set the correct service account credentials in your environment variables.'
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', propertyId } = req.query;
    
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      if (!ga4PropertyService) {
        return res.status(500).json({
          error: 'GA4 Property service not initialized',
          details: 'Service failed to initialize during startup.'
        });
      }
      const defaultProperty = ga4PropertyService.getDefaultProperty();
      if (!defaultProperty) {
        return res.status(400).json({
          error: 'No GA4 Property configured',
          details: 'Please add a GA4 Property ID first.',
          help: 'Use the "Add GA4 Property" button to configure your first property.'
        });
      }
      targetPropertyId = defaultProperty.propertyId;
    }

    logger.info('Fetching citation data:', { startDate, endDate, propertyId: targetPropertyId });

    const data = await llmAnalyticsService.fetchCitationData(targetPropertyId, startDate, endDate);
    
    res.json(data);
  } catch (error) {
    logger.error('Error in citations endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch citation data',
      message: error.message 
    });
  }
});

// Get AI content performance data
router.get('/content-performance', async (req, res) => {
  try {
    if (!llmAnalyticsService) {
      return res.status(500).json({ 
        error: 'LLM Analytics service not configured. Please check your environment variables.',
        details: 'GOOGLE_APPLICATION_CREDENTIALS is required.',
        help: 'Make sure you have set the correct service account credentials in your environment variables.'
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', propertyId } = req.query;
    
    let targetPropertyId = propertyId;
    if (!targetPropertyId) {
      if (!ga4PropertyService) {
        return res.status(500).json({
          error: 'GA4 Property service not initialized',
          details: 'Service failed to initialize during startup.'
        });
      }
      const defaultProperty = ga4PropertyService.getDefaultProperty();
      if (!defaultProperty) {
        return res.status(400).json({
          error: 'No GA4 Property configured',
          details: 'Please add a GA4 Property ID first.',
          help: 'Use the "Add GA4 Property" button to configure your first property.'
        });
      }
      targetPropertyId = defaultProperty.propertyId;
    }

    logger.info('Fetching AI content performance data:', { startDate, endDate, propertyId: targetPropertyId });

    const data = await llmAnalyticsService.fetchAIContentPerformance(targetPropertyId, startDate, endDate);
    
    res.json(data);
  } catch (error) {
    logger.error('Error in content performance endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch AI content performance data',
      message: error.message 
    });
  }
});

// Submit feedback about LLM usage
router.post('/feedback', async (req, res) => {
  try {
    const { llmName, feedback, pageUrl } = req.body;
    
    if (!llmName || !feedback) {
      return res.status(400).json({ 
        error: 'LLM name and feedback are required' 
      });
    }

    logger.info('Received LLM feedback:', { llmName, feedback, pageUrl });

    // TODO: Store feedback in database
    // For now, just log it
    logger.info('LLM Feedback submitted:', {
      llmName,
      feedback,
      pageUrl,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      message: 'Feedback submitted successfully',
      note: 'Feedback is being logged for future analysis'
    });
  } catch (error) {
    logger.error('Error in feedback endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      message: error.message 
    });
  }
});

module.exports = router; 