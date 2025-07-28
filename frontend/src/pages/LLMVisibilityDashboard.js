import React, { useState, useEffect } from 'react';
import { smartAutomationAPI } from '../services/api';
import api from '../services/api';

export default function LLMVisibilityDashboard() {
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Real data states
  const [analytics, setAnalytics] = useState(null);
  const [gscMetrics, setGscMetrics] = useState(null);
  const [gscHistory, setGscHistory] = useState([]);
  const [llmReferrals, setLlmReferrals] = useState([]);
  const [llmSummary, setLlmSummary] = useState(null);
  const [citationData, setCitationData] = useState(null);
  const [contentPerformance, setContentPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Google Analytics overview
        const analyticsData = await smartAutomationAPI.getAnalyticsOverview('365d');
        setAnalytics(analyticsData);

        // Fetch GSC sites to get the default site
        const sitesResp = await api.get('/gsc/sites');
        const sites = sitesResp.data.sites || [];
        if (!sites.length) throw new Error('No GSC sites found');
        const siteUrl = sites[0].siteUrl;

        // Get current year/month
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Fetch GSC monthly summary for the most recent month
        const gscResp = await api.get('/gsc/monthly-summary', {
          params: { siteUrl, year, month }
        });
        setGscMetrics(gscResp.data.summary);

        // Fetch GSC trend data for the last 3 periods (simulate history)
        const trendResp = await api.get('/gsc/trends', {
          params: {
            siteUrl,
            startDate: `${year - 1}-01-01`,
            endDate: `${year}-${month.toString().padStart(2, '0')}-01`
          }
        });
        setGscHistory(trendResp.data.trends || []);

        // Fetch real LLM referral data
        try {
          const llmResp = await api.get('/llm-analytics/referrals');
          setLlmReferrals(llmResp.data.referrals || []);
          setLlmSummary(llmResp.data.summary);
        } catch (llmError) {
          console.error('Failed to fetch LLM referrals:', llmError);
          setLlmReferrals([]);
          setLlmSummary(null);
        }

        // Fetch citation data
        try {
          const citationResp = await api.get('/llm-analytics/citations');
          setCitationData(citationResp.data);
        } catch (citationError) {
          console.error('Failed to fetch citation data:', citationError);
          setCitationData(null);
        }

        // Fetch content performance data
        try {
          const contentResp = await api.get('/llm-analytics/content-performance');
          setContentPerformance(contentResp.data);
        } catch (contentError) {
          console.error('Failed to fetch content performance:', contentError);
          setContentPerformance(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackSubmitted(true);
    
    try {
      await api.post('/llm-analytics/feedback', {
        llmName: feedback,
        feedback: `User found us via: ${feedback}`,
        pageUrl: window.location.href
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  // Prepare GSC metrics for display
  const impressions = gscMetrics?.totalImpressions || 0;
  const clicks = gscMetrics?.totalClicks || 0;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
  const lastUpdated = gscMetrics?.period?.endDate || '';
  const history = gscHistory.length ? gscHistory.slice(-3).map((h, i) => ({
    period: h.date || `Period ${i + 1}`,
    impressions: h.impressions || 0,
    clicks: h.clicks || 0,
  })) : [];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-2">AI/LLM Visibility Dashboard</h1>
      <p className="text-gray-600 mb-6">Track your website's visibility and performance in the era of AI-driven search and LLMs.</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading analytics...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : (
        <>
          {/* LLM/AI Referral Analytics */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">LLM/AI Referral Analytics</h2>
            {llmSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{llmSummary.totalReferrals}</div>
                  <div className="text-sm text-gray-600">Total Referrals</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{llmSummary.uniqueLLMs}</div>
                  <div className="text-sm text-gray-600">Unique LLMs</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{llmSummary.totalSessions}</div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{llmSummary.totalPageViews}</div>
                  <div className="text-sm text-gray-600">Page Views</div>
                </div>
              </div>
            )}
            <p className="text-gray-500 mb-2">Recent requests from known LLM/AI user agents:</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Timestamp</th>
                    <th className="px-4 py-2 text-left">User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {llmReferrals.length === 0 ? (
                    <tr><td colSpan={2} className="text-center py-4 text-gray-400">No LLM/AI referrals detected yet.</td></tr>
                  ) : (
                    llmReferrals.slice(0, 10).map((ref, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-4 py-2">{ref.timestamp}</td>
                        <td className="px-4 py-2 font-mono text-xs">
                          <div>
                            <div className="font-semibold text-blue-600">{ref.detectedLLM}</div>
                            <div className="text-gray-500">{ref.userAgent}</div>
                            <div className="text-xs text-gray-400">Page: {ref.pagePath}</div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Cited Source Monitoring */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Cited Source Monitoring</h2>
            {citationData ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{citationData.summary?.totalCitations || 0}</div>
                    <div className="text-sm text-gray-600">Total Citations</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{Object.keys(citationData.summary?.byPlatform || {}).length}</div>
                    <div className="text-sm text-gray-600">Platforms</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{citationData.summary?.recentCitations?.length || 0}</div>
                    <div className="text-sm text-gray-600">Recent Citations</div>
                  </div>
                </div>
                {citationData.note && (
                  <p className="text-gray-500 mb-2">{citationData.note}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 mb-2">(Coming soon) This section will show when your site is cited in LLMs like ChatGPT, Gemini, and Perplexity.</p>
            )}
            <ul className="list-disc ml-6 text-gray-500">
              <li>Automate regular queries to LLMs for your brand/keywords</li>
              <li>Log and display citations</li>
              <li>Track which content is being referenced</li>
            </ul>
          </section>

          {/* SEO Metrics & Visibility Gap */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">SEO Metrics & Visibility Gap</h2>
            <div className="flex flex-col md:flex-row md:space-x-8">
              <div className="flex-1 mb-4 md:mb-0">
                <div className="mb-2 text-gray-500">Impressions</div>
                <div className="text-2xl font-bold">{impressions.toLocaleString()}</div>
                <div className="mb-2 text-gray-500 mt-4">Clicks</div>
                <div className="text-2xl font-bold">{clicks.toLocaleString()}</div>
                <div className="mb-2 text-gray-500 mt-4">CTR</div>
                <div className="text-2xl font-bold">{ctr}%</div>
                <div className="text-gray-400 text-xs mt-2">Last updated: {lastUpdated}</div>
              </div>
              <div className="flex-1">
                <div className="mb-2 text-gray-500">Visibility Gap (Impressions vs. Clicks)</div>
                <div className="w-full h-32 bg-gray-50 rounded flex items-end">
                  {/* Simple bar chart */}
                  {history.length === 0 ? (
                    <div className="text-gray-400 text-center w-full">No history data</div>
                  ) : (
                    history.map((h, i) => {
                      const maxImpr = Math.max(...history.map(x => x.impressions));
                      const imprHeight = (h.impressions / maxImpr) * 100;
                      const clickHeight = (h.clicks / maxImpr) * 100;
                      return (
                        <div key={i} className="flex flex-col items-center mx-2">
                          <div className="flex items-end" style={{height: '100px'}}>
                            <div className="w-4 bg-blue-400 rounded-t" style={{height: `${imprHeight}px`}} title={`Impressions: ${h.impressions.toLocaleString()}`}></div>
                            <div className="w-4 bg-green-400 rounded-t ml-1" style={{height: `${clickHeight}px`}} title={`Clicks: ${h.clicks.toLocaleString()}`}></div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{h.period}</div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-2">Blue: Impressions, Green: Clicks</div>
              </div>
            </div>
          </section>

          {/* Feedback Widget */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Feedback: Did you find us via an AI/LLM?</h2>
            {feedbackSubmitted ? (
              <div className="text-green-600 font-semibold">Thank you for your feedback!</div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <input
                  type="text"
                  className="border rounded px-3 py-2 flex-1"
                  placeholder="Which AI/LLM did you use? (e.g. ChatGPT, Gemini, Perplexity)"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  required
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit</button>
              </form>
            )}
          </section>

          {/* Structured Data & Schema Tips */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Structured Data & Schema Tips</h2>
            <ul className="list-disc ml-6 text-gray-500">
              <li>Add <code>FAQ</code>, <code>HowTo</code>, <code>Article</code> schema to your content</li>
              <li>Use JSON-LD for easy parsing by LLMs and Google</li>
              <li>Mark up original research, stats, and definitions</li>
            </ul>
          </section>

          {/* AI Content Performance */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">AI-Friendly Content Performance</h2>
            {contentPerformance ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{contentPerformance.summary?.totalPages || 0}</div>
                    <div className="text-sm text-gray-600">Pages Tracked</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{contentPerformance.summary?.totalPageViews?.toLocaleString() || 0}</div>
                    <div className="text-sm text-gray-600">Total Page Views</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{contentPerformance.summary?.totalSessions?.toLocaleString() || 0}</div>
                    <div className="text-sm text-gray-600">Total Sessions</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{Math.round(contentPerformance.summary?.averageSessionDuration || 0)}s</div>
                    <div className="text-sm text-gray-600">Avg Session Duration</div>
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Top Performing Pages</h3>
                  <div className="space-y-2">
                    {contentPerformance.content?.slice(0, 5).map((page, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{page.pageTitle}</div>
                          <div className="text-sm text-gray-500">{page.pagePath}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{page.pageViews.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">views</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mb-2">Loading content performance data...</p>
            )}
          </section>

          {/* AI/LLM-Friendly Content Tips */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">AI/LLM-Friendly Content Tips</h2>
            <ul className="list-disc ml-6 text-gray-500">
              <li>Add "AI Summary" or "Key Takeaways" sections to your articles</li>
              <li>Use clear, authoritative language and cite sources</li>
              <li>Publish original research and unique insights</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
} 