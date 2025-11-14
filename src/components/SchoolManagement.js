import React, { useState, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import AdminTable from './AdminTable';

const SchoolManagement = ({ 
  universitiesData, 
  schoolsData, 
  isLoading, 
  error, 
  onAddSchool, 
  onUpdateSchool, 
  onDeleteSchool 
}) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const handleToggleAddForm = () => {
    setShowAddForm(prev => !prev);
  };

  const handleAddEntryAndToggleForm = (newEntryData) => {
    onAddSchool(newEntryData);
    

    const universityToUpdate = universitiesData.find(u => u.name === newEntryData.university);

    if (universityToUpdate) {
      queryClient.setQueryData('allUniversities', (oldData) => {
        if (!oldData) return [];
        return oldData.map(uni => {
          if (uni.id === universityToUpdate.id) {
            return { ...uni, schoolCount: (uni.schoolCount || 0) + 1 };

          }
          return uni;
          console.log('Updated university:', uni);
        });
      });
    }

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

  const filteredAndSortedSchools = useMemo(() => {
    let filtered = schoolsData;
    if (searchTerm.trim()) {
      // Check if using semicolon-separated search (position-based)
      if (searchTerm.includes(';')) {
        // Position-based search: each position searches specific column
        const searchParts = searchTerm.split(';').map(part => part.trim());
        const searchUniversity = searchParts[0] || '';
        const searchName = searchParts.length > 1 ? searchParts[1] : '';
        const searchUrl = searchParts.length > 2 ? searchParts[2] : '';
        
        filtered = schoolsData.filter(school => {
          const universityMatch = searchUniversity ? 
            (school.university || '').toUpperCase().includes(searchUniversity.toUpperCase()) : true;
          const nameMatch = searchName ? 
            (school.name || '').toUpperCase().includes(searchName.toUpperCase()) : true;
          const urlMatch = searchUrl ? 
            (school.url || '').toUpperCase().includes(searchUrl.toUpperCase()) : true;
          
          return universityMatch && nameMatch && urlMatch;
        });
      } else {
        // Space-separated search: each word can match any column
        const searchWords = searchTerm.split(/\s+/).map(word => word.trim().toUpperCase()).filter(word => word);
        
        filtered = schoolsData.filter(school => {
          const schoolUniversity = (school.university || '').toUpperCase();
          const schoolName = (school.name || '').toUpperCase();
          const schoolUrl = (school.url || '').toUpperCase();
          
          // Each word must match at least one column
          return searchWords.every(word => {
            return schoolUniversity.includes(word) || schoolName.includes(word) || schoolUrl.includes(word);
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
  }, [schoolsData, searchTerm, sortConfig]);
  
  return (
    <div>
      <div className="admin-controls-wrapper" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-controls-row">
          <input
            type="text"
            placeholder="Search University ; School Name ; URL"
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
          <button
            onClick={handleToggleAddForm}
            className="button button-primary admin-action-button"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={isLoading}
          >
            <span style={{ fontSize: '1.2em', lineHeight: '1' }}>+</span>
            {showAddForm ? 'Cancel ' : 'Form'}
          </button>
        </div>
      </div>
      {isLoading && <div className="loading-indicator card">Loading or processing...</div>}
      {error && <div className="error-message card">Error: {error}</div>}
      {!isLoading && !error && (
        <AdminTable
          data={filteredAndSortedSchools}
          type="school"
          onCellUpdate={onUpdateSchool}
          onDelete={onDeleteSchool}
          onAddEntry={handleAddEntryAndToggleForm}
          showInlineAddForm={showAddForm}
          universitiesData={universitiesData}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      )}
    </div>
  );
};

export default SchoolManagement;
