import React, { useState, useEffect } from 'react';
import api from '../services/api';

const GA4PropertyManager = ({ onPropertyChange }) => {
  const [properties, setProperties] = useState([]);
  const [defaultProperty, setDefaultProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  
  // Form states
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newPropertyLabel, setNewPropertyLabel] = useState('');
  const [editPropertyLabel, setEditPropertyLabel] = useState('');
  
  // Debug states
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/properties');
      setProperties(response.data.properties || []);
      setDefaultProperty(response.data.defaultPropertyId);
      setError(null);
    } catch (err) {
      setError('Failed to load GA4 properties');
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/analytics/properties', {
        propertyId: newPropertyId,
        label: newPropertyLabel || null
      });
      setProperties([...properties, response.data]);
      setNewPropertyId('');
      setNewPropertyLabel('');
      setShowAddModal(false);
      // Always notify parent of the new default property
      if (onPropertyChange) {
        // The backend sets the new property as default if it's the first property
        // Otherwise, fetch the latest default from backend
        const status = await api.get('/analytics/status');
        if (status.data.properties?.defaultProperty) {
          onPropertyChange(status.data.properties.defaultProperty.propertyId);
        } else {
          onPropertyChange(response.data.propertyId);
        }
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to add property');
      console.error('Error adding property:', err);
    }
  };

  const handleUpdateProperty = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/analytics/properties/${editingProperty.propertyId}`, {
        label: editPropertyLabel
      });
      
      setProperties(properties.map(p => 
        p.propertyId === editingProperty.propertyId ? response.data : p
      ));
      setShowEditModal(false);
      setEditingProperty(null);
      setEditPropertyLabel('');
      setError(null);
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to update property');
      console.error('Error updating property:', err);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }
    
    try {
      await api.delete(`/analytics/properties/${propertyId}`);
      setProperties(properties.filter(p => p.propertyId !== propertyId));
      
      // If deleted property was default, notify parent
      if (defaultProperty === propertyId && onPropertyChange) {
        const remainingProperties = properties.filter(p => p.propertyId !== propertyId);
        if (remainingProperties.length > 0) {
          onPropertyChange(remainingProperties[0].propertyId);
        }
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to delete property');
      console.error('Error deleting property:', err);
    }
  };

  const handleSetDefault = async (propertyId) => {
    try {
      await api.post(`/analytics/properties/${propertyId}/default`);
      setDefaultProperty(propertyId);
      
      if (onPropertyChange) {
        onPropertyChange(propertyId);
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to set default property');
      console.error('Error setting default property:', err);
    }
  };

  const openEditModal = (property) => {
    setEditingProperty(property);
    setEditPropertyLabel(property.label);
    setShowEditModal(true);
  };

  const handleDebugOrtto = async (propertyId) => {
    try {
      setDebugLoading(true);
      setShowDebugModal(true);
      setDebugData(null);
      
      const response = await api.get('/analytics/debug-ortto', {
        params: { propertyId }
      });
      
      setDebugData(response.data);
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to debug Ortto data');
      console.error('Error debugging Ortto data:', err);
    } finally {
      setDebugLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">GA4 Properties</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add Property
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No GA4 Properties</h3>
          <p className="text-gray-500 mb-4">Add your first Google Analytics 4 property to get started.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <div
              key={property.propertyId}
              className={`border rounded-lg p-4 ${
                property.propertyId === defaultProperty
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{property.label}</h4>
                    {property.propertyId === defaultProperty && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Property ID: {property.propertyId}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Added: {new Date(property.addedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDebugOrtto(property.propertyId)}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                    title="Debug Ortto data issues"
                  >
                    Debug
                  </button>
                  
                  {property.propertyId !== defaultProperty && (
                    <button
                      onClick={() => handleSetDefault(property.propertyId)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Set Default
                    </button>
                  )}
                  
                  <button
                    onClick={() => openEditModal(property)}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDeleteProperty(property.propertyId)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add GA4 Property</h3>
            
            <form onSubmit={handleAddProperty}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property ID *
                </label>
                <input
                  type="text"
                  value={newPropertyId}
                  onChange={(e) => setNewPropertyId(e.target.value)}
                  placeholder="e.g., 123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find this in Google Analytics Admin → Property settings
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label (Optional)
                </label>
                <input
                  type="text"
                  value={newPropertyLabel}
                  onChange={(e) => setNewPropertyLabel(e.target.value)}
                  placeholder="e.g., Main Website"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Add Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditModal && editingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit GA4 Property</h3>
            
            <form onSubmit={handleUpdateProperty}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property ID
                </label>
                <input
                  type="text"
                  value={editingProperty.propertyId}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Property ID cannot be changed
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={editPropertyLabel}
                  onChange={(e) => setEditPropertyLabel(e.target.value)}
                  placeholder="e.g., Main Website"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Update Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debug Ortto Modal */}
      {showDebugModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Debug Ortto Data Issues</h3>
              <button
                onClick={() => setShowDebugModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {debugLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Analyzing Ortto data...</p>
              </div>
            ) : debugData ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Analysis Summary</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Property ID:</strong> {debugData.debugInfo.propertyId}</p>
                    <p><strong>Date Range:</strong> {debugData.debugInfo.dateRange.startDate} to {debugData.debugInfo.dateRange.endDate}</p>
                    <p><strong>Available Source/Medium Combinations:</strong> {debugData.debugInfo.availableSourceMediums.length}</p>
                    <p><strong>Ortto-Related Combinations:</strong> {debugData.debugInfo.orttoRelatedCombinations.length}</p>
                  </div>
                </div>

                {/* Recommendations */}
                {debugData.debugInfo.recommendations.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Recommendations</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {debugData.debugInfo.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-600 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Available Source/Medium Combinations */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Available Source/Medium Combinations</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {debugData.debugInfo.availableSourceMediums.length > 0 ? (
                      <div className="space-y-2">
                        {debugData.debugInfo.availableSourceMediums.map((combo, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="font-mono bg-white px-2 py-1 rounded border">
                              {combo.sourceMedium}
                            </span>
                            <span className="text-gray-600">
                              {combo.eventCount} events, {combo.sessions} sessions
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No source/medium combinations found</p>
                    )}
                  </div>
                </div>

                {/* Ortto-Related Combinations */}
                {debugData.debugInfo.orttoRelatedCombinations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Ortto-Related Combinations</h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      {debugData.debugInfo.orttoRelatedCombinations.map((combo, index) => (
                        <div key={index} className="flex justify-between items-center text-sm mb-2">
                          <span className="font-mono bg-white px-2 py-1 rounded border text-green-800">
                            {combo.sourceMedium}
                          </span>
                          <span className="text-green-700">
                            {combo.eventCount} events, {combo.sessions} sessions
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Information */}
                {debugData.debugInfo.orttoError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
                    <p className="text-sm text-red-800">{debugData.debugInfo.orttoError}</p>
                  </div>
                )}

                {/* Raw Data (collapsible) */}
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="font-medium text-gray-900 cursor-pointer">Raw Debug Data</summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(debugData.debugInfo, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No debug data available</p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDebugModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GA4PropertyManager; 