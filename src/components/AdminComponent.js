import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import './AdminComponent.css';
import { toast } from 'react-toastify';
import UserManagementPanel from './UserManagementPanel';
import { getConfigValue, setConfigValue } from '../config';
import TicketManagementPanel from "./admin/TicketManagementPanel";
import ErrorBoundary from './ErrorBoundary';
import { 
  listRateLimitConfigs, 
  updateRateLimitConfig, 
  initializeRateLimitConfigs 
} from '../api/graphqlClient';




const ADMIN_API_BASE_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';
const ADMIN_API_KEY_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';
const API_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';

const UNIVERSITY_DATA_API_URL = `${ADMIN_API_BASE_URL}university-table`; 
const UNIVERSITY_API_BASE_URL = `${ADMIN_API_BASE_URL}universities`; 
const SCHOOL_API_BASE_URL = `${ADMIN_API_BASE_URL}school`;

// Static cache to persist data across component unmounts/remounts
let universitiesCache = null;
let schoolsCache = null; // Add cache for schools
let programsCache = null; // Add cache for programs
let facultyCache = null; // Add cache for faculty
let isCacheInitialized = false;

// Function to clear cache - useful for debugging
const clearCache = () => {
  console.log('Clearing cache...');
  universitiesCache = null;
  schoolsCache = null;
  programsCache = null;
  facultyCache = null;
  isCacheInitialized = false;
};

// Make clearCache available globally for debugging


// Lazy load management components
const UniversityManagement = lazy(() => import('./UniversityManagement'));
const SchoolManagement = lazy(() => import('./SchoolManagement'));
const ProgramManagement = lazy(() => import('./ProgramManagement'));
const FacultyManagement = lazy(() => import('./FacultyManagement'));
const DepartmentManagement = lazy(() => import('./DepartmentManagement'));

// Placeholder for Documentation Tab
const DocumentationTab = () => (
  <div className="admin-tab-content">
    <h3>Documentation</h3>
    <p>This section is for documentation.</p>
  </div>
);

// Enhanced Config Tab with feature flag management and rate limiting
const ConfigTab = () => {
  const [config, setConfig] = useState({
    showCountryCode: getConfigValue('SHOW_COUNTRY_CODE'),
    enableSubscriptionButton: getConfigValue('FEATURES.ENABLE_SUBSCRIPTION_BUTTON'),
  });
  const [hasChanges, setHasChanges] = useState(false);
  
  // Rate limiting state
  const [rateLimitConfigs, setRateLimitConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rateLimitChanges, setRateLimitChanges] = useState({});

  useEffect(() => {
    // Check if current values differ from stored values
    const currentShowCountryCode = getConfigValue('SHOW_COUNTRY_CODE');
    const currentEnableSubscription = getConfigValue('FEATURES.ENABLE_SUBSCRIPTION_BUTTON');
    
    const changes = 
      config.showCountryCode !== currentShowCountryCode ||
      config.enableSubscriptionButton !== currentEnableSubscription;
    
    setHasChanges(changes);
  }, [config]);

  // Load rate limit configurations on component mount
  useEffect(() => {
    loadRateLimitConfigs();
  }, []);

  const loadRateLimitConfigs = async () => {
    setLoading(true);
    try {
      const configs = await listRateLimitConfigs();
      setRateLimitConfigs(configs);
    } catch (error) {
      console.error('Failed to load rate limit configurations:', error);
      toast.error('Failed to load rate limit configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleRateLimitChange = (configName, field, value) => {
    setRateLimitChanges(prev => ({
      ...prev,
      [configName]: {
        ...prev[configName],
        [field]: value
      }
    }));
  };

  const handleSaveRateLimitConfig = async (configName) => {
    const changes = rateLimitChanges[configName];
    if (!changes) return;

    try {
      const config = rateLimitConfigs.find(c => c.configName === configName);
      if (!config) return;

      await updateRateLimitConfig({
        configName,
        limit: changes.limit ?? config.limit,
        windowMinutes: changes.windowMinutes ?? config.windowMinutes,
        enabled: changes.enabled ?? config.enabled,
        description: changes.description ?? config.description
      });

      // Update local state
      setRateLimitConfigs(prev => 
        prev.map(c => 
          c.configName === configName 
            ? { ...c, ...changes }
            : c
        )
      );

      // Clear changes for this config
      setRateLimitChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[configName];
        return newChanges;
      });

      toast.success(`Rate limit configuration for ${configName} updated successfully!`);
    } catch (error) {
      console.error('Failed to update rate limit configuration:', error);
      toast.error('Failed to update rate limit configuration');
    }
  };

  const handleInitializeRateLimits = async () => {
    try {
      await initializeRateLimitConfigs();
      await loadRateLimitConfigs();
      toast.success('Default rate limit configurations initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize rate limit configurations:', error);
      toast.error('Failed to initialize rate limit configurations');
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = () => {
    try {
      setConfigValue('SHOW_COUNTRY_CODE', config.showCountryCode);
      setConfigValue('FEATURES.ENABLE_SUBSCRIPTION_BUTTON', config.enableSubscriptionButton);
      
      toast.success('Configuration saved successfully!');
      setHasChanges(false);
      
      // Dispatch custom events for configuration changes
      window.dispatchEvent(new CustomEvent('configChanged', {
        detail: { key: 'SHOW_COUNTRY_CODE', value: config.showCountryCode }
      }));
      window.dispatchEvent(new CustomEvent('configChanged', {
        detail: { key: 'FEATURES.ENABLE_SUBSCRIPTION_BUTTON', value: config.enableSubscriptionButton }
      }));
      
      // Optionally reload the page to apply changes immediately
      if (window.confirm('Configuration saved! Reload the page to apply changes?')) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save configuration. Please try again.');
    }
  };

  const handleResetConfig = () => {
    if (window.confirm('Reset all configuration to default values?')) {
      // Clear localStorage config overrides
      localStorage.removeItem('APP_CONFIG_SHOW_COUNTRY_CODE');
      localStorage.removeItem('APP_CONFIG_FEATURES.ENABLE_SUBSCRIPTION_BUTTON');
      
      // Reset state to default values
      setConfig({
        showCountryCode: false,
        enableSubscriptionButton: false,
      });
      
      // Dispatch custom events for configuration changes
      window.dispatchEvent(new CustomEvent('configChanged', {
        detail: { key: 'SHOW_COUNTRY_CODE', value: false }
      }));
      window.dispatchEvent(new CustomEvent('configChanged', {
        detail: { key: 'FEATURES.ENABLE_SUBSCRIPTION_BUTTON', value: false }
      }));
      
      toast.success('Configuration reset to defaults!');
      
      if (window.confirm('Configuration reset! Reload the page to apply changes?')) {
        window.location.reload();
      }
    }
  };

  return (
    <div className="admin-tab-content">
      <div className="config-section">
        <h3>Application Configuration</h3>
        <p>Manage application settings and feature flags.</p>
        
        <div className="config-groups">
          {/* Display Settings */}
          <div className="config-group">
            <h4>Display Settings</h4>
            <div className="config-item">
              <label className="config-label">
                <input
                  type="checkbox"
                  checked={config.showCountryCode}
                  onChange={(e) => handleConfigChange('showCountryCode', e.target.checked)}
                />
                <span className="config-title">Show Country Codes</span>
                <span className="config-description">
                  Display country short codes (e.g., USA, GBR) next to university names
                </span>
              </label>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="config-group">
            <h4>Feature Flags</h4>
            <div className="config-item">
              <label className="config-label">
                <input
                  type="checkbox"
                  checked={config.enableSubscriptionButton}
                  onChange={(e) => handleConfigChange('enableSubscriptionButton', e.target.checked)}
                />
                <span className="config-title">Enable Subscription Button</span>
                <span className="config-description">
                  Show the subscription button in the user profile dropdown
                </span>
              </label>
            </div>
          </div>

          {/* Rate Limiting Configuration */}
          <div className="config-group">
            <h4>Rate Limiting Configuration</h4>
            <p className="config-description">
              Configure rate limits for tickets and messages to prevent abuse.
            </p>
            
            {loading ? (
              <div className="config-loading">Loading rate limit configurations...</div>
            ) : rateLimitConfigs.length === 0 ? (
              <div className="config-empty">
                <p>No rate limit configurations found. Initialize default configurations to get started.</p>
                <button 
                  className="button button-primary"
                  onClick={handleInitializeRateLimits}
                >
                  Initialize Default Configurations
                </button>
              </div>
            ) : (
              <div className="rate-limit-configs">
                {rateLimitConfigs.map((config) => {
                  const changes = rateLimitChanges[config.configName] || {};
                  const hasChanges = Object.keys(changes).length > 0;
                  
                  return (
                    <div key={config.configName} className="rate-limit-item">
                      <div className="rate-limit-header">
                        <h5>{config.configName.replace(/_/g, ' ')}</h5>
                        <span className={`status-badge ${config.enabled ? 'enabled' : 'disabled'}`}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      
                      <div className="rate-limit-fields">
                        <div className="config-field">
                          <label>Limit</label>
                          <input
                            type="number"
                            min="1"
                            value={changes.limit ?? config.limit}
                            onChange={(e) => handleRateLimitChange(config.configName, 'limit', parseInt(e.target.value))}
                            className="config-input"
                          />
                        </div>
                        
                        <div className="config-field">
                          <label>Window (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            value={changes.windowMinutes ?? config.windowMinutes}
                            onChange={(e) => handleRateLimitChange(config.configName, 'windowMinutes', parseInt(e.target.value))}
                            className="config-input"
                          />
                        </div>
                        
                        <div className="config-field">
                          <label>
                            <input
                              type="checkbox"
                              checked={changes.enabled ?? config.enabled}
                              onChange={(e) => handleRateLimitChange(config.configName, 'enabled', e.target.checked)}
                            />
                            Enable Rate Limiting
                          </label>
                        </div>
                        
                        <div className="config-field">
                          <label>Description</label>
                          <input
                            type="text"
                            value={changes.description ?? config.description}
                            onChange={(e) => handleRateLimitChange(config.configName, 'description', e.target.value)}
                            className="config-input"
                          />
                        </div>
                      </div>
                      
                      {hasChanges && (
                        <div className="rate-limit-actions">
                          <button
                            className="button button-primary button-small"
                            onClick={() => handleSaveRateLimitConfig(config.configName)}
                          >
                            Save Changes
                          </button>
                          <button
                            className="button button-secondary button-small"
                            onClick={() => setRateLimitChanges(prev => {
                              const newChanges = { ...prev };
                              delete newChanges[config.configName];
                              return newChanges;
                            })}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="config-actions">
          <button
            className={`button ${hasChanges ? 'button-primary' : 'button-secondary'}`}
            onClick={handleSaveConfig}
            disabled={!hasChanges}
          >
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleResetConfig}
          >
            Reset to Defaults
          </button>
        </div>

        {/* Current Configuration Display */}
        <div className="config-current">
          <h5>Current Configuration:</h5>
          <pre className="config-display">
            {JSON.stringify({
              SHOW_COUNTRY_CODE: config.showCountryCode,
              FEATURES: {
                ENABLE_SUBSCRIPTION_BUTTON: config.enableSubscriptionButton
              }
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

const AdminComponent = ({ 
  onNavigateBack,
  universitiesData,
  isLoading,
  error,
  onAddUniversity,
  onUpdateUniversity,
  onDeleteUniversity,
}) => {
  const [activeTab, setActiveTab] = useState('universities'); 
  const tempIdCounter = useRef(0);

  const [universities, setUniversities] = useState(universitiesCache || []);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);
  const [universitiesError, setUniversitiesError] = useState(null);

  // Add school state management
  const [schools, setSchools] = useState(schoolsCache || []); // Initialize from cache
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schoolsError, setSchoolsError] = useState(null);

  // Add program state management
  const [programs, setPrograms] = useState(programsCache || []);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [programsError, setProgramsError] = useState(null);

  // Add faculty state management
  const [faculty, setFaculty] = useState([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);
  const [facultyError, setFacultyError] = useState(null);

  // Add department state management
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentsError, setDepartmentsError] = useState(null);

  // Add program view mode state
  const [programViewMode, setProgramViewMode] = useState('simple');

  // Add import results state for visual feedback
  const [importResults, setImportResults] = useState(null);

  // Caching state for ticket messages (same as user side)
  const [ticketCache, setTicketCache] = useState(new Map());
  const [activeRequests, setActiveRequests] = useState(new Set());
  const [refreshKey, setRefreshKey] = useState(0); // For triggering ticket list refresh

  // Fetch universities only if not already cached
  useEffect(() => {
    const fetchUniversitiesIfNeeded = async () => {
      // Force refresh if cache exists but doesn't match new structure
      const shouldForceRefresh = universitiesCache && universitiesCache.length > 0 && 
        (!schoolsCache || schoolsCache.length === 0);
      
      // If cache is already initialized and valid, use cached data
      if (isCacheInitialized && universitiesCache && !shouldForceRefresh) {
        console.log('Using cached university and school data');
        setUniversities(universitiesCache);
        setSchools(schoolsCache || []);
        setPrograms(programsCache || []);
        setFaculty(facultyCache || []);
        return;
      }

      // If cache needs refresh or is not initialized, fetch from API
      console.log('Fetching university and school data from API...');
      setIsLoadingUniversities(true);
      setUniversitiesError(null);
      setIsLoadingSchools(true);
      setSchoolsError(null);
      setIsLoadingPrograms(true);
      setProgramsError(null);
      try {
        const response = await fetch(UNIVERSITY_DATA_API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`University API returned ${data.length} universities`);
        
        const transformedUniversities = [];
        const allSchools = [];
        // Note: allPrograms and allFaculty are no longer populated from university-table

        data.forEach(uni => {
          transformedUniversities.push({
            id: uni.id || uni._id,
            name: uni.university,
            country: uni.country,
            rank: uni.rank ?? null,
            url: uni.university_url,
            top50: uni.top50 !== undefined ? Number(uni.top50) : 0,
            schoolCount: uni.schoolCount,
            programCount: uni.programCount || 0,
          });

          if (uni.schools && Array.isArray(uni.schools)) {
            uni.schools.forEach((schoolDoc) => {
              // New API structure: schoolDoc has _id, name, and programCount
              if (schoolDoc && (schoolDoc._id || schoolDoc.id)) {
                const transformedSchool = {
                  id: schoolDoc._id || schoolDoc.id,
                  name: schoolDoc.name || 'Unknown School',
                  university: uni.university,
                  university_id: uni._id || uni.id,
                  url: schoolDoc.url || '',
                  programCount: schoolDoc.programCount || 0,
                };
                allSchools.push(transformedSchool);
              }
            });
          }
        });
        
        console.log(`Processed ${transformedUniversities.length} universities and ${allSchools.length} schools`);
        console.log(`same school: ${JSON.stringify(allSchools)}`);

        // Cache data and mark as initialized
        universitiesCache = transformedUniversities;
        schoolsCache = allSchools; // Cache schools data
        // Note: programs and faculty are no longer loaded from university-table endpoint
        programsCache = []; // Initialize empty programs cache
        facultyCache = []; // Initialize empty faculty cache
        isCacheInitialized = true;
        setUniversities(transformedUniversities);
        setSchools(allSchools); // Populate schools from the university fetch
        setPrograms([]); // Initialize empty programs array
        setFaculty([]); // Initialize empty faculty array
        
        console.log(`Cached ${transformedUniversities.length} universities and ${allSchools.length} schools. Programs and faculty will be loaded separately if needed.`);

      } catch (e) {
        setUniversitiesError(e.message);
        setSchoolsError(e.message);
        // Don't set program/faculty errors since they're not being loaded from this endpoint
        console.error("Failed to fetch initial data:", e);
      } finally {
        setIsLoadingUniversities(false);
        setIsLoadingSchools(false);
        // Programs and faculty loading states are handled separately
      }
    };

    fetchUniversitiesIfNeeded();
  }, []); // Empty dependency array - only run once when component mounts

const handleAddUniversity = useCallback(async (newUniversityData) => {
  // Accept both a single object or an array of objects
  const universitiesToAdd = Array.isArray(newUniversityData) ? newUniversityData : [newUniversityData];

  for (const newUniversityDataFromForm of universitiesToAdd) {
    console.log(`Starting university add process:`, newUniversityDataFromForm);

    // Validate required fields before proceeding
    if (!newUniversityDataFromForm.name || !newUniversityDataFromForm.country) {
      console.error(`Missing required fields: name="${newUniversityDataFromForm.name}", country="${newUniversityDataFromForm.country}"`);
      toast.error('Error: University Name and Country are required.', 'error');
      continue; // Skip this entry and continue with others
    }

    // Check for duplicates before adding
    const isDuplicate = universities.some(
      uni =>
        String(uni.name).trim().toUpperCase() === String(newUniversityDataFromForm.name).trim().toUpperCase() &&
        String(uni.country).trim().toUpperCase() === String(newUniversityDataFromForm.country).trim().toUpperCase()
    );

    if (isDuplicate) {
      toast.error(`Error: This university "${newUniversityDataFromForm.name}" already exists in "${newUniversityDataFromForm.country}".`, 'error');
      continue; // Skip duplicates
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${tempIdCounter.current++}`;
    const optimisticUniversity = {
      id: tempId,
      name: newUniversityDataFromForm.name.toUpperCase(),
      country: newUniversityDataFromForm.country ? newUniversityDataFromForm.country.toUpperCase() : '',
      url: newUniversityDataFromForm.url || "",
      top50: 0,
      rank: newUniversityDataFromForm.rank || null,
    };

    console.log(`Optimistic university entry created with temp ID: ${tempId}`);
    console.log(`Optimistic entry country: "${optimisticUniversity.country}"`);

    // Optimistically add to client immediately
    setUniversities(prevUniversities => [optimisticUniversity, ...prevUniversities]);

    const payload = {
      university: newUniversityDataFromForm.name?.toUpperCase(),
      university_url: newUniversityDataFromForm.url || "", 
      country: newUniversityDataFromForm.country ? newUniversityDataFromForm.country.toUpperCase() : '',
      top50: 0,
      rank: newUniversityDataFromForm.rank || null, // Include rank if provided
    };

    console.log(`API payload for new university:`, payload);
    console.log(`Payload country field: "${payload.country}"`);

    try {
      const response = await fetch(UNIVERSITY_API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || `Failed to add university. Status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`University add API response:`, result);
      console.log(`Response university object:`, result.university);
      console.log(`Response country field: "${result.university?.country}"`);
      
      if (result.university && (result.university.id || result.university._id)) {
        const addedUniversity = result.university;
        // Replace temp item with final data from server
        const transformedNewUniversity = {
          id: addedUniversity.id || addedUniversity._id,
          name: addedUniversity.university,
          country: addedUniversity.country || newUniversityDataFromForm.country,
          url: addedUniversity.university_url || "",
          top50: Number(addedUniversity.top50) || 0,
          isNew: true, // Flag to keep 'NEW' indicator
        };
        
        setUniversities(prevUniversities => {
          const updated = prevUniversities.map(uni => 
            uni.id === tempId ? transformedNewUniversity : uni
          );
          universitiesCache = updated; // Update cache
          return updated;
        });

        toast.success(result.message || "University added successfully!", 'success');
        
      } else {
        console.error(`University add failed: Invalid server response`, result);
        throw new Error("University data not found in response after add.");
      }
    } catch (error) {
      console.error("University add failed:", error);
      // On error, remove the optimistic entry
      setUniversities(prevUniversities => {
        const updated = prevUniversities.filter(uni => uni.id !== tempId);
        universitiesCache = updated; // Update cache
        return updated;
      });
      toast.error(`Error adding university: ${error.message}`, 'error');
    }
  }
}, []);
  const handleUniversityCellUpdate = useCallback(async (id, frontendKey, newValue) => {
    // Add null/undefined check and ensure value is defined
    const safeValue = newValue ?? '';
    const processedValue = (frontendKey === 'url') ? safeValue : String(safeValue).toUpperCase();
    
    const originalItem = universities.find(u => u.id === id);
    if (!originalItem) {
        console.error(`University update failed: University with ID ${id} not found.`);
        toast.error(`Error: University with ID ${id} not found.`, 'error');
        return;
    }

    // Optimistically update UI
    setUniversities(prev => prev.map(uni => 
      uni.id === id ? { ...uni, [frontendKey]: processedValue } : uni
    ));

    const payload = {
        university: frontendKey === 'name' ? processedValue : String(originalItem.name || "").toUpperCase(),
        university_url: frontendKey === 'url' ? processedValue : (originalItem.url || ""),
        country: frontendKey === 'country' ? processedValue : String(originalItem.country || ""),
        top50: originalItem.top50 !== undefined ? Number(originalItem.top50) : 0,
        rank: frontendKey === 'rank' ? (processedValue === '' ? null : Number(processedValue)) : (originalItem.rank ?? null),
    };

    if (frontendKey === 'country' && (!processedValue || processedValue.trim() === '')) {
        console.error(`Country field cannot be empty`);
        
        toast.error('Error: Country field cannot be empty', 'error');
        setUniversities(prev => prev.map(uni => (uni.id === id ? originalItem : uni)));
        return;
    }

    if (!payload.university) {
        console.error(`Missing required field: university="${payload.university}"`);
        toast.error('Error: University name is required', 'error');
        setUniversities(prev => prev.map(uni => (uni.id === id ? originalItem : uni)));
        return;
    }

    try {
      const response = await fetch(`${UNIVERSITY_API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || `Failed to update university. Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.university && (result.university.id || result.university._id)) {
        const updatedFromServer = result.university;
        const finalUniversityData = {
          id: updatedFromServer.id || updatedFromServer._id,
          name: updatedFromServer.university || originalItem.name,
          country: updatedFromServer.country || payload.country || originalItem.country,
          url: updatedFromServer.university_url || "",
          top50: Number(updatedFromServer.top50) || 0,
          rank: updatedFromServer.rank !== undefined ? Number(updatedFromServer.rank) : originalItem.rank || null,
        };
        
        setUniversities(prev => {
          const updated = prev.map(uni => uni.id === finalUniversityData.id ? finalUniversityData : uni);
          universitiesCache = updated;
          return updated;
        });
        toast.success(result.message || "University updated successfully!", 'success');
      } else {
        throw new Error("Updated university data not found or malformed in response.");
      }
    } catch (error) {
      console.error(`University ${id} update failed:`, error);
      // Revert on failure
      setUniversities(prev => {
        const reverted = prev.map(uni => uni.id === id ? originalItem : uni);
        universitiesCache = reverted;
        return reverted;
      });
      toast.error(`Error updating university: ${error.message}`, 'error');
    }
  }, [universities]);

  const handleDeleteUniversity = useCallback(async (id) => {
    let originalUniversities;
    
    // Optimistically remove from UI
    setUniversities(prev => {
      originalUniversities = prev; // Capture state before filtering
      const updated = prev.filter(uni => uni.id !== id);
      universitiesCache = updated; // Update cache
      return updated;
    });
    
    setIsLoadingUniversities(true);
    setUniversitiesError(null);

    try {
      const response = await fetch(`${UNIVERSITY_API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ university_id: id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || `Failed to delete university. Status: ${response.status}`);
      }
      const result = await response.json(); 
      toast.success(result.message || "University deleted successfully!", 'success');
    } catch (error) {
      console.error("Failed to delete university:", error);
      setUniversities(originalUniversities); // Revert to pre-delete state
      universitiesCache = originalUniversities; // Revert cache
      setUniversitiesError(error.message);
      toast.error(`Error deleting university: ${error.message}`, 'error');
    } finally {
      setIsLoadingUniversities(false);
    }
  }, []);

  // School management handlers
  const handleAddSchool = useCallback(async (newSchoolDataFromForm) => {
    console.log(`Starting school add process:`, newSchoolDataFromForm);
    
    // Validate required fields before proceeding
    if (!newSchoolDataFromForm.name) {
        console.error(`Missing required field: name="${newSchoolDataFromForm.name}"`);
        toast.error('Error: School name is required', 'error');
        return;
    }
    
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${tempIdCounter.current++}`;
    const optimisticSchool = {
      id: tempId,
      name: newSchoolDataFromForm.name?.toUpperCase() || '',
      university: typeof newSchoolDataFromForm.university === 'string'
        ? newSchoolDataFromForm.university.toUpperCase()
        : newSchoolDataFromForm.university?.university?.toUpperCase() || '',
      university_id: newSchoolDataFromForm.university?._id || newSchoolDataFromForm.university_id || '',
      url: newSchoolDataFromForm.url || '',
    };    
    console.log(`Optimistic school entry created with temp ID: ${tempId}`);
console.log(`Optimistic entry university: "${optimisticSchool.university_id}"`);
    // Optimistically add to client immediately
    setSchools(prevSchools => {
      const updatedSchools = [optimisticSchool, ...prevSchools];
      schoolsCache = updatedSchools; // Update cache to persist when navigating
  
      // Optimistically update university cache
      setUniversities(prevUniversities => {
        const updatedUniversities = prevUniversities.map(university => {
            if (university.id === optimisticSchool.university_id) {
                console.log(
                    `Current schoolCount for university ${university.id}: ${university.schoolCount}`
                );
                return {
                    ...university,
                    schoolCount: (university.schoolCount || 0) + 1,
                };
            }
            return university;
        });
        universitiesCache = updatedUniversities;
        return updatedUniversities;
    });
      return updatedSchools;
  });

    // TODO: Replace with actual API call when backend is ready
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful response
      const addedSchool = {
        id: newSchoolDataFromForm.id, // Replace with actual ID from API
        name: newSchoolDataFromForm.name.toUpperCase(),
        university: newSchoolDataFromForm.university ? newSchoolDataFromForm.university.university.toUpperCase() : '',
        url: newSchoolDataFromForm.url || "",
        university_id: newSchoolDataFromForm.university_id,
        isNew: true, // Flag to keep 'NEW' indicator
      };
      
      // Update with real ID
      setSchools(prevSchools => {
        const updatedSchools = prevSchools.map(school => 
          school.id === tempId ? addedSchool : school
        );
        schoolsCache = updatedSchools; // Update cache to persist when navigating
        return updatedSchools;
      });
      
      
    } catch (error) {
      console.error("School add failed:", error);
      setSchools(prevSchools => {
        const updatedSchools = prevSchools.filter(school => school.id !== tempId);
        schoolsCache = updatedSchools; // Update cache to persist when navigating
        return updatedSchools;
      });
      toast.error(`Error adding school: ${error.message}`, 'error');
    }
  }, []);

  const handleSchoolCellUpdate = useCallback(async (id, frontendKey, newValue) => {
    const schoolToUpdate = schools.find(school => school.id === id);

    if (!schoolToUpdate) {
      console.error(`School update failed: School with ID ${id} not found`);
      toast.error(`Error: School with ID ${id} not found.`, 'error');
      return;
    }
    
    // Capitalize non-URL values before processing
    const processedValue = (frontendKey === 'url') ? newValue : newValue.toUpperCase();
    
    console.log(`Starting school update: ID ${id}, field "${frontendKey}", new value "${processedValue}"`);
    
    // Store original for potential rollback
    const originalSchoolItem = { ...schoolToUpdate };

    // Optimistically update client-side table immediately
    let updatedSchoolItemOptimistic = { ...schoolToUpdate, [frontendKey]: processedValue };

    // If university name is changed, find its ID
    if (frontendKey === 'university') {
      const university = universities.find(u => u.name.toUpperCase() === processedValue);
      if (university) {
        updatedSchoolItemOptimistic.university_id = university.id;
      } else {
        toast.error(`Error: University "${processedValue}" not found. Update cancelled.`, 'error');
        setSchools(prev => prev.map(s => (s.id === id ? originalSchoolItem : s)));
        return; // Do not proceed with update
      }
    }

    setSchools(prevSchools => {
        const updatedSchools = prevSchools.map(school =>
            school.id === id ? updatedSchoolItemOptimistic : school
        );
        schoolsCache = updatedSchools; // Update cache to persist when navigating
        return updatedSchools;
    });

    console.log(`Optimistic update applied for school ${id}`);

    // Determine which school field to update based on frontendKey or default to school1
    let schoolFieldToUpdate = 'school1';
    if (frontendKey === 'school2' || frontendKey === 'name2') {
      schoolFieldToUpdate = 'school2';
    } else if (frontendKey === 'school3' || frontendKey === 'name3') {
      schoolFieldToUpdate = 'school3';
    }

    const payload = {
      [schoolFieldToUpdate]: frontendKey === 'name' || frontendKey.startsWith('name') ? updatedSchoolItemOptimistic.name : updatedSchoolItemOptimistic[schoolFieldToUpdate] || updatedSchoolItemOptimistic.name,
      url: updatedSchoolItemOptimistic.url,
      university: updatedSchoolItemOptimistic.university,
      university_id: updatedSchoolItemOptimistic.university_id
    };

    try {
      const response = await fetch(`${SCHOOL_API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || `Failed to update school. Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.school && (result.school.id || result.school._id)) {
        const updatedFromServer = result.school;
        const finalSchoolData = {
          id: updatedFromServer.id || updatedFromServer._id,
          name: updatedFromServer[schoolFieldToUpdate] || updatedFromServer.school1 || payload[schoolFieldToUpdate],
          university: updatedFromServer.university || payload.university,
          university_id: updatedFromServer.university_id || payload.university_id,
          url: updatedFromServer.url || "",
          school1: updatedFromServer.school1 || "",
          school2: updatedFromServer.school2 || "",
          school3: updatedFromServer.school3 || "",
        };
        
        setSchools(prev => {
          const updated = prev.map(s => s.id === finalSchoolData.id ? finalSchoolData : s);
          schoolsCache = updated;
          return updated;
        });
        toast.success(result.message || "School updated successfully!", 'success');
      } else {
        throw new Error("Updated school data not found or malformed in response.");
      }
    } catch (error) {
      console.error(`School ${id} update failed:`, error);
      // Rollback optimistic update
      setSchools(prev => {
        const reverted = prev.map(s => s.id === id ? originalSchoolItem : s);
        schoolsCache = reverted;
        return reverted;
      });
      toast.error(`Error updating school: ${error.message}`, 'error');
    }
  }, [schools, universities]);

  const handleDeleteSchool = useCallback(async (id) => {
    // Find the school to be deleted for potential rollback
    const schoolToDelete = schools.find(school => school.id === id);
    if (!schoolToDelete) {
      toast.error('School not found for deletion.', 'error');
      return;
    }

    // Store original state for rollback
    const originalSchools = [...schools];
    
    // Optimistically remove from UI immediately
    const updatedSchools = schools.filter(school => school.id !== id);
    setSchools(updatedSchools);
    schoolsCache = updatedSchools; // Update cache
    
    // Also optimistically decrement the university's school count
    setUniversities(prevUniversities => {
      const updatedUniversities = prevUniversities.map(university => {
        if (university.id === schoolToDelete.university_id) {
          return {
            ...university,
            schoolCount: Math.max(0, (university.schoolCount || 1) - 1),
          };
        }
        return university;
      });
      universitiesCache = updatedUniversities;
      return updatedUniversities;
    });

    try {
      // Call the backend API to delete the school
      const response = await fetch(`${SCHOOL_API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP error! status: ${response.status}` 
        }));
        throw new Error(errorData.error || `Failed to delete school. Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('School deleted successfully:', result);
      toast.success(result.message || 'School deleted successfully!', 'success');
      
    } catch (error) {
      console.error("Failed to delete school:", error);
      
      // Rollback optimistic updates on failure
      setSchools(originalSchools);
      schoolsCache = originalSchools;
      
      // Rollback university school count
      setUniversities(prevUniversities => {
        const revertedUniversities = prevUniversities.map(university => {
          if (university.id === schoolToDelete.university_id) {
            return {
              ...university,
              schoolCount: (university.schoolCount || 0) + 1,
            };
          }
          return university;
        });
        universitiesCache = revertedUniversities;
        return revertedUniversities;
      });
      
      toast.error(`Error deleting school: ${error.message}`, 'error');
    }
  }, [schools]);

  // Program management handlers (placeholders)
  const handleAddProgram = useCallback((newProgramData) => {
    if (Array.isArray(newProgramData)) {
      // Handle bulk operations (optimistic add and final update)
      setPrograms(prev => {
        let updatedPrograms = [...prev];
        const newOptimisticEntries = [];

        newProgramData.forEach(program => {
          if (program.tempId) {
            // This is a FINALIZATION step - increment count only here
            const index = updatedPrograms.findIndex(p => p.id === program.tempId);
            if (index !== -1) {
              const oldProgram = updatedPrograms[index];
              updatedPrograms[index] = {
                ...oldProgram,
                id: program.id,
                name: program.name,
                school: program.school,
                university: program.university,
                degree: program.degree,
                url: program.url,
                school_id: program.school_id,
                university_id: program.university_id,
                isOptimistic: false,
              };
              // Only increment programCount during finalization (when we get real ID from server)
              setSchools(prevSchools => {
                const updatedSchools = prevSchools.map(school =>
                  school.id === program.school_id
                    ? { ...school, programCount: (school.programCount || 0) + 1 }
                    : school
                );
                schoolsCache = updatedSchools;
                return updatedSchools;
              });
            }
          } else {
            // This is an OPTIMISTIC ADD step - DO NOT increment count here
            newOptimisticEntries.push({
              ...program,
              isNew: true,
              isOptimistic: true,
            });
            // DO NOT increment programCount here - it will be done during finalization
          }
        });

        const final = [...newOptimisticEntries, ...updatedPrograms];
        programsCache = final;
        return final;
      });
    } else {
      // Handle single entry add - only increment if it's a real addition (not optimistic)
      if (newProgramData.school_id && !newProgramData.isOptimistic) {
        setPrograms(prev => [...prev, newProgramData]);
        setSchools(prevSchools => {
          const updatedSchools = prevSchools.map(school =>
            school.id === newProgramData.school_id
              ? { ...school, programCount: (school.programCount || 0) + 1 }
              : school
          );
          schoolsCache = updatedSchools;
          return updatedSchools;
        });
      } else {
        setPrograms(prev => [...prev, newProgramData]);
      }
    }
  }, []);

  // Add new handler to load entire programs array
  const handleLoadPrograms = useCallback((programsArray) => {
    console.log(`Loading ${programsArray.length} programs into AdminComponent state`);
    setPrograms(programsArray);
    programsCache = programsArray;
  }, []);

  const handleProgramCellUpdate = useCallback(async (id, key, value) => {
    console.log(`Looking for program with ID: "${id}"`);
    console.log(`Current programs array contains ${programs.length} programs`);
    console.log(`Program IDs in array:`, programs.map(p => ({ id: p.id, _id: p._id })));
    
    // Check if programs array is empty and provide better error message
    if (programs.length === 0) {
      console.error(`Programs array is empty. Programs data may not be loaded in AdminComponent state.`);
      console.warn(`This update will proceed with API call only, without local state management.`);
      
      // Since we don't have the program in local state, we'll make the API call directly
      // without optimistic updates, but we need to construct the payload differently
      console.log(`Proceeding with direct API update for program ${id}, field: ${key}, value: "${value}"`);
      
      // For school updates, we need to find the school_id
      let schoolId = null;
      if (key === 'school') {
        const newSchool = schools.find(s => s.name.toUpperCase() === value.toUpperCase());
        if (newSchool) {
          schoolId = newSchool.id;
          console.log(`Found school_id ${schoolId} for school "${value}"`);
        } else {
          toast.error(`School "${value}" not found in schools list.`);
          return;
        }
      }
      
      // For school_2 and school_3 updates, validate that the school ID exists
      if (key === 'school_2' || key === 'school_3') {
        const schoolExists = schools.find(s => (s.id === value || s._id === value));
        if (!schoolExists && value) {
          console.warn(`School with ID "${value}" not found in schools data for ${key} update`);
        }
      }
      
      // Create a minimal payload based on the update
      const payload = {
        programs: [{
          _id: id,
          // For school updates, we need to handle this specially
          ...(key === 'school' && { school_1: schoolId }), // Send school ID in school_1 field
          ...(key === 'school_2' && { school_2: value }),
          ...(key === 'school_3' && { school_3: value }),
          ...(key === 'name' && { program: value }),
          ...(key === 'degree' && { degree: value }),
          ...(key === 'url' && { program_url: value }),
          ...(key === 'placement_url' && { placement_url: value }),
          ...(key === 'url_comment' && { url_comment: value }),
          ...(key === 'error_comment' && { error_comment: value }),
          ...(key === 'run_comment' && { comment: value }),
        }]
      };

      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}bulk-program`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Referer': ADMIN_API_KEY_URL,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Direct API update successful:`, result);
        
        // Update local state if we have program data in response
        if (result.programs && result.programs.length > 0) {
          const serverProgram = result.programs[0];
          
          // Resolve school and university names from IDs using our local data
          let resolvedSchoolName = serverProgram.school || '';
          let resolvedUniversityName = serverProgram.university || '';
          let resolvedSchool2Name = '';
          let resolvedSchool3Name = '';
          
          // If school_1 exists, try to resolve the school name
          if (serverProgram.school_1) {
            const foundSchool = schools.find(s => (s.id === serverProgram.school_1) || (s._id === serverProgram.school_1));
            if (foundSchool) {
              resolvedSchoolName = foundSchool.name;
              // Also get university name from the school if not provided by server
              if (!resolvedUniversityName) {
                resolvedUniversityName = foundSchool.university;
              }
            }
          }
          
          // If school_2 exists, try to resolve the school name
          if (serverProgram.school_2) {
            const foundSchool2 = schools.find(s => (s.id === serverProgram.school_2) || (s._id === serverProgram.school_2));
            if (foundSchool2) {
              resolvedSchool2Name = foundSchool2.name;
            }
          }
          
          // If school_3 exists, try to resolve the school name
          if (serverProgram.school_3) {
            const foundSchool3 = schools.find(s => (s.id === serverProgram.school_3) || (s._id === serverProgram.school_3));
            if (foundSchool3) {
              resolvedSchool3Name = foundSchool3.name;
            }
          }
          
          // If university name is still not resolved, try to get it from university_id
          if (!resolvedUniversityName && serverProgram.university_id) {
            const foundUniversity = universities.find(u => (u.id === serverProgram.university_id) || (u._id === serverProgram.university_id));
            if (foundUniversity) {
              resolvedUniversityName = foundUniversity.name;
            }
          }
          
          // Create a complete program object to add to local state
          const updatedProgram = {
            id: serverProgram._id,
            _id: serverProgram._id,
            name: serverProgram.program,
            degree: serverProgram.degree ,
            url: serverProgram.program_url || '',
            placement_url: serverProgram.placement_url || '',
            school_1: serverProgram.school_1,
            school_2: serverProgram.school_2 || '',
            school_3: serverProgram.school_3 || '',
            university_id: serverProgram.university_id,
            school_id: serverProgram.school_id || serverProgram.school_1,
            school: resolvedSchoolName, // Use resolved school name
            university: resolvedUniversityName, // Use resolved university name
            school_1_name: resolvedSchoolName,
            school_2_name: resolvedSchool2Name || serverProgram.school_2_name || '',
            school_3_name: resolvedSchool3Name || serverProgram.school_3_name || '',
            status: serverProgram.status,
            alert_flag: serverProgram.alert_flag || 0,
            error_comment: serverProgram.error_comment || '',
            url_comment: serverProgram.url_comment || '',
            run_comment: serverProgram.comment || '',
          };
          
          // Add this program to local state so future updates work properly
          setPrograms(prev => {
            const existing = prev.find(p => (p.id === id) || (p._id === id));
            if (existing) {
              // Update existing program
              const updated = prev.map(p => ((p.id === id) || (p._id === id)) ? { ...p, ...updatedProgram } : p);
              programsCache = updated;
              return updated;
            } else {
              // Add new program to state
              const updated = [updatedProgram, ...prev];
              programsCache = updated;
              return updated;
            }
          });
        }
        
        toast.success(result.message || "Program updated successfully!");
        
      } catch (error) {
        console.error("Failed to update program via direct API call:", error);
        toast.error(`Update failed: ${error.message}`);
      }
      return;
    }
    
    const originalProgram = programs.find(p => (p.id === id) || (p._id === id));
    if (!originalProgram) {
      console.error(`Program with ID ${id} not found. Available IDs:`, programs.map(p => p.id || p._id));
      toast.error(`Program with ID ${id} not found for update.`);
      return;
    }

    const updatedProgramOptimistic = { ...originalProgram, [key]: value };

    // If school is being updated, find the school_id for the new school
    if (key === 'school') {
      // Handle empty value case
      console.log("hello", key, value);
      if (!value || value.trim() === '') {
        updatedProgramOptimistic.school_id = '';
        updatedProgramOptimistic.school = '';
      } else {
        const newSchool = schools.find(s => s.name.toUpperCase() === value.toUpperCase() && s.university === updatedProgramOptimistic.university);
        if (newSchool) {
          updatedProgramOptimistic.school_id = newSchool.id;
        } else {
          toast.error(`School "${value}" not found for university "${updatedProgramOptimistic.university}".`);
          return;
        }
      }
    }

    // Handle school_2 and school_3 updates - value should already be the school ID from AdminTable
    if (key === 'school_2' || key === 'school_3') {
      // Handle empty value case
      console.log(key, value);
      if (!value || value.trim() === '') {
        updatedProgramOptimistic[key] = '';
        updatedProgramOptimistic[`${key}_name`] = '';
        console.log(`${key} update: clearing school selection`);
      } else {
        // Value is already the school ID, validate it exists
        const schoolExists = schools.find(s => (s.id === value || s._id === value));
        if (!schoolExists && value) {
          console.warn(`School with ID "${value}" not found in schools data for ${key} update`);
        }
        console.log(`${key} update: received value "${value}" ${schoolExists ? '(valid school ID)' : '(invalid or empty)'}`);
      }
    }

    setPrograms(prev => {
      const updated = prev.map(p => (p.id === id ? updatedProgramOptimistic : p));
      programsCache = updated;
      return updated;
    });

    // Log the update for debugging
    console.log(`Updating program ${id}, field: ${key}, value: "${value}"`);
    console.log(`Updated program optimistic:`, updatedProgramOptimistic);

    const payload = {
      programs: [{
        _id: updatedProgramOptimistic.id,
        program: updatedProgramOptimistic.name,
        degree: updatedProgramOptimistic.degree,
        program_url: updatedProgramOptimistic.url,
        placement_url: updatedProgramOptimistic.placement_url || '',
        university_id: updatedProgramOptimistic.university_id,
        // Use school_id when school is being updated, otherwise use existing school_1
        school_1: key === 'school' ? updatedProgramOptimistic.school_id : updatedProgramOptimistic.school_1,
        // For school_2 and school_3, use the value directly as it should be the school ID
        school_2: key === 'school_2' ? value : updatedProgramOptimistic.school_2,
        school_3: key === 'school_3' ? value : updatedProgramOptimistic.school_3,
        comment: updatedProgramOptimistic.run_comment || '',
        url_comment: updatedProgramOptimistic.url_comment || '',
        error_comment: updatedProgramOptimistic.error_comment || '',
        alert_flag: updatedProgramOptimistic.alert_flag || 0,
      }]
    };

    // Log the payload for debugging
    console.log(`API payload:`, payload);

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}bulk-program`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': ADMIN_API_KEY_URL,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      
      // Log the server response for debugging
      console.log(`Server response:`, result);
      
      if (result.programs && result.programs.length > 0) {
        const serverProgram = result.programs[0];
        
        // Resolve school name from school_id using our schools data
        let resolvedSchoolName = serverProgram.school;
        let resolvedUniversityName = serverProgram.university;
        let resolvedSchool2Name = '';
        let resolvedSchool3Name = '';
        
        if (serverProgram.school_id || serverProgram.school_1) {
          const schoolId = serverProgram.school_id || serverProgram.school_1;
          const foundSchool = schools.find(s => (s.id === schoolId) || (s._id === schoolId));
          if (foundSchool) {
            resolvedSchoolName = foundSchool.name;
            // Also get university name from the school if not provided by server
            if (!resolvedUniversityName) {
              resolvedUniversityName = foundSchool.university;
            }
          }
        }
        
        // Resolve school_2 name if it exists
        if (serverProgram.school_2) {
          const foundSchool2 = schools.find(s => (s.id === serverProgram.school_2) || (s._id === serverProgram.school_2));
          if (foundSchool2) {
            resolvedSchool2Name = foundSchool2.name;
          }
        }
        
        // Resolve school_3 name if it exists
        if (serverProgram.school_3) {
          const foundSchool3 = schools.find(s => (s.id === serverProgram.school_3) || (s._id === serverProgram.school_3));
          if (foundSchool3) {
            resolvedSchool3Name = foundSchool3.name;
          }
        }
        
        // If university name is still not resolved, try to get it from university_id
        if (!resolvedUniversityName && serverProgram.university_id) {
          const foundUniversity = universities.find(u => (u.id === serverProgram.university_id) || (u._id === serverProgram.university_id));
          if (foundUniversity) {
            resolvedUniversityName = foundUniversity.name;
          }
        }
        
        const finalProgram = {
          ...originalProgram, // Start with the original program data
          id: serverProgram._id,
          name: serverProgram.program,
          degree: serverProgram.degree,
          url: serverProgram.program_url || '',
          placement_url: serverProgram.placement_url || '',
          school: resolvedSchoolName, // Use resolved school name
          university: resolvedUniversityName, // Use resolved university name
          school_id: serverProgram.school_id || serverProgram.school_1, // Use school_id or fall back to school_1
          university_id: serverProgram.university_id,
          school_1: serverProgram.school_1, // This should be updated with the new school ID
          school_2: serverProgram.school_2,
          school_3: serverProgram.school_3,
          school_1_name: resolvedSchoolName, // Use resolved school name for school_1_name
          school_2_name: resolvedSchool2Name || serverProgram.school_2_name || '',
          school_3_name: resolvedSchool3Name || serverProgram.school_3_name || '',
          url_comment: serverProgram.url_comment || '',
          error_comment: serverProgram.error_comment || 'No error',
          alert_flag: serverProgram.alert_flag || 0,
          status: serverProgram.status,
          scraperTag: serverProgram.scraperTag,
          timeToScrape: serverProgram.timeToScrape || 0,
          run_comment: serverProgram.comment || '',
          scrapingErrorDetails: serverProgram.scrapingErrorDetails || '',
          url_selection_confidence: serverProgram.url_selection_confidence || 0,
          totalPreapprovedPlacements: serverProgram.totalPreapprovedPlacements || 0,
          accepted: serverProgram.approved || "null",
          rejected: serverProgram.rejected || "null",
          manual: serverProgram.manual || "null",
          edited: serverProgram.edited || "null",
          url_selection_reasoning: serverProgram.url_selection_reasoning || '',
        };

        // Log the final program for debugging
        console.log(`Final program after server response:`, finalProgram);

        setPrograms(prev => {
          const updated = prev.map(p => (p.id === finalProgram.id ? finalProgram : p));
          programsCache = updated;
          return updated;
        });
        toast.success(result.message || "Program updated successfully!");
      } else {
        throw new Error("No program data returned from server after update.");
      }

    } catch (error) {
      console.error("Failed to update program:", error);
      toast.error(`Update failed: ${error.message}. Reverting.`);
      setPrograms(prev => {
        const reverted = prev.map(p => (p.id === id ? originalProgram : p));
        programsCache = reverted;
        return reverted;
      });
    }
  }, [programs, schools]);

  const handleDeleteProgram = useCallback((id) => {
    console.log(`Deleting program ${id} (client-side only)`);
    setPrograms(prev => {
      const updated = prev.filter(p => p.id !== id);
      programsCache = updated;
      return updated;
    });
  }, []);

  // Faculty management handlers
  const handleAddFaculty = useCallback((newFacultyData) => {
    if (Array.isArray(newFacultyData)) {
      // Handle bulk operations (optimistic add and final update)
      setFaculty(prev => {
        let updatedFaculty = [...prev];
        const newOptimisticEntries = [];

        newFacultyData.forEach(facultyMember => {
          if (facultyMember.tempId) {
            // This is a FINALIZATION step - increment count only here
            const index = updatedFaculty.findIndex(f => f.id === facultyMember.tempId);
            if (index !== -1) {
              const oldFaculty = updatedFaculty[index];
              updatedFaculty[index] = {
                ...oldFaculty,
                id: facultyMember.id,
                name: facultyMember.name,
                email: facultyMember.email,
                title: facultyMember.title,
                department: facultyMember.department,
                profileUrl: facultyMember.profileUrl,
                school: facultyMember.school,
                university: facultyMember.university,
                school_id: facultyMember.school_id,
                university_id: facultyMember.university_id,
                isOptimistic: false,
              };
              // Only increment facultyCount during finalization (when we get real ID from server)
              setSchools(prevSchools => {
                const updatedSchools = prevSchools.map(school =>
                  school.id === facultyMember.school_id
                    ? { ...school, facultyCount: (school.facultyCount || 0) + 1 }
                    : school
                );
                schoolsCache = updatedSchools;
                return updatedSchools;
              });
            }
          } else {
            // This is an OPTIMISTIC ADD step - DO NOT increment count here
            newOptimisticEntries.push({
              ...facultyMember,
              isNew: true,
              isOptimistic: true,
            });
            // DO NOT increment facultyCount here - it will be done during finalization
          }
        });

        const final = [...newOptimisticEntries, ...updatedFaculty];
        facultyCache = final;
        return final;
      });
    } else {
      // Handle single entry add - only increment if it's a real addition (not optimistic)
      if (newFacultyData.school_id && !newFacultyData.isOptimistic) {
        setFaculty(prev => [...prev, newFacultyData]);
        setSchools(prevSchools => {
          const updatedSchools = prevSchools.map(school =>
            school.id === newFacultyData.school_id
              ? { ...school, facultyCount: (school.facultyCount || 0) + 1 }
              : school
          );
          schoolsCache = updatedSchools;
          return updatedSchools;
        });
      } else {
        setFaculty(prev => [...prev, newFacultyData]);
      }
    }
  }, []);

  const handleFacultyCellUpdate = useCallback(async (id, key, value) => {
    const originalFaculty = faculty.find(f => f.id === id);
    if (!originalFaculty) {
      toast.error(`Faculty member with ID ${id} not found for update.`);
      return;
    }

    const updatedFacultyOptimistic = { ...originalFaculty, [key]: value };

    // If school is being updated, find the school_id for the new school
    if (key === 'school') {
      const newSchool = schools.find(s => s.name.toUpperCase() === value.toUpperCase() && s.university === updatedFacultyOptimistic.university);
      if (newSchool) {
        updatedFacultyOptimistic.school_id = newSchool.id;
      } else {
        toast.error(`School "${value}" not found for university "${updatedFacultyOptimistic.university}".`);
        return;
      }
    }

    setFaculty(prev => {
      const updated = prev.map(f => f.id === id ? updatedFacultyOptimistic : f);
      facultyCache = updated;
      return updated;
    });

    // Log the update for debugging
    console.log(`Updating faculty ${id}, field: ${key}, value: "${value}"`);
    console.log(`Updated faculty optimistic:`, updatedFacultyOptimistic);

    const payload = {
      faculty: [{
        _id: updatedFacultyOptimistic.id,
        name: updatedFacultyOptimistic.name,
        email: updatedFacultyOptimistic.email,
        title: updatedFacultyOptimistic.title || '',
        department: updatedFacultyOptimistic.department || '',
        profile_url: updatedFacultyOptimistic.profileUrl || '',
        university_id: updatedFacultyOptimistic.university_id,
        school_id: updatedFacultyOptimistic.school_id,
      }]
    };

    // Log the payload for debugging
    console.log(`API payload:`, payload);

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}bulk-faculty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': ADMIN_API_KEY_URL,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      
      // Log the server response for debugging
      console.log(`Server response:`, result);
      
      if (result.faculty && result.faculty.length > 0) {
        const serverFaculty = result.faculty[0];
        const finalFaculty = {
          id: serverFaculty._id,
          name: serverFaculty.name,
          email: serverFaculty.email,
          title: serverFaculty.title || '',
          department: serverFaculty.department || '',
          profileUrl: serverFaculty.profile_url || '',
          school: serverFaculty.school,
          university: serverFaculty.university,
          school_id: serverFaculty.school_id,
          university_id: serverFaculty.university_id,
        };

        // Log the final faculty for debugging
        console.log(`Final faculty after server response:`, finalFaculty);

        setFaculty(prev => {
          const updated = prev.map(f => f.id === finalFaculty.id ? finalFaculty : f);
          facultyCache = updated;
          return updated;
        });

        toast.success(result.message || "Faculty updated successfully!", 'success');
      } else {
        throw new Error("Updated faculty data not found in response.");
      }
    } catch (error) {
      console.error(`Faculty ${id} update failed:`, error);
      // Rollback optimistic update
      setFaculty(prev => {
        const reverted = prev.map(f => f.id === id ? originalFaculty : f);
        facultyCache = reverted;
        return reverted;
      });
      toast.error(`Error updating faculty: ${error.message}`, 'error');
    }
  }, [faculty, schools]);

  const handleDeleteFaculty = useCallback((id) => {
    console.log(`Deleting faculty ${id} (client-side only)`);
    setFaculty(prev => {
      const updated = prev.filter(f => f.id !== id);
      facultyCache = updated;
      return updated;
    });
    toast.info("Faculty deleted from local state. API integration needed.");
  }, []);

  // Department handlers
  const handleAddDepartment = useCallback((newDepartmentData) => {
    console.log(`handleAddDepartment called with:`, newDepartmentData);
    
    if (Array.isArray(newDepartmentData)) {
      // Handle bulk operations (optimistic add and finalization)
      setDepartments(prev => {
        console.log(`Current departments before update: ${prev.length}`);
        let updatedDepartments = [...prev];
        const newOptimisticEntries = [];

        newDepartmentData.forEach(department => {
          if (department.tempId) {
            // This is a FINALIZATION step - replace optimistic entry with real database entry
            console.log(`Looking for optimistic department with ID: ${department.tempId}`);
            console.log(`Current departments:`, updatedDepartments.map(d => ({ id: d.id, department: d.department, isOptimistic: d.isOptimistic })));
            
            const index = updatedDepartments.findIndex(d => d.id === department.tempId);
            if (index !== -1) {
              // Replace optimistic entry with finalized one
              console.log(`Found optimistic department at index ${index}, replacing with finalized version`);
              updatedDepartments[index] = {
                ...department,
                isNew: true,
                isOptimistic: false,
              };
              console.log(`Department finalized: ${department.department} (ID: ${department.id}, tempId: ${department.tempId})`);
              
              // Update department count in schools for successful saves
              setSchools(prevSchools => {
                const updatedSchools = prevSchools.map(school =>
                  school.id === department.school_id
                    ? { ...school, departmentCount: (school.departmentCount || 0) + 1 }
                    : school
                );
                schoolsCache = updatedSchools;
                return updatedSchools;
              });
            } else {
              console.warn(`Could not find optimistic department with ID ${department.tempId} to replace`);
              console.log(`Available department IDs:`, updatedDepartments.map(d => d.id));
            }
          } else if (department.isOptimistic) {
            // This is an OPTIMISTIC ADD step - add to beginning of list for visibility
            console.log(`Department optimistically added: ${department.department} (ID: ${department.id})`);
            newOptimisticEntries.push({
              ...department,
              isNew: true,
              isOptimistic: true,
            });
            // DO NOT increment departmentCount here - it will be done during finalization
          } else {
            // This is a regular confirmed add
            console.log(`Department confirmed add: ${department.department} (ID: ${department.id})`);
            newOptimisticEntries.push({
              ...department,
              isNew: true,
              isOptimistic: false,
            });
            
            // Update department count for confirmed adds
            if (department.school_id) {
              setSchools(prevSchools => {
                const updatedSchools = prevSchools.map(school =>
                  school.id === department.school_id
                    ? { ...school, departmentCount: (school.departmentCount || 0) + 1 }
                    : school
                );
                schoolsCache = updatedSchools;
                return updatedSchools;
              });
            }
          }
        });

        // Add new entries to the beginning so they're immediately visible
        const final = [...newOptimisticEntries, ...updatedDepartments];
        console.log(`Total departments after update: ${final.length} (added ${newOptimisticEntries.length} new)`);
        return final;
      });
    } else {
      // Handle single entry add
      console.log(`Single department add: ${newDepartmentData.department || 'Unknown'} (optimistic: ${newDepartmentData.isOptimistic})`);
      
      setDepartments(prev => {
        // Add to beginning for immediate visibility
        const updated = [{ ...newDepartmentData, isNew: true }, ...prev];
        console.log(`Departments updated from ${prev.length} to ${updated.length}`);
        return updated;
      });
      
      // Only increment count if it's a confirmed addition (not optimistic)
      if (newDepartmentData.school_id && !newDepartmentData.isOptimistic) {
        setSchools(prevSchools => {
          const updatedSchools = prevSchools.map(school =>
            school.id === newDepartmentData.school_id
              ? { ...school, departmentCount: (school.departmentCount || 0) + 1 }
              : school
          );
          schoolsCache = updatedSchools;
          return updatedSchools;
        });
      }
    }
  }, []);

  // Add handler to load departments from DepartmentManagement
  const handleLoadDepartments = useCallback((loadedDepartments) => {
    console.log(`Loading ${loadedDepartments.length} departments into AdminComponent state`);
    setDepartments(loadedDepartments);
  }, []);

  const handleDepartmentCellUpdate = useCallback(async (id, key, value) => {
    // Only handle department_name updates for now
    if (key !== 'department') {
      setDepartments(prev => {
        const updated = prev.map(dept => 
          dept.id === id ? { ...dept, [key]: value } : dept
        );
        return updated;
      });
      toast.info("Field updated in local state. API integration needed for this field.");
      return;
    }

    // Store original value for potential rollback
    let originalValue = null;
    setDepartments(prev => {
      const dept = prev.find(d => d.id === id);
      originalValue = dept ? dept[key] : null;
      return prev;
    });

    // Optimistic update
    setDepartments(prev => {
      const updated = prev.map(dept => 
        dept.id === id ? { ...dept, [key]: value } : dept
      );
      console.log('Optimistic update applied:', { id, key, value });
      console.log('Updated departments:', updated.filter(d => d.id === id));
      return updated;
    });

    try {
      // Make API call to update department name
      const response = await fetch(`${API_URL}update-departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department_name: value
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Department updated server response:', result);
      console.log('Response structure:', JSON.stringify(result, null, 2));
      toast.success('Department name updated successfully!');

      // Update with server response to ensure consistency
      setDepartments(prev => {
        console.log('Before server response update, current departments:', prev.filter(d => d.id === id));
        
        const updated = prev.map(dept => 
          dept.id === id ? { 
            ...dept, 
            department: result.department?.department_name || result.department_name || value, // Fallback to original value
            updatedAt: result.department?.updatedAt || result.updatedAt || new Date().toISOString()
          } : dept
        );
        
        console.log('After server response update, updated departments:', updated.filter(d => d.id === id));
        return updated;
      });

    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(`Failed to update department: ${error.message}`);
      
      // Revert optimistic update on failure
      if (originalValue !== null) {
        setDepartments(prev => {
          const updated = prev.map(dept => 
            dept.id === id ? { ...dept, [key]: originalValue } : dept
          );
          return updated;
        });
      }
    }
  }, [API_URL]);

  const handleDeleteDepartment = useCallback((id) => {
    console.log(`handleDeleteDepartment called for ID: ${id}`);
    setDepartments(prev => {
      const departmentToDelete = prev.find(d => d.id === id);
      console.log(`Department to delete:`, departmentToDelete);
      const updated = prev.filter(d => d.id !== id);
      console.log(`Departments after deletion: ${prev.length} -> ${updated.length}`);
      
      // If this was a real department (not optimistic), decrement the school count
      if (departmentToDelete && departmentToDelete.school_id && !departmentToDelete.isOptimistic) {
        console.log(`Decrementing school count for school_id: ${departmentToDelete.school_id}`);
        setSchools(prevSchools => {
          const updatedSchools = prevSchools.map(school =>
            school.id === departmentToDelete.school_id
              ? { ...school, departmentCount: Math.max((school.departmentCount || 0) - 1, 0) }
              : school
          );
          schoolsCache = updatedSchools;
          return updatedSchools;
        });
        toast.info("Department deleted from local state. API integration needed.");
      } else {
        console.log(`Not decrementing school count (optimistic: ${departmentToDelete?.isOptimistic}, school_id: ${departmentToDelete?.school_id})`);
      }
      
      return updated;
    });
  }, []);

  // Handler for receiving import results from management components
  const handleImportResults = useCallback((results) => {
    setImportResults(results);
    
    // Auto-clear results after 30 seconds
    setTimeout(() => {
      setImportResults(null);
    }, 30000);
  }, []);
  
  // Handle tab selection
  const handleTabSelect = useCallback((tabId) => {
    setActiveTab(tabId);
    
    // If selecting programs tab and we don't have program data, fetch some
    if (tabId === 'programs' && (!programs || programs.length === 0)) {
      console.log('Programs tab selected, checking if data needs to be fetched');
      // You could trigger a fetch here if needed
      setIsLoadingPrograms(false);
    }})
      // If we have a default university, fetch its programs
  //     if (universities && universities.length > 0) {
  //       const defaultUniversity = universities[0];
  //       console.log(`Fetching programs for default university: ${defaultUniversity.name}`);
        
  //       // Fetch programs for this university
  //       fetch(`${API_URL}programs/${defaultUniversity.id}`)
  //         .then(response => {
  //           if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  //           return response.json();
  //         })
  //         .then(data => {
  //           const programList = data.programs || data || [];
  //           console.log(`Fetched ${programList.length} programs for ${defaultUniversity.name}`);
            
  //           // Process and set programs
  //           const processedPrograms = programList.map(program => ({
  //             ...program,
  //             id: program._id || program.id,
  //             name: program.program || program.name,
  //           }));
            
  //           setPrograms(processedPrograms);
  //           programsCache = processedPrograms;
  //         })
  //         .catch(error => {
  //           console.error('Error fetching programs:', error);
  //           setProgramsError(`Failed to fetch programs: ${error.message}`);
  //         })
  //         .finally(() => {
  //           setIsLoadingPrograms(false);
  //         });
  //     } else {
  //       // No universities to fetch programs for
  //       setIsLoadingPrograms(false);
  //     }
  //   }
  // }, [API_URL, programs, universities]);

  const tabs = [
    { id: 'universities', label: 'Universities' },
    { id: 'schools', label: 'Schools' },
    { id: 'programs', label: 'Programs' },
    { id: 'department', label: 'Department' },
    { id: "tickets", label: "Tickets" },
    { id: 'userManagement', label: 'User Management' },
    { id: 'documentation', label: 'Documentation' },
    { id: 'config', label: 'Config' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'universities':
        return (
          <UniversityManagement
            universitiesData={universities}
            isLoading={isLoadingUniversities} 
            error={universitiesError} 
            onAddUniversity={handleAddUniversity}
            onUpdateUniversity={handleUniversityCellUpdate}
            onDeleteUniversity={handleDeleteUniversity}
            onImportResults={handleImportResults}
            importResults={importResults}
          />
        );
      case 'schools':
        return (
          <SchoolManagement
            universitiesData={universities}
            schoolsData={schools}
            isLoading={isLoadingSchools}
            error={schoolsError}
            onAddSchool={handleAddSchool}
            onUpdateSchool={handleSchoolCellUpdate}
            onDeleteSchool={handleDeleteSchool}
            importResults={importResults}
          />
        );
      case 'programs':
        return <ProgramManagement
          programsData={programs}
          universitiesData={universities}
          schoolsData={schools}
          isLoading={isLoadingPrograms}
          error={programsError}
          onAddProgram={handleAddProgram}
          onLoadPrograms={handleLoadPrograms}
          onUpdateProgram={handleProgramCellUpdate}
          onDeleteProgram={handleDeleteProgram}
          programViewMode={programViewMode}
          onProgramViewModeChange={setProgramViewMode}
          importResults={importResults}
        />;
      case 'department':
        return <DepartmentManagement
          universitiesData={universities}
          schoolsData={schools}
          departmentData={departments}
          isLoading={isLoadingDepartments}
          error={departmentsError}
          onAddDepartment={handleAddDepartment}
          onUpdateDepartment={handleDepartmentCellUpdate}
          onDeleteDepartment={handleDeleteDepartment}
          onLoadDepartments={handleLoadDepartments}
        />;

      case 'tickets':
        return (
          <ErrorBoundary>
            <TicketManagementPanel
              refreshKey={refreshKey}
              ticketCache={ticketCache}
              setTicketCache={setTicketCache}
              activeRequests={activeRequests}
              setActiveRequests={setActiveRequests}
              onMessageSent={() => {
                // Refresh ticket list when message is sent (like user side)
                setRefreshKey(prev => prev + 1);
              }}
              onStatusChanged={(ticketId, newStatus) => {
                // Refresh ticket list when status changes
                setRefreshKey(prev => prev + 1);
              }}
            />
          </ErrorBoundary>
        );
      case 'userManagement':
        return <UserManagementPanel />;
      case 'documentation':
        return <DocumentationTab />;
      case 'config':
        return <ConfigTab />;
      default:
        return <p>Select a tab</p>;
    }
  };

  return (
    <div className="admin-component-wrapper">
      <div className="admin-floating-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-floating-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="admin-panel-card">
        <Suspense fallback={<div className="loading-indicator card">Loading...</div>}>
          {renderTabContent()}
        </Suspense>
      </div>
    </div>
  );
};
    
export default AdminComponent;
