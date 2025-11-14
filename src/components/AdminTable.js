import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import CountryDropdown from './CountryDropdown';
import { COUNTRY_CODES } from '../data/countries';
import { getConfigValue } from '../config';
import './AdminTable.css';
import { toast } from 'react-toastify';
import { APP_CONFIG } from '../config';
import { FaEye,FaMinus } from 'react-icons/fa'; // Add this import for the eye icon
import genImage from '../assets/gen.png';
const ADMIN_API_BASE_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';
const ADMIN_API_KEY_URL = process.env.REACT_APP_API_KEY_URL || process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';

// Utility: Debounce function to improve performance
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Optimize: Move these functions outside component to prevent recreation on every render
const renderStatusBadge = (status) => {
  const statusConfig = {
    'URL_EMPTY': { label: 'URL EMPTY', className: 'status-badge status-empty' },
    'URL_EXISTS': { label: 'URL EXISTS', className: 'status-badge status-exists' },
    'SCRAPING_NOW': { label: 'SCRAPING NOW', className: 'status-badge status-exists' },
    'GEMINI SUCCESSFUL': { label: 'GEMINI SUCCESSFUL', className: 'status-badge status-exists' },
    'GEMINI FAILED': { label: 'GEMINI FAILED', className: 'status-badge status-empty' },
    'SELENIUM FAILED': { label: 'SELENIUM FAILED', className: 'status-badge status-empty' }
  };

  const config = statusConfig[status] || { label: 'Unknown', className: 'status-badge status-unknown' };
  
  return (
    <span className={config.className}>
      {config.label}
    </span>
  );
};

const getProgramStatusOptimized = (item, scraping) => {
  // Check placement_url availability for status
  if (
    item.placement_url &&
    item.status?.trim().toLowerCase() === 'gemini-successful'
  ) {
    return 'GEMINI SUCCESSFUL';
  }
  if (
    item.placement_url &&
    item.status?.trim().toLowerCase() === 'gemini-failed(sent to selenium)'
  ) {
    return 'GEMINI FAILED';
  }
  if (
    item.placement_url &&
    item.status?.trim().toLowerCase() === 'gemini-failed,sent to selenium'
  ) {
    return 'GEMINI FAILED';
  }

  if (
    item.placement_url &&
    item.status?.trim().toLowerCase() === 'data-scraping-no-results'
  ) {
    return 'SELENIUM FAILED';
  }

  if (!item.placement_url ||
      item.placement_url.trim() === '' ||
      item.placement_url.trim().toLowerCase() === 'not available' ||
      item.placement_url.trim().toLowerCase() === 'ai could not find' ||
      item.placement_url.trim().toLowerCase() === 'human cant find' ||
      item.placement_url.trim().toLowerCase() === 'n/a') {
    return 'URL_EMPTY';
  } else {
    return (Array.isArray(scraping) && scraping.some(scrapingItem => scrapingItem.id === item.id)) ? 'SCRAPING_NOW' : 'URL_EXISTS';
  }
};

// Memoized Program Status Component to avoid recalculating status
const ProgramStatus = memo(({ item, scraping }) => {
  const status = useMemo(() => getProgramStatusOptimized(item, scraping), [item.placement_url, item.status, scraping]);
  return renderStatusBadge(status);
});

// Memoized Table Row Component
const OptimizedTableRow = memo(({ 
  item, 
  index, 
  type, 
  copiedId, 
  highlightedRowId, 
  handleIdClick, 
  handleDoubleClick, 
  renderCellContent, 
  onDelete, 
  handleDeleteWithConfirmation,
  scraping,
  renderProgramCells,
  highlightType
}) => {
  const isTemporary = String(item.id).startsWith('temp-');
  const isNew = item.isNew === true;
  
  const getHighlightClass = (highlightType) => {
    switch (highlightType) {
      case 'created':
        return 'import-highlight-created';
      case 'updated':
        return 'import-highlight-updated';
      case 'conflict':
        return 'import-highlight-conflict';
      default:
        return '';
    }
  };

  const idCell = (
    <td 
      className={`serial-number-cell ${!isTemporary ? 'clickable-id' : ''}`}
      onClick={() => !isTemporary && handleIdClick(item.id, index + 1)}
      title={isTemporary ? "New Entry" : `Click to copy ID: ${item.id}`}
    >
      {(isTemporary || isNew) ? 
        <span className="new-entry-indicator">NEW</span> : 
        <span className="serial-number">{index + 1}</span>
      }
    </td>
  );

  return (
    <tr 
      key={item.id} 
      className={`
        ${copiedId === index + 1 ? 'copied-row' : ''}
        ${highlightedRowId === item.id ? 'newly-added-row' : ''}
        ${isTemporary ? 'temporary-row' : ''}
        ${item.isOptimistic ? 'optimistic-row' : ''}
        ${type === 'program' ? 'program-clickable-row' : ''}
        ${getHighlightClass(highlightType)}
      `.trim()}
    >
      {type === 'university' && (
        <>
          {idCell}
          <td className="university-column" onDoubleClick={() => handleDoubleClick(item, 'name')}>
            {renderCellContent(item, 'name')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'country')}>
            {renderCellContent(item, 'country')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'url')}>
            {renderCellContent(item, 'url')}
          </td>
          <td className="total-column">
            {item.schoolCount ?? 0}
          </td>
          <td className="hide-on-form-visible rank-column" onDoubleClick={() => handleDoubleClick(item, 'rank')}>
            {renderCellContent(item, 'rank')}
          </td>
          <td className="actions-column-cell actions-column" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            <button
              className="delete-button"
              onClick={() => handleDeleteWithConfirmation(item, type)}
              title="Delete university"
              aria-label="Delete university"
              style={{
                background: '#f8d7da',
                color: '#d1465f',
                border: '2px solid #f5c2c7',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '4px'
              }}
            >
              -
            </button>
          </td>
        </>
      )}
      {type === 'school' && (
        <>
          {idCell}
          <td onDoubleClick={() => handleDoubleClick(item, 'university')}>
            {renderCellContent(item, 'university')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'name')}>
            {renderCellContent(item, 'name')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'url')}>
            {renderCellContent(item, 'url')}
          </td>
          <td className="total-column">
            {item.programCount ?? 0}
          </td>
          <td className="actions-column-cell actions-column" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            <button
              className="delete-button"
              onClick={() => handleDeleteWithConfirmation(item, type)}
              title="Delete school"
              aria-label="Delete school"
              style={{
                background: '#f8d7da',
                color: '#d1465f',
                border: '2px solid #f5c2c7',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                margin: '0 auto',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f1aeb5';
                e.target.style.borderColor = '#ea868f';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8d7da';
                e.target.style.borderColor = '#f5c2c7';
              }}
            >
              −
            </button>
          </td>
        </>
      )}
      {type === 'department' && (
        <>
          {idCell}
          <td onDoubleClick={() => handleDoubleClick(item, 'university')}>
            {renderCellContent(item, 'university')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'school')}>
            {renderCellContent(item, 'school')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'department')}>
            {renderCellContent(item, 'department')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'status')}>
            {renderCellContent(item, 'status')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'count')}>
            {renderCellContent(item, 'count')}
          </td>
          <td className="actions-column-cell actions-column" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            <a
              className="eye-icon-button"
              href={`/admin/department-view/${item.id}`}
              title="View department details"
              aria-label="View department details"
              tabIndex={0}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <FaEye />
            </a>
            <button
              className="delete-button"
              onClick={() => handleDeleteWithConfirmation(item, type)}
              title="Delete department"
              aria-label="Delete department"
              style={{
                background: '#f8d7da',
                color: '#d1465f',
                border: '2px solid #f5c2c7',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                margin: '0 auto',
                marginLeft: '8px',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f1aeb5';
                e.target.style.borderColor = '#ea868f';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8d7da';
                e.target.style.borderColor = '#f5c2c7';
              }}
            >
              −
            </button>
          </td>
        </>
      )}
      {type === 'program' && (
        <>
          {idCell}
          <td>
            <ProgramStatus item={item} scraping={scraping} />
          </td>
          <td className="actions-column-cell actions-column" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            <a
              className="eye-icon-button"
              href={`/admin/program-view/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View details"
              aria-label="View details"
              tabIndex={0}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <FaEye />
            </a>
            <button
              className="delete-button"
              title="Delete program"
              aria-label="Delete program"
              style={{
                background: '#f8d7da',
                color: '#d1465f',
                border: '2px solid #f5c2c7',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                margin: '0 auto',
                marginLeft: '8px',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f1aeb5';
                e.target.style.borderColor = '#ea868f';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8d7da';
                e.target.style.borderColor = '#f5c2c7';
              }}
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
                  try {
                    const response = await fetch(`${ADMIN_API_BASE_URL}delete-program/${item.id}`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        Referer: ADMIN_API_KEY_URL,
                      },
                    });
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                      throw new Error(errorData.error || `API Error: ${response.status}`);
                    }
                    toast.success('Program deleted successfully.');
                    if (onDelete) onDelete(item.id);
                  } catch (error) {
                    toast.error(`Failed to delete program: ${error.message}`);
                  }
                }
              }}
            >
                <FaMinus size={16} />
            </button>
          </td>
          {renderProgramCells(item, false, false)}
        </>
      )}
      {type === 'faculty' && (
        <>
          {idCell}
          <td onDoubleClick={() => handleDoubleClick(item, 'name')}>
            {renderCellContent(item, 'name')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'title')}>
            {renderCellContent(item, 'title')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'bachelor')} style={{ maxWidth: '250px', wordWrap: 'break-word' }}>
            {renderCellContent(item, 'bachelor')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'master')} style={{ maxWidth: '250px', wordWrap: 'break-word' }}>
            {renderCellContent(item, 'master')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'phd')} style={{ maxWidth: '250px', wordWrap: 'break-word' }}>
            {renderCellContent(item, 'phd')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'email')}>
            {renderCellContent(item, 'email')}
          </td>
          <td onDoubleClick={() => handleDoubleClick(item, 'source_url')}>
            {item.source_url ? (
              <a 
                href={item.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="faculty-link"
                style={{ color: '#007bff', textDecoration: 'none' }}
              >
                View Profile
              </a>
            ) : (
              renderCellContent(item, 'source_url')
            )}
          </td>
          <td className="actions-column-cell actions-column" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            <button
              className="delete-button"
              onClick={() => handleDeleteWithConfirmation(item, type)}
              title="Delete faculty"
              aria-label="Delete faculty"
              style={{
                background: '#f8d7da',
                color: '#d1465f',
                border: '2px solid #f5c2c7',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                margin: '0 auto',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f1aeb5';
                e.target.style.borderColor = '#ea868f';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8d7da';
                e.target.style.borderColor = '#f5c2c7';
              }}
            >
              −
            </button>
          </td>
        </>
      )}
    </tr>
  );
});

const AdminTable = ({
  scraping,
  data, type, onDelete, onCellUpdate, onAddEntry, showInlineAddForm, universitiesData,onKeyDown,
  schoolsData,
  // New props for multi-add
  newEntriesData, onNewEntryChange, onRemoveNewEntry, onInsertRow,
  // New props for sorting
  sortConfig, onSort,
  // Program view mode prop
  programViewMode = 'simple',
  degreeOptions, // <-- add this prop
  // Import results for highlighting
  importResults
}) => {
  const navigate = useNavigate();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [highlightedRowId, setHighlightedRowId] = useState(null); // Track highlighted row
  const [isGeneratingInfo, setIsGeneratingInfo] = useState(false); // New state for loading
  const [stagedEntries, setStagedEntries] = useState([]); // State for AI-generated staged entries
  const [isSubmittingStaged, setIsSubmittingStaged] = useState(false);
  const stagedIdCounter = useRef(0);
  const queryClient = useQueryClient();
  // Remove internal view mode state - now using prop
  const [showFullProgramView, setShowFullProgramView] = useState(false);
  
  // State to track config changes and force re-render when config changes
  const [showCountryCode, setShowCountryCode] = useState(() => getConfigValue('SHOW_COUNTRY_CODE'));
  
  // Function to determine row highlight type based on import results
  const getRowHighlightType = useCallback((item) => {
    if (!importResults) return null;
    
    const itemId = item.id || item._id;
    
    // Check for university highlights
    if (type === 'university' && importResults.university) {
      if (importResults.university.id === itemId || importResults.university._id === itemId) {
        return importResults.university.isNew ? 'created' : 'updated';
      }
    }
    
    // Check for school highlights
    if (type === 'school' && importResults.schools) {
      // Check created schools
      if (importResults.schools.created?.some(school => 
        school.id === itemId || school._id === itemId
      )) {
        return 'created';
      }
      
      // Check updated schools
      if (importResults.schools.updated?.some(school => 
        school.id === itemId || school._id === itemId
      )) {
        return 'updated';
      }
    }
    
    // Check for program highlights
    if (type === 'program' && importResults.programs) {
      // Check created programs
      if (importResults.programs.created?.some(program => 
        program.id === itemId || program._id === itemId
      )) {
        return 'created';
      }
      
      // Check updated programs
      if (importResults.programs.updated?.some(program => 
        program.id === itemId || program._id === itemId
      )) {
        return 'updated';
      }
      
      // Check conflicting programs
      if (importResults.conflicting_programs?.some(program => 
        program.id === itemId || program._id === itemId
      )) {
        return 'conflict';
      }
    }
    
    return null;
  }, [importResults, type]);
  
  // CSS classes for different highlight types
  const getHighlightClass = (highlightType) => {
    switch (highlightType) {
      case 'created':
        return 'import-highlight-created';
      case 'updated':
        return 'import-highlight-updated';
      case 'conflict':
        return 'import-highlight-conflict';
      default:
        return '';
    }
  };
  
  // Effect to listen for config changes via storage events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'APP_CONFIG_SHOW_COUNTRY_CODE') {
        try {
          const newValue = JSON.parse(e.newValue);
          setShowCountryCode(newValue);
        } catch (error) {
          console.warn('Failed to parse new SHOW_COUNTRY_CODE value:', error);
        }
      }
    };

    // Listen for localStorage changes from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    // For same-tab changes, we'll dispatch a custom event when config is saved
    const handleConfigChange = (e) => {
      if (e.detail && e.detail.key === 'SHOW_COUNTRY_CODE') {
        setShowCountryCode(e.detail.value);
      }
    };
    
    window.addEventListener('configChanged', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('configChanged', handleConfigChange);
    };
  }, []);
  
  // Predefined placement URL options for select dropdowns
  const [placementUrlOptions, setPlacementUrlOptions] = useState([
    { value: 'AI could not find', label: 'AI could not find' },
    { value: 'Human cant find', label: 'Human cant find' },
  ]);
   const universityMap = useMemo(() => {
    if (!universitiesData) return new Map();
    return new Map(universitiesData.map(u => [u.name, u]));
  }, [universitiesData]);

  const getFormattedUniversityName = useCallback((name, country) => {
    if (!name) return '';
    if (!showCountryCode || !country) {
      return name;
    }
    const code = COUNTRY_CODES[country.toUpperCase()];
    return code ? `${name} (${code})` : name;
  }, [showCountryCode]);


  const initialNewEntryData = type === 'university'
    ? {} // No longer used for university
    : type === 'school'
    ? { name: '', university: '', url: '' }
    : type === 'department'
    ? { university: '', school: '', department: '' }
    : { name: '', url: '', university: '', school: '', degree: 'PhD' };
  const [newEntryData, setNewEntryData] = useState(initialNewEntryData);

  const universitySelectStyles = {
    menu: provided => ({
      ...provided,
      width: 350, // Increase width of the dropdown menu
    }),
    menuPortal: base => ({
      ...base,
      zIndex: 9999, // Ensure dropdown appears above other elements
    }),
  };

  // Reset form if it's hidden by parent
  
  const getSortedData = (data, sortConfig) => {
    if (!sortConfig?.key) return data;
    // Numeric sort for programCount and schoolCount
    const numericKeys = ['programCount', 'schoolCount', 'rank', 'totalPreapprovedPlacements', 'accepted', 'rejected', 'edited', 'manual', 'url_selection_confidence', 'count'];
    const key = sortConfig.key;
    const direction = sortConfig.direction === 'ascending' ? 1 : -1;
    return [...data].sort((a, b) => {
      if (numericKeys.includes(key)) {
      const aVal = a[key] != null ? Number(a[key]) : 9999;
      const bVal = b[key] != null ? Number(b[key]) : 9999;
        return (aVal - bVal) * direction;
      }
      // Default string sort
      const aVal = (a[key] ?? '').toString().toLowerCase();
      const bVal = (b[key] ?? '').toString().toLowerCase();
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
  };
  // Header definitions for different table types and view modes
  const universityHeaders = ['ID', 'University Name', 'Country', 'University URL', 'School Count', 'Rank', 'Actions'];
  const programHeaders = [
    'ID',
    'Status',
    'Actions',
    'University',
    'Degree',
    'School',
    'Program Name',
    'Total'
  ];
  const programHeadersFull = [
    'ID',
    'Status',
    'Actions',
    'University',
    'School 1',
    'Program Name',
    'Degree',
    'Error',
    'Program URL',
    'Placement URL',
    'Run comment',
    'Error Comment',
    'Url Comment',
    'Scraper',
    'Confidence',
    'Scraper Comment',
    'Scraper Time',
    'Total',
    'Accepted',
    'Rejected',
    'Edited',
    'Manual',
    'School 2',
    'School 3'
  ];
  const programHeadersProgramInfo = [
    'ID',
    'Status',
    'Actions',
    'University',
    'School',
    'Program Name',
    'Degree',
    'Program URL',
    'Placement URL',
    'Run Comment',
    'Error Comment',
    'Url Comment',
    'Scraper',
    'Url Confidence',
  
    'Total'
  ];
  const programHeadersPlacementInfo = [
    'ID',
    'Status',
    'Actions',
    'University',
    'School',
    'Program Name',
    'Degree',
    'Total',
    'Accepted',
    'Rejected',
    'Edited',
    'Manual'
  ];
  const programHeadersScraperInfo = [
    'ID',
    'Status',
    'Actions',
    'University',
    'School',
    'Program Name',
    'Degree',
    'Error',
    'Scraper Summary',
    'Error Comment',
    'Scraper',
    'Scraper Comment',
    
    'Scraper Time',
    'Confidence',
    'Total'
  ];
  const schoolHeaders = ['ID', 'University', 'School Name', 'School URL', 'Program Count', 'Actions']; // Add Program Count column
  const departmentHeaders = ['ID', 'University', 'School', 'Department', 'Status', 'Count', 'Actions'];
  const facultyHeaders = ['ID', 'Name', 'Title', 'Bachelor\'s', 'Master\'s', 'PhD', 'Email', 'Profile URL', 'Actions'];

  const getHeadersForViewMode = () => {
    if (type !== 'program') {
      return type === 'university' ? universityHeaders : 
             type === 'school' ? schoolHeaders : 
             type === 'faculty' ? facultyHeaders : departmentHeaders;
    }
    switch (programViewMode) {
      case 'all':
        return [...programHeadersFull];
      case 'programInfo':
        return [...programHeadersProgramInfo];
      case 'placementInfo':
        return [...programHeadersPlacementInfo];
      case 'scraperInfo':
        return [...programHeadersScraperInfo];
      default:
        return [...programHeaders];
    }
  };

  const headers = getHeadersForViewMode();

  // Memoized sorted data - only recalculates when data or sortConfig changes
  const tableData = useMemo(() => {
    return getSortedData(data, sortConfig);
  }, [data, sortConfig]);

  // Memoized university options for dropdowns
  const universityOptions = useMemo(() => {
    return (universitiesData || []).map(uni => ({ 
      value: uni.name, 
      label: getFormattedUniversityName(uni.name, uni.country) 
    }));
  }, [universitiesData, getFormattedUniversityName]);

  // Memoized school options for dropdowns  
  const schoolOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select School --' },
      ...(schoolsData || []).map(school => ({ 
        value: school.name, 
        label: school.name 
      }))
    ];
  }, [schoolsData]);

  // Memoized function to get filtered schools for a university
  const getFilteredSchools = useCallback((universityName) => {
    return [
      { value: '', label: '-- Select School --' },
      ...(schoolsData || [])
        .filter(school => school.university === universityName)
        .map(school => ({ value: school.name, label: school.name }))
    ];
  }, [schoolsData]);

  // Column visibility state for performance (show fewer columns by default)
  // Use useMemo to make visibleColumns reactive to headers changes
  const visibleColumns = useMemo(() => ({
    simple: programHeaders,
    all: programHeadersFull,
    programInfo: programHeadersProgramInfo,
    placementInfo: programHeadersPlacementInfo,
    scraperInfo: programHeadersScraperInfo
  }), []);

  // Memoized visible headers based on view mode
  const visibleHeaders = useMemo(() => {
    if (type !== 'program') return headers;
    return visibleColumns[programViewMode] || headers;
  }, [programViewMode, visibleColumns, headers, type]);

  // Debounced handlers for better performance
  const debouncedHandleDoubleClick = useCallback(
    debounce((item, key) => {
      handleDoubleClick(item, key);
    }, 100),
    []
  );

  const debouncedOnCellUpdate = useCallback(
    debounce((id, key, value) => {
      onCellUpdate(id, key, value);
    }, 300),
    [onCellUpdate]
  );


  if (!data) {
    return <p>No data available or data is loading.</p>;
  }

  // Function to copy ID to clipboard
  const handleIdClick = async (realId, serialNumber) => {
    if (!realId) return;
    try {
      await navigator.clipboard.writeText(realId);
      setCopiedId(serialNumber);
      toast.success(`ID "${realId}" copied to clipboard.`);
      // Clear the copied indicator after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy ID.');
    }
  };

  // Function to handle delete with confirmation
  const handleDeleteWithConfirmation = (item, type) => {
    let itemName = '';
    let confirmMessage = '';
    
    // Generate appropriate confirmation message based on item type and data
    if (type === 'university') {
      itemName = item.name || 'Unnamed University';
      const country = item.country ? ` in ${item.country}` : '';
      confirmMessage = `Are you sure you want to delete the university "${itemName}"${country}?`;
    } else if (type === 'school') {
      itemName = item.name || 'Unnamed School';
      const university = item.university ? ` at ${item.university}` : '';
      confirmMessage = `Are you sure you want to delete the school "${itemName}"${university}?`;
    } else if (type === 'program') {
      itemName = item.name || 'Unnamed Program';
      const school = item.school ? ` from ${item.school}` : '';
      const university = item.university ? ` at ${item.university}` : '';
      confirmMessage = `Are you sure you want to delete the program "${itemName}"${school}${university}?`;
    } else if (type === 'department') {
      itemName = item.department || 'Unnamed Department';
      const school = item.school ? ` from ${item.school}` : '';
      const university = item.university ? ` at ${item.university}` : '';
      confirmMessage = `Are you sure you want to delete department "${itemName}"${school}${university}?`;
    } else {
      // Generic confirmation for unknown types
      confirmMessage = `Are you sure you want to delete this ${type}?`;
    }
    
    confirmMessage += '\n\nThis action cannot be undone.';
    
    // Show confirmation dialog
    if (window.confirm(confirmMessage)) {
      // User confirmed, proceed with deletion
      if (onDelete) {
        onDelete(item.id);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} "${itemName}" has been deleted.`);
      }
    }
  };

  // Function to handle staged entry removal with confirmation
  const handleRemoveStagedEntryWithConfirmation = (entry, index, entryType) => {
    let itemName = '';
    let confirmMessage = '';
    
    if (entryType === 'school') {
      itemName = entry.name || 'Unnamed School';
      const university = entry.university ? ` at ${entry.university}` : '';
      confirmMessage = `Are you sure you want to remove the staged school "${itemName}"${university}?`;
    } else if (entryType === 'program') {
      itemName = entry.name || 'Unnamed Program';
      const school = entry.school ? ` from ${entry.school}` : '';
      const university = entry.university ? ` at ${entry.university}` : '';
      confirmMessage = `Are you sure you want to remove the staged program "${itemName}"${school}${university}?`;
    } else if (entryType === 'department') {
      itemName = entry.department || 'Unnamed Department';
      const school = entry.school ? ` from ${entry.school}` : '';
      const university = entry.university ? ` at ${entry.university}` : '';
      confirmMessage = `Are you sure you want to remove the staged department "${itemName}"${school}${university}?`;
    } else {
      confirmMessage = `Are you sure you want to remove this staged ${entryType}?`;
    }
    
    // Show confirmation dialog
    if (window.confirm(confirmMessage)) {
      // User confirmed, proceed with removal
      handleRemoveStagedEntry(index);
      toast.info(`Staged ${entryType} "${itemName}" has been removed.`);
    }
  };

  // Function to handle new entry removal with confirmation
  const handleRemoveNewEntryWithConfirmation = (index) => {
    if (window.confirm('Are you sure you want to remove this new entry?')) {
      onRemoveNewEntry(index);
      toast.info('New entry has been removed.');
    }
  };

  // *** START: NEW "programView" MODE LOGIC ***
  // This block handles the new view mode specifically for placement data.
  // It is self-contained to avoid interfering with existing logic.
  if (type === 'program' && programViewMode === 'programView') {
    const programViewHeaders = [
      'ID', 'Name', 'Date', 'Role', 'Institution',
      'Degree', 'Discipline', 'Program', 'Approval', 'Submit', 'State', 'Source', 'Comment'
    ];

    // Map header to data key
    const headerKeyMap = {
      'ID': '_id',
      'Name': 'name',
      'Date': 'date',
      'Role': 'role',
      'Institution': 'institution',
      'Degree': 'degree',
      'Discipline': 'discipline',
      'Program': 'program',
      'Approval': 'approval',
      'Submit': 'submit',
      'State': 'state',
      'Source':'Source',
      'Comment': 'source_comment'
    };

    // Only allow editing for these fields
    const editableProgramViewKeys = [
      'name', 'date', 'role', 'institution', 'degree', 'discipline', 'program', 'approval', 'submit', 'state', 'Source', 'source_comment'
    ];

    // Handler for double click in programView mode
    const handleProgramViewDoubleClick = (item, key) => {
      if (!editableProgramViewKeys.includes(key)) return;
      setEditingCell({ id: item._id, key });
      setEditValue(item[key] ?? '');
      console.log(`Double-click on programView item ${item._id}, field "${key}", current value: "${item[key]}"`);
      console.log(`Editing cell set to:`, { id: item._id, key });
      console.log(`Edit value set to: "${item[key] ?? ''}"`);
      handleProgramViewSave(item);
    };
    // Handler for saving in programView mode
    const handleProgramViewSave = (item) => {
      if (editingCell && editingCell.id === item._id) {
        const key = editingCell.key;
        const originalValue = item[key];
        if (originalValue === editValue) {
          setEditingCell(null);
          return;
        }
        if (onCellUpdate) {
          onCellUpdate(item._id, key, editValue);
        }
        setEditingCell(null);
      }
    };

    // Handler for input change in programView mode
    const handleProgramViewChange = (e) => {
      setEditValue(e.target.value);
    };

    // Handler for keydown in programView mode
    const handleProgramViewKeyDown = (e, item) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleProgramViewSave(item);
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
      }
    };

    return (
      <div className="admin-table-container" style={{ overflowX: 'auto' }}>
        <table className="admin-table admin-table-program-view">
          <thead>
            <tr>
              {programViewHeaders.map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data && data.map((item, index) => (
              <tr key={item._id || index} className={copiedId === index + 1 ? 'copied-row' : ''}>
                {programViewHeaders.map(header => {
                  const key = headerKeyMap[header];
                  const value = item[key] ?? '';
                  // Placement ID cell: allow copy on click
                  if (header === 'ID') {
                    return (
                      <td
                        key={header}
                        className="serial-number-cell clickable-id"
                        onClick={() => handleIdClick(item._id, index + 1)}
                        title={`Click to copy ID: ${item._id}`}
                      >
                        <span className="serial-number">{copiedId === index + 1 ? 'Copied!' : index + 1}</span>
                      </td>
                    );
                  }
                  // Editable cells
                  if (editableProgramViewKeys.includes(key)) {
                    if (editingCell && editingCell.id === item._id && editingCell.key === key) {
                      return (
                        <td key={header}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleProgramViewChange}
                            onBlur={() => handleProgramViewSave(item)}
                            onKeyDown={e => handleProgramViewKeyDown(e, item)}
                            autoFocus
                            className="inline-edit-input"
                          />
                        </td>
                      );
                    }
                    return (
                      <td
                        key={header}
                        onDoubleClick={() => handleProgramViewDoubleClick(item, key)}
                        style={{ cursor: 'pointer' }}
                        title="Double click to edit"
                      >
                        {value}
                      </td>
                    );
                  }
                  // Non-editable cells
                  return <td key={header}>{value}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // *** END: NEW "programView" MODE LOGIC ***


  // --- All existing logic continues below ---

  const sortableColumns = {
    university: {
      'University Name': 'name',
      'Country': 'country',
      'School Count': 'schoolCount',
      'Rank': 'rank',
      'University URL': 'url',
    },
    school: {
      'University': 'university',
      'School Name': 'name',
      'School URL': 'url',
      'Program Count': 'programCount',
    },
    program: {
      'University': 'university',
      'School': 'school',
      'Program Name': 'name',
      'Degree': 'degree',
      'Program URL': 'url',
      'Placement URL': 'placement_url',
      'Comment': 'comment',
      'Url Comment': 'url_comment',
      'Scraper': 'scraperTag',
      'Url Confidence': 'url_selection_confidence',
      'Scraper Comment': 'scrapingErrorDetails',
      'Scraper Time': 'timeToScrape',
      'Total': 'totalPreapprovedPlacements',
      'Accepted': 'accepted',
      'Rejected': 'rejected',
      'Edited': 'edited',
      'Manual': 'manual',
    },
    department: {
      'University': 'university',
      'School': 'school',
      'Department': 'department',
      'Status': 'status',
      'Count': 'count',
    },
    faculty: {
      'Name': 'name',
      'Education': 'education',
      'Source URL': 'profileUrl',
    }
  };

  const editableColumns = {
    university: ['name', 'country', 'url', 'rank'],
    program: ['name', 'degree', 'url', 'placement_url', 'url_comment', 'scraper_comment', 'comment', 'school', 'school_1', 'school_2', 'school_3'],
    school: ['name', 'university', 'url'],
    department: ['university', 'school', 'department'],
    faculty: ['name', 'title', 'education', 'email', 'profileUrl'],
  };

  const handleDoubleClick = (item, key) => {
    if (editableColumns[type]?.includes(key)) {
      console.log(`Double-click on ${type} item ${item.id}, field "${key}", current value: "${item[key]}"`);
      setEditingCell({ id: item.id, key });
      setEditValue(item[key] || ""); // Ensure we handle undefined/null values
    }
  };

  const handleChange = (e) => {
    const { value } = e.target;
    const key = editingCell?.key;
    // Add null/undefined check and ensure value is defined
    const safeValue = value ?? '';
    // For URL fields (url, placement_url), don't convert to uppercase. For others, do.
    const processedValue = (key === 'url' || key === 'placement_url') ? safeValue : String(safeValue).toUpperCase();
    setEditValue(processedValue);
  };

  const handleSave = async () => {
    if (editingCell) {
      const originalItem = data.find(item => item.id === editingCell.id);
      if (originalItem) {
        const originalValue = originalItem[editingCell.key];
        // Fix: Ensure editValue is properly handled for all field types
        const safeEditValue = editValue ?? '';
        const processedEditValue = (editingCell.key === 'url' || editingCell.key === 'placement_url') 
          ? safeEditValue 
          : String(safeEditValue).toUpperCase();

        // *** FIX 1: Simplify the change detection logic. ***
        // The old logic had a confusing condition that prevented saves.
        // This is now reliable because the race condition is fixed at the call sites.
        console.log(`Checking changes for ${editingCell.key} in item ${editingCell.id}: original value "${originalValue}", new value "${processedEditValue}"`);

        // Check for duplicates
        if (type === 'university' && (editingCell.key === 'name' || editingCell.key === 'country')) {
          const newName = editingCell.key === 'name' ? String(processedEditValue).trim() : String(originalItem.name || '').trim().toUpperCase();
          const newCountry = editingCell.key === 'country' ? String(processedEditValue).trim() : String(originalItem.country || '').trim().toUpperCase();

          if (newName && newCountry) { // Only check if both name and country are present
            const isDuplicate = data.some(
              item =>
                item.id !== editingCell.id &&
                String(item.name || '').trim().toUpperCase() === newName &&
                String(item.country || '').trim().toUpperCase() === newCountry
            );

            if (isDuplicate) {
              console.log(`Edit cancelled: Duplicate university "${newName}" in country "${newCountry}"`);
              toast.error(`: This university already exists in this country. Edit cancelled.`, 'error');
              setEditingCell(null);
              return;
            }
          }
        } else if (type === 'school' && (editingCell.key === 'name' || editingCell.key === 'university')) {
          const newName = editingCell.key === 'name' ? String(processedEditValue).trim() : String(originalItem.name || '').trim().toUpperCase();
          const newUniversity = editingCell.key === 'university' ? String(processedEditValue).trim() : String(originalItem.university || '').trim().toUpperCase();

          if (newName && newUniversity) {
            const isDuplicate = data.some(
              item =>
                item.id !== editingCell.id &&
                String(item.name || '').trim().toUpperCase() === newName &&
                String(item.university || '').trim().toUpperCase() === newUniversity
            );

            if (isDuplicate) {
              console.log(`Edit cancelled: Duplicate school "${newName}" for university "${newUniversity}"`);
              toast.error(`: This school already exists for this university. Edit cancelled.`, 'error');
              setEditingCell(null);
              return;
            }
          }
        } else if (type === 'department' && (editingCell.key === 'department' || editingCell.key === 'school' || editingCell.key === 'university')) {
          const newDepartment = editingCell.key === 'department' ? String(processedEditValue).trim() : String(originalItem.department || '').trim().toUpperCase();
          const newSchool = editingCell.key === 'school' ? String(processedEditValue).trim() : String(originalItem.school || '').trim().toUpperCase();
          const newUniversity = editingCell.key === 'university' ? String(processedEditValue).trim() : String(originalItem.university || '').trim().toUpperCase();

          if (newDepartment && newSchool && newUniversity) {
            const isDuplicate = data.some(
              item =>
                item.id !== editingCell.id &&
                String(item.department || '').trim().toUpperCase() === newDepartment &&
                String(item.school || '').trim().toUpperCase() === newSchool &&
                String(item.university || '').trim().toUpperCase() === newUniversity
            );

            if (isDuplicate) {
              console.log(`Edit cancelled: Duplicate department "${newDepartment}" at "${newSchool}", "${newUniversity}"`);
              toast.error(`This department already exists at this school. Edit cancelled.`, 'error');
              setEditingCell(null);
              return;
            }
          }
        } else if (type === 'program' && editingCell.key === 'name') {
          const isDuplicate = data.some(
            item =>
              item.id !== editingCell.id &&
              String(item.name || '').trim().toUpperCase() === String(processedEditValue).trim()
          );
        }

        console.log(`Editing ${type} item ${editingCell.id}: ${editingCell.key} changed from "${originalValue}" to "${processedEditValue}"`);
        onCellUpdate(editingCell.id, editingCell.key, processedEditValue);
      }
      setEditingCell(null);
    }
  };

const handleSavePlacementUrl = (item, newValue) => {
  const key = 'placement_url';
  const originalValue = item[key];

  if (originalValue === newValue) {
    setEditingCell(null);
    return;
  }

  if (onCellUpdate) {
    onCellUpdate(item.id, key, newValue); // updates in parent
  }

  setEditingCell(null);
};

  const handleCountryDropdownBlur = () => {
    handleSave();
  };

  const handleCountryDropdownKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setTimeout(() => {
        handleSave();
      }, 0);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      // *** FIX 2: Wrap handleSave in setTimeout. ***
      // This ensures state updates from onChange (especially in react-select)
      // are processed before attempting to save the new value, fixing the race condition.
      setTimeout(handleSave, 0);
    } else if (event.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleGenerateSchoolInfoClick = async () => {
    if (!newEntryData.university) {
      toast.info('Please select a university first.', 'info');
      return;
    }

    const selectedUniversity = universitiesData.find(
      (uni) => uni.name === newEntryData.university
    );
    if (!selectedUniversity || !selectedUniversity.url) {
      toast.info(
        'Could not find a URL for the selected university. Please ensure the university has a URL in the system.',
        'info'
      );
      return;
    }

    setIsGeneratingInfo(true);
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}gen-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: ADMIN_API_KEY_URL,
        },
        body: JSON.stringify({
          university_name: selectedUniversity.name,
          university_url: selectedUniversity.url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response',
        }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();

      const schools = result[selectedUniversity.name];
      if (schools && typeof schools === 'object' && Object.keys(schools).length > 0) {
        const existingSchoolKeys = new Set([
          ...data
            .filter((i) => i.university)
            .map(
              (item) =>
                `${item.university?.toUpperCase().trim()}-${item.name
                  .toUpperCase()
                  .trim()}`
            ),
          ...stagedEntries.map(
            (item) =>
              `${item.university?.toUpperCase().trim()}-${item.name
                .toUpperCase()
                .trim()}`
          ),
        ]);

        const newSchoolsToStage = [];
        const processedInBatch = new Set();
        let discardedCount = 0;

        Object.entries(schools).forEach(([schoolName, schoolUrl]) => {
          const upperCaseSchoolName = schoolName?.toUpperCase().trim();
          const upperCaseUniversityName = selectedUniversity.name.toUpperCase().trim();
          const uniqueKey = `${upperCaseUniversityName}-${upperCaseSchoolName}`;

          if (processedInBatch.has(uniqueKey) || existingSchoolKeys.has(uniqueKey)) {
            discardedCount++;
            return; // Skip duplicate within batch or already existing
          }

          processedInBatch.add(uniqueKey);
          newSchoolsToStage.push({
            id: `staged-${stagedIdCounter.current++}`,
            name: upperCaseSchoolName,
            url: schoolUrl,
            university: selectedUniversity.name,
            university_id: selectedUniversity.id,
          });
        });

        if (newSchoolsToStage.length > 0) {
          setStagedEntries((prev) => [...prev, ...newSchoolsToStage]);
          toast.success(
            `${newSchoolsToStage.length} new school(s) staged for submission.`,
            'success'
          );
        } else {
          toast.info(
            'No new schools to add. All generated schools already exist or were duplicates in the response.',
            'info'
          );
        }

        if (discardedCount > 0) {
          toast.info(
            `${discardedCount} duplicate school(s) were discarded and not added.`,
            'info'
          );
        }

        // Preserve university selection but clear other fields
        setNewEntryData({
          ...initialNewEntryData,
          university: newEntryData.university,
        });
      } else {
        throw new Error('AI response did not contain valid school data.');
      }
    } catch (error) {
      console.error('Failed to generate school info:', error);
      toast.error(
        `Failed to generate school information: ${error.message}`,
        'error'
      );
    } finally {
      setIsGeneratingInfo(false);
    }
  };
  const handleGenerateProgramInfoClick = async () => {
    if (!newEntryData.university) {
      toast.info('Please select a university first.', 'info');
      return;
    }

    const selectedUniversity = universitiesData.find(
      (uni) => uni.name === newEntryData.university
    );

    if (!selectedUniversity) {
      toast.error('Selected university not found.', 'error');
      return;
    }

    let schoolsForPayload = [];
    if (newEntryData.school) {
      // A specific school is selected
      const selectedSchool = schoolsData.find(
        (sch) => sch.name === newEntryData.school && sch.university === newEntryData.university
      );
      if (selectedSchool) {
        schoolsForPayload.push({
          name: selectedSchool.name,
          url: selectedSchool.url || '',
          id: selectedSchool.id,
        });
      } else {
        toast.error('Selected school not found.', 'error');
        return;
      }
    } else {
      // No school selected, use all schools for the university
      schoolsForPayload = schoolsData
        .filter((sch) => sch.university === newEntryData.university)
        .map((sch) => ({
          name: sch.name,
          url: sch.url || '',
          id: sch.id,
        }));
      if (schoolsForPayload.length === 0) {
        toast.info('No schools found for the selected university. Cannot generate programs.', 'info');
        return;
      }
    }

    // Create the new payload format for placement generation
    const payload = {
      university_name: selectedUniversity.name,
      university_url: selectedUniversity.url || '',
      university_id: selectedUniversity.id,
      program: newEntryData.degree ,
      schools: schoolsForPayload.map(school => ({
        id: school.id,
        name: school.name,
        url: school.url

      })),
    };

    setIsGeneratingInfo(true);
    try {
      console.log('Sending payload to gen-programs-and-placements:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${ADMIN_API_BASE_URL}gen-programs-and-placements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: ADMIN_API_KEY_URL,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response',
        }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Full API response:', JSON.stringify(result, null, 2));

      if (!result.programs_with_placements || !Array.isArray(result.programs_with_placements)) {
        console.error('Invalid response structure. Expected programs_with_placements array, got:', typeof result.programs_with_placements);
        throw new Error('AI response did not contain valid programs with placements data.');
      }

      const programsWithPlacements = result.programs_with_placements;
      console.log(`Received ${programsWithPlacements.length} programs from API`);
      
      if (programsWithPlacements.length > 0) {
        const existingProgramKeys = new Set([
          ...data
            .filter((i) => i.university && i.school && i.name)
            .map(
              (item) =>
                `${item.university.toUpperCase().trim()}-${item.school.toUpperCase().trim()}-${item.name.toUpperCase().trim()}`
            ),
          ...stagedEntries.map(
            (item) =>
              `${item.university.toUpperCase().trim()}-${item.school.toUpperCase().trim()}-${item.name.toUpperCase().trim()}`
          ),
        ]);

        const newProgramsToStage = [];
        const processedInBatch = new Set();
        let discardedCount = 0;

        programsWithPlacements.forEach((program) => {
          const programName = program.program;
          if (!programName) return;

          const upperCaseProgramName = programName.toUpperCase().trim();
          const upperCaseUniversityName = program.university.toUpperCase().trim();
          const upperCaseSchoolName = program.school.toUpperCase().trim();
          const uniqueKey = `${upperCaseUniversityName}-${upperCaseSchoolName}-${upperCaseProgramName}`;

          if (processedInBatch.has(uniqueKey) || existingProgramKeys.has(uniqueKey)) {
            discardedCount++;
            return; // Skip duplicate within batch or already existing
          }

          processedInBatch.add(uniqueKey);
          newProgramsToStage.push({
            id: `staged-${stagedIdCounter.current++}`,
            name: upperCaseProgramName,
            url: program.program_url || '',
            placement_url: program.placement_url || '',
            university: program.university,
            university_id: program.university_id,
            school: program.school,
            school_id: program.school_id,
            degree: program.degree || '',
          });
        });

        if (newProgramsToStage.length > 0) {
          setStagedEntries((prev) => [...prev, ...newProgramsToStage]);
          toast.success(
            `${newProgramsToStage.length} new program(s) with placement data staged for submission.`,
            'success'
          );
        } else {
          toast.info(
            'No new programs to add. All generated programs already exist or were duplicates in the response.',
            'info'
          );
        }

        if (discardedCount > 0) {
          toast.info(
            `${discardedCount} duplicate program(s) were discarded and not added.`,
            'info'
          );
        }

        // Preserve university and school selection but clear other fields
        setNewEntryData({
          ...initialNewEntryData,
          university: newEntryData.university,
          school: newEntryData.school,
        });
      } else {
        console.log('API returned empty programs_with_placements array');
        console.log('Payload sent:', JSON.stringify(payload, null, 2));
        toast.info('The AI did not return any programs with placement data. This could be because:\n• No programs were found for the selected university/school\n• The university/school URLs are not accessible\n• The AI service is experiencing issues\n\nPlease try with a different university or check the console for more details.', 'info');
      }
    } catch (error) {
      console.error('Failed to generate program placement info:', error);
      toast.error(
        `Failed to generate program placement information: ${error.message}`,
        'error'
      );
    } finally {
      setIsGeneratingInfo(false);
    }
  };
  
  const handleGenerateDepartmentInfoClick = async () => {
    if (!newEntryData.university) {
      toast.info('Please select a university first.', 'info');
      return;
    }

    if (!newEntryData.school) {
      toast.info('Please select a school first.', 'info');
      return;
    }

    const selectedSchool = schoolsData.find(
      (school) => school.name === newEntryData.school && school.university === newEntryData.university
    );
    if (!selectedSchool) {
      toast.info('Selected school not found in the system.', 'info');
      return;
    }

    if (!selectedSchool.id) {
      toast.info('Selected school does not have a valid ID.', 'info');
      return;
    }

    const selectedUniversity = universitiesData.find(
      (uni) => uni.name === newEntryData.university
    );
    if (!selectedUniversity || !selectedUniversity.id) {
      toast.info('Selected university not found or does not have a valid ID.', 'info');
      return;
    }

    setIsGeneratingInfo(true);
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}departments/${selectedSchool.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Referer: ADMIN_API_KEY_URL,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response',
        }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();

      // Parse the response - assuming result contains an array of department objects or names
      let departments = [];
      
      if (Array.isArray(result)) {
        // If result is directly an array, extract department names from objects or use strings directly
        departments = result.map(item => {
          if (typeof item === 'string') {
            return item;
          } else if (item.departmentName) {
            return item.departmentName;
          } else if (item.name) {
            return item.name;
          } else if (item.department) {
            return item.department;
          }
          return null;
        }).filter(dept => dept !== null);
      } else if (result.departments && Array.isArray(result.departments)) {
        // If result has a departments property with array
        departments = result.departments.map(item => {
          if (typeof item === 'string') {
            return item;
          } else if (item.departmentName) {
            return item.departmentName;
          } else if (item.name) {
            return item.name;
          }
          return null;
        }).filter(dept => dept !== null);
      } else if (result.data && Array.isArray(result.data)) {
        // If result has a data property with array
        departments = result.data.map(item => {
          if (typeof item === 'string') {
            return item;
          } else if (item.departmentName) {
            return item.departmentName;
          } else if (item.name) {
            return item.name;
          }
          return null;
        }).filter(dept => dept !== null);
      } else {
        // Try to extract department names from object values
        departments = Object.values(result).filter(dept => typeof dept === 'string');
      }

      if (departments && departments.length > 0) {
        const existingDepartmentKeys = new Set([
          ...data
            .filter((i) => i.university && i.school && i.department)
            .map(
              (item) =>
                `${item.university?.toUpperCase().trim()}-${item.school?.toUpperCase().trim()}-${item.department?.toUpperCase().trim()}`
            ),
          ...stagedEntries.map(
            (item) =>
              `${item.university?.toUpperCase().trim()}-${item.school?.toUpperCase().trim()}-${item.department?.toUpperCase().trim()}`
          ),
        ]);

        const newDepartmentsToStage = [];
        const processedInBatch = new Set();
        let discardedCount = 0;

        departments.forEach((departmentName) => {
          if (!departmentName || typeof departmentName !== 'string') {
            discardedCount++;
            return;
          }

          const upperCaseDepartmentName = departmentName.toUpperCase().trim();
          const upperCaseSchoolName = selectedSchool.name.toUpperCase().trim();
          const upperCaseUniversityName = newEntryData.university.toUpperCase().trim();
          const uniqueKey = `${upperCaseUniversityName}-${upperCaseSchoolName}-${upperCaseDepartmentName}`;

          if (processedInBatch.has(uniqueKey) || existingDepartmentKeys.has(uniqueKey)) {
            discardedCount++;
            return; // Skip duplicate within batch or already existing
          }

          processedInBatch.add(uniqueKey);
          newDepartmentsToStage.push({
            id: `staged-${stagedIdCounter.current++}`,
            university: newEntryData.university,
            school: selectedSchool.name,
            department: upperCaseDepartmentName,
            school_id: selectedSchool.id,
            university_id: selectedUniversity.id,
          });
        });

        if (newDepartmentsToStage.length > 0) {
          setStagedEntries((prev) => [...prev, ...newDepartmentsToStage]);
          toast.success(
            `${newDepartmentsToStage.length} new department(s) staged for submission.`,
            'success'
          );
        } else {
          toast.info(
            'No new departments to add. All departments already exist or were duplicates in the response.',
            'info'
          );
        }

        if (discardedCount > 0) {
          toast.info(
            `${discardedCount} duplicate or invalid department(s) were discarded and not added.`,
            'info'
          );
        }

        // Preserve university and school selection but clear department field
        setNewEntryData({
          ...initialNewEntryData,
          university: newEntryData.university,
          school: newEntryData.school,
        });
      } else {
        toast.info('No departments found for the selected school.', 'info');
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast.error(
        `Failed to fetch departments: ${error.message}`,
        'error'
      );
    } finally {
      setIsGeneratingInfo(false);
    }
  };

  const handleStagedEntryChange = (index, field, value) => {
    setStagedEntries(prev => {
        const updated = [...prev];
        // Add null/undefined check and ensure value is defined
        const safeValue = value ?? '';
        // Don't capitalize URL fields (url, placement_url)
        const processedValue = (field === 'url' || field === 'placement_url') ? safeValue : String(safeValue).toUpperCase();
        updated[index] = { ...updated[index], [field]: processedValue };
        return updated;
    });
  };

  const handleRemoveStagedEntry = (index) => {
    setStagedEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitStaged = async () => {
    if (stagedEntries.length === 0) {
      toast.error("No staged entries to submit.");
      return;
    }

    setIsSubmittingStaged(true);

    if (type === 'program') {
      const duplicates = [];
      for (const entry of stagedEntries) {
        const isDuplicate = data.some(item =>
          String(item.university).trim().toUpperCase() === String(entry.university).trim().toUpperCase() &&
          String(item.school).trim().toUpperCase() === String(entry.school).trim().toUpperCase() &&
          String(item.name).trim().toUpperCase() === String(entry.name).trim().toUpperCase()
        );
        if (isDuplicate) {
          duplicates.push(`${entry.name} at ${entry.school}`);
        }
      }

      if (duplicates.length > 0) {
        const duplicatesList = duplicates.join(", ");
        toast.error(`: The following entries already exist and cannot be submitted:\n\n${duplicatesList}`);
        setIsSubmittingStaged(false);
        return;
      }

      // Optimistic update with correct status based on placement_url
      const optimisticPrograms = stagedEntries.map(entry => ({
        ...entry,
        isNew: true,
        isOptimistic: true,
        status:
          !entry.placement_url ||
          entry.placement_url.trim() === '' ||
          entry.placement_url.trim().toLowerCase() === 'not available'||
          entry.placement_url.trim().toLowerCase() === 'ai could not find' ||
          entry.placement_url.trim().toLowerCase() === 'human cant find'||
          (entry.comment || "").trim().toLowerCase() === "url doesn't exist"
            ? 'URL_EMPTY'
            : 'URL_EXISTS'
      }));
      if (onAddEntry) {
        onAddEntry(optimisticPrograms);
      }
      const originalStagedEntries = [...stagedEntries];
      setStagedEntries([]);

      const programsPayload = originalStagedEntries.map(entry => ({
  program: entry.name,
  program_url: entry.url || '',
  placement_url: entry.placement_url || '',
  degree: entry.degree || 'PhD',
  university_id: entry.university_id,
  school_1: entry.school_1_id || '',
  school_2: entry.school_2_id || '',
  school_3: entry.school_3_id || '',
      }));

      const payload = { programs: programsPayload };

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
        if (!Array.isArray(result.programs)) {
          throw new Error("Malformed response: Missing 'programs' array");
        }

        // Finalize update by replacing temp entries with real data
        const finalProgramList = result.programs.map(serverEntry => {
          // Match server response with original staged entry
          const originalEntry = originalStagedEntries.find(staged =>
            staged.university_id === serverEntry.university_id &&
            staged.school_id === serverEntry.school_id &&
            staged.name === serverEntry.program &&
            (staged.degree || '') === (serverEntry.degree || '')
          );
          // Set status based on placement_url
          const status =
            !serverEntry.placement_url ||
            serverEntry.placement_url.trim() === '' ||
            serverEntry.placement_url.trim().toLowerCase() === 'not available'
            || serverEntry.placement_url.trim().toLowerCase() === 'ai could not find'
            || serverEntry.placement_url.trim().toLowerCase() === 'human cant find'
              ? 'URL_EMPTY'
              : 'URL_EXISTS';
          // Create payload with permanent ID and temporary ID for mapping
          return {
            id: serverEntry._id,
            tempId: originalEntry ? originalEntry.id : null,
            name: serverEntry.program,
            school: serverEntry.school,
            university: serverEntry.university,
            url: serverEntry.program_url || '',
            placement_url: serverEntry.placement_url || '',
            degree: serverEntry.degree || '',
            school_id: serverEntry.school_id,
            university_id: serverEntry.university_id,
            status
          };
        });

        if (onAddEntry) {
          // Send the final list to update the state
          onAddEntry(finalProgramList.filter(p => p.tempId));
        }

        toast.success(result.message || `${finalProgramList.length} program(s) submitted successfully!`, 'success');
        queryClient.invalidateQueries(['programs']);

      } catch (error) {
        console.error("Failed to submit staged programs:", error);
        toast.error(`Failed to submit programs: ${error.message}. Reverting changes.`, 'error');
        // Rollback optimistic update
        if (onDelete) {
          optimisticPrograms.forEach(p => onDelete(p.id));
        }
        setStagedEntries(originalStagedEntries);
      } finally {
        setIsSubmittingStaged(false);
      }
      return; // Exit after handling programs
    }

    if (type === 'department') {
      const duplicates = [];
      for (const entry of stagedEntries) {
        const isDuplicate = data.some(item =>
          String(item.university).trim().toUpperCase() === String(entry.university).trim().toUpperCase() &&
          String(item.school).trim().toUpperCase() === String(entry.school).trim().toUpperCase() &&
          String(item.department).trim().toUpperCase() === String(entry.department).trim().toUpperCase()
        );
        if (isDuplicate) {
          duplicates.push(`${entry.department} at ${entry.school}, ${entry.university}`);
        }
      }

      if (duplicates.length > 0) {
        const duplicatesList = duplicates.join(", ");
        toast.error(`The following departments already exist and cannot be submitted:\n\n${duplicatesList}`);
        setIsSubmittingStaged(false);
        return;
      }

      // OPTIMISTIC UPDATE: Add departments to UI immediately
      const optimisticDepartments = stagedEntries.map(entry => ({
        ...entry,
        id: `optimistic-${Date.now()}-${Math.random()}`, // Temporary optimistic ID
        isNew: true,
        isOptimistic: true,
      }));

      // Add optimistic entries to the UI immediately
      if (onAddEntry) {
        onAddEntry(optimisticDepartments);
      }

      // Clear staged entries since they're now optimistically added
      const originalStagedEntries = [...stagedEntries];
      setStagedEntries([]);

      // Submit departments to database in background
      const submittedDepartments = [];
      const failedDepartments = [];
      let successCount = 0;
      let errorCount = 0;

      try {
        for (let i = 0; i < originalStagedEntries.length; i++) {
          const entry = originalStagedEntries[i];
          const optimisticEntry = optimisticDepartments[i];
          
          const payload = {
            department_name: entry.department || '',
            school_id: entry.school_id,
            university_id: entry.university_id
          };

          try {
            const response = await fetch(`${ADMIN_API_BASE_URL}save-departments`, {
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
            
            // Create the finalized department object with real database ID
            const finalizedDepartment = {
              id: result.department.id || result.department._id || `fallback-${Date.now()}-${Math.random()}`,
              tempId: optimisticEntry.id, // Reference to optimistic ID for replacement
              university: entry.university,
              school: entry.school,
              department: entry.department || '',
              university_id: entry.university_id,
              school_id: entry.school_id,
              isNew: true,
              isOptimistic: false // No longer optimistic, now confirmed by database
            };

            submittedDepartments.push(finalizedDepartment);
            successCount++;

          } catch (departmentError) {
            console.error(`Failed to submit department ${entry.department}:`, departmentError);
            failedDepartments.push({
              optimisticId: optimisticEntry.id,
              entry: entry,
              error: departmentError.message
            });
            errorCount++;
          }
        }

        // FINALIZE: Replace optimistic entries with real database entries for successful saves
        if (submittedDepartments.length > 0 && onAddEntry) {
          onAddEntry(submittedDepartments);
        }

        // ROLLBACK: Remove failed optimistic entries
        if (failedDepartments.length > 0 && onDelete) {
          failedDepartments.forEach(failed => {
            onDelete(failed.optimisticId);
          });
        }

        // Show appropriate success/error messages
        if (successCount > 0 && errorCount === 0) {
          toast.success(`${successCount} department(s) saved successfully!`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(`${successCount} department(s) saved successfully, ${errorCount} failed and were removed.`, 'warning');
        } else if (errorCount > 0) {
          toast.error(`Failed to save ${errorCount} department(s). They have been removed from the list.`, 'error');
        }

        // Invalidate queries to refresh data from server if needed
        queryClient.invalidateQueries(['departments']);

      } catch (error) {
        console.error("Failed to submit staged departments:", error);
        toast.error(`Failed to save departments: ${error.message}. Removing all optimistic entries.`, 'error');
        
        // COMPLETE ROLLBACK: Remove all optimistic entries if there's a system error
        if (onDelete) {
          optimisticDepartments.forEach(d => onDelete(d.id));
        }
        
        // Restore staged entries for user to try again
        setStagedEntries(originalStagedEntries);
      } finally {
        setIsSubmittingStaged(false);
      }
      return; // Exit after handling departments
    }

    // Check for duplicates with existing data before submission (for schools)
    const duplicates = [];
    for (const entry of stagedEntries) {
      const isDuplicate = data.some(item =>
        String(item.university).trim().toUpperCase() === String(entry.university).trim().toUpperCase() &&
        String(item.name).trim().toUpperCase() === String(entry.name).trim().toUpperCase() &&
        String(item.url || '').trim() === String(entry.url || '').trim()
      );
      if (isDuplicate) {
        duplicates.push(`${entry.name} at ${entry.university}`);
      }
    }

    if (duplicates.length > 0) {
      const duplicatesList = duplicates.join(", ");
      toast.error(`: The following entries already exist and cannot be submitted:\n\n${duplicatesList}`);
      setIsSubmittingStaged(false);
      return;
    }

    const schoolsPayload = stagedEntries.map(entry => ({
      university: entry.university,
      school: entry.name,
      url: entry.url || '',
      university_id: entry.university_id
    }));

    const payload = { schools: schoolsPayload };

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}bulk-school`, {
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
      console.log("Server response after submission:", result);

      if (!Array.isArray(result.schools)) {
        throw new Error("Malformed response: Missing 'schools' array");
      }

      // Update local state with response data
      const finalSchoolList = result.schools.map(serverEntry => ({
        id: serverEntry._id,
        name: serverEntry.school || '',
        university: serverEntry.university || '',
        url: serverEntry.url || '',
      }));
      console.log("Final school list after submission:", finalSchoolList);
      if (onAddEntry) {
        finalSchoolList.forEach(entry => onAddEntry(entry));
      }

      // Clear staged entries only after successfully adding them to the main list
      setStagedEntries([]);

      toast.success(result.message || `${finalSchoolList.length} school(s) submitted successfully!`, 'success');
      queryClient.invalidateQueries(['schools']); // Refresh data if using React Query

    } catch (error) {
      console.error("Failed to submit staged schools:", error);
      toast.error(`Failed to submit schools: ${error.message}. The entries were not removed from staging.`, 'error');
    } finally {
      setIsSubmittingStaged(false);
    }
  };
  const handleNewEntryChange = (e) => {
    const { name, value } = e.target;
    // Add null/undefined check and ensure value is defined
    const safeValue = value ?? '';
    // Don't capitalize URL fields (url, university_url, placement_url)
    const processedValue = (name === 'url' || name === 'university_url' || name === 'placement_url') ? safeValue : String(safeValue).toUpperCase();
    setNewEntryData(prev => ({
        ...prev,
        [name]: processedValue
    }));
  };

  const handleCountryChange = (countryValue) => {
    const safeValue = countryValue ?? '';
    setNewEntryData(prev => ({
      ...prev,
      country: safeValue
    }));
  };

  const handleUniversityChange = (universityValue, item = null) => {
    const safeValue = universityValue ?? '';
    
    if (item && item.id && onCellUpdate) {
      // Handle updating existing item's university field
      onCellUpdate(item.id, 'university', safeValue);
      // Clear the school fields when university changes
      onCellUpdate(item.id, 'school_1', '');
      onCellUpdate(item.id, 'school_2', '');
      onCellUpdate(item.id, 'school_3', '');
      onCellUpdate(item.id, 'school_1_name', '');
      onCellUpdate(item.id, 'school_2_name', '');
      onCellUpdate(item.id, 'school_3_name', '');
    } else {
      // Handle new entry data
      setNewEntryData(prev => ({
        ...prev,
        university: safeValue,
        school: '',
        school_1: '',
        school_2: '',
        school_3: ''
      }));
    }
  };

  const handleSchoolChange = (field, schoolValue, item = null) => {
    // If no school is found, set it to ""
    if (!schoolValue) {
      if (item && item.id) {
        if (onCellUpdate) {
          if (!field || field === 'school') {
            onCellUpdate(item.id, 'school_id', '');
            onCellUpdate(item.id, 'school', '');
          } else {
            const fieldNumber = field.match(/school_([123])/)?.[1];
            if (fieldNumber) {
              onCellUpdate(item.id, `school_${fieldNumber}`, '');
              onCellUpdate(item.id, `school_${fieldNumber}_id`, '');
              onCellUpdate(item.id, `school_${fieldNumber}_name`, '');
            }
          }
        }
      } else {
        if (field) {
          setNewEntryData(prev => ({
            ...prev,
            [field]: ''
          }));
        } else {
          setNewEntryData(prev => ({
            ...prev,
            school: ''
          }));
        }
      }
      return;
    }

    const safeValue = schoolValue ?? '';
    if (item && item.id) {
      // Handle updating existing item's school field
      if (onCellUpdate) {
        // Find the school ID based on the school name
        const selectedSchool = schoolsData.find(
          school => school.name === safeValue && school.university === item.university
        );
        const schoolId = selectedSchool ? selectedSchool.id : '';
        
        // Update fields based on which school field is being modified
        if (!field || field === 'school') {
          // Update main school fields
          onCellUpdate(item.id, 'school_id', schoolId);
          onCellUpdate(item.id, 'school', safeValue);
        } else {
          // Handle numbered school fields (school_1, school_2, school_3)
          const fieldNumber = field.match(/school_([123])/)?.[1];
          if (fieldNumber) {
            onCellUpdate(item.id, `school_${fieldNumber}`, schoolId);
            onCellUpdate(item.id, `school_${fieldNumber}_id`, schoolId);
            onCellUpdate(item.id, `school_${fieldNumber}_name`, safeValue);
          }
        }
        
        // Also update the display name field locally for immediate UI feedback
        const nameField = `${field}_name`;
        onCellUpdate(item.id, nameField, safeValue);
      }
    } else {
      // Handle new entry data
      if (field) {
        setNewEntryData(prev => ({
          ...prev,
          [field]: safeValue
        }));
      } else {
        setNewEntryData(prev => ({
          ...prev,
          school: safeValue
        }));
      }
    }
  };

  const handleAddNewEntryClick = async () => {
  if (type === 'school') {
        if (!newEntryData.name || !newEntryData.university) {
            console.log('Add school failed: Missing required fields (name, university)');
            toast.error('School Name and University are required.', 'error');
            return;
        }

        // Check for duplicate school (name + university)
        const isDuplicate = data.some(
            item => String(item.name).trim().toUpperCase() === String(newEntryData.name).trim().toUpperCase() &&
                    String(item.university).trim().toUpperCase() === String(newEntryData.university).trim().toUpperCase()
        );

        const isDuplicateStaged = stagedEntries.some(
            item => String(item.name).trim().toUpperCase() === String(newEntryData.name).trim().toUpperCase() &&
                    String(item.university).trim().toUpperCase() === String(newEntryData.university).trim().toUpperCase()
        );

        if (isDuplicate) {
            console.log(`Add school failed: Duplicate name "${newEntryData.name}" for university "${newEntryData.university}"`);
            toast.error('Error: This school already exists for the selected university.', 'error');
            return;
        }

        if (isDuplicateStaged) {
            console.log(`Add school failed: Duplicate name "${newEntryData.name}" for university "${newEntryData.university}" in staged entries`);
            toast.error('Error: This school is already in the staging area.', 'error');
            return;
        }

        console.log(`Adding new school to staging area:`, newEntryData);

        // Get university_id from the selected university
        const selectedUniversity = universitiesData.find(uni => uni.name === newEntryData.university);
        const university_id = selectedUniversity ? selectedUniversity.id : null;

        // Add to staged entries instead of directly submitting
        const newStagedEntry = {
            name: newEntryData.name.toUpperCase(),
            university: newEntryData.university,
            url: newEntryData.url || '',
            university_id: university_id,
            manuallyAdded: true // Flag to identify manually added entries
        };

        setStagedEntries(prev => [...prev, newStagedEntry]);

        // Preserve university selection but clear other fields
        setNewEntryData({
            ...initialNewEntryData,
            university: newEntryData.university
        });

  } else if (type === 'program') {
    // Validate all required fields for program
    if (!newEntryData.university || typeof newEntryData.university !== 'string' || newEntryData.university.trim() === '') {
      toast.error('University is required.', 'error');
      return;
    }
    
    if (!newEntryData.name || typeof newEntryData.name !== 'string' || newEntryData.name.trim() === '') {
      toast.error('Program Name is required.', 'error');
      return;
    }
    if (!newEntryData.degree || typeof newEntryData.degree !== 'string' || newEntryData.degree.trim() === '') {
      toast.error('Degree is required.', 'error');
      return;
    }
    // Optionally, require at least school_1 (if used in your schema)
    

        const isDuplicateInDataTable = data.some(
            item => String(item.name).trim().toUpperCase() === String(newEntryData.name).trim().toUpperCase() &&
                    String(item.school).trim().toUpperCase() === String(newEntryData.school).trim().toUpperCase() &&
                    String(item.university).trim().toUpperCase() === String(newEntryData.university).trim().toUpperCase()
        );

        if (isDuplicateInDataTable) {
            toast.error('Error: This program already exists for the selected school.', 'error');
            return;
        }

        const isDuplicateInStaged = stagedEntries.some(
            item => String(item.name).trim().toUpperCase() === String(newEntryData.name).trim().toUpperCase() &&
                    String(item.school).trim().toUpperCase() === String(newEntryData.school).trim().toUpperCase() &&
                    String(item.university).trim().toUpperCase() === String(newEntryData.university).trim().toUpperCase()
        );

        if (isDuplicateInStaged) {
            toast.error('Error: This program is already in the staging area.', 'error');
            return;
        }

        const selectedUniversity = universitiesData.find(uni => uni.name === newEntryData.university);
        const selectedSchool = schoolsData.find(sch => sch.name === newEntryData.school && sch.university === newEntryData.university);

    const newStagedEntry = {
      name: newEntryData.name.toUpperCase(),
      university: newEntryData.university,
      school_1: newEntryData.school_1 || newEntryData.school || '',
      school_2: newEntryData.school_2 || '',
      school_3: newEntryData.school_3 || '',
      school_1_id: (schoolsData.find(s => s.name === (newEntryData.school_1 || newEntryData.school) && s.university === newEntryData.university)?.id) || '',
      school_2_id: (schoolsData.find(s => s.name === newEntryData.school_2 && s.university === newEntryData.university)?.id) || '',
      school_3_id: (schoolsData.find(s => s.name === newEntryData.school_3 && s.university === newEntryData.university)?.id) || '',
      url: newEntryData.url || '',
      degree: newEntryData.degree || '',
      placement_url: newEntryData.placement_url || '',
      university_id: selectedUniversity?.id,
      school_id: selectedSchool?.id,
      manuallyAdded: true
    };

        console.log('Adding new program to staging area:', newStagedEntry);
        setStagedEntries(prev => [...prev, newStagedEntry]);

        // Preserve university and school selection but clear other fields
        setNewEntryData({
          ...initialNewEntryData,
          university: newEntryData.university,
          school: newEntryData.school
        });
    } else if (type === 'department') {
        if (!newEntryData.department || !newEntryData.university || !newEntryData.school) {
            console.log('Add department failed: Missing required fields (department, university, school)');
            toast.error('Department Name, University, and School are required.', 'error');
            return;
        }

        // Check for duplicate department (department + school + university)
        const isDuplicate = data.some(
            item => String(item.department).trim().toUpperCase() === String(newEntryData.department).trim().toUpperCase() &&
                    String(item.school).trim().toUpperCase() === String(newEntryData.school).trim().toUpperCase() &&
                    String(item.university).trim().toUpperCase() === String(newEntryData.university).trim().toUpperCase()
        );

        const isDuplicateStaged = stagedEntries.some(
            item => String(item.department).trim().toUpperCase() === String(newEntryData.department).trim().toUpperCase() &&
                    String(item.school).trim().toUpperCase() === String(newEntryData.school).trim().toUpperCase() &&
                    String(item.university).trim().toUpperCase() === String(newEntryData.university).trim().toUpperCase()
        );

        if (isDuplicate) {
            console.log(`Add department failed: Duplicate department "${newEntryData.department}" for school "${newEntryData.school}" at university "${newEntryData.university}"`);
            toast.error('Error: This department already exists at the selected school.', 'error');
            return;
        }

        if (isDuplicateStaged) {
            console.log(`Add department failed: Duplicate department "${newEntryData.department}" for school "${newEntryData.school}" at university "${newEntryData.university}" in staged entries`);
            toast.error('Error: This department is already in the staging area.', 'error');
            return;
        }

        console.log(`Adding new department to staging area:`, newEntryData);

        // Get university_id and school_id from the selected university and school
        const selectedUniversity = universitiesData.find(uni => uni.name === newEntryData.university);
        const selectedSchool = schoolsData.find(
          (school) => school.name === newEntryData.school && school.university === newEntryData.university
        );

        if (!selectedUniversity || !selectedUniversity.id) {
            toast.error('Error: Selected university not found or missing ID.', 'error');
            return;
        }

        if (!selectedSchool || !selectedSchool.id) {
            toast.error('Error: Selected school not found or missing ID.', 'error');
            return;
        }

        // Add to staged entries instead of directly submitting
        const newStagedEntry = {
            id: `staged-${Date.now()}`,
            department: newEntryData.department.toUpperCase(),
            university: newEntryData.university,
            school: newEntryData.school,
            status: newEntryData.status || '',
            count: newEntryData.count ? parseInt(newEntryData.count) : 0,
            university_id: selectedUniversity.id,
            school_id: selectedSchool.id,
            manuallyAdded: true // Flag to identify manually added entries
        };

        setStagedEntries(prev => [...prev, newStagedEntry]);

        // Preserve university and school selection but clear department field
        setNewEntryData({
            ...initialNewEntryData,
            university: newEntryData.university,
            school: newEntryData.school
        });
    }
};

// Handler for creating new placement URL options
  const handleCreatePlacementUrl = (inputValue, isInlineEdit = false, isStaged = false, index = null) => {
    const newOption = { value: inputValue, label: inputValue };

    // Check if option already exists to prevent duplicates
    const optionExists = placementUrlOptions.some(option =>
      option.value.toLowerCase() === inputValue.toLowerCase()
    );

    if (!optionExists) {
      setPlacementUrlOptions(prev => [...prev, newOption]);
    }

    if (isInlineEdit) {
      // For inline editing, set the edit value and trigger save
      setEditValue(inputValue);
      // Use setTimeout to ensure the editValue is set before save is called
      setTimeout(() => {
        handleSave();
      }, 0);
    } else {
      // For form editing, set the value in the appropriate state
      if (isStaged && index !== null) {
        handleStagedEntryChange(index, 'placement_url', inputValue);
      } else {
        setNewEntryData(prev => ({
          ...prev,
          placement_url: inputValue
        }));
      }
    }

    return newOption;
  };

  const renderCellContent = (item, columnKey) => {
    const cellValue = item[columnKey];
    // For other types, continue with the existing editing logic
    if (editingCell && editingCell.id === item.id && editingCell.key === columnKey) {
      if (columnKey === 'country') {
        return (
          <CountryDropdown
            value={editValue}
            onChange={(selected) => {
              // Fix: Ensure we properly extract the value from the selected option
              const newValue = selected ? selected.value || selected : '';
              console.log('Country dropdown onChange:', { selected, newValue });
              setEditValue(newValue);
            }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder="Select country..."
            className="inline-edit-country-dropdown"
            autoFocus={true}
          />
        );
      } else if (columnKey === 'university' && type === 'school') {
        const universityOptions = (universitiesData || []).map(uni => ({
            value: uni.name,
            label: getFormattedUniversityName(uni.name, uni.country)
        }));
        const currentValue = universityOptions.find(option => option.value === editValue);

        return (
          <Select
            value={currentValue}
            onChange={(selected) => setEditValue(selected ? selected.value : '')}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            options={universityOptions}
            placeholder="Select university..."
            className="inline-edit-university-dropdown"
            classNamePrefix="react-select"
            autoFocus
            isClearable
            menuPortalTarget={document.body}
            styles={universitySelectStyles}
          />
        );
      } else if (columnKey === 'university' && (type === 'school' || type === 'department')) {
        const universityOptions = (universitiesData || []).map(uni => ({
            value: uni.name,
            label: getFormattedUniversityName(uni.name, uni.country)
        }));
        const currentValue = universityOptions.find(option => option.value === editValue);

        return (
          <Select
            value={currentValue}
            onChange={(selected) => setEditValue(selected ? selected.value : '')}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            options={universityOptions}
            placeholder="Select university..."
            className="inline-edit-university-dropdown"
            classNamePrefix="react-select"
            autoFocus
            isClearable
            menuPortalTarget={document.body}
            styles={universitySelectStyles}
          />
        );
      } else if (columnKey === 'school' && type === 'department') {
const schoolOptions = [
  { value: '', label: '-- Select School1 --' },  // default / null option
  ...(schoolsData || [])
    .filter(school => school.university === item.university)
    .map(school => ({ value: school.name, label: school.name }))
];

       const currentValue = schoolOptions.find(option => option.value === editValue);

        return (
          <Select
            value={currentValue}
            onChange={(selected) => setEditValue(selected ? selected.value : '')}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            options={schoolOptions}
            placeholder="Select school..."
            className="inline-edit-school-dropdown"
            classNamePrefix="react-select"
            autoFocus
            isClearable
            menuPortalTarget={document.body}
            styles={universitySelectStyles}
          />
        );
      } else if (columnKey === 'placement_url' && type === 'program') {
        const currentValue = placementUrlOptions.find(option => option.value === editValue) ||
                           (editValue ? { value: editValue, label: editValue } : null);

        return (
          <CreatableSelect
            value={currentValue}
            onChange={(selected) => {
              const newValue = selected ? selected.value : '';
              console.log('Placement URL dropdown onChange:', { selectedValue: newValue });
              setEditValue(newValue);
              handleSavePlacementUrl(item, newValue); // this updates data via onCellUpdate
            }}
            onCreateOption={(inputValue) => {
              // Add to options first
              const newOption = { value: inputValue, label: inputValue };
              console.log('Creating new placement URL option:', newOption);
              const optionExists = placementUrlOptions.some(option =>
                option.value.toLowerCase() === inputValue.toLowerCase()
              );
              
              if (!optionExists) {
                setPlacementUrlOptions(prev => [...prev, newOption]);
              }
              
              // Set the new value and immediately trigger save
              setEditValue(inputValue);
              // Trigger save immediately to update the actual row data
              handleSavePlacementUrl(item, inputValue);}}
            onBlur={() => setTimeout(handleSave, 5000)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setTimeout(handleSave, 5000);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
                setEditValue('');
              }
            }}
            options={placementUrlOptions}
            placeholder="Select or enter URL..."
            className="inline-edit-placement-dropdown"
            classNamePrefix="react-select"
            autoFocus
            isClearable
            formatCreateLabel={(inputValue) => `Create: ${inputValue}`}
            noOptionsMessage={({ inputValue }) =>
              inputValue ? `Press Enter to create "${inputValue}"` : "Type to create new URL"
            }
            menuPortalTarget={document.body}
            styles={{
              control: (provided, state) => ({
                ...provided,
                minWidth: 200,
                maxWidth: 400,
                padding: '0.1rem 0.2rem',
                fontSize: 'var(--font-size-small, 0.9rem)',
                border: `1px solid ${
                  state.isFocused
                    ? 'var(--primary-color-medium, #1a6985)'
                    : 'var(--border-color-light, #dee5ec)'
                }`,
                borderRadius: 'var(--border-radius-medium, 4px)',
                backgroundColor: state.isFocused
                  ? 'rgba(233, 246, 252, 0.5)'
                  : '#fff',
                color: 'var(--text-color-primary, #333)',
                cursor: 'pointer',
                fontWeight: '400',
                boxShadow: state.isFocused
                  ? '0 0 0 3px var(--focus-ring-color, rgba(26, 105, 133, 0.25))'
                  : 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  borderColor: 'var(--primary-color-medium, #1a6985)',
                }
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 9999,
                borderRadius: 'var(--border-radius-medium, 4px)',
                border: '1px solid var(--border-color-light, #dee5ec)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                fontSize: 'var(--font-size-small, 0.9rem)'
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected
                  ? 'var(--primary-color, #007bff)'
                  : state.isFocused
                  ? 'var(--bg-color-light, #f8f9fa)'
                  : '#fff',
                color: state.isSelected
                  ? '#fff'
                  : 'var(--text-color-primary, #333)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-small, 0.9rem)',
                fontWeight: state.isSelected ? '500' : '400',
                padding: '0.5rem 0.75rem',
                transition: 'background-color 0.15s, color 0.15s',
                '&:hover': {
                  backgroundColor: state.isSelected
                    ? 'var(--primary-color, #007bff)'
                    : 'var(--bg-color-light, #f8f9fa)'
                }
              }),
              singleValue: (provided) => ({
                ...provided,
                color: 'var(--text-color-primary, #333)',
                fontSize: 'var(--font-size-small, 0.9rem)',
                fontWeight: '400'
              }),
              placeholder: (provided) => ({
                ...provided,
                color: 'var(--text-color-secondary, #6c757d)',
                fontSize: 'var(--font-size-small, 0.9rem)'
              }),
              input: (provided) => ({
                ...provided,
                color: 'var(--text-color-primary, #333)',
                fontSize: 'var(--font-size-small, 0.9rem)'
              }),
              menuPortal: (provided) => ({
                ...provided,
                zIndex: 9999
              })
            }}
          />
        );
      } else if (columnKey === 'school' && type === 'program') {
        // Filter schools by the program's university and add empty option
        const schoolOptions = [
          { value: '', label: '-- No School --' },
          ...(schoolsData || [])
            .filter(school => school.university === item.university)
            .map(school => ({ value: school.name, label: school.name }))
        ];
        
        const currentValue = schoolOptions.find(option => option.value === editValue);

        return (
          <Select
            value={currentValue}
            isClearable={true}
            onChange={(selected) => {
              const schoolName = selected ? selected.value : '';
              setEditValue(schoolName);
              
              // For school field, we need to find the school ID and call onCellUpdate directly
              if (selected && selected.value) {
                const selectedSchool = schoolsData.find(
                  school => school.name === selected.value && school.university === item.university
                );
                const schoolId = selectedSchool ? selectedSchool.id : '';
                if (schoolId) {
                  // Call onCellUpdate with the school ID immediately
                  onCellUpdate(item.id, 'school', schoolName); // For legacy school field, send the name
                  // Close the editing mode
                  setEditingCell(null);
                  setEditValue('');
                }
              } else {
                // Handle clearing the school field
                onCellUpdate(item.id, 'school', '');
                setEditingCell(null);
                setEditValue('');
              }
            }}
            onBlur={() => {
              // Don't call handleSave for school fields as we handle it in onChange
              setEditingCell(null);
              setEditValue('');
            }}
            onKeyDown={handleKeyDown}
            options={schoolOptions}
            placeholder={schoolOptions.length > 0 ? "Select school..." : "No schools available"}
            className="inline-edit-school-dropdown"
            classNamePrefix="react-select"
            autoFocus
            isClearable
            isDisabled={!item.university || schoolOptions.length === 0}
            menuPortalTarget={document.body}
            styles={universitySelectStyles}
            noOptionsMessage={() => item.university ? `No schools found for ${item.university}` : "Please select a university first"}
          />
        );
      } else if ((columnKey === 'school_1' || columnKey === 'school_2' || columnKey === 'school_3') && type === 'program') {
        // Filter schools by the program's university for school_1, school_2, school_3
const schoolOptions = [
          { value: '', label: '-- No School --' },
          ...(schoolsData || [])
            .filter(school => school.university === item.university)
            .map(school => ({ value: school.name, label: school.name }))
        ];        
        const currentValue = schoolOptions.find(option => option.value === editValue);

        return (
          <Select
            value={currentValue}
            onChange={(selected) => {
              const schoolName = selected ? selected.value : '';
              setEditValue(schoolName);
              
              // For school_1, school_2, school_3, we need to find the school ID and call onCellUpdate directly
              if (selected && selected.value) {
                const selectedSchool = schoolsData.find(
                  school => school.name === selected.value && school.university === item.university
                );
                const schoolId = selectedSchool ? selectedSchool.id : '';
                if (schoolId) {
                  // Call onCellUpdate with the school ID immediately
                  onCellUpdate(item.id, columnKey, schoolId);
                  // Close the editing mode
                  setEditingCell(null);
                  setEditValue('');
                }
              } else {
                // Handle clearing the school field
                onCellUpdate(item.id, columnKey, '');
                setEditingCell(null);
                setEditValue('');
              }
            }}
            onBlur={() => {
              // Don't call handleSave for school fields as we handle it in onChange
              setEditingCell(null);
              setEditValue('');
            }}
            onKeyDown={handleKeyDown}
            options={schoolOptions}
            placeholder={schoolOptions.length > 0 ? `Select ${columnKey.replace('_', ' ')}...` : "No schools available"}
            className="inline-edit-school-dropdown"
            classNamePrefix="react-select"
            autoFocus
            isClearable
            isDisabled={!item.university || schoolOptions.length === 0}
            menuPortalTarget={document.body}
            styles={universitySelectStyles}
            noOptionsMessage={() => item.university ? `No schools found for ${item.university}` : "Please select a university first"}
          />
        );
      }
      return (
        <input
          type={columnKey === 'url' ? 'url' : 'text'}
          value={editValue}
          onChange={handleChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="inline-edit-input"
        />
      );
    }
    // Display as a link if it's a URL and not being edited
    if ((columnKey === 'url' || columnKey === 'placement_url') && typeof cellValue === 'string' && (cellValue.startsWith('http://') || cellValue.startsWith('https://'))) {
      return <a href={cellValue} target="_blank" rel="noopener noreferrer">{cellValue}</a>;
    }

    // University name as clickable link (if url exists)
    if (type === 'university' && columnKey === 'name') {
      if (item.url && typeof item.url === 'string' && (item.url.startsWith('http://') || item.url.startsWith('https://'))) {
        return (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 600 }}
            title={item.url}
          >
            {getFormattedUniversityName(item.name, item.country)}
          </a>
        );
      }
      return getFormattedUniversityName(item.name, item.country);
    }

    if ((type === 'school' || type === 'program') && columnKey === 'university') {
      const university = universityMap.get(item.university);
      return getFormattedUniversityName(item.university, university?.country);
    }

    if (columnKey === 'comment') {
      return cellValue ? (
        <span className="text-sm text-gray-800">{cellValue}</span>
      ) : (
        <span className="text-muted">No comment</span>
      );
    }

    // Handle school_1, school_2, school_3 display (they might be stored as school_1_name, etc.)
    if (columnKey === 'school_1' && type === 'program') {
      // If we don't have the resolved name but have the ID, try to resolve it locally
      let resolvedName = item.school_1_name;
      if (!resolvedName && item.school_1 && schoolsData) {
        const foundSchool = schoolsData.find(s => (s.id === item.school_1) || (s._id === item.school_1));
        if (foundSchool) {
          resolvedName = foundSchool.name;
        }
      }
      
      return resolvedName || item.school_1 || '';
    }
    if (columnKey === 'school_2' && type === 'program') {
      // If we don't have the resolved name but have the ID, try to resolve it locally
      let resolvedName = item.school_2_name;
      if (!resolvedName && item.school_2 && schoolsData) {
        const foundSchool = schoolsData.find(s => (s.id === item.school_2) || (s._id === item.school_2));
        if (foundSchool) {
          resolvedName = foundSchool.name;
        }
      }
      
      return resolvedName || item.school_2 || '';
    }
    if (columnKey === 'school_3' && type === 'program') {
      // If we don't have the resolved name but have the ID, try to resolve it locally
      let resolvedName = item.school_3_name;
      if (!resolvedName && item.school_3 && schoolsData) {
        const foundSchool = schoolsData.find(s => (s.id === item.school_3) || (s._id === item.school_3));
        if (foundSchool) {
          resolvedName = foundSchool.name;
        }
      }
      
      return resolvedName || item.school_3 || '';
    }

    // Special rendering for degree columns
    if (type === 'faculty' && (columnKey === 'bachelor' || columnKey === 'master' || columnKey === 'phd')) {
      if (!cellValue || cellValue.trim() === '') {
        return <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>;
      }
      const degreeClass = `degree-${columnKey}`;
      return <div className={`faculty-degree-column ${degreeClass}`}>{cellValue}</div>;
    }

    return cellValue;
  };

// (The rest of the component remains the same)
// ...

// Make sure to include the rest of the file from where `renderCellContent` ends
// to the export statement. I've omitted it here for brevity as no other changes
// are needed in those sections.
// ...

// (rest of the file from line 1600 onwards)
// ...

// Memoized Program Status Component to avoid recalculating status
const ProgramStatus = memo(({ item, scraping }) => {
  const status = useMemo(() => getProgramStatusOptimized(item, scraping), [item.placement_url, item.status, scraping]);
  return renderStatusBadge(status);
});

  const renderProgramCells = (item, isFormRow = false, isStaged = false) => {
    const isSimpleView = programViewMode === 'simple';
    
    switch (programViewMode) {
      case 'simple':
        return (
          <>
            <td>{isFormRow ? (
              <Select
                name="university"
                value={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) })).find(option => option.value === item.university)}
                onChange={(selected) => handleUniversityChange(selected ? selected.value : '', item)}
                options={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) }))}
                placeholder="Select University*"
                className="inline-edit-university-dropdown"
                classNamePrefix="react-select"
                isClearable
                menuPortalTarget={document.body}
                styles={universitySelectStyles}
                isDisabled={isStaged}
              />
            ) : renderCellContent(item, 'university')}</td>
                        <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'degree') : undefined}>
              {isFormRow ? (
                <Select
                  name="degree"
                  
                  value={degreeOptions && degreeOptions.find(    opt => opt.value.toLowerCase() === item.degree?.toLowerCase()
)}  defaultValue={degreeOptions.find(opt => opt.value === "PhD")} // ✅ Default to "PhD"

                  onChange={selected =>
                    isStaged
                      ? handleStagedEntryChange(item.index, 'degree', selected ? selected.value : '')
                      : setNewEntryData(prev => ({
                          ...prev,
                          degree: selected ? selected.value : ''
                        }))
                  }
                  options={degreeOptions}
                  className="inline-edit-university-dropdown"
                  classNamePrefix="react-select"
                  placeholder="Select degree"
                  isClearable={true}
                  styles={{
                    ...universitySelectStyles,
                    control: (provided) => ({
                      ...provided,
                      minWidth: 100, // Make the degree dropdown wider
                      maxWidth: 200,
                      fontSize: '1em'
                    }),
                    menu: (provided) => ({
                      ...provided,
                      minWidth: 180,
                      maxWidth: 260
                    }),
                    menuPortal: base => ({
                      ...base,
                      zIndex: 9999
                    })
                  }}
                />
              ) : renderCellContent(item, 'degree')}
            </td>
            <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'school') : undefined} style={{width:'150px'}}>{isFormRow ? (
              <Select
                name="school"
                value={item.school ? { value: item.school, label: item.school } : null}
                onChange={(selected) => handleSchoolChange(null, selected ? selected.value : '', item)}
                options={[
                  { value: '', label: '-- Select School --' },
                  ...(schoolsData || [])
                    .filter(school => school.university === item.university)
                    .map(school => ({ value: school.name, label: school.name }))
                ]}
                placeholder="Select School*"
                className="inline-edit-university-dropdown"
                classNamePrefix="react-select"
                isClearable
                isDisabled={!item.university || isStaged}
                menuPortalTarget={document.body}
                styles={universitySelectStyles}
              />
            ) : renderCellContent(item, 'school')}</td>
            <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'name') : undefined}>
              {isFormRow ? (
                <input
                  type="text"
                  name="name"
                  placeholder="Program Name*"
                  value={item.name || ''}
                  onChange={isStaged ? 
                    (e) => handleStagedEntryChange(item.index, 'name', e.target.value) :
                    handleNewEntryChange
                  }
                  className="inline-edit-input"
                />
              ) : renderCellContent(item, 'name')}
            </td>

            <td className="total-column">{renderCellContent(item, 'totalPreapprovedPlacements')}</td>
          </>
        );
        
      case 'all':
        return (
          <>
            <td>{isFormRow ? (
              <Select
          name="university"
          value={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) })).find(option => option.value === item.university)}
          onChange={(selected) => handleUniversityChange(selected ? selected.value : '', item)}
          options={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) }))}
          placeholder="Select University*"
          className="inline-edit-university-dropdown"
          classNamePrefix="react-select"
          isClearable
          menuPortalTarget={document.body}
          styles={universitySelectStyles}
          isDisabled={isStaged}
              />
            ) : renderCellContent(item, 'university')}</td>
            <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'school_1') : undefined}>{isFormRow ? (
              <Select
                name="school_1"
                value={item.school_1 ? { value: item.school_1, label: item.school_1 } : null}
                onChange={(selected) => {
                  // Update both item.school_1 and newEntryData.school_1 for form rows
                  if (item && item.index !== undefined) {
                    handleStagedEntryChange(item.index, 'school_1', selected ? selected.value : '');
                  } else {
                    setNewEntryData(prev => ({
                      ...prev,
                      school_1: selected ? selected.value : ''
                    }));
                  }
                }}
                options={(schoolsData || [])
                  .filter(school => school.university === item.university)
                  .map(school => ({ value: school.name, label: school.name }))
                }
                placeholder="Select School 1*"
                className="inline-edit-university-dropdown"
                classNamePrefix="react-select"
                isClearable
                isDisabled={!item.university || isStaged}
                menuPortalTarget={document.body}
                styles={universitySelectStyles}
              />
            ) : renderCellContent(item, 'school_1')}</td>
            <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'name') : undefined}>
              {isFormRow ? (
          <input
            type="text"
            name="name"
            placeholder="Program Name*"
            value={item.name || ''}
            onChange={isStaged ? 
              (e) => handleStagedEntryChange(item.index, 'name', e.target.value) :
              handleNewEntryChange
            }
            className="inline-edit-input"
          />
              ) : renderCellContent(item, 'name')}
            </td>
            <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'degree') : undefined}>
              {isFormRow ? (
          <Select
            name="degree"
            value={degreeOptions && degreeOptions.find(opt => opt.value.toLowerCase() === item.degree.toLowerCase())}
            onChange={selected =>
              isStaged
                ? handleStagedEntryChange(item.index, 'degree', selected ? selected.value : '')
                : setNewEntryData(prev => ({
              ...prev,
              degree: selected ? selected.value : ''
            }))
            }
            options={degreeOptions}
            className="inline-edit-university-dropdown"
            classNamePrefix="react-select"
            placeholder="Select degree"
            isClearable={false}
            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
            isDisabled={isStaged}
            styles={{
              ...universitySelectStyles,
              control: (provided) => ({
                ...provided,
                minWidth: 180,
                maxWidth: 260,
                fontSize: '1em'
              }),
              menu: (provided) => ({
                ...provided,
                minWidth: 180,
                maxWidth: 260
              }),
              menuPortal: base => ({
                ...base,
                zIndex: 9999
              })
            }}
          />
              ) : renderCellContent(item, 'degree')}
            </td>
            <td className="hide-on-form-visible">
              {typeof item.alert_flag !== 'undefined' && item.alert_flag
          ? <span style={{ color: '#d32f2f', fontWeight: 600 }}>Yes</span>
          : <span style={{ color: '#888' }}>No</span>
              }
            </td>
            <td  onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'url') : undefined}>
              {isFormRow ? (
          <input
            type="url"
            name="url"
            placeholder="Program URL (Optional)"
            value={item.url || ''}
            onChange={isStaged ? 
              (e) => handleStagedEntryChange(item.index, 'url', e.target.value) :
              handleNewEntryChange
            }
            className="inline-edit-input"
          />
              ) : renderCellContent(item, 'url')}
            </td>
            <td  onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'placement_url') : undefined}>
              {isFormRow ? (
          <CreatableSelect
            name="placement_url"
            value={placementUrlOptions.find(opt => opt.value === item.placement_url) || 
              (item.placement_url ? { value: item.placement_url, label: item.placement_url } : null)}
            onChange={(selected) => 
              isStaged
                ? handleStagedEntryChange(item.index, 'placement_url', selected ? selected.value : 'aa')
                : setNewEntryData(prev => ({
              ...prev,
              placement_url: selected ? selected.value : ''
            }))
            }
            onCreateOption={(inputValue) => handleCreatePlacementUrl(inputValue, false, isStaged, item.index)} // Pass correct parameters
            options={placementUrlOptions}
            placeholder="Select or enter placement URL..."
            className="inline-edit-placement-dropdown"
            classNamePrefix="react-select"
            isClearable
            formatCreateLabel={(inputValue) => `Create: ${inputValue}`}
            noOptionsMessage={({ inputValue }) => 
              inputValue ? `Press Enter to create "${inputValue}"` : "Type to create new URL"
            }
            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
            isDisabled={isStaged}
            styles={{
              control: (provided, state) => ({
                ...provided,
                minWidth: 200,
                maxWidth: 400,
                padding: '0.1rem 0.2rem',
                fontSize: 'var(--font-size-small, 0.9rem)',
                border: `1px solid ${
                  state.isFocused
                    ? 'var(--primary-color-medium, #1a6985)'
                    : 'var(--border-color-light, #dee5ec)'
                }`,
                borderRadius: 'var(--border-radius-medium, 4px)',
                backgroundColor: state.isFocused
                  ? 'rgba(233, 246, 252, 0.5)'
                  : isStaged 
                  ? '#f0f0f0' 
                  : '#fff',
                color: 'var(--text-color-primary, #333)',
                cursor: isStaged ? 'not-allowed' : 'pointer',
                fontWeight: '400',
                boxShadow: state.isFocused && !isStaged
                  ? '0 0 0 3px var(--focus-ring-color, rgba(26, 105, 133, 0.25))'
                  : 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  borderColor: !isStaged ? 'var(--primary-color-medium, #1a6985)' : 'var(--border-color-light, #dee5ec)',
                }
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 9999,
                borderRadius: 'var(--border-radius-medium, 4px)',
                border: '1px solid var(--border-color-light, #dee5ec)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                fontSize: 'var(--font-size-small, 0.9rem)'
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected
                  ? 'var(--primary-color, #007bff)'
                  : state.isFocused
                  ? 'var(--bg-color-light, #f8f9fa)'
                  : '#fff',
                color: state.isSelected
                  ? '#fff'
                  : 'var(--text-color-primary, #333)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-small, 0.9rem)',
                fontWeight: state.isSelected ? '500' : '400',
                padding: '0.5rem 0.75rem',
                transition: 'background-color 0.15s, color 0.15s',
                '&:hover': {
                  backgroundColor: state.isSelected
                    ? 'var(--primary-color, #007bff)'
                    : 'var(--bg-color-light, #f8f9fa)'
                }
              }),
              singleValue: (provided) => ({
                ...provided,
                color: 'var(--text-color-primary, #333)',
                fontSize: 'var(--font-size-small, 0.9rem)',
                fontWeight: '400'
              }),
              placeholder: (provided) => ({
                ...provided,
                color: 'var(--text-color-secondary, #6c757d)',
                fontSize: 'var(--font-size-small, 0.9rem)'
              }),
              input: (provided) => ({
                ...provided,
                color: 'var(--text-color-primary, #333)',
                fontSize: 'var(--font-size-small, 0.9rem)'
              }),
              menuPortal: (provided) => ({
                ...provided,
                zIndex: 9999
              })
            }}
          />
              ) : renderCellContent(item, 'placement_url')}
            </td>
            <td className="hide-on-form-visible" onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'run_comment') : undefined}>
              {isFormRow ? (
                <span className="text-muted">-</span>
              ) : (item.run_comment || '')}
            </td>
          {/* Error Comment column */}
          <td className="hide-on-form-visible"
            onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'error_comment') : undefined}
            title={typeof item.error_comment === 'string' ? item.error_comment : ''}
          >
            {isFormRow ? (
          <span className="text-muted">-</span>
            ) : (
          typeof item.error_comment === 'string' && item.error_comment.length > 100
            ? item.error_comment.slice(0, 100) + '...'
            : renderCellContent(item, 'error_comment')
            )}
          </td>
          <td className="hide-on-form-visible"
            onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'url_comment') : undefined}
            title={typeof item.url_comment === 'string' ? item.url_comment : ''}
          >
            {isFormRow ? (
          <span className="text-muted">-</span>
            ) : (
          typeof item.url_comment === 'string' && item.url_comment.length > 40
            ? item.url_comment.slice(0, 100) + '...'
            : renderCellContent(item, 'url_comment')
            )}
          </td>
          <td className="hide-on-form-visible"> {isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'scraperTag')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'url_selection_confidence')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'scrapingErrorDetails')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'timeToScrape')}</td>
          <td className="hide-on-form-visible total-column">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'totalPreapprovedPlacements')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'accepted')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'rejected')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'edited')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'manual')}</td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'school_2') : undefined}>{isFormRow ? (
              <Select
                name="school_2"
                value={item.school_2 ? { value: item.school_2, label: item.school_2 } : null}
                onChange={(selected) => {
                  if (item && item.index !== undefined) {
                    handleStagedEntryChange(item.index, 'school_2', selected ? selected.value : '');
                  } else {
                    setNewEntryData(prev => ({
                      ...prev,
                      school_2: selected ? selected.value : ''
                    }));
                  }
                }}
                options={(schoolsData || [])
                  .filter(school => school.university === item.university)
                  .map(school => ({ value: school.name, label: school.name }))
                }
                placeholder="Select School 2"
                className="inline-edit-university-dropdown"
                classNamePrefix="react-select"
                isClearable
                isDisabled={!item.university || isStaged}
                menuPortalTarget={document.body}
                styles={universitySelectStyles}
              />
            ) : renderCellContent(item, 'school_2')}</td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'school_3') : undefined}>{isFormRow ? (
              <Select
                name="school_3"
                value={item.school_3 ? { value: item.school_3, label: item.school_3 } : null}
                onChange={(selected) => {
                  if (item && item.index !== undefined) {
                    handleStagedEntryChange(item.index, 'school_3', selected ? selected.value : '');
                  } else {
                    setNewEntryData(prev => ({
                      ...prev,
                      school_3: selected ? selected.value : ''
                    }));
                  }
                }}
                options={(schoolsData || [])
                  .filter(school => school.university === item.university)
                  .map(school => ({ value: school.name, label: school.name }))
                }
                placeholder="Select School 3"
                className="inline-edit-university-dropdown"
                classNamePrefix="react-select"
                isClearable
                isDisabled={!item.university || isStaged}
                menuPortalTarget={document.body}
                styles={universitySelectStyles}
              />
            ) : renderCellContent(item, 'school_3')}</td>        </>
      );
      
    case 'programInfo':
      return (
        <>
          <td>{isFormRow ? (
            <Select
              name="university"
              value={universityOptions.find(option => option.value === item.university)}
              onChange={(selected) => handleUniversityChange(selected ? selected.value : '', item)}
              options={universityOptions}
              placeholder="Select University*"
              className="inline-edit-university-dropdown"
              classNamePrefix="react-select"
              isClearable
              menuPortalTarget={document.body}
              styles={universitySelectStyles}
              isDisabled={isStaged}
            />
          ) : renderCellContent(item, 'university')}</td>
          
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'school') : undefined}>{isFormRow ? (
            <Select
              name="school"
              value={item.school ? { value: item.school, label: item.school } : null}
              onChange={(selected) => handleSchoolChange(null, selected ? selected.value : '')}
              options={(schoolsData || [])
                .filter(school => school.university === item.university)
                .map(school => ({ value: school.name, label: school.name }))
              }
              placeholder="Select School*"
              className="inline-edit-university-dropdown"
              classNamePrefix="react-select"
              isClearable
              isDisabled={!item.university || isStaged}
              menuPortalTarget={document.body}
              styles={universitySelectStyles}
            />
          ) : renderCellContent(item, 'school')}</td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'name') : undefined}>
            {isFormRow ? (
              <input
                type="text"
                name="name"
                placeholder="Program Name*"
                value={item.name || ''}
                onChange={isStaged ? 
                  (e) => handleStagedEntryChange(item.index, 'name', e.target.value) :
                  handleNewEntryChange
                }
                className="inline-edit-input"
              />
            ) : renderCellContent(item, 'name')}
          </td>
          <td>{renderCellContent(item, 'degree')} </td>
          <td>
            {isFormRow ? (
              <input
                type="url"
                name="url"
                placeholder="Program URL (Optional)"
                value={item.url || ''}
                onChange={isStaged ? 
                  (e) => handleStagedEntryChange(item.index, 'url', e.target.value) :
                  handleNewEntryChange
                }
                className="inline-edit-input"
              />
            ) : renderCellContent(item, 'url')}
          </td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'placement_url') : undefined}>
            {isFormRow ? (
              <CreatableSelect
                name="placement_url"
                value={placementUrlOptions.find(opt => opt.value === item.placement_url) || 
                       (item.placement_url ? { value: item.placement_url, label: item.placement_url } : null)}
                onChange={(selected) => 
                  isStaged
                    ? handleStagedEntryChange(item.index, 'placement_url', selected ? selected.value : '')
                    : setNewEntryData(prev => ({
                        ...prev,
                        placement_url: selected ? selected.value : ''
                      }))
                }
                onCreateOption={(inputValue) => handleCreatePlacementUrl(inputValue, false, isStaged, item.index)} // Pass correct parameters
                options={placementUrlOptions}
                placeholder="Select or enter placement URL..."
                className="inline-edit-placement-dropdown"
                classNamePrefix="react-select"
                isClearable
                formatCreateLabel={(inputValue) => `Create: ${inputValue}`}
                noOptionsMessage={({ inputValue }) => 
                  inputValue ? `Press Enter to create "${inputValue}"` : "Type to create new URL"
                }
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                isDisabled={isStaged}
                styles={{
                  control: (provided, state) => ({
                    ...provided,
                    minWidth: 200,
                    maxWidth: 400,
                    padding: '0.1rem 0.2rem',
                    fontSize: 'var(--font-size-small, 0.9rem)',
                    border: `1px solid ${
                      state.isFocused
                        ? 'var(--primary-color-medium, #1a6985)'
                        : 'var(--border-color-light, #dee5ec)'
                    }`,
                    borderRadius: 'var(--border-radius-medium, 4px)',
                    backgroundColor: state.isFocused
                      ? 'rgba(233, 246, 252, 0.5)'
                      : isStaged 
                      ? '#f0f0f0' 
                      : '#fff',
                    color: 'var(--text-color-primary, #333)',
                    cursor: isStaged ? 'not-allowed' : 'pointer',
                    fontWeight: '400',
                    boxShadow: state.isFocused && !isStaged
                      ? '0 0 0 3px var(--focus-ring-color, rgba(26, 105, 133, 0.25))'
                      : 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      borderColor: !isStaged ? 'var(--primary-color-medium, #1a6985)' : 'var(--border-color-light, #dee5ec)',
                    }
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 9999,
                    borderRadius: 'var(--border-radius-medium, 4px)',
                    border: '1px solid var(--border-color-light, #dee5ec)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    fontSize: 'var(--font-size-small, 0.9rem)'
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isSelected
                      ? 'var(--primary-color, #007bff)'
                      : state.isFocused
                      ? 'var(--bg-color-light, #f8f9fa)'
                      : '#fff',
                    color: state.isSelected
                      ? '#fff'
                      : 'var(--text-color-primary, #333)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-small, 0.9rem)',
                    fontWeight: state.isSelected ? '500' : '400',
                    padding: '0.5rem 0.75rem',
                    transition: 'background-color 0.15s, color 0.15s',
                    '&:hover': {
                      backgroundColor: state.isSelected
                        ? 'var(--primary-color, #007bff)'
                        : 'var(--bg-color-light, #f8f9fa)'
                    }
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: 'var(--text-color-primary, #333)',
                    fontSize: 'var(--font-size-small, 0.9rem)',
                    fontWeight: '400'
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: 'var(--text-color-secondary, #6c757d)',
                    fontSize: 'var(--font-size-small, 0.9rem)'
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: 'var(--text-color-primary, #333)',
                    fontSize: 'var(--font-size-small, 0.9rem)'
                  }),
                  menuPortal: (provided) => ({
                    ...provided,
                    zIndex: 9999
                  })
                }}
              />
            ) : renderCellContent(item, 'placement_url')}
          </td>
          <td className="hide-on-form-visible">
            {renderCellContent(item, 'run_comment')}
          </td>
          {/* Error Comment column */}
          <td className="hide-on-form-visible"
            onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'error_comment') : undefined}
            title={typeof item.error_comment === 'string' ? item.error_comment : ''}
          >
            {isFormRow ? (
          <span className="text-muted">-</span>
            ) : (
          typeof item.error_comment === 'string' && item.error_comment.length > 100
            ? item.error_comment.slice(0, 100) + '...'
            : renderCellContent(item, 'error_comment')
            )}
          </td>
          <td className="hide-on-form-visible"
            onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'url_comment') : undefined}
            title={typeof item.url_comment === 'string' ? item.url_comment : ''}
          >
            {isFormRow ? (
          <span className="text-muted">-</span>
            ) : (
          typeof item.url_comment === 'string' && item.url_comment.length > 40
            ? item.url_comment.slice(0, 100) + '...'
            : renderCellContent(item, 'url_comment')
            )}
          </td>
          <td className="hide-on-form-visible"
            onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'scraperTag') : undefined}
            title={typeof item.scraperTag === 'string' ? item.scraperTag : ''}
          >
            {isFormRow ? (
          <span className="text-muted">-</span>
            ) : (
          typeof item.scraperTag === 'string' && item.scraperTag.length > 40
            ? item.scraperTag.slice(0, 100) + '...'
            : renderCellContent(item, 'scraperTag')
            )}
          </td>
          <td className="hide-on-form-visible"
            onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'url_selection_confidence') : undefined}
            title={typeof item.url_selection_confidence === 'string' ? item.url_selection_confidence : ''}
          >
            {isFormRow ? (
          <span className="text-muted">-</span>
            ) : (
          typeof item.url_selection_confidence === 'string' && item.url_selection_confidence.length > 40
            ? item.url_selection_confidence.slice(0, 100) + '...'
            : renderCellContent(item, 'url_selection_confidence')
            )}

          </td>
          <td className="total-column"
            onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'totalPreapprovedPlacements') : undefined}
            title={typeof item.totalPreapprovedPlacements === 'string' ? item.totalPreapprovedPlacements : ''}
          >
            {isFormRow ? (
          <span className="text-muted">-</span>
            ) : (
          typeof item.totalPreapprovedPlacements === 'string' && item.totalPreapprovedPlacements.length > 40
            ? item.totalPreapprovedPlacements.slice(0, 100) + '...'
            : renderCellContent(item, 'totalPreapprovedPlacements')
            )}
          </td>
        </>
      );
      
    case 'placementInfo':
      return (
        <>
          <td >{isFormRow ? (
            <Select
              name="university"
              value={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) })).find(option => option.value === item.university)}
              onChange={(selected) => handleUniversityChange(selected ? selected.value : '', item)}
              options={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) }))}
              placeholder="Select University*"
              className="inline-edit-university-dropdown"
              classNamePrefix="react-select"
              isClearable
              menuPortalTarget={document.body}
              styles={universitySelectStyles}
              isDisabled={isStaged}
            />
          ) : renderCellContent(item, 'university')}</td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'school') : undefined}>{isFormRow ? (
            <Select
              name="school"
              value={item.school ? { value: item.school, label: item.school } : null}
              onChange={(selected) => handleSchoolChange(selected ? selected.value : '')}
              options={(schoolsData || [])
                .filter(school => school.university === item.university)
                .map(school => ({ value: school.name, label: school.name }))
              }
              placeholder="Select School*"
              className="inline-edit-university-dropdown"
              classNamePrefix="react-select"
              isClearable
              isDisabled={!item.university || isStaged}
              menuPortalTarget={document.body}
              styles={universitySelectStyles}
            />
          ) : renderCellContent(item, 'school')}</td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'name') : undefined}>
            {isFormRow ? (
              <input
                type="text"
                name="name"
                placeholder="Program Name*"
                value={item.name || ''}
                onChange={isStaged ? 
                  (e) => handleStagedEntryChange(item.index, 'name', e.target.value) :
                  handleNewEntryChange
                }
                className="inline-edit-input"
              />
            ) : renderCellContent(item, 'name')}
          </td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'degree') : undefined}>
            {isFormRow ? (
              <Select
                name="degree"
                className="inline-edit-university-dropdown"
                value={degreeOptions && degreeOptions.find(opt => opt.value === item.degree)}
                onChange={selected =>
                  isStaged
                    ? handleStagedEntryChange(item.index, 'degree', selected ? selected.value : '')
                    : setNewEntryData(prev => ({
                          ...prev,
                          degree: selected ? selected.value : ''
                        }))
                }
                options={degreeOptions}
                classNamePrefix="react-select"
                placeholder="Select degree"
                isClearable={false}
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                isDisabled={isStaged}
                styles={{
                  ...universitySelectStyles,
                  control: (provided) => ({
                    ...provided,
                    minWidth: 180, // Make the degree dropdown wider
                    maxWidth: 260,
                    fontSize: '1em'
                  }),
                  menu: (provided) => ({
                    ...provided,
                    minWidth: 180,
                    maxWidth: 260
                  }),
                  menuPortal: base => ({
                    ...base,
                    zIndex: 9999
                  })
                }}
              />
            ) : renderCellContent(item, 'degree')}
          </td>
          <td className=" hide-on-form-visible total-column">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'totalPreapprovedPlacements')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'accepted')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'rejected')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'edited')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'manual')}</td>
        </>
      );
      
    case 'scraperInfo':
      return (
        <>          <td>{isFormRow ? (
            <Select
              name="university"
              value={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) })).find(option => option.value === item.university)}
              onChange={(selected) => handleUniversityChange(selected ? selected.value : '', item)}
              options={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) }))}
              placeholder="Select University*"
              className="inline-edit-university-dropdown"
              classNamePrefix="react-select"
              isClearable
              menuPortalTarget={document.body}
              styles={universitySelectStyles}
              isDisabled={isStaged}
            />
          ) : renderCellContent(item, 'university')}</td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'school') : undefined}>{isFormRow ? (
            <Select
              name="school"
              value={item.school ? { value: item.school, label: item.school } : null}
              onChange={(selected) => handleSchoolChange(selected ? selected.value : '')}
              options={(schoolsData || [])
                .filter(school => school.university === item.university)
                .map(school => ({ value: school.name, label: school.name }))
              }
              placeholder="Select School*"
              className="inline-edit-university-dropdown"
              classNamePrefix="react-select"
              isClearable
              isDisabled={!item.university || isStaged}
              menuPortalTarget={document.body}
              styles={universitySelectStyles}
            />
          ) : renderCellContent(item, 'school')}</td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'name') : undefined}>
            {isFormRow ? (
              <input
                type="text"
                name="name"
                placeholder="Program Name*"
                value={item.name || ''}
                onChange={isStaged ? 
                  (e) => handleStagedEntryChange(item.index, 'name', e.target.value) :
                  handleNewEntryChange
                }
                className="inline-edit-input"
              />
            ) : renderCellContent(item, 'name')}
          </td>
          <td onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'degree') : undefined}>
            {isFormRow ? (
              <Select
                name="degree"
                value={degreeOptions && degreeOptions.find(opt => opt.value === item.degree)}
                onChange={selected =>
                  isStaged
                    ? handleStagedEntryChange(item.index, 'degree', selected ? selected.value : '')
                    : setNewEntryData(prev => ({
                          ...prev,
                          degree: selected ? selected.value : ''
                        }))
                }
                options={degreeOptions}
                className="inline-edit-university-dropdown"
                classNamePrefix="react-select"
                placeholder="Select degree"
                isClearable={false}
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                isDisabled={isStaged}
                styles={{
                  ...universitySelectStyles,
                  control: (provided) => ({
                    ...provided,
                    minWidth: 180, // Make the degree dropdown wider
                    maxWidth: 260,
                    fontSize: '1em'
                  }),
                  menu: (provided) => ({
                    ...provided,
                    minWidth: 180,
                    maxWidth: 260
                  }),
                  menuPortal: base => ({
                    ...base,
                    zIndex: 9999
                  })
                }}
              />
            ) : renderCellContent(item, 'degree')}
          </td>
                      <td className="hide-on-form-visible">
              {typeof item.alert_flag !== 'undefined' && item.alert_flag
          ? <span style={{ color: '#d32f2f', fontWeight: 600 }}>Yes</span>
          : <span style={{ color: '#888' }}>No</span>
              }
            </td>

          <td className="hide-on-form-visible">{  renderCellContent(item, 'run_comment')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'error_comment')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'scraperTag')}</td>
          <td className="hide-on-form-visible" onDoubleClick={!isFormRow ? () => handleDoubleClick(item, 'scrapingErrorDetails') : undefined}>
            {isFormRow ? <span className="text-muted">-</span> : (
              typeof item.scrapingErrorDetails === 'string'
                ? item.scrapingErrorDetails.length > 40
                  ? item.scrapingErrorDetails.slice(0, 37) + '...'
                  : item.scrapingErrorDetails
                : renderCellContent(item, 'scrapingErrorDetails')
            )}
          </td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : renderCellContent(item, 'timeToScrape')}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : (
            typeof item.url_selection_confidence === 'string' && item.url_selection_confidence.length > 40
              ? item.url_selection_confidence.slice(0, 37) + '...'
              : renderCellContent(item, 'url_selection_confidence')
          )}</td>
          <td className="hide-on-form-visible">{isFormRow ? <span className="text-muted">-</span> : (
            typeof item.totalPreapprovedPlacements === 'string' && item.totalPreapprovedPlacements.length > 40
              ? item.totalPreapprovedPlacements.slice(0, 37) + '...'
              : renderCellContent(item, 'totalPreapprovedPlacements')
          )}</td>
        </>
      );
      
    default:
      return null;
    }
  };

  const renderProgramRow = (item, index, isStaged = false) => {
    return (
      <tr
        key={item.id || index}
        className={highlightedRowId === item.id ? 'highlighted-row' : ''}
        // Removed onClick handler for row clickability
      >
        {/* Eye icon cell at the start of the row */}
        <td className="eye-icon-cell">
          <a
            className="eye-icon-button"
            href={`/admin/program-view/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View details"
            aria-label="View details"
            tabIndex={0}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <FaEye />
          </a>
          <button
            className="info-delete-button"
            title="Delete program"
            aria-label="Delete program"
            style={{ marginLeft: '8px', fontSize: '1.1em', background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', verticalAlign: 'middle' }}
            onClick={() => onDelete(item.id)}
          >
            -
          </button>
        </td>
        {/* Status cell: show status from data */}
        <td>
          {item.status ? (
            <span>{item.status}</span>
          ) : (
            renderStatusBadge(getProgramStatusOptimized(item))
          )}
        </td>
        <td>
          {item.scraperTag}
        </td>
        {/* Render the rest of the program cells as before */}
        {renderProgramCells(item, false, isStaged)}
        <td className="actions-column-cell actions-column">
          {/* Empty actions cell for normal rows */}
        </td>
      </tr>
    );
   };

  return (
    <div 
      className={`admin-table-container${type === 'faculty' ? ' admin-table-faculty-container' : ''}`}
      style={programViewMode !== 'simple' && type === 'program' ? { overflowX: 'auto' } : {}}
    >
      {(type === 'school' || type === 'program' || type === 'department') && stagedEntries.length > 0 && (
        <div className="staged-entries-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          padding: '10px 15px',
          backgroundColor: 'rgba(255, 249, 230, 0.8)',
          borderRadius: '8px',
          border: '1px solid rgba(240, 195, 109, 0.3)'
        }}>
          <div className="staged-entries-info">
            <strong>{stagedEntries.length} {type.charAt(0).toUpperCase() + type.slice(1)}(s)</strong> staged for submission
          </div>
          <button
            onClick={handleSubmitStaged}
            className="button button-primary"
            disabled={isSubmittingStaged}
          >
            {isSubmittingStaged ? 'Submitting...' : `Submit ${stagedEntries.length} Staged ${type.charAt(0).toUpperCase() + type.slice(1)}(s)`}
          </button>
        </div>
      )}
      <table
        className={
          (type === 'program'
            ? programViewMode === 'scraperInfo'
              ? 'admin-table admin-table-program full-program-view scraper-view'
              : programViewMode !== 'simple'
                ? 'admin-table admin-table-program full-program-view'
                : 'admin-table admin-table-program simple-program-view'
            : `admin-table admin-table-${type}`) +
          (showInlineAddForm || (newEntriesData && newEntriesData.length > 0) ? ' add-form-visible' : '')
        }
      >
        <thead>
          <tr>
            {visibleHeaders.map(header => {
              const sortKey = sortableColumns[type]?.[header];
              const isSortable = !!sortKey;
              
              const sortClasses = [];
              if (isSortable) {
                sortClasses.push('sortable-header');
                if (sortConfig?.key === sortKey) {
                  sortClasses.push(sortConfig.direction === 'ascending' ? 'sorted-asc' : 'sorted-desc');
                }
              }
              const extraClasses = [];
              if (['Error',      'Run Comment','Run comment',  
   'Url Confidence','Scraper Summary',
            'Error Comment', 'Url Comment', 'Scraper', 'Confidence', 'Scraper Comment', 'Scraper Time', 'Total', 'Accepted', 'Rejected', 'Edited', 'Manual'].includes(header)) {
                extraClasses.push('hide-on-form-visible');
              }

 return (
                <th 
                  key={header} 
                  className={[
                    ...sortClasses,
                    ...extraClasses,
                    header === 'Actions' ? 'actions-column' : '',
                    header === 'Total' ? 'total-column' : '',
                    (header === 'University Name' || header === 'University') ? 'university-column' : '',
                    header === 'AI' ? 'gen-button-column' : ''
                  ].filter(Boolean).join(' ')}
                                                                     onClick={isSortable ? () => onSort(sortKey) : undefined}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {/* Add New Entry Row - Conditionally Rendered */}
          {type === 'university' && newEntriesData && newEntriesData.map((entry, index) => (
            <tr key={entry.id} className="add-new-row" data-row-id={entry.id}>
              <td className="serial-number-cell">
                <span className="new-entry-indicator">NEW</span>
              </td>
              <td className="university-column">
                <input
                  type="text"
                  name="name"
                  placeholder="University Name*"
                  value={entry.name}
                  onChange={(e) => onNewEntryChange(index, 'name', e.target.value)}
                  className="inline-edit-input"
                />
              </td>
              {type==='program'}
              <td>
                <CountryDropdown
                  value={entry.country}
                  onChange={(value) => onNewEntryChange(index, 'country', value || "")}
                  placeholder="Select country*"
                  className="inline-edit-country-dropdown"
                />
              </td>
              <td>
                <input
                  type="url"
                  name="url"
                  placeholder="University URL (Optional)"
                  value={entry.url}
                  onChange={(e) => onNewEntryChange(index, 'url', e.target.value)}
                  className="inline-edit-input"
                />

                
              </td>
                            <td>0</td>
<td>0</td>
              <td className="actions-column-cell actions-column">
                <div className="multi-action-buttons">
                  {index !== 0 && (
                    <button onClick={() => handleRemoveNewEntryWithConfirmation(index)} className="button-remove-row" aria-label="Remove row"></button>
                  )}
                  {index === 0 && (
                    <button onClick={() => onInsertRow(index)} className="button-add-row" aria-label="Add row below">+ Add</button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {showInlineAddForm && type === 'school' && (
            <tr className="add-new-row">
              <td className="serial-number-cell">
                <span className="new-entry-indicator">NEW</span>
              </td>
              <td className="university-column">
                <Select
                  name="university"
                  value={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) })).find(option => option.value === newEntryData.university)}
                  onChange={(selected) => handleUniversityChange(selected ? selected.value : '')}
                  options={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) }))}
                  placeholder="Select University*"
                  className="inline-edit-university-dropdown"
                  classNamePrefix="react-select"
                  isClearable
                  menuPortalTarget={document.body}
                  styles={universitySelectStyles}
                />
              </td>
              <td>
                <input
                  type="text"
                  name="name"
                  placeholder="School Name*"
                  value={newEntryData.name}
                  onChange={handleNewEntryChange}
                  className="inline-edit-input"
                />
              </td>
              <td>
                <input
                  type="url"
                  name="url"
                  placeholder="School URL (Optional)"
                  value={newEntryData.url}
                  onChange={handleNewEntryChange}
                  className="inline-edit-input"
                />
              </td>
              <td>0</td>
              <td className="actions-column-cell actions-column">
                <div className="button-group">
                  <button 
                    onClick={handleGenerateSchoolInfoClick}
                    className="gen-image-button"
                    disabled={!newEntryData.university || isGeneratingInfo}
                    title="Generate with AI"
                  >
                    {isGeneratingInfo ? '...' : <img src={genImage} alt="Gen" />}
                  </button>
                  <button 
                    onClick={handleAddNewEntryClick} 
                    className="button-add-row"
                    title="Add school"
                    aria-label="Add school"
                  >
                    +
                  </button>
                </div>
              </td>
            </tr>
          )}

          {showInlineAddForm && type === 'department' && (
            <tr className="add-new-row">
              <td className="serial-number-cell">
                <span className="new-entry-indicator">NEW</span>
              </td>
              <td className="university-column">
                <Select
                  name="university"
                  value={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) })).find(option => option.value === newEntryData.university)}
                  onChange={(selected) => handleUniversityChange(selected ? selected.value : '')}
                  options={(universitiesData || []).map(uni => ({ value: uni.name, label: getFormattedUniversityName(uni.name, uni.country) }))}
                  placeholder="Select University*"
                  className="inline-edit-university-dropdown"
                  classNamePrefix="react-select"
                  isClearable
                  menuPortalTarget={document.body}
                  styles={universitySelectStyles}
                />
              </td>
              <td>
                <Select
                  name="school"
                  value={schoolOptions.find(option => option.value === newEntryData.school)}
                  onChange={(selected) => handleSchoolChange('school', selected ? selected.value : '')}
                  options={schoolOptions.filter(school => 
                    schoolsData.find(s => s.name === school.value)?.university === newEntryData.university
                  )}
                  placeholder="Select School*"
                  className="inline-edit-school-dropdown"
                  classNamePrefix="react-select"
                  isClearable
                  menuPortalTarget={document.body}
                  styles={universitySelectStyles}
                  isDisabled={!newEntryData.university}
                />
              </td>
              <td>
                <input
                  type="text"
                  name="department"
                  placeholder="Department Name*"
                  value={newEntryData.department}
                  onChange={handleNewEntryChange}
                  className="inline-edit-input"
                />
              </td>
              <td className="actions-column-cell actions-column"></td>
              <td className="actions-column-cell actions-column"></td>
              <td className="actions-column-cell actions-column">
                <div className="button-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <button 
                    onClick={handleGenerateDepartmentInfoClick}
                    className="gen-image-button"
                    disabled={!newEntryData.university || !newEntryData.school || isGeneratingInfo}
                    title="Generate with AI"
                  >
                    {isGeneratingInfo ? '...' : <img src={genImage} alt="Gen" />}
                  </button>
                  <button 
                    onClick={handleAddNewEntryClick} 
                    className="button-add-row"
                    title="Add department"
                    aria-label="Add department"
                  >
                    +
                  </button>
                </div>
              </td>
            </tr>
          )}

          {showInlineAddForm && type === 'program' && (
            <tr className="add-new-row">
              <td className="serial-number-cell">
                <span className="new-entry-indicator">NEW</span>
              </td>
              <td>
                <span className="status-badge status-pending">Pending</span>
              </td>
              <td className="actions-column-cell actions-column">
                <div className="button-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <button 
                    onClick={handleGenerateProgramInfoClick}
                    className="gen-image-button"
                    title="Generate with AI"
                    disabled={!newEntryData.university || isGeneratingInfo}
                  >
                    {isGeneratingInfo ? '...' : <img src={genImage} alt="Gen" />}
                  </button>
                  <button 
                    onClick={handleAddNewEntryClick} 
                    className="button-add-row"
                    title="Add program"
                    aria-label="Add program"
                  >
                    +
                  </button>
                </div>
              </td>
              {renderProgramCells(newEntryData, true, false)}
            </tr>
          )}

          {/* Staged School Entries */}
          {type === 'school' && stagedEntries.map((entry, index) => (
            <tr key={entry.id} className="add-new-row staged-row highlighted-staged-row">
              <td className="serial-number-cell">
                <span className="new-entry-indicator">STAGED</span>
              </td>
              <td className="university-column">
                <input
                  type="text"
                  value={entry.university}
                  readOnly
                  className="inline-edit-input"
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </td>
              <td>
                <input
                  type="text"
                  name="name"
                  placeholder="School Name*"
                  value={entry.name}
                  onChange={(e) => handleStagedEntryChange(index, 'name', e.target.value)}
                  className="inline-edit-input"
                />
              </td>
              <td>
                <input
                  type="url"
                  name="url"
                  placeholder="School URL (Optional)"
                  value={entry.url}
                  onChange={(e) => handleStagedEntryChange(index, 'url', e.target.value)}
                  className="inline-edit-input"
                />
              </td>
              <td>0</td>
              <td className="actions-column-cell actions-column">
                <button onClick={() => handleRemoveStagedEntryWithConfirmation(entry, index, 'school')} className="button-remove-row" aria-label="Remove staged entry"></button>
              </td>
            </tr>
          ))}

          {/* Staged Department Entries */}
          {type === 'department' && stagedEntries.map((entry, index) => (
            <tr key={entry.id} className="add-new-row staged-row highlighted-staged-row">
              <td className="serial-number-cell">
                <span className="new-entry-indicator">STAGED</span>
              </td>
              <td className="university-column">
                <input
                  type="text"
                  value={entry.university}
                  readOnly
                  className="inline-edit-input"
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={entry.school}
                  readOnly
                  className="inline-edit-input"
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </td>
              <td>
                <input
                  type="text"
                  name="department"
                  placeholder="Department Name*"
                  value={entry.department}
                  onChange={(e) => handleStagedEntryChange(index, 'department', e.target.value)}
                  className="inline-edit-input"
                />
              </td>
              <td>
                <input
                  type="text"
                  name="status"
                  placeholder="Status"
                  value={entry.status || ''}
                  onChange={(e) => handleStagedEntryChange(index, 'status', e.target.value)}
                  className="inline-edit-input"
                />
              </td>
              <td>
                <input
                  type="number"
                  name="count"
                  placeholder="Count"
                  value={entry.count || ''}
                  onChange={(e) => handleStagedEntryChange(index, 'count', e.target.value)}
                  className="inline-edit-input"
                />
              </td>
              <td className="actions-column-cell actions-column">
                <button onClick={() => handleRemoveStagedEntryWithConfirmation(entry, index, 'department')} className="button-remove-row" aria-label="Remove staged entry"></button>
              </td>
            </tr>
          ))}

          {/* Staged Program Entries */}
          {type === 'program' && stagedEntries.map((entry, index) => (
            <tr key={entry.id} className="add-new-row staged-row highlighted-staged-row">
              <td className="serial-number-cell">
                <span className="new-entry-indicator">STAGED</span>
              </td>
              <td>
                <ProgramStatus item={entry} scraping={scraping} />
              </td>
              <td className="actions-column-cell actions-column">
                <button onClick={() => handleRemoveStagedEntryWithConfirmation(entry, index, 'program')} className="button-remove-row" aria-label="Remove staged entry"></button>
              </td>
              {renderProgramCells({...entry, index}, true, true)}
            </tr>
          ))}

          {/* Data Rows - Using Optimized Component */}
          {tableData.map((item, index) => (
            <OptimizedTableRow
              key={item.id}
              item={item}
              index={index}
              type={type}
              copiedId={copiedId}
              highlightedRowId={highlightedRowId}
              handleIdClick={handleIdClick}
              handleDoubleClick={handleDoubleClick}
              renderCellContent={renderCellContent}
              onDelete={onDelete}
              handleDeleteWithConfirmation={handleDeleteWithConfirmation}
              scraping={scraping}
              renderProgramCells={renderProgramCells}
              highlightType={getRowHighlightType(item)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};


export default AdminTable;