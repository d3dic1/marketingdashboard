const csv = require('csv-parser');
const fs = require('fs');
const { logger } = require('../utils/logger');
const aiService = require('./aiService');
const googleSheetsService = require('./googleSheetsService');

class PacingService {
  constructor() {
    this.sheetsService = new googleSheetsService();
  }

  async processCSVAndOrganizeSheets(csvFilePath) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting CSV processing and sheet organization');

      // Parse CSV data
      const csvData = await this.parseCSV(csvFilePath);
      
      if (!csvData || csvData.length === 0) {
        throw new Error('No data found in CSV file');
      }

      logger.info('CSV parsed successfully:', { recordCount: csvData.length });

      // Analyze data structure with AI
      const analysis = await this.analyzeDataStructure(csvData);
      
      // Organize data by AI recommendations
      const organizedData = await this.organizeDataByAI(csvData, analysis);
      
      // Create sheets based on organization
      const sheetResults = await this.createSheetsFromData(organizedData);
      
      // Generate AI insights
      const insights = await this.generateInsights(csvData, analysis);
      
      // Create summary sheet
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      const summaryData = {
        totalRecords: csvData.length,
        dateRange: this.getDateRange(csvData),
        sheetsCreated: sheetResults.length,
        processingTime: `${processingTime}s`,
        aiInsights: insights.summary
      };

      await this.sheetsService.createSummarySheet(summaryData);

      // Clean up temporary file
      fs.unlinkSync(csvFilePath);

      return {
        success: true,
        totalRecords: csvData.length,
        sheetsCreated: sheetResults.length,
        processingTime: `${processingTime}s`,
        insights: insights,
        spreadsheetUrl: await this.sheetsService.getSpreadsheetUrl()
      };

    } catch (error) {
      logger.error('Error processing CSV and organizing sheets:', error);
      
      // Clean up temporary file if it exists
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
      
      throw error;
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  async analyzeDataStructure(data) {
    try {
      const sampleData = data.slice(0, 10); // Analyze first 10 rows
      const columns = Object.keys(data[0] || {});
      
      const prompt = `
Analyze this CSV data structure and provide recommendations for organizing it into Google Sheets:

Columns: ${columns.join(', ')}

Sample data (first 10 rows):
${JSON.stringify(sampleData, null, 2)}

Please provide a JSON response with:
1. Date columns identified
2. Suggested sheet organization (daily, weekly, monthly, etc.)
3. Key metrics to track
4. Data grouping recommendations
5. Formatting suggestions

Focus on creating a logical organization that makes the data easy to analyze and track over time.
      `;

      const response = await aiService.analyzeWithGemini(prompt);
      
      // Parse AI response
      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch (parseError) {
        // Fallback analysis if AI response isn't valid JSON
        analysis = this.generateFallbackAnalysis(data);
      }

      logger.info('AI data structure analysis completed:', analysis);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing data structure:', error);
      return this.generateFallbackAnalysis(data);
    }
  }

  generateFallbackAnalysis(data) {
    const columns = Object.keys(data[0] || {});
    const dateColumns = columns.filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('created') ||
      col.toLowerCase().includes('updated')
    );

    return {
      dateColumns: dateColumns,
      suggestedSheets: [
        '📅 Daily Data',
        '📊 Weekly Summary', 
        '📈 Monthly Reports',
        '🎯 Key Metrics',
        '📋 Raw Data'
      ],
      keyMetrics: columns.filter(col => 
        col.toLowerCase().includes('revenue') ||
        col.toLowerCase().includes('sales') ||
        col.toLowerCase().includes('conversion') ||
        col.toLowerCase().includes('amount') ||
        col.toLowerCase().includes('count')
      ),
      grouping: 'date',
      formatting: 'standard'
    };
  }

  async organizeDataByAI(data, analysis) {
    try {
      const prompt = `
Analyze this data and organize it into structured sheets. The data contains the following structure:
${JSON.stringify(analysis, null, 2)}

Please organize the data into:
1. Daily data groups (organized by date)
2. Weekly summaries (aggregated by week)
3. Monthly summaries (aggregated by month)
4. Key metrics calculations
5. Any additional insights or recommendations

Format the response as valid JSON with clear data structures.
      `;

      const response = await aiService.analyzeWithGemini(data, prompt);
      
      let organizedData;
      try {
        organizedData = JSON.parse(response);
      } catch (parseError) {
        organizedData = this.organizeDataManually(data, analysis);
      }

      return organizedData;

    } catch (error) {
      logger.error('Error organizing data with AI:', error);
      return this.organizeDataManually(data, analysis);
    }
  }

  organizeDataManually(data, analysis) {
    const dateColumn = analysis.dateColumns[0] || Object.keys(data[0])[0];
    
    // Group by date
    const dailyGroups = {};
    const weeklyGroups = {};
    const monthlyGroups = {};

    data.forEach(row => {
      const dateValue = row[dateColumn];
      if (!dateValue) return;

      const date = new Date(dateValue);
      const dayKey = date.toISOString().split('T')[0];
      const weekKey = this.getWeekKey(date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Daily grouping
      if (!dailyGroups[dayKey]) dailyGroups[dayKey] = [];
      dailyGroups[dayKey].push(row);

      // Weekly grouping
      if (!weeklyGroups[weekKey]) weeklyGroups[weekKey] = [];
      weeklyGroups[weekKey].push(row);

      // Monthly grouping
      if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = [];
      monthlyGroups[monthKey].push(row);
    });

    return {
      dailyData: dailyGroups,
      weeklyData: weeklyGroups,
      monthlyData: monthlyGroups,
      rawData: data,
      dateColumn: dateColumn
    };
  }

  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  async createSheetsFromData(organizedData) {
    const results = [];
    // Only keep the specified columns (case-insensitive match)
    const allowedColumns = [
      'imps', 'clicks', 'installs', 'spend', 'customers', 'revenue', 'avg.position', 'visibility'
    ];
    // Map allowed columns to actual CSV columns (case-insensitive)
    const rawColumns = Object.keys(organizedData.rawData[0] || {});
    const columnMap = {};
    allowedColumns.forEach(allowed => {
      const found = rawColumns.find(col => col.toLowerCase() === allowed);
      if (found) columnMap[allowed] = found;
    });
    const columns = Object.values(columnMap); // Actual CSV column names to use as headers

    try {
      // Only update the 'raw' sheet
      const sheetName = 'raw';
      logger.info('Updating only the raw sheet with allowed columns:', columns);
      const filteredData = organizedData.rawData.map(row => {
        const filteredRow = {};
        columns.forEach(col => {
          filteredRow[col] = row[col];
        });
        return filteredRow;
      });
      const rawResult = await this.sheetsService.createOrUpdateSheet(
        sheetName,
        filteredData,
        columns
      );
      if (rawResult.success) {
        await this.sheetsService.formatSheet(sheetName);
      }
      results.push(rawResult);
      logger.info(`Raw sheet updated: ${rawResult.rowsUpdated} rows`);
      return results;
    } catch (error) {
      logger.error('Error updating raw sheet:', error.message);
      results.push({ success: false, sheetName: 'raw', error: error.message });
      throw error;
    }
  }

  async generateInsights(data, analysis) {
    try {
      const prompt = `
Analyze this data and provide insights:

Data sample: ${JSON.stringify(data.slice(0, 20), null, 2)}
Analysis: ${JSON.stringify(analysis, null, 2)}

Please provide a JSON response with:
1. Key trends identified
2. Performance insights
3. Recommendations for improvement
4. Summary of findings
5. Action items

Format as valid JSON with clear, actionable insights.
      `;

      const response = await aiService.analyzeWithGemini(data, prompt);
      
      let insights;
      try {
        insights = JSON.parse(response);
      } catch (parseError) {
        insights = {
          summary: 'Data processed successfully. Review the organized sheets for detailed analysis.',
          trends: 'Check daily, weekly, and monthly sheets for trends.',
          recommendations: 'Use the summary dashboard for key metrics.',
          actionItems: 'Review organized data in Google Sheets.'
        };
      }

      return insights;

    } catch (error) {
      logger.error('Error generating insights:', error);
      return {
        summary: 'Data processed successfully. Review the organized sheets for detailed analysis.',
        trends: 'Check daily, weekly, and monthly sheets for trends.',
        recommendations: 'Use the summary dashboard for key metrics.',
        actionItems: 'Review organized data in Google Sheets.'
      };
    }
  }

  getDateRange(data) {
    if (!data || data.length === 0) return 'No data';
    
    const dateColumns = Object.keys(data[0]).filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time')
    );
    
    if (dateColumns.length === 0) return 'No date columns found';
    
    const dateColumn = dateColumns[0];
    const dates = data.map(row => new Date(row[dateColumn])).filter(date => !isNaN(date));
    
    if (dates.length === 0) return 'No valid dates found';
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return `${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`;
  }

  // New method to process CSV content directly from memory
  async processCSVContentAndOrganizeSheets(csvContent, filename) {
    const startTime = Date.now();
    try {
      logger.info('Starting CSV content processing and raw sheet update');
      // Parse CSV data from content
      const csvData = await this.parseCSVContent(csvContent);
      if (!csvData || csvData.length === 0) {
        throw new Error('No data found in CSV content');
      }
      logger.info('CSV parsed successfully:', { recordCount: csvData.length });
      // Analyze data structure with AI (optional, but keep for future use)
      const analysis = await this.analyzeDataStructure(csvData);
      // Organize data (just wrap as rawData)
      const organizedData = { rawData: csvData };
      // Only update the raw sheet
      const sheetResults = await this.createSheetsFromData(organizedData);
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      return {
        success: true,
        totalRecords: csvData.length,
        sheetsCreated: 1,
        processingTime: `${processingTime}s`,
        spreadsheetUrl: await this.sheetsService.getSpreadsheetUrl()
      };
    } catch (error) {
      logger.error('Error processing CSV content and updating raw sheet:', error);
      throw error;
    }
  }

  // New method to parse CSV content from string
  async parseCSVContent(csvContent) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      // Create a readable stream from the string content
      const { Readable } = require('stream');
      const stream = Readable.from(csvContent);
      
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
}

module.exports = PacingService; 