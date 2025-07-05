import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { UsersIcon, EyeIcon, CursorArrowRaysIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline';
import { setAuthToken, authorizedRequest } from '../services/api';
import IdManager from './IdManager';
import MetricCard from './MetricCard';
import CombinedOverview from './CombinedOverview';
import TopPerformers from './TopPerformers';
import AutoDiscovery from './AutoDiscovery';
import { useAuth } from '../services/firebase';

const TIMEFRAMES = [
  { label: '7 Days', value: 'last-7-days' },
  { label: '14 Days', value: 'last-14-days' },
  { label: '30 Days', value: 'last-30-days' },
  { label: 'All Time', value: 'all-time' },
];

const BATCH_SIZE = 50;

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({});
  const [isCampaignManagerOpen, setIsCampaignManagerOpen] = useState(false);
  const [isJourneyManagerOpen, setIsJourneyManagerOpen] = useState(false);
  const [isAutoDiscoveryOpen, setIsAutoDiscoveryOpen] = useState(false);
  const [campaignIds, setCampaignIds] = useState([]);
  const [journeyIds, setJourneyIds] = useState([]);
  const [timeframe, setTimeframe] = useState('all-time');
  const [pendingItems, setPendingItems] = useState([]);
  const [rateLimitedItems, setRateLimitedItems] = useState([]);
  const [isPartial, setIsPartial] = useState(false);
  const [partialMessage, setPartialMessage] = useState('');
  const [summary, setSummary] = useState(null);
  const [hasInitialData, setHasInitialData] = useState(false);
  const { user } = useAuth();

  // Use ref to store loadNextBatch function to avoid circular dependency
  const loadNextBatchRef = useRef();

  // Helper to merge reports by ID
  function mergeReportsById(existing, incoming) {
    const map = new Map();
    existing.forEach(r => map.set(r.id, r));
    incoming.forEach(r => map.set(r.id, { ...map.get(r.id), ...r }));
    return Array.from(map.values());
  }

  // Batch loading function - define this before useEffect to avoid circular dependency
  const loadNextBatch = useCallback(async (pending, loaded, tf, forceRefresh) => {
    if (forceRefresh) {
      setLoading(true);
    } else {
      setBackgroundLoading(true);
    }
    setError(null);
    setIsPartial(false);
    setPartialMessage('');
    setSummary(null);
    
    try {
      const response = await authorizedRequest({ 
        method: 'post', 
        url: '/reports/dashboard-reports', 
        data: { items: pending, timeframe: tf, forceRefresh: !!forceRefresh } 
      });
      
      console.log('API response:', response.data); // Debug log
      
      if (!response.data || response.data.error) {
        setError(response.data?.error || 'No data returned from backend');
        setBackgroundLoading(false);
        setLoading(false);
        return;
      }
      
      let newReports = response.data.reports || response.data || [];
      if (!Array.isArray(newReports)) newReports = [newReports];

      // Merge new reports with existing loaded data, updating by ID
      const updatedLoaded = mergeReportsById(loaded, newReports);
      setReportData(prev => ({ ...prev, [tf]: updatedLoaded }));
      
      // Update pending items based on response
      if (response.data.pending && Array.isArray(response.data.pending)) {
        setPendingItems(response.data.pending);
      } else {
        setPendingItems([]);
      }

      // Handle rate limited items
      if (response.data.rateLimited && response.data.rateLimited.length > 0) {
        setRateLimitedItems(prev => mergeReportsById(prev, response.data.rateLimited));
      }

      // Handle partial/rate-limited
      if (response.data.partial) {
        setIsPartial(true);
        setPartialMessage(response.data.message || 'Some data is still loading...');
        setSummary(response.data.summary || null);
        
        // Start polling for updates if background processing is happening
        if (response.data.summary?.source === 'background_processing' || response.data.summary?.source === 'partial_cache') {
          startPollingForUpdates(tf, updatedLoaded.length);
        }
      } else {
        setIsPartial(false);
        setPartialMessage('');
        setSummary(response.data.summary || null);
      }

      // Show background refresh notification
      if (response.data.summary?.source === 'cache_refreshing') {
        setPartialMessage('Data loaded from cache. Fresh data is being fetched in the background...');
        setIsPartial(true);
      }
      
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      if (forceRefresh) {
        setLoading(false);
      } else {
        setBackgroundLoading(false);
      }
    }
  }, [timeframe]);

  // Polling function for background updates
  const startPollingForUpdates = useCallback(async (tf, lastCount) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await authorizedRequest({ 
          method: 'get', 
          url: `/reports/poll-cached-reports?timeframe=${tf}&lastCount=${lastCount}` 
        });
        
        if (response.data.hasUpdates) {
          console.log('Polling found updates:', response.data.message);
          const newReports = response.data.reports || [];
          setReportData(prev => ({ ...prev, [tf]: newReports }));
          setPartialMessage(response.data.message);
          
          // Update last count for next poll
          lastCount = response.data.count;
          
          // If we have all the data, stop polling
          if (response.data.count >= pendingItems.length) {
            clearInterval(pollInterval);
            setIsPartial(false);
            setPartialMessage('All data loaded successfully');
            setBackgroundLoading(false);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds
    
    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setBackgroundLoading(false);
    }, 300000);
  }, [pendingItems.length]);

  // Store the function in ref to avoid circular dependency
  useEffect(() => {
    loadNextBatchRef.current = loadNextBatch;
  }, [loadNextBatch]);

  // Load cached data on mount
  const loadCachedData = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      setAuthToken(token);
      const response = await authorizedRequest({ method: 'get', url: `/reports/cached-reports?timeframe=${timeframe}` });
      
      if (response.data.reports && response.data.reports.length > 0) {
        setReportData(prev => ({ ...prev, [timeframe]: response.data.reports }));
        setPartialMessage(`Loaded ${response.data.count} cached reports (${response.data.cacheAge} minutes old)`);
        setIsPartial(true);
        setHasInitialData(true);
        console.log('Loaded cached data:', response.data.message);
        return true; // Indicate that we have cached data
      }
    } catch (error) {
      console.log('No cached data available or error loading cache:', error.message);
    }
    return false; // No cached data available
  }, [user, timeframe]);

  // Load IDs from backend or localStorage on mount
  useEffect(() => {
    const fetchIds = async () => {
      console.log('Dashboard: Fetching IDs, user:', !!user);
      if (user) {
        const token = await user.getIdToken();
        setAuthToken(token);
        try {
          const res = await authorizedRequest({ method: 'get', url: '/auth/ids' });
          console.log('Dashboard: Loaded IDs from backend:', {
            campaigns: res.data.campaignIds?.length || 0,
            journeys: res.data.journeyIds?.length || 0
          });
          setCampaignIds(res.data.campaignIds || []);
          setJourneyIds(res.data.journeyIds || []);
          
          // Load cached data after IDs are loaded
          const hasCachedData = await loadCachedData();
          
          // Only start background loading if we have IDs and no cached data
          if ((res.data.campaignIds?.length > 0 || res.data.journeyIds?.length > 0) && !hasCachedData) {
            // Start background loading for fresh data
            setBackgroundLoading(true);
            const allItems = [
              ...(res.data.campaignIds || []).map(id => ({ id, type: 'campaign' })),
              ...(res.data.journeyIds || []).map(id => ({ id, type: 'journey' })),
            ];
            setPendingItems(allItems);
            if (loadNextBatchRef.current) {
              loadNextBatchRef.current(allItems, [], timeframe, false);
            }
          }
        } catch (err) {
          console.error('Dashboard: Error loading IDs from backend:', err);
          setCampaignIds([]);
          setJourneyIds([]);
        }
      } else {
        const savedCampaignIds = localStorage.getItem('campaignIds');
        const savedJourneyIds = localStorage.getItem('journeyIds');
        console.log('Dashboard: Loaded IDs from localStorage:', {
          campaigns: savedCampaignIds?.split(',').filter(Boolean).length || 0,
          journeys: savedJourneyIds?.split(',').filter(Boolean).length || 0
        });
        if (savedCampaignIds) setCampaignIds(savedCampaignIds.split(',').filter(Boolean));
        if (savedJourneyIds) setJourneyIds(savedJourneyIds.split(',').filter(Boolean));
      }
    };
    fetchIds();
  }, [user]);

  // Reset and start batch loading when IDs or timeframe change
  useEffect(() => {
    console.log('Dashboard: IDs or timeframe changed:', {
      campaigns: campaignIds.length,
      journeys: journeyIds.length,
      timeframe,
      hasData: Array.isArray(reportData[timeframe]) && reportData[timeframe].length > 0
    });
    
    // Skip this effect on initial load if we don't have IDs yet
    if (campaignIds.length === 0 && journeyIds.length === 0) {
      console.log('Dashboard: No IDs available, skipping data loading');
      return;
    }

    // Only trigger batch loading if we do NOT already have data for this timeframe
    if (Array.isArray(reportData[timeframe]) && reportData[timeframe].length > 0) {
      console.log('Dashboard: Data already loaded for timeframe, skipping batch loading');
      return;
    }
    
    // Add debounce to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      const allItems = [
        ...campaignIds.map(id => ({ id, type: 'campaign' })),
        ...journeyIds.map(id => ({ id, type: 'journey' })),
      ];
      
      console.log('Dashboard: Starting batch loading for', allItems.length, 'items');
      
      // Don't reset reportData immediately - let the API call determine what's cached
      setPendingItems(allItems);
      setRateLimitedItems([]); // Clear rate limited items when IDs change
      setIsPartial(false);
      setPartialMessage('');
      setSummary(null);
      setError(null);
      
      if (allItems.length > 0 && loadNextBatchRef.current) {
        setBackgroundLoading(true);
        loadNextBatchRef.current(allItems, reportData[timeframe] || [], timeframe, false);
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [campaignIds.join(','), journeyIds.join(','), timeframe]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    // Restart batch loading with forceRefresh false, but maintain existing data
    const allItems = [
      ...campaignIds.map(id => ({ id, type: 'campaign' })),
      ...journeyIds.map(id => ({ id, type: 'journey' })),
    ];
    
    // Don't clear reportData - let the API determine what's cached
    setPendingItems(allItems);
    setRateLimitedItems([]); // Clear rate limited items on refresh
    setIsPartial(false);
    setPartialMessage('');
    setSummary(null);
    setError(null);
    
    if (allItems.length > 0) {
      setBackgroundLoading(true);
      if (loadNextBatchRef.current) {
        loadNextBatchRef.current(allItems, reportData[timeframe] || [], timeframe, false);
      }
    }
  }, [campaignIds, journeyIds, timeframe, reportData]);

  // Force refresh function (bypasses cache)
  const handleForceRefresh = useCallback(async () => {
    const allItems = [
      ...campaignIds.map(id => ({ id, type: 'campaign' })),
      ...journeyIds.map(id => ({ id, type: 'journey' })),
    ];
    setReportData(prev => ({ ...prev, [timeframe]: [] }));
    setPendingItems(allItems);
    setRateLimitedItems([]); // Clear rate limited items on force refresh
    setIsPartial(false);
    setPartialMessage('');
    setSummary(null);
    setError(null);
    if (allItems.length > 0) {
      if (loadNextBatchRef.current) {
        loadNextBatchRef.current(allItems, [], timeframe, true);
      }
    }
  }, [campaignIds, journeyIds, timeframe, reportData]);

  // Clear cache function
  const handleClearCache = useCallback(async () => {
    try {
      await authorizedRequest({ method: 'delete', url: '/reports/cache' });
      // Refresh data after clearing cache (force refresh)
      setReportData(prev => ({ ...prev, [timeframe]: [] }));
      handleForceRefresh();
    } catch (error) {
      setError('Failed to clear cache: ' + error.message);
    }
  }, [handleForceRefresh]);

  // Clear rate limits function
  const handleClearRateLimits = useCallback(async () => {
    try {
      await authorizedRequest({ method: 'delete', url: '/reports/rate-limits' });
      setRateLimitedItems([]);
      setError(null);
      // Refresh data after clearing rate limits
      handleRefresh();
    } catch (error) {
      setError('Failed to clear rate limits: ' + error.message);
    }
  }, [handleRefresh]);

  const aggregatedMetrics = useMemo(() => {
    return (reportData[timeframe] || []).reduce((acc, report) => {
      acc.totalRecipients += report.total_recipients || 0;
      acc.totalOpens += report.opens || 0;
      acc.totalClicks += report.clicks || 0;
      acc.totalDeliveries += report.deliveries || 0;
      return acc;
    }, {
      totalRecipients: 0,
      totalOpens: 0,
      totalClicks: 0,
      totalDeliveries: 0,
    });
  }, [reportData, timeframe]);
  
  const deliveryRate = aggregatedMetrics.totalRecipients > 0
    ? (aggregatedMetrics.totalDeliveries / aggregatedMetrics.totalRecipients) * 100
    : 0;

  const topPerformers = useMemo(() => {
    return (reportData[timeframe] || [])
      .map(report => ({
        name: report.name || `Campaign: ${report.id}`,
        type: report.type,
        id: report.id,
        openRate: report.total_recipients > 0 ? (report.unique_opens / report.total_recipients) * 100 : 0,
        clickRate: report.opens > 0 ? (report.unique_clicks / report.opens) * 100 : 0,
      }))
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);
  }, [reportData, timeframe]);

  // Save campaign IDs to backend or localStorage
  const handleSaveCampaigns = async (newCampaignIds) => {
    console.log('Dashboard: Saving campaign IDs:', newCampaignIds);
    setCampaignIds(newCampaignIds);
    setIsCampaignManagerOpen(false);
    if (user) {
      const token = await user.getIdToken();
      setAuthToken(token);
      try {
        await authorizedRequest({ method: 'post', url: '/auth/ids', data: { campaignIds: newCampaignIds } });
        console.log('Dashboard: Campaign IDs saved to backend successfully');
      } catch (err) {
        console.error('Error saving campaign IDs:', err);
        // Fallback to localStorage if backend save fails
        localStorage.setItem('campaignIds', newCampaignIds.join(','));
        console.log('Dashboard: Campaign IDs saved to localStorage as fallback');
      }
    } else {
      localStorage.setItem('campaignIds', newCampaignIds.join(','));
      console.log('Dashboard: Campaign IDs saved to localStorage');
    }
  };

  // Save journey IDs to backend or localStorage
  const handleSaveJourneys = async (newJourneyIds) => {
    console.log('Dashboard: Saving journey IDs:', newJourneyIds);
    setJourneyIds(newJourneyIds);
    setIsJourneyManagerOpen(false);
    if (user) {
      const token = await user.getIdToken();
      setAuthToken(token);
      try {
        await authorizedRequest({ method: 'post', url: '/auth/ids', data: { journeyIds: newJourneyIds } });
        console.log('Dashboard: Journey IDs saved to backend successfully');
      } catch (err) {
        console.error('Error saving journey IDs:', err);
        // Fallback to localStorage if backend save fails
        localStorage.setItem('journeyIds', newJourneyIds.join(','));
        console.log('Dashboard: Journey IDs saved to localStorage as fallback');
      }
    } else {
      localStorage.setItem('journeyIds', newJourneyIds.join(','));
      console.log('Dashboard: Journey IDs saved to localStorage');
    }
  };

  // Handle auto-discovery completion
  const handleAutoDiscoveryComplete = async (discoveredData) => {
    // Update the local state with discovered IDs
    setCampaignIds(discoveredData.campaignIds || []);
    setJourneyIds(discoveredData.journeyIds || []);
    setIsAutoDiscoveryOpen(false);
    
    // Refresh the dashboard data
    await handleRefresh();
  };

  // Auto-refresh for pending data
  useEffect(() => {
    // Only auto-refresh for pending items, not for rate-limited items
    if (isPartial && pendingItems.length > 0 && rateLimitedItems.length === 0) {
      // Retry with existing data maintained
      const timer = setTimeout(() => {
        console.log('Auto-refreshing dashboard data for pending items...');
        // Only retry up to 3 times to avoid infinite loop
        if (!window.__dashboardPendingRetries) window.__dashboardPendingRetries = 0;
        window.__dashboardPendingRetries++;
        if (window.__dashboardPendingRetries > 3) {
          setPartialMessage('Some data could not be loaded after several attempts. Please try again later or click Refresh.');
          return;
        }
        const allItems = [
          ...campaignIds.map(id => ({ id, type: 'campaign' })),
          ...journeyIds.map(id => ({ id, type: 'journey' })),
        ];
        setPendingItems(allItems);
        if (loadNextBatchRef.current) {
          loadNextBatchRef.current(allItems, reportData[timeframe] || [], timeframe, false);
        }
      }, 120000); // 2 minutes for pending items
      return () => clearTimeout(timer);
    }
    // If rate-limited, show warning and do not auto-retry
    if (isPartial && rateLimitedItems.length > 0) {
      setPartialMessage('Rate limited by Ortto API. Please wait a few minutes and click Refresh.');
      // Do not auto-retry while rate-limited
      window.__dashboardPendingRetries = 0;
    }
    // Reset retry counter if not partial
    if (!isPartial) {
      window.__dashboardPendingRetries = 0;
    }
  }, [isPartial, pendingItems.length, rateLimitedItems, campaignIds, journeyIds, reportData, timeframe]);

  // Auto-refresh for partial cache
  useEffect(() => {
    if (isPartial || (Array.isArray(pendingItems) && pendingItems.length > 0)) {
      const interval = setInterval(() => {
        // Re-fetch cached data
        loadCachedData();
      }, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
    // No auto-refresh needed if all data is loaded
    return undefined;
  }, [isPartial, pendingItems, loadCachedData]);

  // Error display logic
  const showNoReportsError = error && (!reportData[timeframe] || reportData[timeframe].length === 0);

  return (
    <div className="space-y-8 px-2 sm:px-4 md:px-8 max-w-full w-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-text-secondary">Welcome back, here's a look at your performance.</p>
          {backgroundLoading && !loading && (
            <div className="text-blue-600 text-sm mt-1 flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>Updating data in background...</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-2 font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? '🔄' : '🔄'} Refresh
          </button>
          <button 
            onClick={handleForceRefresh}
            disabled={loading}
            className="px-3 py-2 font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '⚡' : '⚡'} Force Refresh
          </button>
          <button 
            onClick={handleClearCache}
            disabled={loading}
            className="px-3 py-2 font-semibold rounded-lg text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loading ? '🗑️' : '🗑️'} Clear Cache
          </button>
          <button 
            onClick={handleClearRateLimits}
            disabled={loading}
            className="px-3 py-2 font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? '🗑️' : '🗑️'} Clear Rate Limits
          </button>
          <button 
            onClick={() => setIsAutoDiscoveryOpen(true)} 
            className="px-4 py-2 font-semibold rounded-lg text-white bg-accent hover:bg-accent-hover transition-colors"
          >
            🚀 Auto-Discover All
          </button>
          <button onClick={() => setIsCampaignManagerOpen(true)} className="px-4 py-2 font-semibold rounded-lg text-white bg-accent hover:bg-accent-hover transition-colors">Manage Campaign IDs</button>
          <button onClick={() => setIsJourneyManagerOpen(true)} className="px-4 py-2 font-semibold rounded-lg text-white bg-primary hover:bg-primary/80 transition-colors border border-border">Manage Journey IDs</button>
        </div>
      </header>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 p-1 rounded-lg bg-background-secondary border border-border">
          {TIMEFRAMES.map(item => (
            <button
              key={item.value}
              onClick={() => setTimeframe(item.value)}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                timeframe === item.value
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-background'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {showNoReportsError && (
        <div className="bg-danger/10 border border-danger text-danger px-6 py-4 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Warning for too many campaigns */}
      {campaignIds.length > 50 && (
        <div className="bg-warning/10 border border-warning text-warning px-6 py-4 rounded-xl font-medium">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>
              You are loading {campaignIds.length} campaigns/journeys. This may cause rate limiting and slow loading. Consider reducing the number of items or use the auto-discovery feature to get the most recent data.
            </span>
          </div>
        </div>
      )}

      {/* Background loading indicator */}
      {backgroundLoading && !loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Fetching fresh data in the background...</span>
          </div>
        </div>
      )}

      {/* Data source indicator */}
      {summary && summary.source && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
          summary.source === 'firebase_cache' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : summary.source === 'cache_refreshing'
            ? 'bg-blue-100 border border-blue-300 text-blue-800'
            : summary.source === 'partial_cache'
            ? 'bg-yellow-100 border border-yellow-300 text-yellow-800'
            : 'bg-blue-100 border border-blue-300 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {summary.source === 'firebase_cache' ? '💾' : 
             summary.source === 'cache_refreshing' ? '🔄' :
             summary.source === 'partial_cache' ? '⚠️' : '🔄'}
            <span>
              {summary.source === 'firebase_cache' 
                ? 'Using cached data from Firebase (24-hour cache)' 
                : summary.source === 'cache_refreshing'
                ? 'Using cached data (refreshing in background)'
                : summary.source === 'partial_cache'
                ? 'Using partial cached data (some items missing)'
                : 'Fresh data from Ortto API'
              }
            </span>
            {summary.source === 'firebase_cache' && summary.lastUpdated && (
              <span className="text-xs opacity-75">
                (Last updated: {new Date(summary.lastUpdated).toLocaleString()})
              </span>
            )}
            <span className="text-xs opacity-75">
              • Showing {summary.fetched}/{summary.total} items
            </span>
          </div>
          {summary.source === 'firebase_cache' && (
            <div className="mt-1 text-xs opacity-75">
              💡 Use "Force Refresh" to bypass cache or "Clear Cache" to remove all cached data
            </div>
          )}
          {summary.source === 'cache_refreshing' && (
            <div className="mt-1 text-xs opacity-75">
              💡 Fresh data is being fetched in the background to avoid rate limits
            </div>
          )}
        </div>
      )}

      {/* Partial results warning */}
      {isPartial && partialMessage && (
        <div className="bg-warning/10 border border-warning text-warning px-6 py-4 rounded-xl font-medium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{partialMessage}</span>
              {summary && (
                <span className="text-sm opacity-75">
                  ({summary.fetched}/{summary.total} fetched)
                </span>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 text-sm font-semibold rounded-md bg-warning text-white hover:bg-warning/80 transition-colors"
            >
              Refresh Now
            </button>
          </div>
          <div className="mt-2 text-sm opacity-75">
            {pendingItems.length > 0 && `Pending: ${pendingItems.length} items due to batching. `}
            {rateLimitedItems.length > 0 && (
              <span className="text-red-600 font-semibold">
                Rate limited: {rateLimitedItems.length} items. Will retry in 5 minutes.
              </span>
            )}
            {pendingItems.length > 0 && !rateLimitedItems.length && 
              "The remaining data will be automatically fetched in 2 minutes, or you can refresh manually."
            }
          </div>
        </div>
      )}

      {/* Show a loading/progress indicator if partial */}
      {isPartial && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading missing data in the background...</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading dashboard data...</p>
        </div>
      ) : (campaignIds.length > 0 || journeyIds.length > 0) && reportData[timeframe] && reportData[timeframe].length > 0 ? (
        <div className="space-y-8">
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Recipients" value={aggregatedMetrics.totalRecipients} icon={<UsersIcon className="w-6 h-6 text-text-secondary" />} change="+15.2%" changeType="positive" />
            <MetricCard title="Total Opens" value={aggregatedMetrics.totalOpens} icon={<EyeIcon className="w-6 h-6 text-text-secondary" />} change="+8.7%" changeType="positive" />
            <MetricCard title="Total Clicks" value={aggregatedMetrics.totalClicks} icon={<CursorArrowRaysIcon className="w-6 h-6 text-text-secondary" />} change="-2.1%" changeType="negative" />
            <MetricCard title="Delivery Rate" value={deliveryRate} isRate={true} suffix="%" icon={<EnvelopeOpenIcon className="w-6 h-6 text-text-secondary" />} change="+0.1%" changeType="positive" />
          </div>

          <CombinedOverview reportData={reportData[timeframe]} timeframe={timeframe === 'last-7-days' ? 'weekly' : 'monthly'} loading={loading} />
          <TopPerformers data={topPerformers} />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-text-secondary text-lg">No data to display.</p>
          <p className="text-text-secondary mt-2">
            Please add campaign or journey IDs to view the dashboard.
          </p>
        </div>
      )}

      <IdManager isOpen={isCampaignManagerOpen} onClose={() => setIsCampaignManagerOpen(false)} onSave={handleSaveCampaigns} initialIds={campaignIds} entityType="campaign" />
      <IdManager isOpen={isJourneyManagerOpen} onClose={() => setIsJourneyManagerOpen(false)} onSave={handleSaveJourneys} initialIds={journeyIds} entityType="journey" />
      
      {/* Auto-Discovery Modal */}
      {isAutoDiscoveryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text">Auto-Discovery</h2>
                <button 
                  onClick={() => setIsAutoDiscoveryOpen(false)}
                  className="text-text-secondary hover:text-text"
                >
                  ✕
                </button>
              </div>
              <AutoDiscovery onDiscoveryComplete={handleAutoDiscoveryComplete} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 