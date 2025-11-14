import React, { useState, useEffect, useRef, useMemo } from 'react';
import './ComparisonTable.css';

const ComparisonTable = ({ data, universities }) => {
  const [expandedInstitutions, setExpandedInstitutions] = useState({});
  const [processedData, setProcessedData] = useState(null);
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleResize = ()=> {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!data || !universities || universities.length === 0) {
      console.log("No valid comparison data available");
      setProcessedData(null);
      return;
    }

    try {
      // Collect all years from all universities
      const allYears = new Set();
      universities.forEach(uni => {
        if (data[uni] && data[uni].data && Array.isArray(data[uni].data)) {
          data[uni].data.forEach(placement => {
            if (placement.date) {
              allYears.add(placement.date);
            }
          });
        }
      });

      // Sort years in descending order
      const sortedYears = Array.from(allYears).sort((a, b) => b - a);

      // Create year-based structure with university placements
      const yearData = {};

      sortedYears.forEach(year => {
        yearData[year] = {};

        universities.forEach(uni => {
          // Filter placements for this university and year
          const uniDataEntry = data[uni] || { data: [] };
          const uniData = uniDataEntry.data || [];
          yearData[year][uni] = uniData.filter(placement => placement.date === year);
        });
      });

      setProcessedData(yearData);
    } catch (error) {
      setProcessedData(null);
    }
  }, [data, universities]);

  // Check if we have actual data to display
  const hasData = useMemo(() => {
    if (!data || !universities || universities.length === 0) {
      return false;
    }

    // Check if any university has placement data
    return Object.values(data).some(uniData =>
      uniData && uniData.data && uniData.data.length > 0
    );
  }, [data, universities]);

  // Format college name for display (replace underscores with spaces and capitalize)
  const formatCollegeName = (collegeName) => {
    if (!collegeName) return "UNKNOWN";
    return collegeName.toUpperCase().replace(/_/g, ' ');
  };

  // Format department name for display
  const formatDepartmentName = (departmentName) => {
    if (!departmentName) return "UNKNOWN";
    return departmentName.toUpperCase().replace(/_/g, ' ');
  };


  // Get formatted program name
  const getProgramDisplay = (uni) => {
    const program = data[uni]?.selectedProgram;
    return program ? program.toUpperCase() : 'PHD';
  };

  // If there's no valid data, show a friendly message
  if (!hasData) {
    return (
      <div className="comparison-container empty-comparison">
        <h2>UNIVERSITY COMPARISON</h2>
        <div className="empty-comparison-message">
          <div className="empty-icon">🔍</div>
          <h3>No Results Available</h3>
          <p>There is no placement data available for the selected universities.</p>
          <p className="empty-subtitle">Try selecting different universities to compare.</p>
        </div>
      </div>
    );
  }

  // If data is still being processed or is invalid, show a message
  if (!processedData) {
    return (
      <div className="comparison-container">
        <h2>UNIVERSITY COMPARISON</h2>
        <p>Processing comparison data...</p>
      </div>
    );
  }

  const years = Object.keys(processedData).sort((a, b) => b - a); // Sort years in descending order

  const getPlacementsForUniversity = (year, university) => {
    return processedData[year][university] || [];
  };

  const groupByInstitution = (placements) => {
    return Object.entries(placements.reduce((acc, p) => {
      const key = p.institution || 'Unknown Institution';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        ...p,
        department: formatDepartmentName(p.department),
        college: formatCollegeName(p.college)
      });
      return acc;
    }, {}))
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase())) // Case-insensitive sort
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  };

  const toggleInstitution = (year, uni, inst) => {
    const key = `${year}-${uni}-${inst}`;
    setExpandedInstitutions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isInstitutionExpanded = (year, uni, inst) => {
    const key = `${year}-${uni}-${inst}`;
    return expandedInstitutions[key];
  };

  const handleScroll = () => {
    if (showSwipeIndicator) {
      setShowSwipeIndicator(false);
    }
  };

  // Clean role text for better display
  const formatRole = (role) => {
    if (!role) return 'POSITION NOT SPECIFIED';

    // Make common abbreviations uniform
    let cleanedRole = role.toUpperCase()
      .replace(/ASST\.? PROF/i, 'ASSISTANT PROFESSOR')
      .replace(/ASSOC\.? PROF/i, 'ASSOCIATE PROFESSOR')
      .replace(/AST\.? PROF/i, 'ASSISTANT PROFESSOR');

    return cleanedRole;
  };

  // Check if any university is still loading
  const isAnyLoading = Object.values(data).some(uni => uni.isLoading);
  
  // Check if any university had an error
  const hasErrors = Object.values(data).some(uni => uni.error);

  return (
    <div className="comparison-container">
      <h2>UNIVERSITY COMPARISON</h2>

      {/* Only show swipe indicator on mobile devices */}
      {isMobile && showSwipeIndicator && (
        <div className="swipe-indicator">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 19L3 12M3 12L10 5M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Swipe horizontally to view complete comparison
        </div>
      )}

      <div 
        className="comparison-scroll" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {years.map(year => (
          <div key={year} className="year-section">
            <div className="year-header">
              <h3>{year}</h3>
            </div>

            <div className="table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    {universities.map((uni) => (
                      <th key={`${year}-${uni}`} className="university-column">
                        <div className="university-header-content">
                          <div className="university-name">
                            {formatCollegeName(uni)}
                          </div>
                          <div className="university-program-field">
                            <span className={`university-program ${data[uni]?.selectedProgram ? 'has-program' : ''}`}>
                              {getProgramDisplay(uni)}
                            </span>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {universities.map((uni) => {
                      const placements = getPlacementsForUniversity(year, uni);
                      const institutionGroups = groupByInstitution(placements);

                      return (
                        <td key={`${year}-${uni}`} className="university-data">
                          <div className="placement-summary-container">
                            <span className="placement-count">{placements.length}</span>
                            <span className="placement-label">PLACEMENTS</span>
                          </div>
                          {Object.entries(institutionGroups).map(([inst, instPlacements]) => (
                            <div key={inst} className="institution-block">
                              <div 
                                className="institution-header"
                                onClick={() => toggleInstitution(year, uni, inst)}
                                role="button"
                                aria-expanded={isInstitutionExpanded(year, uni, inst)}
                                tabIndex={0}
                              >
                                <div className="institution-name">
                                  {inst.toUpperCase()} ({instPlacements.length})
                                </div>
                                <button 
                                  className={`toggle-button ${isInstitutionExpanded(year, uni, inst) ? 'toggle-minus' : 'toggle-plus'}`}
                                  aria-label={isInstitutionExpanded(year, uni, inst) ? 'Collapse details' : 'Expand details'}
                                >
                                  {/* Empty button - content will be added via CSS ::before pseudo-element */}
                                </button>
                              </div>
                              {isInstitutionExpanded(year, uni, inst) && (
                                <div className="roles-list">
                                  {instPlacements.map((p, idx) => (
                                    <div key={idx} className="role-item">
                                      • {formatRole(p.role)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {isAnyLoading && (
        <div className="loading-overlay">
          <p>Loading university data...</p>
        </div>
      )}
      
      {hasErrors && (
        <div className="error-banner">
          <p>Some universities could not be loaded. The comparison may be incomplete.</p>
        </div>
      )}
      
      
      <style jsx>{`
        .comparison-table-container {
          position: relative;
          overflow-x: auto;
          margin-top: 20px;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.8);
          padding: 10px;
          text-align: center;
          font-weight: bold;
          z-index: 1;
        }
        
        .error-banner {
          background: rgba(255, 200, 200, 0.2);
          padding: 10px;
          margin-bottom: 15px;
          border-left: 3px solid #d9534f;
          color: #d9534f;
        }
        
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .comparison-table th, .comparison-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        .comparison-table th {
          background-color: rgba(26, 105, 133, 0.1);
          font-weight: 600;
          position: relative;
        }
        
        .metric-column {
          min-width: 180px;
          background-color: rgba(26, 105, 133, 0.15) !important;
        }
        
        .university-column {
          min-width: 220px;
        }
        
        .metric-label {
          font-weight: 500;
          color: #555;
        }
        
        .loading-indicator {
          display: inline-block;
          opacity: 0.7;
          font-style: italic;
        }
        
        .university-error-indicator {
          font-size: 12px;
          color: #d9534f;
          font-weight: normal;
          margin-top: 5px;
        }
      `}</style>
    </div>
  );
};

export default ComparisonTable;
