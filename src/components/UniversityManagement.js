import React, { useState, useMemo } from 'react';
import AdminTable from './AdminTable';
import { toast } from 'react-toastify';
import Select from 'react-select';
const UniversityManagement = ({
  universitiesData,
  isLoading,
  error,
  onAddUniversity,
  onUpdateUniversity,
  onDeleteUniversity,
  onImportResults,
  importResults,
}) => {
  const [newEntries, setNewEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [showReverseJson, setShowReverseJson] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [reversedJson, setReversedJson] = useState('');
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [localImportResults, setLocalImportResults] = useState(null);

  const handleAddRow = () => {
    const newRow = { id: `new-${Date.now()}`, name: '', country: '', url: '' };
    setNewEntries(prev => [...prev, newRow]);
    console.log('New university row added:', newRow);
  };

  const handleInsertRow = (index) => {
    const newId = `new-${Date.now()}`;
    const newEntry = { id: newId, name: '', country: '', url: '' };
    const updatedEntries = [...newEntries];
    updatedEntries.splice(index + 1, 0, newEntry);
    setNewEntries(updatedEntries);

    setTimeout(() => {
      const newRowInput = document.querySelector(`[data-row-id='${newId}'] input[name='name']`);
      if (newRowInput) {
        newRowInput.focus();
      }
    }, 100);
  };

  const handleNewEntryChange = (index, field, value) => {
    const updatedEntries = [...newEntries];
    // Add null/undefined check and ensure value is a string before calling toUpperCase
    const safeValue = value ?? '';
    const processedValue = (field === 'url') ? safeValue : String(safeValue).toUpperCase();

    updatedEntries[index][field] = processedValue;
    setNewEntries(updatedEntries);
    
  };

  const handleRemoveNewEntry = (index) => {
    const updatedEntries = [...newEntries];
    updatedEntries.splice(index, 1);
    setNewEntries(updatedEntries);
  };

  const handleCancelForm = () => {
    setNewEntries([]);
  };

  const handleSubmitAll = () => {
    const entriesToSubmit = newEntries.filter(entry => entry.name && entry.country);

    if (entriesToSubmit.length === 0) {
      toast.error("No valid entries to submit. Please fill in at least University Name and Country for each row.", "error");
      return;
    }

    const entrySet = new Set();
    for (const entry of entriesToSubmit) {
        const key = `${entry.name.trim()}-${entry.country.trim()}`;
        if (entrySet.has(key)) {
            toast.error(`Duplicate entry found in the new rows: "${entry.name}" in "${entry.country}". Please remove duplicates before submitting.`, "error");
            return;
        }
        entrySet.add(key);
    }

    for (const entry of entriesToSubmit) {
        const isDuplicate = universitiesData.some(
            item => String(item.name).trim().toUpperCase() === entry.name.trim() &&
                    String(item.country).trim().toUpperCase() === entry.country.trim()
        );
        if (isDuplicate) {
            toast.error(`Error: University "${entry.name}" already exists in "${entry.country}". Please remove it from the list.`, "error");
            return;
        }
    }

    const universitiesPayload = entriesToSubmit.map(entry => ({
      name: entry.name,
      country: entry.country,
      url: entry.url || ''
    }));
    onAddUniversity(universitiesPayload);

    setNewEntries([]);
  };

  const handleToggleJsonInput = () => {
    setShowJsonInput(prev => !prev);
    if (showJsonInput) {
      setJsonInput(''); // Clear JSON input when closing
    }
    // Close reverse JSON if open
    setShowReverseJson(false);
  };

  const handleToggleReverseJson = () => {
    setShowReverseJson(prev => !prev);
    if (showReverseJson) {
      setSelectedUniversity('');
      setReversedJson('');
    }
    // Close JSON input if open
    setShowJsonInput(false);
  };

  const handleUniversitySelect = async (universityId) => {
    if (!universityId) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/'}universities-json/${universityId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Referer': process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      setReversedJson(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Failed to fetch university JSON:", error);
      toast.error(`Failed to fetch university JSON: ${error.message}`, "error");
    }
  };

  const handleJsonSubmit = async () => {
    if (!jsonInput.trim()) {
      toast.error("Please enter JSON data.", "error");
      return;
    }

    try {
      // Validate JSON format
      const parsedJson = JSON.parse(jsonInput);
      
      // Check if it's the comprehensive format (single university object) or simple array format
      if (Array.isArray(parsedJson)) {
        // Simple array format - validate each university object has required fields
        for (let i = 0; i < parsedJson.length; i++) {
          const uni = parsedJson[i];
          if (!uni.name || !uni.country) {
            toast.error(`University at index ${i} is missing required fields (name, country).`, "error");
            return;
          }
        }
      } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        // Comprehensive format - validate it has university info
        if (!parsedJson.univ_name || !parsedJson.univ_country) {
          toast.error("JSON must contain 'univ_name' and 'univ_country' fields for comprehensive format.", "error");
          return;
        }
      } else {
        toast.error("JSON must be either an array of university objects or a comprehensive university object.", "error");
        return;
      }

      setIsSubmittingJson(true);

      // Submit to universities-json endpoint - let backend handle the format
      const response = await fetch(`${process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/'}universities-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/',
        },
        body: jsonInput,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      
      // Store the detailed results for visual feedback
      setLocalImportResults(result);
      setShowResults(true);
      
      // Pass results to parent component for cross-tab highlighting
      if (onImportResults) {
        onImportResults(result);
      }
      
      // Generate detailed success message
      let message = result.message || "Data submitted successfully from JSON!";
      let details = [];
      
      if (result.university) {
        details.push(`University: ${result.university.isNew ? 'Created' : 'Updated'} "${result.university.name}"`);
      }
      
      if (result.schools) {
        if (result.schools.created?.length > 0) {
          details.push(`Schools Created: ${result.schools.created.length}`);
        }
        if (result.schools.updated?.length > 0) {
          details.push(`Schools Updated: ${result.schools.updated.length}`);
        }
      }
      
      if (result.programs) {
        if (result.programs.created?.length > 0) {
          details.push(`Programs Created: ${result.programs.created.length}`);
        }
        if (result.programs.updated?.length > 0) {
          details.push(`Programs Updated: ${result.programs.updated.length}`);
        }
      }
      
      if (result.conflicting_programs?.length > 0) {
        details.push(`⚠️ Conflicting Programs: ${result.conflicting_programs.length}`);
      }
      
      const finalMessage = details.length > 0 ? `${message}\n\n${details.join('\n')}` : message;
      
      // Show appropriate toast based on conflicts
      if (result.conflicting_programs?.length > 0) {
        toast.warning(finalMessage, {
          autoClose: 8000,
          style: { whiteSpace: 'pre-line' }
        });
      } else {
        toast.success(finalMessage, {
          autoClose: 5000,
          style: { whiteSpace: 'pre-line' }
        });
      }
      
      // Clear the JSON input and close the form
      setJsonInput('');
      setShowJsonInput(false);
      
      // Log the results for debugging
      if (result.universities) console.log('Universities processed:', result.universities);
      if (result.schools) console.log('Schools processed:', result.schools);
      if (result.programs) console.log('Programs processed:', result.programs);
      if (result.conflicting_programs) console.log('Conflicting programs:', result.conflicting_programs);

    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format. Please check your JSON syntax.", "error");
      } else {
        console.error("JSON submission failed:", error);
        toast.error(`Failed to submit JSON: ${error.message}`, "error");
      }
    } finally {
      setIsSubmittingJson(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value.toUpperCase());
  };

  const filteredAndSortedUniversities = useMemo(() => {
    let filtered = universitiesData;
    if (searchTerm.trim()) {
      // Check if using semicolon-separated search (position-based)
      if (searchTerm.includes(';')) {
        // Position-based search: each position searches specific column
        const searchParts = searchTerm.split(';').map(part => part.trim());
        const searchName = searchParts[0] || '';
        const searchCountry = searchParts.length > 1 ? searchParts[1] : '';
        const searchUrl = searchParts.length > 2 ? searchParts[2] : '';
        const searchSchoolCount = searchParts.length > 3 ? searchParts[3] : '';
        
        filtered = universitiesData.filter(uni => {
          const nameMatch = searchName ? 
            (uni.name || '').toUpperCase().includes(searchName.toUpperCase()) : true;
          const countryMatch = searchCountry ? 
            (uni.country || '').toUpperCase().includes(searchCountry.toUpperCase()) : true;
          const urlMatch = searchUrl ? 
            (uni.url || '').toUpperCase().includes(searchUrl.toUpperCase()) : true;
          const schoolCountMatch = searchSchoolCount ?
            String(uni.schoolCount || '0').includes(searchSchoolCount) : true;
          
          return nameMatch && countryMatch && urlMatch && schoolCountMatch;
        });
      } else {
        // Space-separated search: each word can match any column
        const searchWords = searchTerm.split(/\s+/).map(word => word.trim().toUpperCase()).filter(word => word);
        
        filtered = universitiesData.filter(uni => {
          const uniName = (uni.name || '').toUpperCase();
          const uniCountry = (uni.country || '').toUpperCase();
          const uniUrl = (uni.url || '').toUpperCase();
          const uniSchoolCount = String(uni.schoolCount || '0');
          
          // Each word must match at least one column
          return searchWords.every(word => {
            return uniName.includes(word) || uniCountry.includes(word) || uniUrl.includes(word) || uniSchoolCount.includes(word);
          });
        });
      }
    }

    const sortableItems = [...filtered];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (sortConfig.key === 'schoolCount') {
          return sortConfig.direction === 'ascending' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
        }

        if (String(aVal).toLowerCase() < String(bVal).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (String(aVal).toLowerCase() > String(bVal).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableItems;
  }, [universitiesData, searchTerm, sortConfig]);
    
  return (
    <div>
      <div className="admin-controls-wrapper" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-controls-row">
          <input
            type="text"
            placeholder="Search Name ; Country ; URL ; School Count"
            value={searchTerm}
            onChange={handleSearchChange}
            className="admin-search-input"
            style={{
              padding: '0.6rem 0.8rem',
              fontSize: 'var(--font-size-small, 0.9rem)',
              flexGrow: 1,
              maxWidth: '300px',
              border: '1px solid var(--border-color-light, #dee5ec)',
              borderRadius: 'var(--border-radius-medium, 8px)',
              boxSizing: 'border-box'
            }}
          />
          <div className="admin-action-buttons-group">
            {newEntries.length > 0 ? (
              <>
                <button
                  onClick={handleSubmitAll}
                  className="button button-primary admin-action-button"
                  disabled={isLoading}
                >
                  Submit All ({newEntries.length})
                </button>
                <button
                  onClick={handleCancelForm}
                  className="button button-primary admin-action-button"
                  disabled={isLoading}
                >
                  Cancel Form
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleJsonInput}
                  className={`button ${showJsonInput ? 'button-secondary' : 'button-primary'} admin-action-button`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={isLoading}
                >
                  <span style={{ fontSize: '1.2em', lineHeight: '1' }}>📝</span>
                  {showJsonInput ? 'Cancel JSON' : 'JSON'}
                </button>
                <button
                  onClick={handleToggleReverseJson}
                  className={`button ${showReverseJson ? 'button-secondary' : 'button-primary'} admin-action-button`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={isLoading}
                >
                  <span style={{ fontSize: '1.2em', lineHeight: '1' }}>🔄</span>
                  {showReverseJson ? 'Cancel Reverse' : 'Reverse JSON'}
                </button>
                <button
                  onClick={handleAddRow}
                  className="button button-primary admin-action-button"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={isLoading}
                >
                  <span style={{ fontSize: '1.2em', lineHeight: '1' }}>+</span>
                  Form
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {showReverseJson && (
        <div className="json-input-section" style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid var(--border-color-light, #dee5ec)',
          borderRadius: 'var(--border-radius-medium, 8px)',
          backgroundColor: 'var(--bg-color-light, #f8f9fa)'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-color-primary, #333)' }}>
            Get University JSON
          </h4>
          <div style={{ marginBottom: '1rem' }}>
            <Select
              value={universitiesData
                .map(uni => ({ value: uni.id, label: `${uni.name} (${uni.country})` }))
                .find(option => option.value === selectedUniversity) || null}
              onChange={selected => {
                setSelectedUniversity(selected ? selected.value : '');
                handleUniversitySelect(selected ? selected.value : '');
              }}
              options={universitiesData.map(uni => ({ value: uni.id, label: `${uni.name} (${uni.country})` }))}
              placeholder="Select a university..."
              classNamePrefix="react-select"
              isClearable
              menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
              styles={{
                control: (provided) => ({
                  ...provided,
                  width: '100%',
                  minWidth: '220px',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color-light, #dee5ec)',
                  boxShadow: 'none',
                  backgroundColor: '#fff',
                  marginBottom: '0.5rem',
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 10000,
                  borderRadius: '4px',
                  border: '1px solid var(--border-color-light, #dee5ec)',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.13)',
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected
                    ? 'var(--primary-color, #007bff)'
                    : state.isFocused
                    ? 'rgba(233, 246, 252, 0.8)'
                    : '#fff',
                  color: state.isSelected
                    ? '#fff'
                    : 'var(--primary-color-dark, #0a3d4e)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  fontWeight: state.isSelected ? '600' : '500',
                }),
                singleValue: provided => ({
                  ...provided,
                  color: 'var(--primary-color-dark, #0a3d4e)',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  fontWeight: '500',
                }),
                menuPortal: provided => ({
                  ...provided,
                  zIndex: 10000
                })
              }}
            />
          </div>
          {reversedJson && (
            <div style={{ position: 'relative' }}>
              <textarea
                value={reversedJson}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '0.8rem',
                  border: '1px solid var(--border-color-light, #dee5ec)',
                  borderRadius: 'var(--border-radius-medium, 8px)',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  backgroundColor: '#f8f9fa'
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(reversedJson);
                  toast.success('JSON copied to clipboard!');
                }}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  padding: '0.4rem 0.8rem',
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}
      
      {showJsonInput && (
        <div className="json-input-section" style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid var(--border-color-light, #dee5ec)',
          borderRadius: 'var(--border-radius-medium, 8px)',
          backgroundColor: 'var(--bg-color-light, #f8f9fa)'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-color-primary, #333)' }}>
            Submit University Data JSON
          </h4>
          <p style={{ 
            fontSize: 'var(--font-size-small, 0.9rem)', 
            color: 'var(--text-color-secondary, #6c757d)',
            marginBottom: '1rem'
          }}>
            Enter JSON data in either format:<br/>
            • <strong>Simple:</strong> Array of university objects with "name", "country", and optional "url"<br/>
            • <strong>Comprehensive:</strong> Single object with "univ_name", "univ_country", "univ_url", "schools", and "programs" arrays
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`Comprehensive format:\n{\n  "univ_name": "Princeton University",\n  "univ_country": "United States",\n  "univ_url": "https://www.princeton.edu",\n  "schools": [\n    {"school": "Graduate School", "url": "https://..."}\n  ],\n  "programs": [\n    {\n      "program_name": "PhD in Computer Science",\n      "school_names": ["Graduate School"],\n      "program_url": "https://...",\n      "placement": ["https://..."]\n    }\n  ]\n}\n\nOr simple format:\n[\n  {\n    "name": "UNIVERSITY NAME",\n    "country": "COUNTRY",\n    "url": "https://...",\n    "rank": 10\n  }\n]`}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '0.8rem',
              border: '1px solid var(--border-color-light, #dee5ec)',
              borderRadius: 'var(--border-radius-medium, 8px)',
              fontSize: 'var(--font-size-small, 0.9rem)',
              fontFamily: 'monospace',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            disabled={isSubmittingJson}
          />
          <div style={{ 
            marginTop: '1rem', 
            display: 'flex', 
            gap: '0.5rem', 
            justifyContent: 'flex-end' 
          }}>
            <button
              onClick={handleToggleJsonInput}
              className="button button-secondary"
              disabled={isSubmittingJson}
            >
              Cancel
            </button>
            <button
              onClick={handleJsonSubmit}
              className="button button-primary"
              disabled={isSubmittingJson || !jsonInput.trim()}
            >
              {isSubmittingJson ? 'Submitting...' : 'Submit JSON'}
            </button>
          </div>
        </div>
      )}
      
      {showResults && localImportResults && (
        <div className="import-results-section" style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid var(--border-color-light, #dee5ec)',
          borderRadius: 'var(--border-radius-medium, 8px)',
          backgroundColor: localImportResults.conflicting_programs?.length > 0 ? '#fff3cd' : '#d4edda'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, color: 'var(--text-color-primary, #333)' }}>
              Import Results
            </h4>
            <button
              onClick={() => setShowResults(false)}
              className="button button-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              ✕ Close
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {/* University Results */}
            {localImportResults.university && (
              <div className="result-category" style={{
                padding: '0.75rem',
                border: '1px solid #28a745',
                borderRadius: '4px',
                backgroundColor: '#d4edda'
              }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#155724' }}>
                  🏛️ University: {localImportResults.university.isNew ? 'Created' : 'Updated'}
                </h5>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#155724' }}>
                  {localImportResults.university.name}
                </p>
              </div>
            )}
            
            {/* Schools Results */}
            {localImportResults.schools && (localImportResults.schools.created?.length > 0 || localImportResults.schools.updated?.length > 0) && (
              <div className="result-category" style={{
                padding: '0.75rem',
                border: '1px solid #17a2b8',
                borderRadius: '4px',
                backgroundColor: '#d1ecf1'
              }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#0c5460' }}>🏫 Schools</h5>
                {localImportResults.schools.created?.length > 0 && (
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#0c5460' }}>
                    ✅ Created: {localImportResults.schools.created.length}
                  </p>
                )}
                {localImportResults.schools.updated?.length > 0 && (
                  <p style={{ margin: '0', fontSize: '0.9rem', color: '#0c5460' }}>
                    🔄 Updated: {localImportResults.schools.updated.length}
                  </p>
                )}
              </div>
            )}
            
            {/* Programs Results */}
            {localImportResults.programs && (localImportResults.programs.created?.length > 0 || localImportResults.programs.updated?.length > 0) && (
              <div className="result-category" style={{
                padding: '0.75rem',
                border: '1px solid #6f42c1',
                borderRadius: '4px',
                backgroundColor: '#e2d9f3'
              }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#4a2c6b' }}>📚 Programs</h5>
                {localImportResults.programs.created?.length > 0 && (
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#4a2c6b' }}>
                    ✅ Created: {localImportResults.programs.created.length}
                  </p>
                )}
                {localImportResults.programs.updated?.length > 0 && (
                  <p style={{ margin: '0', fontSize: '0.9rem', color: '#4a2c6b' }}>
                    🔄 Updated: {localImportResults.programs.updated.length}
                  </p>
                )}
              </div>
            )}
            
            {/* Conflicting Programs */}
            {localImportResults.conflicting_programs?.length > 0 && (
              <div className="result-category" style={{
                padding: '0.75rem',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                backgroundColor: '#fff3cd'
              }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>
                  ⚠️ Conflicting Programs: {localImportResults.conflicting_programs.length}
                </h5>
                <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                  {localImportResults.conflicting_programs.slice(0, 3).map((program, index) => (
                    <p key={index} style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#856404' }}>
                      • {program.program}
                    </p>
                  ))}
                  {localImportResults.conflicting_programs.length > 3 && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#856404', fontStyle: 'italic' }}>
                      ... and {localImportResults.conflicting_programs.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Summary Stats */}
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(0,0,0,0.05)', 
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: 'var(--text-color-secondary, #6c757d)'
          }}>
            <strong>Processing Summary:</strong> 
            {localImportResults.schools_processed && ` ${localImportResults.schools_processed} schools processed,`}
            {localImportResults.programs_processed && ` ${localImportResults.programs_processed} programs processed`}
          </div>
        </div>
      )}
      
      {isLoading && <div className="loading-indicator card">Loading or processing...</div>}
      {error && <div className="error-message card">Error: {error}</div>}
      {!isLoading && !error && (
        <AdminTable
          data={filteredAndSortedUniversities}
          type="university"
          onCellUpdate={onUpdateUniversity}
          onDelete={onDeleteUniversity}
          newEntriesData={newEntries}
          onNewEntryChange={handleNewEntryChange}
          onRemoveNewEntry={handleRemoveNewEntry}
          onInsertRow={handleInsertRow}
          sortConfig={sortConfig}
          onSort={handleSort}
          importResults={importResults}
        />
      )}
    </div>
  );
};
export default UniversityManagement;
