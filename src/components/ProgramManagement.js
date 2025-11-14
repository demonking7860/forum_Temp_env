import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Select from 'react-select';
import AdminTable from './AdminTable';
import { toast } from 'react-toastify';

const ProgramManagement = ({
  programsData,
  universitiesData,
  schoolsData,
  isLoading,
  error,
  onAddProgram,
  onLoadPrograms,
  onUpdateProgram,
  onDeleteProgram,
  programViewMode = 'simple',
  onProgramViewModeChange,
  importResults,
}) => {
  const degreeOptions = [
    { value: 'bachelors', label: 'Bachelors' },
    { value: 'masters', label: 'Masters' },
    { value: 'phd', label: 'PhD' },
    { value: 'all', label: 'All' }
  ];

  // Create university options from universitiesData
  const universityOptions = useMemo(() => {
    if (!universitiesData || !Array.isArray(universitiesData)) return [];
    
    const options = [
      { value: null, label: 'All Universities', id: null }, // Option to show all
      ...universitiesData.map(uni => ({
        value: uni.name,
        label: `${uni.name} (${uni.country})`,
        id: uni.id // Include university ID for API call
      }))
    ];
    
    return options.sort((a, b) => {
      if (a.value === null) return -1; // Keep "All Universities" at the top
      if (b.value === null) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [universitiesData]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState(null); // New state for university filter
  const [universityPrograms, setUniversityPrograms] = useState(null); // State for programs fetched from API
  const [loadingUniversityPrograms, setLoadingUniversityPrograms] = useState(false); // Loading state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [stagedPrograms, setStagedPrograms] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // default to 'all'
  const [scraping, setScraping] = useState(false); // New state for scraping
  const [progress, setProgress] = useState(null); // { completedPercentage, queuedCount, statusSummary }
  const [pollProgramsData, setPollProgramsData] = useState(null); // New state for polled programs
  const [pollingFinished, setPollingFinished] = useState(false); // Track if polling has finished
  const pollingRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';
  
  // Debug: Log when programsData changes
  useEffect(() => {
    console.log(`ProgramManagement received programsData update:`, {
      length: programsData?.length || 0,
      sampleProgram: programsData?.[0] ? {
        id: programsData[0].id,
        name: programsData[0].name,
        school: programsData[0].school,
        school_1: programsData[0].school_1,
        university: programsData[0].university
      } : null
    });
  }, [programsData]);
  
  // Auto-load data when component mounts if no data is available
  console.log("hello", programsData);
  programsData=""
  
  const handleToggleAddForm = () => {
    setShowAddForm(prev => !prev);
  };
  const handleScrapeNow=async()=>{
    try {
      setScraping(true)
      console.log('Starting scrape now...');
      const count = programsData.filter(p =>p.status==="URL_EXISTS"
      ).length;

      console.log('Programs with placement_url', count);
      const response = await fetch(`${API_URL}scrape-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      toast.success(`Scraping started asynchronously successfully `);
    } catch (err) {
      console.error(err);
      toast.error('Failed to start scraping.');
    } 
  }

  const handleAddEntryAndToggleForm = (newEntryData) => {
    if (onAddProgram) {
      onAddProgram(newEntryData);
    }
    // Only toggle form if it's not a bulk add from staged entries
    if (!Array.isArray(newEntryData)) {
      setShowAddForm(false);
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

  const handleUniversityChange = async (selectedOption) => {
    setSelectedUniversity(selectedOption);
    setSearchTerm(''); // Clear the search text when university changes
    
    // If no university selected or "All Universities" selected, use original data
    if (!selectedOption || selectedOption.value === null) {
      setUniversityPrograms(null);
      return;
    }
    
    // Fetch programs for the selected university
    if (selectedOption.id) {
      setLoadingUniversityPrograms(true);
      try {
        const response = await fetch(`${API_URL}programs/${selectedOption.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        
        // Extract programs array from response object
        const rawPrograms = responseData.programs || responseData || [];
        
        // First, check the school data we have available and the format of program.school
        console.log('Analyzing school data structure:');
        
        // Check if program.school is sometimes an array
        const schoolArrayExample = rawPrograms.find(p => Array.isArray(p.school));
        if (schoolArrayExample) {
          console.log('Found program with school as array:', schoolArrayExample);
        }
        
        // Log first few schools from school data for comparison
        if (schoolsData && schoolsData.length > 0) {
          console.log('First 3 schools from schoolsData:');
          schoolsData.slice(0, 3).forEach((school, i) => {
            console.log(`School ${i}:`, {
              id: school.id,
              _id: school._id,
              name: school.name ,
              rawSchool: school
            });
          });
        }
        
        // Get all school IDs from schoolsData for faster lookups
        const schoolIdMap = {};
        schoolsData?.forEach(school => {
          if (school.id) schoolIdMap[school.id] = school;
          if (school._id) schoolIdMap[school._id] = school;
        });
        
        // Fetch school names directly from backend as a fallback
        console.log('Creating lookup map for schools');
        
        // Transform programs by resolving university and school IDs to names
        const transformedPrograms = rawPrograms.map(program => {
          // Find university name from universitiesData
          const university = universitiesData?.find(uni => uni.id === program.university);
          const universityName = university ? university.name : program.university;
          
          // Handle school ID resolution - check if it's an array
          let schoolNames = 'Unknown School';
          
          if (program.school_1) {
            if (Array.isArray(program.school_1)) {
              // Handle array of school IDs
              schoolNames = program.school_1.map(schoolId => {
                // Look up school in our map
                const school = schoolIdMap[schoolId];
                if (school) {
                  // Return real school name if found
                  return school.name !== "Unknown School" ? school.name : null;
                }
                return null;
              })
              .filter(Boolean) // Remove null entries
              .join(', ');
              
              if (!schoolNames) schoolNames = 'Unknown School';
            } else {
              // Handle single school ID
              const schoolObj = schoolIdMap[program.school_1];
              
              if (schoolObj) {
                // Make sure we're not using a placeholder "Unknown School"
                schoolNames = schoolObj.name !== "Unknown School" ? 
                  schoolObj.name : 
                  'School not found';
              } else {
                schoolNames = 'School not found';
              }
            }
          }
          
          return {
            ...program,
            id: program._id || program.id,
            name: program.program,
            university: universityName,
            school: schoolNames,
            url: program.program_url || '',
            degree: program.degree,
            status: program.status || 'active',
            // Add fields that might be needed for display
            placement_url: program.placement_url || '',
            totalPreapprovedPlacements: program.totalPreapprovedPlacements || 0,
            // Include the school name fields from backend
            school_1_name: program.school_1 || '',
            school_2_name: program.school_2 || '',
            school_3_name: program.school_3 || '',
            accepted: program.accepted || 0,
            rejected: program.rejected || 0,
            edited: program.edited || 0,
            manual: program.manual || 0
          };
        });
        
        setUniversityPrograms(transformedPrograms);
        console.log(`the programs are ${transformedPrograms}`, transformedPrograms);
        console.log(`Fetched and transformed ${transformedPrograms.length} programs for ${selectedOption.value}`);
        
        // Pass the loaded programs back to the parent component using the proper callback
        if (onLoadPrograms && Array.isArray(transformedPrograms)) {
          onLoadPrograms(transformedPrograms);
        }
        
        toast.success(`Loaded ${transformedPrograms.length} programs for ${selectedOption.label}`);
      } catch (error) {
        console.error('Error fetching university programs:', error);
        toast.error(`Failed to fetch programs for ${selectedOption.value}`);
        setUniversityPrograms(null);
      } finally {
        setLoadingUniversityPrograms(false);
      }
    }
  };
  // Add new row view filter options
  const rowViewOptions = [
    { value: 'all', label: 'All' },
    { value: 'need_review', label: 'Error' },
    { value: 'running', label: 'Running' },
    { value: 'nat', label: 'Needs Review' },
  ];

  // Function to enrich programs with school names
  const enrichProgramsWithSchoolNames = useCallback((receivedPrograms, schoolData) => {
    if (!schoolData || !Array.isArray(schoolData)) return receivedPrograms;
    
    return receivedPrograms.map((program) => {
      const enrichedProgram = { ...program };

      ['school_1', 'school_2', 'school_3'].forEach((schoolKey) => {
        const schoolId = program[schoolKey];
        if (schoolId) {
          const matchedSchool = schoolData.find((s) => s.id === schoolId || s._id === schoolId);
          if (matchedSchool) {
            // Store the resolved name in a separate field to preserve the original ID
            enrichedProgram[`${schoolKey}_name`] = matchedSchool.name;
          }
        }
      });

      return enrichedProgram;
    });
  }, []);

  // Filtering logic for row view
  const filteredAndSortedPrograms = useMemo(() => {
    // Always prioritize parent programsData when available as it contains the most up-to-date data
    // including any updates made through AdminComponent
    let filtered = [];
    
    if (Array.isArray(programsData) && programsData.length > 0) {
      // Use parent's programsData (which includes real-time updates from AdminComponent)
      filtered = [...programsData];
      console.log(`Using parent programsData with ${filtered.length} programs`);
      
      // If a university is selected, filter by the selected university
      if (selectedUniversity && selectedUniversity.value !== null) {
        const originalLength = filtered.length;
        filtered = filtered.filter(program => 
          (program.university || '').toUpperCase() === selectedUniversity.value.toUpperCase()
        );
        console.log(`Filtered from ${originalLength} to ${filtered.length} programs for university ${selectedUniversity.value}`);
      }
    } else if (Array.isArray(universityPrograms)) {
      // Fallback to locally fetched university programs only if no parent data
      filtered = [...universityPrograms];
      console.log(`Using local universityPrograms with ${filtered.length} programs`);
    } else {
      // No data available
      filtered = [];
      console.log(`No program data available`);
    }
    
    // Apply text search filter
    if (searchTerm.trim()) {
      if (searchTerm.includes(';')) {
        // Position-based search: university; school; program; degree
        const parts = searchTerm.split(';').map(part => part.trim().toUpperCase());
        const searchUniversity = parts[0] || '';
        const searchSchool = parts.length > 1 ? parts[1] : '';
        const searchProgram = parts.length > 2 ? parts[2] : '';
        const searchDegree = parts.length > 3 ? parts[3] : '';
  
        filtered = filtered.filter(program => {
          const universityMatch = searchUniversity
            ? (program.university || '').toUpperCase().includes(searchUniversity)
            : true;
          const schoolMatch = searchSchool
            ? (program.school || '').toUpperCase().includes(searchSchool)
            : true;
          const programMatch = searchProgram
            ? (program.name || '').toUpperCase().includes(searchProgram)
            : true;
          const degreeMatch = searchDegree
            ? (program.degree || '').toUpperCase().includes(searchDegree)
            : true;
  
          return universityMatch && schoolMatch && programMatch && degreeMatch;
        });
      } else {
        // Word-based flexible search
        const searchWords = searchTerm
          .split(/\s+/)
          .map(word => word.trim().toUpperCase())
          .filter(Boolean);
  
        filtered = filtered.filter(program => {
          const university = (program.university || '').toUpperCase();
          const school = (program.school || '').toUpperCase();
          const programName = (program.name || '').toUpperCase();
          const degree = (program.degree || '').toUpperCase();
  
          return searchWords.every(word =>
            university.includes(word) ||
            school.includes(word) ||
            programName.includes(word) ||
            degree.includes(word)
          );
        });
      }
    }

    // Row view filter logic
    switch (filterMode) {
      case 'need_review':
        console.log('Need Review filter clicked');
        // Force programViewMode to 'all' when needs review is selected
        // This ensures all columns are shown when "Needs Review" is active
        if (programViewMode !== 'all' && onProgramViewModeChange) {
          onProgramViewModeChange('all');
        }
        filtered = filtered.filter(
          program =>
            (String(program.status).toLowerCase().includes('error')) ||
            !program.placement_url ||
            program.alert_flag==1 ||
            program.placement_url.trim() === '' ||
            program.placement_url.trim().toLowerCase() === 'not available' ||
            program.placement_url.trim().toLowerCase() === 'n/a'
        );
        break;
      case 'running':
        console.log('Running filter clicked');
        filtered = filtered.filter(
          program =>
            typeof program.status === 'string' &&
            program.status.toLowerCase().includes('in-progress')
        );
        break;
      case 'nat':
        console.log('NAT filter clicked');
        filtered = filtered.filter(program => {
          const totalPreapproved = Number(program.totalPreapprovedPlacements) || 0;
          const accepted = Number(program.accepted) || 0;
          const rejected = Number(program.rejected) || 0;
                return totalPreapproved > accepted && totalPreapproved > rejected;
        });
        break;
      case 'error':
        console.log('Error filter clicked');
        filtered = filtered.filter(
          program =>
            (String(program.status).toLowerCase().includes('error')) ||
            !program.placement_url ||
            program.placement_url.trim() === '' ||
            program.placement_url.trim().toLowerCase() === 'not available' ||
            program.placement_url.trim().toLowerCase() === 'n/a'
        );
        break;
      case 'all':
        console.log('All filter clicked');
        break;
      default:
        console.log('Unknown filterMode:', filterMode);
        break;
    }

    const sortableItems = [...filtered];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
  
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Handle numeric fields
        const numericFields = ['totalPreapprovedPlacements', 'accepted', 'rejected', 'edited', 'manual', 'timeToScrape'];
        if (numericFields.includes(sortConfig.key)) {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
        }

        // Handle string fields
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
  
        if (aStr < bStr) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    // Enrich programs with school names for proper display in the table
    const enrichedPrograms = enrichProgramsWithSchoolNames(sortableItems, schoolsData);
  
    return enrichedPrograms;
  }, [programsData, universityPrograms, searchTerm, selectedUniversity, sortConfig, filterMode, programViewMode, onProgramViewModeChange, schoolsData, enrichProgramsWithSchoolNames]);


  const handleBulkProgramSubmit = async () => {
    if (stagedPrograms.length === 0) return;
    try {
      const response = await fetch('/bulk-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          programs: stagedPrograms.map(program => ({
            degree: "PhD",
            program: program.name || program.program,
            program_url: program.url || program.program_url || '',
            placement_url: program.placement_url || '',
            school_1:  program.school_1,
            university: program.university_id
          }))
        }),
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data.programs)) {
        const updated = programsData.map((prog) => {
          if (!prog.id?.startsWith('staged--')) return prog;
          const match = data.programs.find(
            (serverProg) =>
              serverProg.program === prog.name &&
              serverProg.degree === prog.degree &&
              serverProg.school === prog.school_id &&
              serverProg.university === prog.university_id
          );
          return match
            ? {
                ...prog,
                id: match._id,
                name: match.program,
                degree: match.degree,
                url: match.program_url || '',
                placement_url: match.placement_url || '',
              }
            : prog;
        });
        onAddProgram(updated); // Pass updated array back
        setStagedPrograms([]);
      }
    } catch (err) {
      console.error('Bulk program submission failed:', err);
    }
  };

  // Helper to merge polled programs into existing table data
  function mergePolledPrograms(existingPrograms, polledPrograms) {
    // Create a map of existing programs by id
    const existingMap = new Map((existingPrograms || []).map(p => [String(p.id), p]));
    // Track updated IDs
    const updatedIds = new Set();

    // Prepare merged list
    const merged = [...existingPrograms];

    // For each polled program, update or append
    polledPrograms.forEach(polled => {
      const polledId = String(polled._id || polled.id);
      const mapped = {
        id: polled._id || polled.id,
        url: Array.isArray(polled.program_url) ? polled.program_url[0] : polled.program_url,
        placement_url: Array.isArray(polled.placement_url) ? polled.placement_url[0] : polled.placement_url,
    
        status: polled.status,
        alert_flag: polled.alert_flag,
        scraperTag: polled.scraperTag,
        timeToScrape: polled.timeToScrape,
        scrapingErrorDetails: polled.scrapingErrorDetails,
        url_selection_confidence: polled.url_selection_confidence,
        totalPreapprovedPlacements: polled.totalPreapprovedPlacements,
        accepted: polled.approved,
        rejected: polled.rejected,
        manual: polled.manual,
        edited: polled.edited,
        url_comment: polled.url_selection_reasoning,
        error_comment: Array.isArray(polled.error_comment) ? polled.error_comment.join('; ') : polled.error_comment,
        run_comment: polled.comment,
        // ...other fields as needed
      };
      if (existingMap.has(polledId)) {
        // Update the existing row
        const idx = merged.findIndex(p => String(p.id) === polledId);
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...mapped };
          updatedIds.add(polledId);
        }
      } else {
        // Append new row
        merged.push(mapped);
        updatedIds.add(polledId);
      }
    });

    return merged;
  }

  // Polling logic for progress bar
  useEffect(() => {
    if (!scraping) {
      setProgress(null);
      setPollingFinished(true);
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    setPollingFinished(false); // Reset when scraping starts
    // Poll every 2 seconds
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}poll-queued-programs-status`);
        if (!res.ok) throw new Error('Failed to poll status');
        const data = await res.json();
        setProgress(data);

        if (Array.isArray(data.programs)) {
          setPollProgramsData(prev => mergePolledPrograms(filteredAndSortedPrograms, data.programs));
        }

        // Stop polling if completed
        if (data.completedPercentage >= 100 || data.queuedCount === 0) {
          setScraping(false);
          setProgress(null);
          setPollingFinished(true);
          if (pollingRef.current) clearInterval(pollingRef.current);

          // Cleanup queue when progress bar is full
          try {
            await fetch(`${API_URL}cleanup-entire-queue`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            // Optionally show a toast or log
            toast.success('Queue cleaned up after scraping finished.');
          } catch (cleanupErr) {
            console.error('Failed to cleanup queue:', cleanupErr);
            toast.error('Failed to cleanup queue after scraping.');
          }
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    poll();
    pollingRef.current = setInterval(poll, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [scraping, API_URL, filteredAndSortedPrograms]);

  // Use merged polled programs if available, even after scraping is finished
  // Always prioritize the most up-to-date data
  const tableProgramsData = useMemo(() => {
    const data = pollProgramsData || filteredAndSortedPrograms;
    console.log(`tableProgramsData updated:`, {
      source: pollProgramsData ? 'pollProgramsData' : 'filteredAndSortedPrograms',
      length: data?.length || 0,
      sampleProgram: data?.[0] ? {
        id: data[0].id,
        school: data[0].school,
        school_1: data[0].school_1
      } : null
    });
    return data;
  }, [pollProgramsData, filteredAndSortedPrograms]);

  // Optionally, provide a way to reset polled status manually (e.g., a button)
  // Example:
  // <button onClick={() => setPollProgramsData(null)}>Reset Polled Status</button>

  return (
    <div className="admin-tab-content program-table">
      <div className="admin-controls-wrapper" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-controls-row" >
          <div style={{ minWidth: 250, maxWidth: 400, flexGrow: 1, marginRight: '1rem' }}>
            <Select
              value={selectedUniversity}
              onChange={handleUniversityChange}
              options={universityOptions}
              placeholder={loadingUniversityPrograms ? "Loading programs..." : "Select University..."}
              isClearable
              isSearchable
              isLoading={loadingUniversityPrograms}
              isDisabled={loadingUniversityPrograms}
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
            placeholder="Search School, Program, or Degree"
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
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          />
          <div style={{ minWidth: 150, transition: 'all 0.2s' }}>
            <Select
              value={{
                value: programViewMode,
                label:
                  programViewMode === 'simple'
                    ? 'Simple View'
                    : programViewMode === 'all'
                    ? 'All Columns'
                    : programViewMode === 'programInfo'
                    ? 'Program Info'
                    : programViewMode === 'placementInfo'
                    ? 'Placement Info'
                    : programViewMode === 'scraperInfo'
                    ? 'Scraper Info'
                    : 'Simple View'
              }}
              onChange={selected =>
                onProgramViewModeChange &&
                onProgramViewModeChange(selected ? selected.value : 'simple')
              }
              options={[
                { value: 'simple', label: 'Simple View' },
                { value: 'all', label: 'All Columns' },
                { value: 'programInfo', label: 'Program Info' },
                { value: 'placementInfo', label: 'Placement Info' },
                { value: 'scraperInfo', label: 'Scraper Info' }
              ]}
              className="program-view-dropdown-select"
              classNamePrefix="react-select"
              isSearchable={false}
              isClearable={false}
              menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  padding: '0.1rem 0.2rem',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  border: `1px solid ${
                    state.isFocused
                      ? 'var(--primary-color-medium, #1a6985)'
                      : 'var(--primary-color, #007bff)'
                  }`,
                  borderRadius: 'var(--border-radius-medium, 8px)',
                  backgroundColor: state.isFocused
                    ? 'rgba(233, 246, 252, 0.5)'
                    : '#fff',
                  color: 'var(--primary-color-dark, #0a3d4e)',
                  cursor: 'pointer',
                  minWidth: '140px',
                  fontWeight: '500',
                  boxShadow: state.isFocused
                    ? '0 0 0 3px rgba(0, 123, 255, 0.18)'
                    : '0 2px 4px rgba(0, 123, 255, 0.08)',
                  transition:
                    'border-color 0.2s, box-shadow 0.2s, background-color 0.2s, transform 0.15s',
                  '&:hover': {
                    borderColor: 'var(--primary-color-medium, #1a6985)',
                    backgroundColor: 'rgba(233, 246, 252, 0.3)',
                    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.12)',
                    transform: 'translateY(-1px)'
                  }
                }),
                menu: provided => ({
                  ...provided,
                  zIndex: 10000,
                  borderRadius: 'var(--border-radius-medium, 8px)',
                  border: '1px solid var(--primary-color, #007bff)',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.13)',
                  transition: 'opacity 0.18s'
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
                  transition: 'background-color 0.15s, color 0.15s'
                }),
                singleValue: provided => ({
                  ...provided,
                  color: 'var(--primary-color-dark, #0a3d4e)',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  fontWeight: '500',
                  transition: 'color 0.15s'
                }),
                menuPortal: provided => ({
                  ...provided,
                  zIndex: 10000
                })
              }}
              theme={theme => ({
                ...theme,
                borderRadius: 8,
                colors: {
                  ...theme.colors,
                  primary25: 'rgba(233, 246, 252, 0.8)',
                  primary: '#007bff'
                }
              })}
            />
          </div>
          {/* New Row View Dropdown */}
          <div style={{ minWidth: 150, marginLeft: 12 }}>
            <Select
              value={rowViewOptions.find(opt => opt.value === filterMode)}
              onChange={selected => setFilterMode(selected ? selected.value : 'all')}
              options={rowViewOptions}
              className="row-view-dropdown-select"
              classNamePrefix="react-select"
              isSearchable={false}
              isClearable={false}
              menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  padding: '0.1rem 0.2rem',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  border: `1px solid ${
                    state.isFocused
                      ? 'var(--primary-color-medium, #1a6985)'
                      : 'var(--primary-color, #007bff)'
                  }`,
                  borderRadius: 'var(--border-radius-medium, 8px)',
                  backgroundColor: state.isFocused
                    ? 'rgba(233, 246, 252, 0.5)'
                    : '#fff',
                  color: 'var(--primary-color-dark, #0a3d4e)',
                  cursor: 'pointer',
                  minWidth: '120px',
                  fontWeight: '500',
                  boxShadow: state.isFocused
                    ? '0 0 0 3px rgba(0, 123, 255, 0.18)'
                    : '0 2px 4px rgba(0, 123, 255, 0.08)',
                  transition:
                    'border-color 0.2s, box-shadow 0.2s, background-color 0.2s, transform 0.15s',
                  '&:hover': {
                    borderColor: 'var(--primary-color-medium, #1a6985)',
                    backgroundColor: 'rgba(233, 246, 252, 0.3)',
                    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.12)',
                    transform: 'translateY(-1px)'
                  }
                }),
                menu: provided => ({
                  ...provided,
                  zIndex: 10000,
                  borderRadius: 'var(--border-radius-medium, 8px)',
                  border: '1px solid var(--primary-color, #007bff)',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.13)',
                  transition: 'opacity 0.18s'
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
                  transition: 'background-color 0.15s, color 0.15s'
                }),
                singleValue: provided => ({
                  ...provided,
                  color: 'var(--primary-color-dark, #0a3d4e)',
                  fontSize: 'var(--font-size-small, 0.9rem)',
                  fontWeight: '500',
                  transition: 'color 0.15s'
                }),
                menuPortal: provided => ({
                  ...provided,
                  zIndex: 10000
                })
              }}
              theme={theme => ({
                ...theme,
                borderRadius: 8,
                colors: {
                  ...theme.colors,
                  primary25: 'rgba(233, 246, 252, 0.8)',
                  primary: '#007bff'
                }
              })}
            />
          </div>
          {/* Remove old All/Attention filter buttons */}
          <button
            className="button button-primary admin-action-button"
            onClick={handleScrapeNow}
            style={{ transition: 'background 0.18s, color 0.18s, box-shadow 0.18s' }}
          >
            Scrape Now
          </button>
          <button
            onClick={handleToggleAddForm}
            className="button button-primary admin-action-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background 0.18s, color 0.18s, box-shadow 0.18s'
            }}
            disabled={isLoading}
          >
            <span style={{ fontSize: '1.2em', lineHeight: '1' }}>+</span>
            {showAddForm ? 'Cancel' : 'Form'}
          </button>
        </div>
      </div>
      {/* Progress Bar UI */}
      {progress && (
        <div style={{ margin: '0 0 1.5rem 0', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
            <div>
              <strong>Queued:</strong> {progress.queuedCount}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {progress.statusSummary &&
                Object.entries(progress.statusSummary).map(([status, count]) => (
                  <span key={status} style={{ marginLeft: 8 }}>
                    <strong>{status.replace(/-/g, ' ')}</strong>: {count}
                  </span>
                ))}
            </div>
            <div>
              <strong>{progress.completedPercentage}%</strong> Complete
            </div>
          </div>
          <div style={{
            width: '100%',
            background: '#e0e0e0',
            borderRadius: 8,
            height: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              width: `${progress.completedPercentage}%`,
              background: 'linear-gradient(90deg, #007bff 60%, #1a6985 100%)',
              height: '100%',
              transition: 'width 0.5s',
              borderRadius: 8
            }} />
          </div>
        </div>
      )}
      {(isLoading || loadingUniversityPrograms) && (
        <div className="loading-indicator card">
          {loadingUniversityPrograms ? 'Loading university programs...' : 'Loading or processing...'}
        </div>
      )}
      {error && <div className="error-message card">Error: {error}</div>}
      {!isLoading && !loadingUniversityPrograms && !error && (
        <AdminTable
          scraping={scraping}
          data={tableProgramsData}
          type="program"
          onCellUpdate={onUpdateProgram}
          onDelete={onDeleteProgram}
          onAddEntry={handleAddEntryAndToggleForm}
          showInlineAddForm={showAddForm}
          universitiesData={universitiesData}
          schoolsData={schoolsData}
          sortConfig={sortConfig}
          onSort={handleSort}
          programViewMode={programViewMode}
          degreeOptions={degreeOptions}
          importResults={importResults}
        />
      )}
    </div>
  );
};

export default ProgramManagement;
