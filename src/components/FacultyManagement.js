import React, { useState, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import AdminTable from './AdminTable';

const FacultyManagement = ({ 
  universitiesData, 
  schoolsData,
  facultyData, 
  isLoading, 
  error, 
  onAddFaculty, 
  onUpdateFaculty, 
  onDeleteFaculty 
}) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const handleToggleAddForm = () => {
    setShowAddForm(prev => !prev);
  };

  const handleAddEntryAndToggleForm = (newEntryData) => {
    onAddFaculty(newEntryData);
    
    // Update school's faculty count
    const schoolToUpdate = schoolsData.find(s => s.id === newEntryData.school_id);
    if (schoolToUpdate) {
      queryClient.setQueryData('allSchools', (oldData) => {
        if (!oldData) return [];
        return oldData.map(school => {
          if (school.id === schoolToUpdate.id) {
            return { ...school, facultyCount: (school.facultyCount || 0) + 1 };
          }
          return school;
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

  const filteredAndSortedFaculty = useMemo(() => {
    let filtered = facultyData;
    if (searchTerm.trim()) {
      // Check if using semicolon-separated search (position-based)
      if (searchTerm.includes(';')) {
        // Position-based search: each position searches specific column
        const searchParts = searchTerm.split(';').map(part => part.trim());
        const searchUniversity = searchParts[0] || '';
        const searchSchool = searchParts.length > 1 ? searchParts[1] : '';
        const searchName = searchParts.length > 2 ? searchParts[2] : '';
        const searchEmail = searchParts.length > 3 ? searchParts[3] : '';
        
        filtered = facultyData.filter(faculty => {
          const universityMatch = searchUniversity ? 
            (faculty.university || '').toUpperCase().includes(searchUniversity.toUpperCase()) : true;
          const schoolMatch = searchSchool ? 
            (faculty.school || '').toUpperCase().includes(searchSchool.toUpperCase()) : true;
          const nameMatch = searchName ? 
            (faculty.name || '').toUpperCase().includes(searchName.toUpperCase()) : true;
          const emailMatch = searchEmail ? 
            (faculty.email || '').toUpperCase().includes(searchEmail.toUpperCase()) : true;
          
          return universityMatch && schoolMatch && nameMatch && emailMatch;
        });
      } else {
        // Space-separated search: each word can match any column
        const searchWords = searchTerm.split(/\s+/).map(word => word.trim().toUpperCase()).filter(word => word);
        
        filtered = facultyData.filter(faculty => {
          const facultyUniversity = (faculty.university || '').toUpperCase();
          const facultySchool = (faculty.school || '').toUpperCase();
          const facultyName = (faculty.name || '').toUpperCase();
          const facultyEmail = (faculty.email || '').toUpperCase();
          const facultyTitle = (faculty.title || '').toUpperCase();
          const facultyDepartment = (faculty.department || '').toUpperCase();
          
          // Each word must match at least one column
          return searchWords.every(word => {
            return facultyUniversity.includes(word) || 
                   facultySchool.includes(word) || 
                   facultyName.includes(word) || 
                   facultyEmail.includes(word) ||
                   facultyTitle.includes(word) ||
                   facultyDepartment.includes(word);
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
  }, [facultyData, searchTerm, sortConfig]);
  
  return (
    <div>
      <div className="admin-controls-wrapper" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-controls-row">
          <input
            type="text"
            placeholder="Search University ; School ; Name ; Email"
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
        </div>
      </div>
      {isLoading && <div className="loading-indicator card">Loading or processing...</div>}
      {error && <div className="error-message card">Error: {error}</div>}
      {!isLoading && !error && (
        <AdminTable
          data={filteredAndSortedFaculty}
          type="faculty"
          onCellUpdate={onUpdateFaculty}
          onDelete={onDeleteFaculty}
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

export default FacultyManagement;
