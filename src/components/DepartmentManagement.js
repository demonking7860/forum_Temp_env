import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import AdminTable from './AdminTable';
import { toast } from 'react-toastify';
import './DepartmentView.css'; // Import styles for spinner animation

const DepartmentManagement = ({ 
  universitiesData, 
  schoolsData,
  departmentData, 
  isLoading, 
  error, 
  onAddDepartment, 
  onUpdateDepartment, 
  onDeleteDepartment,
  onLoadDepartments // Add callback to pass loaded departments back to parent
}) => {
  const API_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [universityDepartments, setUniversityDepartments] = useState(null);
  const [loadingUniversityDepartments, setLoadingUniversityDepartments] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  // Create university options from universitiesData
  const universityOptions = useMemo(() => {
    if (!universitiesData || !Array.isArray(universitiesData)) return [];
    
    const options = [
      { value: null, label: 'All Universities', id: null },
      ...universitiesData.map(uni => ({
        value: uni.name,
        label: `${uni.name} (${uni.country})`,
        id: uni.id
      }))
    ];
    
    return options.sort((a, b) => {
      if (a.value === null) return -1;
      if (b.value === null) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [universitiesData]);

  const handleUniversityChange = async (selectedOption) => {
    setSelectedUniversity(selectedOption);
    setSearchTerm(''); // Clear the search text when university changes
    
    // If no university selected or "All Universities" selected, use original data
    if (!selectedOption || selectedOption.value === null) {
      setUniversityDepartments(null);
      
      // Clear departments in AdminComponent when no specific university is selected
      if (onLoadDepartments) {
        onLoadDepartments([]);
      }
      
      return;
    }
    
    // Fetch departments for the selected university
    if (selectedOption.id) {
      setLoadingUniversityDepartments(true);
      try {
        const response = await fetch(`${API_URL}departments-university/${selectedOption.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        console.log("aaa",responseData);

        // Extract departments array from response object
        const rawDepartments = responseData.departments || responseData || [];
        
        // Transform departments to match the expected format
        const transformedDepartments = rawDepartments.map(dept => {
          // Find university and school info
          const university = universitiesData?.find(uni => uni.id === dept.university_oid);
          const school = schoolsData?.find(sch => sch.id === dept.school_oid);
          
          return {
            id: dept._id,
            university: university?.name || '',
            school: school?.name || '',
            department: dept.department_name || '',
            university_id: dept.university_oid,
            count: dept.count || 0,
            status: dept.status || '',
            school_id: dept.school_oid
          };
        });
        
        setUniversityDepartments(transformedDepartments);
        
        // Pass the loaded departments back to AdminComponent so optimistic updates work
        if (onLoadDepartments) {
          onLoadDepartments(transformedDepartments);
        }
        
        toast.success(`Loaded ${transformedDepartments.length} departments for ${selectedOption.value}`, 'success');
        
      } catch (error) {
        console.error('Error fetching university departments:', error);
        toast.error(`Failed to fetch departments: ${error.message}`, 'error');
        setUniversityDepartments(null);
      } finally {
        setLoadingUniversityDepartments(false);
      }
    }
  };

  const handleToggleAddForm = () => {
    setShowAddForm(prev => !prev);
  };

  const handleScrapeNow = async () => {
    setIsScraping(true);
    try {
      const response = await fetch(`${API_URL}trigger-faculty-scraper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Add any payload data if needed by the endpoint
          trigger: 'manual',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Faculty scraper triggered:', result);
      toast.success('Faculty scraper triggered successfully!');
      
    } catch (error) {
      console.error('Error triggering faculty scraper:', error);
      toast.error(`Failed to trigger faculty scraper: ${error.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleAddEntryAndToggleForm = (newEntryData) => {
    console.log('handleAddEntryAndToggleForm called with:', newEntryData);
    
    onAddDepartment(newEntryData);
    
    // Only hide the form for single, non-optimistic entries
    // Keep the form open for:
    // 1. Array entries (bulk/staged operations)
    // 2. Optimistic entries (so user can see them being processed)
    // 3. Entries that have isOptimistic flag
    if (Array.isArray(newEntryData)) {
      // This is a bulk operation (like staged entries), keep form open
      console.log('Bulk operation detected, keeping form open');
      return;
    }
    
    if (newEntryData && newEntryData.isOptimistic) {
      // This is an optimistic entry, keep form open to show progress
      console.log('Optimistic entry detected, keeping form open');
      return;
    }
    
    // Only hide form for confirmed single entries
    console.log('Single confirmed entry, hiding form');
    setShowAddForm(false);
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

  const filteredAndSortedDepartments = useMemo(() => {
    console.log(`filteredAndSortedDepartments: Processing ${departmentData.length} departments`);
    console.log(`Optimistic departments in data:`, departmentData.filter(d => d.isOptimistic));
    
    let filtered;
    
    // Always use departmentData as the primary source to include optimistic entries
    // If a university is selected, filter departmentData by university
    if (selectedUniversity && selectedUniversity.value !== null) {
      // Filter from departmentData, but ALWAYS include optimistic entries regardless of university filter
      const originalLength = departmentData.length;
      
      // Get optimistic entries first (these should always be shown)
      const optimisticEntries = departmentData.filter(dept => dept.isOptimistic);
      
      // Get non-optimistic entries that match the university filter
      const nonOptimisticFiltered = departmentData.filter(dept => 
        !dept.isOptimistic && (dept.university || '').toUpperCase() === selectedUniversity.value.toUpperCase()
      );
      
      // Combine optimistic entries with filtered entries
      filtered = [...optimisticEntries, ...nonOptimisticFiltered];
      
      console.log(`Filtered from ${originalLength} to ${filtered.length} departments for university ${selectedUniversity.value}`);
      console.log(`Included ${optimisticEntries.length} optimistic entries regardless of filter`);
      console.log(`Optimistic departments after university filter:`, filtered.filter(d => d.isOptimistic));
      
      // If we have fetched universityDepartments and no optimistic entries, 
      // we can supplement with those that aren't already in departmentData
      if (Array.isArray(universityDepartments) && universityDepartments.length > 0) {
        const existingIds = new Set(filtered.map(d => d.id));
        const additionalDepts = universityDepartments.filter(d => !existingIds.has(d.id));
        if (additionalDepts.length > 0) {
          filtered = [...filtered, ...additionalDepts];
          console.log(`Added ${additionalDepts.length} additional departments from universityDepartments`);
        }
      }
    } else {
      // Use all departments when no university is selected
      filtered = departmentData;
      console.log(`Using all ${filtered.length} departments (no university filter)`);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      // Check if using semicolon-separated search (position-based)
      if (searchTerm.includes(';')) {
        // Position-based search: each position searches specific column
        const searchParts = searchTerm.split(';').map(part => part.trim());
        const searchUniversity = searchParts[0] || '';
        const searchSchool = searchParts.length > 1 ? searchParts[1] : '';
        const searchDepartment = searchParts.length > 2 ? searchParts[2] : '';
        
        filtered = filtered.filter(dept => {
          const universityMatch = searchUniversity ? 
            (dept.university || '').toUpperCase().includes(searchUniversity.toUpperCase()) : true;
          const schoolMatch = searchSchool ? 
            (dept.school || '').toUpperCase().includes(searchSchool.toUpperCase()) : true;
          const departmentMatch = searchDepartment ? 
            (dept.department || '').toUpperCase().includes(searchDepartment.toUpperCase()) : true;
          
          return universityMatch && schoolMatch && departmentMatch;
        });
      } else {
        // Space-separated search: each word can match any column
        const searchWords = searchTerm.split(/\s+/).map(word => word.trim().toUpperCase()).filter(word => word);
        
        filtered = filtered.filter(dept => {
          const deptUniversity = (dept.university || '').toUpperCase();
          const deptSchool = (dept.school || '').toUpperCase();
          const deptDepartment = (dept.department || '').toUpperCase();
          
          // Each word must match at least one column
          return searchWords.every(word => {
            return deptUniversity.includes(word) || 
                   deptSchool.includes(word) || 
                   deptDepartment.includes(word);
          });
        });
      }
    }

    // Apply sorting
    const sortableItems = [...filtered];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (String(aVal).toLowerCase() < String(bVal).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (String(aVal).toLowerCase() > String(bVal).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    console.log(`Final filtered departments: ${sortableItems.length}`);
    console.log(`Final optimistic departments:`, sortableItems.filter(d => d.isOptimistic));
    
    return sortableItems;
  }, [departmentData, universityDepartments, searchTerm, selectedUniversity, sortConfig]);
  
  return (
    <div>
      <div className="admin-controls-wrapper" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-controls-row">
          <div style={{ minWidth: 250, maxWidth: 400, flexGrow: 1, marginRight: '1rem' }}>
            <Select
              value={selectedUniversity}
              onChange={handleUniversityChange}
              options={universityOptions}
              placeholder={loadingUniversityDepartments ? "Loading departments..." : "Select University..."}
              isClearable
              isSearchable
              isLoading={loadingUniversityDepartments}
              isDisabled={loadingUniversityDepartments}
              className="university-filter-dropdown"
              classNamePrefix="react-select"
              styles={{
                control: (provided) => ({
                  ...provided,
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  border: '1px solid var(--border-color-light, #dee5ec)',
                  borderRadius: 'var(--border-radius-medium, 8px)',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                })
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Search University ; School ; Department"
            value={searchTerm}
            onChange={handleSearchChange}
            className="admin-search-input"
            style={{
              padding: '0.6rem 0.8rem',
              fontSize: 'var(--font-size-small, 0.9rem)',
              flexGrow: 1,
              maxWidth: '400px',
              border: '1px solid var(--border-color-light, #dee5ec)',
              borderRadius: 'var(--border-radius-medium, 8px)',
              boxSizing: 'border-box'
            }}
          />
          <button
            onClick={handleToggleAddForm}
            className="button button-primary admin-action-button"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={isLoading}
          >
            <span style={{ fontSize: '1.2em', lineHeight: '1' }}>+</span>
            {showAddForm ? 'Cancel ' : 'Form'}
          </button>
          <button
            onClick={handleScrapeNow}
            className="button button-primary admin-action-button"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={isLoading || isScraping}
          >
            {isScraping ? (
              <>
                <span className="spinner" style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #ffffff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }}></span>
                Scraping...
              </>
            ) : (
              <>
                <span style={{ fontSize: '1.2em', lineHeight: '1' }}>⚡</span>
                Scrape Now
              </>
            )}
          </button>
        </div>
      </div>
      {(isLoading || loadingUniversityDepartments) && <div className="loading-indicator card">Loading or processing...</div>}
      {error && <div className="error-message card">Error: {error}</div>}
      {!isLoading && !loadingUniversityDepartments && !error && (
        <AdminTable
          data={filteredAndSortedDepartments}
          type="department"
          onCellUpdate={onUpdateDepartment}
          onDelete={onDeleteDepartment}
          onAddEntry={handleAddEntryAndToggleForm}
          showInlineAddForm={showAddForm}
          universitiesData={universitiesData}
          schoolsData={schoolsData}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      )}
    </div>
  );
};

export default DepartmentManagement;
