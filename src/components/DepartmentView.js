import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AdminTable from './AdminTable';
import './DepartmentView.css';

const DepartmentView = () => {
  const { id: departmentId } = useParams();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';

  const [faculty, setFaculty] = useState([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Fetch faculty for this department
  useEffect(() => {
    const fetchFaculty = async () => {
      if (!departmentId) return;

      try {
        setIsLoadingFaculty(true);
        const response = await fetch(`${API_URL}faculty-department/${departmentId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch faculty: ${response.status}`);
        }

        const data = await response.json();
        const facultyData = data.faculty || [];
        
        // Function to parse education into separate degree types
        const parseEducation = (education) => {
          const degrees = {
            bachelor: '',
            master: '',
            phd: ''
          };
          
          if (Array.isArray(education)) {
            education.forEach(({ degree, program, university, year }) => {
              let formatted = degree || '';
              if (program && program !== 'Unknown') formatted += ` ${program}`;
              if (university) formatted += `, ${university}`;
              if (year) formatted += ` (${year})`;
              
              // Categorize by degree type
              const degreeType = (degree || '').toLowerCase();
              if (degreeType.includes('bachelor') || degreeType.includes('bs') || degreeType.includes('ba')) {
                degrees.bachelor = formatted;
              } else if (degreeType.includes('master') || degreeType.includes('ms') || degreeType.includes('ma') || degreeType.includes('msc')) {
                degrees.master = formatted;
              } else if (degreeType.includes('phd') || degreeType.includes('doctorate') || degreeType.includes('doctoral')) {
                degrees.phd = formatted;
              } else {
                // If we can't categorize, put it in the most appropriate field based on common patterns
                const formattedLower = (formatted || '').toLowerCase();
                if (!degrees.phd && (degreeType.includes('doctor') || formattedLower.includes('phd'))) {
                  degrees.phd = formatted;
                } else if (!degrees.master && (degreeType.includes('master') || formattedLower.includes('master'))) {
                  degrees.master = formatted;
                } else if (!degrees.bachelor) {
                  degrees.bachelor = formatted;
                }
              }
            });
          } else if (education && typeof education === 'string') {
            // Parse string format education
            const educationParts = education.split('•').map(part => part.trim());
            educationParts.forEach(part => {
              const lowerPart = part.toLowerCase();
              if (lowerPart.includes('bachelor') || lowerPart.includes('bs ') || lowerPart.includes('ba ')) {
                degrees.bachelor = part;
              } else if (lowerPart.includes('master') || lowerPart.includes('ms ') || lowerPart.includes('ma ') || lowerPart.includes('msc')) {
                degrees.master = part;
              } else if (lowerPart.includes('phd') || lowerPart.includes('doctorate') || lowerPart.includes('doctoral')) {
                degrees.phd = part;
              } else {
                // Default assignment if we can't categorize
                const partLower = (part || '').toLowerCase();
                if (!degrees.phd && partLower.includes('doctor')) {
                  degrees.phd = part;
                } else if (!degrees.master && partLower.includes('master')) {
                  degrees.master = part;
                } else if (!degrees.bachelor) {
                  degrees.bachelor = part;
                }
              }
            });
          }
          
          return degrees;
        };

        // Transform faculty data to match the expected format
        const transformedFaculty = facultyData.map((fac, index) => {
          const educationDegrees = parseEducation(fac.education);
          
          return {
            id: fac._id || fac.id || `faculty-${index}`,
            name: fac.name || '',
            title: fac.title || '',
            // Keep original education for backward compatibility
            education: Array.isArray(fac.education) 
              ? fac.education.map(({ degree, program, university, year }) => {
                  let formatted = degree || '';
                  if (program && program !== 'Unknown') formatted += ` ${program}`;
                  if (university) formatted += `, ${university}`;
                  if (year) formatted += ` (${year})`;
                  
                  return formatted;
                }).join(' • ')
              : (fac.education || ''),
            // Add separate degree columns
            bachelor: educationDegrees.bachelor,
            master: educationDegrees.master,
            phd: educationDegrees.phd,
            email: fac.email || '',
            profileUrl: fac.profile_url || fac.source_url || '',
            source_url: fac.source_url || '',
            department_id: fac.department_id || departmentId,
            university_id: fac.university_id || '',
          };
        });        setFaculty(transformedFaculty);
        toast.success(`Loaded ${transformedFaculty.length} faculty members`);
      } catch (err) {
        console.error('Error fetching faculty:', err);
        setError(err.message);
        toast.error(`Failed to load faculty: ${err.message}`);
      } finally {
        setIsLoadingFaculty(false);
      }
    };

    fetchFaculty();
  }, [departmentId, API_URL]);

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

  // Filter and sort faculty data
  const filteredAndSortedFaculty = useMemo(() => {
    let filtered = faculty;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchWords = searchTerm.split(/\s+/).map(word => word.trim().toUpperCase()).filter(word => word);
      
      filtered = faculty.filter(fac => {
        const facName = (fac.name || '').toUpperCase();
        const facEducation = (fac.education || '').toUpperCase();
        const facTitle = (fac.title || '').toUpperCase();
        const facEmail = (fac.email || '').toUpperCase();
        const facBachelor = (fac.bachelor || '').toUpperCase();
        const facMaster = (fac.master || '').toUpperCase();
        const facPhd = (fac.phd || '').toUpperCase();
        
        return searchWords.every(word => {
          return facName.includes(word) || 
                 facEducation.includes(word) || 
                 facTitle.includes(word) ||
                 facEmail.includes(word) ||
                 facBachelor.includes(word) ||
                 facMaster.includes(word) ||
                 facPhd.includes(word);
        });
      });
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
    
    return sortableItems;
  }, [faculty, searchTerm, sortConfig]);

  const handleBack = () => {
    navigate('/admin', { state: { activeTab: 'department' } });
  };

  // Placeholder handlers for faculty management (you can implement these later)
  const handleFacultyUpdate = (id, key, value) => {
    console.log(`Faculty update: ID ${id}, ${key} = ${value}`);
    // TODO: Implement faculty update
    toast.info("Faculty update functionality not yet implemented");
  };

  const handleFacultyDelete = (id) => {
    console.log(`Faculty delete: ID ${id}`);
    // TODO: Implement faculty delete
    toast.info("Faculty delete functionality not yet implemented");
  };

  const handleAddFaculty = (newFacultyData) => {
    console.log('Add faculty:', newFacultyData);
    // TODO: Implement add faculty
    toast.info("Add faculty functionality not yet implemented");
  };

  if (isLoadingFaculty) {
    return (
      <div className="admin-view-container">
        <div className="loading-indicator card">Loading faculty...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-view-container">
        <div className="error-message card">
          <h3>Error Loading Faculty</h3>
          <p>{error}</p>
          <button onClick={handleBack} className="button button-secondary">
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-view-container">
      {/* Back button */}
      <button onClick={handleBack} className="back-to-admin-button">
        ← Back to Admin
      </button>

      {/* Faculty management card */}
      <div className="faculty-management-card">
        <h3>Faculty Members ({faculty.length})</h3>
        
        {/* Controls */}
        <div className="admin-controls-wrapper">
          <div className="admin-controls-row">
            <input
              type="text"
              placeholder="Search Faculty (Name, Title, Email, Bachelor's, Master's, PhD)"
              value={searchTerm}
              onChange={handleSearchChange}
              className="admin-search-input"
            />
          </div>
        </div>

        {/* Faculty table container */}
        <div className="faculty-table-container">
          {faculty.length === 0 ? (
            <div className="no-data-message card">
              <p>No faculty members found for this department.</p>
            </div>
          ) : (
            <AdminTable
              data={filteredAndSortedFaculty}
              type="faculty"
              onCellUpdate={handleFacultyUpdate}
              onDelete={handleFacultyDelete}
              onAddEntry={handleAddFaculty}
              showInlineAddForm={false}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentView;
