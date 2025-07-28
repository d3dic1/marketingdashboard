require('dotenv').config();

// Initialize Firebase first
require('./services/firebaseService');

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { setupRoutes } = require('./routes');
const { setupScheduledTasks } = require('./services/scheduler');
const { logger } = require('./utils/logger');
const changelogScheduler = require('./services/changelogScheduler');
const pacingRoutes = require('./routes/pacing');
const journeyRoutes = require('./routes/journeys');
const authRoutes = require('./routes/auth');
const leadScoringRoutes = require('./routes/leadScoring');
const installTrackingRoutes = require('./routes/installTracking');
const timelineRoutes = require('./routes/timeline');
const changelogRoutes = require('./routes/changelog');
const gscRoutes = require('./routes/gsc');
const audienceRoutes = require('./routes/audience');
const logosRoutes = require('./routes/logos');
const advancedAnalyticsRoutes = require('./routes/advancedAnalytics');
const smartAutomationRoutes = require('./routes/smartAutomation');
const llmAnalyticsRoutes = require('./routes/llmAnalytics');
const orttoService = require('./services/orttoService');

const app = express();
const port = process.env.PORT || 5001;
const httpsPort = process.env.HTTPS_PORT || 5002;

console.log('RAILWAY ENV:', process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY is set' : 'OPENAI_API_KEY is missing');

// Pre-fetch campaigns and journeys at startup
orttoService.fetchCampaignsAndJourneys()
  .then(() => logger.info('Successfully pre-fetched and cached campaigns and journeys.'))
  .catch(err => logger.error('Failed to pre-fetch campaigns and journeys at startup:', err));

// Also pre-fetch journey names for better name resolution
orttoService.fetchAndCacheJourneyNames()
  .then(() => logger.info('Successfully pre-fetched and cached journey names.'))
  .catch(err => logger.error('Failed to pre-fetch journey names at startup:', err));

// Initialize changelog scheduler
changelogScheduler.initialize()
  .then(() => logger.info('Changelog scheduler initialized successfully.'))
  .catch(err => logger.error('Failed to initialize changelog scheduler:', err));

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://shop-circle-marketing.vercel.app',
    'https://marketingtool.shopcircle.co',
    'https://marketingtool.shopcircle.co/',
    'https://www.marketingtool.shopcircle.co',
    'https://www.marketingtool.shopcircle.co/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Additional CORS preflight handling
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (for fallback local storage)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Comprehensive health check endpoint for Railway debugging
app.get('/healthcheckup', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5001,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment_variables: {
        // Check critical env vars
        NODE_ENV: process.env.NODE_ENV || 'not_set',
        PORT: process.env.PORT || 'not_set',
        // GSC variables
        GSC_CLIENT_EMAIL: process.env.GSC_CLIENT_EMAIL ? 'set' : 'not_set',
        GSC_PRIVATE_KEY: process.env.GSC_PRIVATE_KEY ? 'set' : 'not_set',
        GSC_PROJECT_ID: process.env.GSC_PROJECT_ID ? 'set' : 'not_set',
        // Other critical variables
        ORTTO_API_KEY: process.env.ORTTO_API_KEY ? 'set' : 'not_set',
        ORTTO_INSTANCE_ID: process.env.ORTTO_INSTANCE_ID ? 'set' : 'not_set',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'not_set',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'set' : 'not_set',
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'set' : 'not_set'
      },
      services: {
        express: 'running',
        cors: 'configured'
      }
    };

    // Test GSC service if variables are available
    if (process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY && process.env.GSC_PROJECT_ID) {
      try {
        const gscService = require('./services/googleSearchConsoleService');
        await gscService.initialize();
        healthStatus.services.gsc = 'initialized';
      } catch (gscError) {
        healthStatus.services.gsc = `error: ${gscError.message}`;
      }
    } else {
      healthStatus.services.gsc = 'missing_env_vars';
    }

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Setup routes
app.use('/api', setupRoutes(express.Router()));
app.use('/api/pacing', pacingRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/lead-scoring', leadScoringRoutes);
app.use('/api/install-tracking', installTrackingRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/changelog', changelogRoutes);
// GSC routes with error handling
try {
    app.use('/api/gsc', gscRoutes);
    logger.info('GSC routes loaded successfully');
} catch (gscRouteError) {
    logger.error('Failed to load GSC routes:', gscRouteError);
    // Add a fallback route for debugging
    app.use('/api/gsc', (req, res) => {
        res.status(500).json({ 
            error: 'GSC routes failed to load',
            details: gscRouteError.message 
        });
    });
}
app.use('/api/audience', audienceRoutes);
app.use('/api/logos', logosRoutes);
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);
app.use('/api/smart-automation', smartAutomationRoutes);
// LLM Analytics routes with error handling
try {
    app.use('/api/llm-analytics', llmAnalyticsRoutes);
    logger.info('LLM Analytics routes loaded successfully');
} catch (llmRouteError) {
    logger.error('Failed to load LLM Analytics routes:', llmRouteError);
    // Add a fallback route for debugging
    app.use('/api/llm-analytics', (req, res) => {
        res.status(500).json({ 
            error: 'LLM Analytics routes failed to load',
            details: llmRouteError.message 
        });
    });
}

// 404 handler
app.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error details:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    response: err.response?.data
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    details: process.env.NODE_ENV === 'development' ? err.response?.data : undefined
  });
});

// Start HTTP server (primary server)
const server = app.listen(port, () => {
  logger.info(`HTTP Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CORS origins: ${JSON.stringify([
    'http://localhost:3000',
    'https://shop-circle-marketing.vercel.app',
    'https://marketingtool.shopcircle.co',
    'https://marketingtool.shopcircle.co/',
    'https://www.marketingtool.shopcircle.co',
    'https://www.marketingtool.shopcircle.co/'
  ])}`);
  
  // Setup scheduled tasks
  setupScheduledTasks();
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use`);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// HTTPS configuration (optional, for local development)
const sslKeyPath = path.join(__dirname, '../ssl/key.pem');
const sslCertPath = path.join(__dirname, '../ssl/cert.pem');

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  try {
    const httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };

    // Start HTTPS server
    const httpsServer = https.createServer(httpsOptions, app);
    httpsServer.listen(httpsPort, () => {
      logger.info(`HTTPS Server running on port ${httpsPort}`);
    });
  } catch (error) {
    logger.warn('Failed to start HTTPS server:', error.message);
    logger.info('Continuing with HTTP server only');
  }
} else {
  logger.info('SSL certificates not found, running HTTP server only');
}

module.exports = app; 