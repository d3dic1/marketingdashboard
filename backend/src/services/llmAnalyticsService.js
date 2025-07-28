const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { logger } = require('../utils/logger');

class LLMAnalyticsService {
  constructor() {
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    this.credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!this.credentials && !this.credentialsJson) {
      throw new Error('Either GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON is required');
    }

    let clientConfig = {};
    
    if (this.credentialsJson) {
      try {
        const credentials = JSON.parse(this.credentialsJson);
        clientConfig = { credentials };
        logger.info('LLMAnalyticsService: Using GOOGLE_APPLICATION_CREDENTIALS_JSON');
      } catch (error) {
        throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format');
      }
    } else if (this.credentials) {
      clientConfig = { keyFilename: this.credentials };
      logger.info('LLMAnalyticsService: Using GOOGLE_APPLICATION_CREDENTIALS file path');
    }

    this.analyticsDataClient = new BetaAnalyticsDataClient(clientConfig);
    
    // Known LLM user agent patterns
    this.llmUserAgents = [
      'perplexity',
      'chatgpt',
      'openai',
      'gemini',
      'claude',
      'anthropic',
      'copilot',
      'bingbot',
      'anthropic-ai',
      'ai-assistant',
      'llm',
      'ai-bot',
      'ai-crawler'
    ];
    
    logger.info('Initializing LLMAnalyticsService');
  }

  /**
   * Fetch LLM referral data from Google Analytics
   */
  async fetchLLMReferrals(propertyId, startDate = '30daysAgo', endDate = 'today') {
    try {
      logger.info('Fetching LLM referral data:', { propertyId, startDate, endDate });

      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'date' },
          { name: 'dateHour' },
          { name: 'userAgent' },
          { name: 'pagePath' },
          { name: 'pageTitle' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'totalUsers' }
        ],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'userAgent',
                  stringFilter: {
                    matchType: 'CONTAINS',
                    value: this.llmUserAgents.join('|'),
                    caseSensitive: false
                  }
                }
              }
            ]
          }
        },
        orderBys: [
          {
            dimension: { dimensionName: 'dateHour' },
            desc: true
          }
        ],
        limit: 100
      });

      if (!response.rows || response.rows.length === 0) {
        logger.info('No LLM referrals found in the specified date range');
        return {
          success: true,
          referrals: [],
          summary: {
            totalReferrals: 0,
            uniqueLLMs: 0,
            totalSessions: 0,
            totalPageViews: 0
          }
        };
      }

      const referrals = response.rows.map(row => {
        const dimensions = row.dimensionValues;
        const metrics = row.metricValues;
        
        const userAgent = dimensions[2].value;
        const detectedLLM = this.detectLLMFromUserAgent(userAgent);
        
        return {
          timestamp: this.formatTimestamp(dimensions[1].value), // dateHour
          date: dimensions[0].value,
          userAgent: userAgent,
          detectedLLM: detectedLLM,
          pagePath: dimensions[3].value,
          pageTitle: dimensions[4].value,
          sessions: parseInt(metrics[0].value) || 0,
          pageViews: parseInt(metrics[1].value) || 0,
          users: parseInt(metrics[2].value) || 0
        };
      });

      // Group by LLM type and calculate summary
      const llmSummary = this.calculateLLMSummary(referrals);

      return {
        success: true,
        referrals: referrals,
        summary: llmSummary
      };

    } catch (error) {
      logger.error('Error fetching LLM referrals:', error);
      throw new Error(`Failed to fetch LLM referral data: ${error.message}`);
    }
  }

  /**
   * Detect which LLM is being used based on user agent
   */
  detectLLMFromUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('perplexity')) return 'Perplexity';
    if (ua.includes('chatgpt') || ua.includes('openai')) return 'ChatGPT';
    if (ua.includes('gemini') || ua.includes('google')) return 'Gemini';
    if (ua.includes('claude') || ua.includes('anthropic')) return 'Claude';
    if (ua.includes('copilot') || ua.includes('bingbot')) return 'Copilot';
    if (ua.includes('ai-assistant') || ua.includes('ai-bot')) return 'AI Assistant';
    
    return 'Unknown LLM';
  }

  /**
   * Format timestamp from GA4 dateHour format
   */
  formatTimestamp(dateHour) {
    // GA4 dateHour format: YYYYMMDDHH
    const year = dateHour.substring(0, 4);
    const month = dateHour.substring(4, 6);
    const day = dateHour.substring(6, 8);
    const hour = dateHour.substring(8, 10);
    
    return `${year}-${month}-${day} ${hour}:00`;
  }

  /**
   * Calculate summary statistics for LLM referrals
   */
  calculateLLMSummary(referrals) {
    const llmCounts = {};
    let totalSessions = 0;
    let totalPageViews = 0;
    let totalUsers = 0;

    referrals.forEach(ref => {
      const llm = ref.detectedLLM;
      if (!llmCounts[llm]) {
        llmCounts[llm] = {
          count: 0,
          sessions: 0,
          pageViews: 0,
          users: 0
        };
      }
      
      llmCounts[llm].count++;
      llmCounts[llm].sessions += ref.sessions;
      llmCounts[llm].pageViews += ref.pageViews;
      llmCounts[llm].users += ref.users;
      
      totalSessions += ref.sessions;
      totalPageViews += ref.pageViews;
      totalUsers += ref.users;
    });

    return {
      totalReferrals: referrals.length,
      uniqueLLMs: Object.keys(llmCounts).length,
      totalSessions,
      totalPageViews,
      totalUsers,
      byLLM: llmCounts
    };
  }

  /**
   * Fetch citation monitoring data (simulated for now)
   */
  async fetchCitationData(propertyId, startDate = '30daysAgo', endDate = 'today') {
    try {
      // This would ideally query external APIs or databases for citation data
      // For now, we'll return a placeholder structure
      return {
        success: true,
        citations: [],
        summary: {
          totalCitations: 0,
          byPlatform: {},
          recentCitations: []
        },
        note: 'Citation monitoring requires integration with external APIs or manual tracking'
      };
    } catch (error) {
      logger.error('Error fetching citation data:', error);
      throw new Error(`Failed to fetch citation data: ${error.message}`);
    }
  }

  /**
   * Fetch AI-friendly content performance
   */
  async fetchAIContentPerformance(propertyId, startDate = '30daysAgo', endDate = 'today') {
    try {
      logger.info('Fetching AI-friendly content performance:', { propertyId, startDate, endDate });

      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'date' },
          { name: 'pagePath' },
          { name: 'pageTitle' }
        ],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'averageSessionDuration' }
        ],
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true
          }
        ],
        limit: 50
      });

      if (!response.rows || response.rows.length === 0) {
        return {
          success: true,
          content: [],
          summary: {
            totalPages: 0,
            totalPageViews: 0,
            averageSessionDuration: 0
          }
        };
      }

      const content = response.rows.map(row => {
        const dimensions = row.dimensionValues;
        const metrics = row.metricValues;
        
        return {
          date: dimensions[0].value,
          pagePath: dimensions[1].value,
          pageTitle: dimensions[2].value,
          pageViews: parseInt(metrics[0].value) || 0,
          sessions: parseInt(metrics[1].value) || 0,
          users: parseInt(metrics[2].value) || 0,
          avgSessionDuration: parseFloat(metrics[3].value) || 0
        };
      });

      const summary = {
        totalPages: content.length,
        totalPageViews: content.reduce((sum, page) => sum + page.pageViews, 0),
        totalSessions: content.reduce((sum, page) => sum + page.sessions, 0),
        totalUsers: content.reduce((sum, page) => sum + page.users, 0),
        averageSessionDuration: content.reduce((sum, page) => sum + page.avgSessionDuration, 0) / content.length
      };

      return {
        success: true,
        content: content,
        summary: summary
      };

    } catch (error) {
      logger.error('Error fetching AI content performance:', error);
      throw new Error(`Failed to fetch AI content performance: ${error.message}`);
    }
  }
}

module.exports = LLMAnalyticsService; 