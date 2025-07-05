import React, { useState, useEffect } from 'react';
import CampaignReportsComponent from '../components/CampaignReports';
import IdManager from '../components/IdManager';
import AutoDiscovery from '../components/AutoDiscovery';
import api, { setAuthToken, authorizedRequest } from '../services/api';
import { useAuth } from '../services/firebase';

const LOAD_LIMIT_OPTIONS = [10, 20, 30, 40, 50, 75, 100];

const CampaignReports = () => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isAutoDiscoveryOpen, setIsAutoDiscoveryOpen] = useState(false);
  const [campaignIds, setCampaignIds] = useState([]);
  const [maxItems, setMaxItems] = useState(50); // Default to 50
  const { user } = useAuth();

  // Load campaign IDs from backend or localStorage on mount
  useEffect(() => {
    const fetchIds = async () => {
      if (user) {
        const token = await user.getIdToken();
        setAuthToken(token);
        try {
          const res = await authorizedRequest({ method: 'get', url: '/auth/ids' });
          setCampaignIds(res.data.campaignIds || []);
        } catch (err) {
          setCampaignIds([]);
        }
      } else {
        // fallback to localStorage for guests
        const savedIds = localStorage.getItem('campaignIds');
        if (savedIds) {
          setCampaignIds(savedIds.split(',').filter(Boolean));
        }
      }
    };
    fetchIds();
    // eslint-disable-next-line
  }, [user]);

  // Save campaign IDs to backend or localStorage
  const handleSaveCampaigns = async (newCampaignIds) => {
    setCampaignIds(newCampaignIds);
    setIsManagerOpen(false);
    if (user) {
      const token = await user.getIdToken();
      setAuthToken(token);
      try {
        await authorizedRequest({ method: 'post', url: '/auth/ids', data: { campaignIds: newCampaignIds } });
      } catch (err) {
        // Optionally show error
      }
    } else {
      localStorage.setItem('campaignIds', newCampaignIds.join(','));
    }
  };

  // Handle auto-discovery completion
  const handleAutoDiscoveryComplete = async (discoveredData) => {
    // Update the local state with discovered campaign IDs
    setCampaignIds(discoveredData.campaignIds || []);
    setIsAutoDiscoveryOpen(false);
  };

  return (
    <div className="px-2 sm:px-4 md:px-8 max-w-6xl mx-auto w-full space-y-8">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-1">Campaign Reports</h1>
          <p className="text-text-secondary text-sm sm:text-base">View and analyze your campaign performance.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            className="border border-gray-200 rounded-xl px-4 py-2.5 bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
            value={maxItems}
            onChange={e => setMaxItems(Number(e.target.value))}
            style={{ minWidth: 100 }}
          >
            {LOAD_LIMIT_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt} campaigns</option>
            ))}
          </select>
          <button 
            onClick={() => setIsAutoDiscoveryOpen(true)} 
            className="px-4 py-2 font-semibold rounded-lg text-background bg-accent hover:bg-accent-hover transition-colors"
          >
            🚀 Auto-Discover Campaigns
          </button>
          <button
            onClick={() => setIsManagerOpen(true)}
            className="px-6 py-3 font-semibold rounded-lg text-background bg-accent hover:bg-accent-hover transition-colors"
          >
            Manage Campaign IDs
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <CampaignReportsComponent campaignIds={campaignIds.slice(0, maxItems)} />
      </div>

      <IdManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        onSave={handleSaveCampaigns}
        initialIds={campaignIds}
        entityType="campaign"
      />

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

export default CampaignReports; 