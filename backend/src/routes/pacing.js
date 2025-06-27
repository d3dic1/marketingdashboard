const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PacingService = require('../services/pacingService');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pacing-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize Pacing service
let pacingService;
try {
  pacingService = new PacingService();
} catch (error) {
  logger.error('Failed to initialize PacingService:', error.message);
}

// Upload CSV and process with AI
router.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No CSV file uploaded' 
      });
    }

    if (!pacingService) {
      return res.status(500).json({ 
        error: 'Pacing service not configured. Please check your environment variables.' 
      });
    }

    logger.info('Processing CSV file:', {
      filename: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });

    // Process the CSV file
    const result = await pacingService.processCSVAndOrganizeSheets(req.file.path);
    
    res.json({
      success: true,
      message: 'CSV processed successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error processing CSV file:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process CSV file',
      details: error.message 
    });
  }
});

// Get pacing service status
router.get('/status', async (req, res) => {
  try {
    const status = {
      configured: !!pacingService,
      googleSheets: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? 'Configured' : 'Not configured',
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Configured' : 'Not configured',
      aiService: process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'
    };

    res.json(status);
  } catch (error) {
    logger.error('Error getting pacing status:', error);
    res.status(500).json({ 
      error: 'Failed to get pacing status',
      details: error.message 
    });
  }
});

// Get spreadsheet URL
router.get('/spreadsheet-url', async (req, res) => {
  try {
    if (!pacingService) {
      return res.status(500).json({ 
        error: 'Pacing service not configured' 
      });
    }

    const url = await pacingService.sheetsService.getSpreadsheetUrl();
    res.json({ url });
  } catch (error) {
    logger.error('Error getting spreadsheet URL:', error);
    res.status(500).json({ 
      error: 'Failed to get spreadsheet URL',
      details: error.message 
    });
  }
});

// Test CSV parsing (without creating sheets)
router.post('/test-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No CSV file uploaded' 
      });
    }

    logger.info('Testing CSV file:', {
      filename: req.file.originalname,
      size: req.file.size
    });

    // Just parse the CSV to test
    const csvData = await pacingService.parseCSV(req.file.path);
    
    // Clean up test file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'CSV parsed successfully',
      recordCount: csvData.length,
      columns: Object.keys(csvData[0] || {}),
      sampleData: csvData.slice(0, 3) // First 3 rows as sample
    });

  } catch (error) {
    logger.error('Error testing CSV file:', error);
    
    // Clean up test file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to parse CSV file',
      details: error.message 
    });
  }
});

module.exports = router; 