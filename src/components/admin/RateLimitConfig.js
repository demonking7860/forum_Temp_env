import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  updateRateLimitConfig, 
  initializeRateLimitConfigs, 
  listRateLimitConfigs 
} from '../../api/graphqlClient';
import './RateLimitConfig.css';

const RateLimitConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    configName: '',
    limit: 10,
    windowMinutes: 5,
    enabled: true,
    description: ''
  });

  // Load configurations on component mount
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      console.log('🔍 Attempting to load rate limit configurations...');
      console.log('🔍 listRateLimitConfigs function:', typeof listRateLimitConfigs);
      const response = await listRateLimitConfigs();
      console.log('🔍 Response received:', response);
      setConfigs(response || []);
    } catch (error) {
      console.error('Failed to load rate limit configurations:', error);
      console.error('Error details:', error.message, error.stack);
      toast.error('Failed to load rate limit configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    setFormData({
      configName: config.configName,
      limit: config.limit,
      windowMinutes: config.windowMinutes,
      enabled: config.enabled,
      description: config.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    setFormData({
      configName: '',
      limit: 10,
      windowMinutes: 5,
      enabled: true,
      description: ''
    });
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const response = await updateRateLimitConfig({
        configName: formData.configName,
        limit: formData.limit,
        windowMinutes: formData.windowMinutes,
        enabled: formData.enabled,
        description: formData.description
      });

      if (response.success) {
        toast.success('Rate limit configuration updated successfully!');
        await loadConfigurations();
        handleCancelEdit();
      } else {
        toast.error(response.message || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setSaving(true);
      const response = await initializeRateLimitConfigs();
      
      if (response.success) {
        toast.success('Default rate limit configurations initialized!');
        await loadConfigurations();
      } else {
        toast.error(response.message || 'Failed to initialize configurations');
      }
    } catch (error) {
      console.error('Failed to initialize configurations:', error);
      toast.error('Failed to initialize configurations');
    } finally {
      setSaving(false);
    }
  };

  const getConfigDisplayName = (configName) => {
    const displayNames = {
      'TICKET_RATE_LIMIT': 'Ticket Creation Rate Limit',
      'MESSAGE_RATE_LIMIT': 'Message Sending Rate Limit'
    };
    return displayNames[configName] || configName;
  };

  const getConfigDescription = (configName) => {
    const descriptions = {
      'TICKET_RATE_LIMIT': 'Controls how many tickets a user can create within a time window',
      'MESSAGE_RATE_LIMIT': 'Controls how many messages a user can send within a time window'
    };
    return descriptions[configName] || 'Rate limiting configuration';
  };

  if (loading) {
    return (
      <div className="rate-limit-config">
        <div className="loading">Loading rate limit configurations...</div>
      </div>
    );
  }

  return (
    <div className="rate-limit-config">
      <div className="config-header">
        <h3>Rate Limiting Configuration</h3>
        <p>Configure rate limits for tickets and messages to prevent abuse.</p>
        
        {configs.length === 0 && (
          <div className="no-configs">
            <p>No rate limit configurations found. Initialize default configurations to get started.</p>
            <button 
              className="button button-primary"
              onClick={handleInitializeDefaults}
              disabled={saving}
            >
              {saving ? 'Initializing...' : 'Initialize Default Configurations'}
            </button>
          </div>
        )}
      </div>

      {configs.length > 0 && (
        <div className="configs-list">
          {configs.map((config) => (
            <div key={config.configName} className="config-item">
              <div className="config-info">
                <h4>{getConfigDisplayName(config.configName)}</h4>
                <p className="config-description">{getConfigDescription(config.configName)}</p>
                <div className="config-details">
                  <span className={`status ${config.enabled ? 'enabled' : 'disabled'}`}>
                    {config.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="limit">
                    {config.limit} per {config.windowMinutes} minutes
                  </span>
                  {config.description && (
                    <span className="description">{config.description}</span>
                  )}
                </div>
              </div>
              <div className="config-actions">
                <button 
                  className="button button-secondary"
                  onClick={() => handleEditConfig(config)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingConfig && (
        <div className="config-modal">
          <div className="modal-content">
            <h4>Edit Rate Limit Configuration</h4>
            
            <div className="form-group">
              <label>Configuration Name</label>
              <input 
                type="text" 
                value={formData.configName} 
                disabled 
                className="disabled-input"
              />
            </div>

            <div className="form-group">
              <label>Limit (number of requests)</label>
              <input 
                type="number" 
                min="1" 
                max="1000"
                value={formData.limit}
                onChange={(e) => setFormData(prev => ({ ...prev, limit: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="form-group">
              <label>Time Window (minutes)</label>
              <input 
                type="number" 
                min="1" 
                max="1440"
                value={formData.windowMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, windowMinutes: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                Enable this rate limit
              </label>
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter a description for this rate limit..."
                rows="3"
              />
            </div>

            <div className="modal-actions">
              <button 
                className="button button-secondary"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="button button-primary"
                onClick={handleSaveConfig}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateLimitConfig;
