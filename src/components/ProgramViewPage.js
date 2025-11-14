import React, { useMemo,useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import AdminTable from './AdminTable';

const API_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';

const ProgramViewPage = () => {
  const { id } = useParams();
  const [placementData, setPlacementData] = useState([]);
  const [programInfo, setProgramInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [placements, setPlacements] = useState([]); // or use your existing placementData
  let placementsCache = null;

  const filteredPlacements = useMemo(() => {
    let filtered = placementData || [];
  
    if (searchQuery.trim()) {
      if (searchQuery.includes(';')) {
        const parts = searchQuery.split(';').map(part => part.trim().toUpperCase());
        const searchSchool = parts[0] || '';
        const searchDepartment = parts.length > 1 ? parts[1] : '';
        const searchTerm = parts.length > 2 ? parts[2] : '';
  
        filtered = filtered.filter(item => {
          const schoolMatch = searchSchool
            ? (item.school || '').toUpperCase().includes(searchSchool)
            : true;
          const deptMatch = searchDepartment
            ? (item.department || '').toUpperCase().includes(searchDepartment)
            : true;
          const termMatch = searchTerm
            ? (item.name || '').toUpperCase().includes(searchTerm)
            : true;
          return schoolMatch && deptMatch && termMatch;
        });
      } else {
        const searchWords = searchQuery
          .split(/\s+/)
          .map(word => word.trim().toUpperCase())
          .filter(Boolean);
      
        filtered = filtered.filter(item => {
          const fields = [
            (item.name || '').toUpperCase(),
            (item.school || '').toUpperCase(),
            (item.department || '').toUpperCase(),
            (item.university || '').toUpperCase(),
            (item.title || '').toUpperCase(),
            (item.institution || '').toUpperCase(),
          ];
          return searchWords.every(word =>
            fields.some(field => field.includes(word))
          );
        });
      }
    }
  
    return filtered;
  }, [placementData, searchQuery]);

  
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetch(`${API_URL}preapproved-placements?source_program_id=${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch placements: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        // Adapt to backend response: { placements: [...], program_url: "...", placement_url: "...", university_url: "..." }
        if (data && typeof data === 'object' && Array.isArray(data.placements)) {
          setPlacementData(data.placements);
          if (data.placements.length > 0) {
            setProgramInfo({
              university: data.placements[0].university,
              program: data.placements[0].program,
              program_url: data.program_url || data.placements[0].program_url,
              placement_url: data.placement_url || data.placements[0].placement_url,
              university_url: data.university_url || data.placements[0].university_url
            });
          }
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          // fallback for old shape
          const placements = Object.values(data);
          setPlacementData(placements);
          if (placements.length > 0) {
            setProgramInfo({
              university: placements[0].university,
              program: placements[0].program,
              program_url: placements[0].program_url,
              placement_url: placements[0].placement_url,
              university_url: placements[0].university_url
            });
          }
        } else if (Array.isArray(data)) {
          setPlacementData(data);
          if (data.length > 0) {
            setProgramInfo({
              university: data[0].university,
              program: data[0].program,
              program_url: data[0].program_url,
              placement_url: data[0].placement_url,
              university_url: data[0].university_url
            });
          }
        } else {
          setPlacementData([]);
        }
        setLastSyncedAt(new Date());
      })
      .catch(err => {
        setPlacementData([]);
        setError(err.message);
        toast.error(`Failed to fetch data: ${err.message}`);
        console.error('Failed to fetch data:', err);
        setLastSyncedAt(new Date());
      })
      .finally(() => setLoading(false));
      
  }, [id]);
  
  // Update cell with state/meta for backend
  async function handleCellUpdate(id, key, value, state = 3, meta = 'edited', suppressToast = false) {
    const payload =
      key === null
        ? { ...value, state, meta } // full row
        : { [key]: value, state, meta };

    try {
      await fetch(`${API_URL}preapproved-placements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!suppressToast) {
        toast.success('Saved!');
      }
    } catch (err) {
      if (!suppressToast) {
        toast.error('Failed to save change.');
      }
      throw err; // Re-throw to allow bulk operations to handle errors
    }
  }
  
  const handleToggleAddForm = () => {
    setShowAddForm(prev => !prev);
  };
  const [showAddForm, setShowAddForm] = useState(false);
  const isLoading = loading || !placementData;
  // Add state tracking for when add form is visible
  
  // Add Placement (optimistic)
  const handleAddPlacement = useCallback(async (newPlacementData) => {
    // Always set state: 4 and meta: 'added' for new rows
    const payload = {
      ...newPlacementData,
      source_program_id: id,
      state: 4,
      meta: 'added'
    };

    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') delete payload[k];
    });

    const tempId = `temp-placement-${Date.now()}`;
    const optimisticPlacement = {
      id: tempId,
      ...payload,
      isNew: true,
      isOptimistic: true,
    };

    // Immediately add to frontend placementData for instant feedback
    setPlacementData(prev => [optimisticPlacement, ...prev]);

    setPlacements(prev => {
      const updated = [optimisticPlacement, ...prev];
      placementsCache = updated;
      return updated;
    });

    try {
      const response = await fetch(`${API_URL}preapproved-placements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to add placement');
      }

      const result = await response.json();
      // Replace optimistic row with real data from server in placementData and placements
      setPlacementData(prev =>
        prev.map(p =>
          p.id === tempId
            ? { ...result, isNew: true, isOptimistic: false }
            : p
        )
      );
      setPlacements(prev =>
        prev.map(p =>
          p.id === tempId
            ? { ...result, isNew: true, isOptimistic: false }
            : p
        )
      );
      toast.success('Placement added!');
    } catch (error) {
      setPlacementData(prev => prev.filter(p => p.id !== tempId));
      setPlacements(prev => {
        const updated = prev.filter(p => p.id !== tempId);
        placementsCache = updated;
        return updated;
      });
      toast.error(`Error adding placement: ${error.message}`);
    }
  }, [id]);

  // New: State for add form fields
  const [newPlacement, setNewPlacement] = useState({
    name: '',
    date: '',
    role: '',
    institution: '',
    approvalstatus: '',
    source: ''
  });

  // New: Handle input change for add row
  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlacement(prev => ({ ...prev, [name]: value }));
  };

  // New: Handle dropdown change for approvalstatus
  const handleAddApprovalChange = (e) => {
    setNewPlacement(prev => ({ ...prev, approvalstatus: e.target.value }));
  };

  // New: Submit add row
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (
      !newPlacement.name ||
      !newPlacement.date ||
      !newPlacement.role ||
      !newPlacement.institution ||
      !newPlacement.source // Make source mandatory
    ) {
      toast.error('All fields are required, including Source.');
      return;
    }
    console.log('New placement row added:', newPlacement);

    // Always set state: 4 and meta: 'added' for new rows
    const placementWithManual = { ...newPlacement, state: 4, meta: 'added' };

    await handleAddPlacement(placementWithManual);
    setNewPlacement({ name: '', date: '', role: '', institution: '', approvalstatus: '', source: '' });
    setShowAddForm(false); // Always close the form after add
  };

  // New: Cancel add row
  const handleAddCancel = () => {
    setNewPlacement({ name: '', date: '', role: '', institution: '', approvalstatus: '', source: '' });
    setShowAddForm(false);
  };

  // New: State for editing cell
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  // New: Track copied row for feedback
  const [copiedId, setCopiedId] = useState(null);

  // Store the original item when editing starts
  const [originalEditItem, setOriginalEditItem] = useState(null);

  // New: Handle double click to edit
  const handleDoubleClick = (item, key) => {
    if (!['name', 'date', 'role', 'institution', 'approvalstatus', 'source'].includes(key)) return;
    setEditingCell({ id: item._id, key });
    setEditValue(item[key] ?? '');
    setOriginalEditItem({ ...item }); // Store the original item before any edits
  };

  // New: Handle input change in edit mode
  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  // New: Save edit on blur or Enter
  const handleEditSave = async (item) => {
    if (editingCell && editingCell.id === item._id) {
      const key = editingCell.key;
      const originalValue = item[key];

      // Only proceed if value is actually changed
      if (originalValue === editValue) {
        setEditingCell(null);
        setOriginalEditItem(null);
        return;
      }

      // Keep a copy of the row prior to edit
      const priorRow = { ...originalEditItem };

      // If editing 'source', require it to be changed and non-empty
      if (key === 'source') {
        if (!editValue) {
          toast.error('You must provide a new, non-empty Source when editing.');
          return;
        }
        // Submit the entire row with all current values (including the new source)
        const updatedRow = { 
          ...item, 
          source: editValue, 
          approvalstatus: 'approved', // set to approved on edit
          state: 1, 
          meta: 'approved',
          editedMeta:"edited" // new field to track edits
        };
        try {
          await handleCellUpdate(item._id, null, updatedRow, 1, 'approved');
          setPlacementData(prev =>
            prev.map(row =>
              row._id === item._id ? updatedRow : row
            )
          );
        } catch (err) {
          toast.error('Failed to save row.');
        }
        setEditingCell(null);
        setOriginalEditItem(null);
        return;
      }

      // If editing name, institution, role, or date on an approved item, save the edit and open source for editing
      if (['name', 'institution', 'role', 'date'].includes(key)) {
        // Save the edit locally, set approvalstatus to approved
        setPlacementData(prev =>
          prev.map(row =>
            row._id === item._id ? { ...row, [key]: editValue, approvalstatus: 'approved' } : row
          )
        );
        
        // For approved items, create a rejected version of the prior row only if it was originally approved
        // AND if this is the first edit (check if the original item was approved)
        if (priorRow && priorRow._id && originalEditItem && originalEditItem.approvalstatus === 'approved') {
          const rejectedRow = {
            ...priorRow,
            approvalstatus: 'rejected',
            state: 2,
            meta: 'rejected'
          };
          // Remove fields that shouldn't be sent
          delete rejectedRow.id;
          delete rejectedRow._id;
          delete rejectedRow.isNew;
          delete rejectedRow.isOptimistic;
          try {
            await fetch(`${API_URL}preapproved-placements`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rejectedRow),
            });
          } catch (err) {
            toast.error('Failed to save previous version as rejected.');
          }
        }
        
        // Save the current edit to the database
        try {
          await handleCellUpdate(
            item._id, 
            key, 
            editValue, 
            1, // state: approved
            'approved'
          );
        } catch (err) {
          toast.error('Failed to save change.');
        }
        
        // Open the source field for editing
        setEditingCell({ id: item._id, key: 'source' });
        setEditValue('');
        toast.info('Please enter a source for this change before submitting.');
        return;
      }

      // If editing approvalstatus, do NOT send old row as rejected
      let state = 3;
      let meta = 'edited';
      if (key === 'approvalstatus') {
        if (editValue === 'approved') {
            state = 1;
            meta = 'approved';
          } else if (editValue === 'rejected') {
            state = 2;
            meta = 'rejected';
          } else if (editValue === 'submitted') {
            state = 5;
            meta = 'submitted';
          }
          // First update the field client-side
          setPlacementData(prev =>
            prev.map(row =>
            row._id === item._id ? { ...row, [key]: editValue } : row
            )
          );
          // Then send the update to the backend
          try {
            await handleCellUpdate(item._id, key, editValue, state, meta);
          } catch (err) {
            toast.error('Failed to save change.');
          }
          setEditingCell(null);
          setOriginalEditItem(null);
          return; // Exit early - don't send old row as rejected for approval status changes
      }

      // For all other fields EXCEPT approvalstatus, send prior row as rejected/state:2
      if (key !== 'approvalstatus' && priorRow && priorRow._id) {
        const rejectedRow = {
          ...priorRow,
          approvalstatus: 'rejected',
          state: 2,
          meta: 'rejected'
        };
        delete rejectedRow.id;
        delete rejectedRow._id;
        delete rejectedRow.isNew;
        delete rejectedRow.isOptimistic;
        try {
          await fetch(`${API_URL}preapproved-placements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rejectedRow),
          });
        } catch (err) {
          toast.error('Failed to save previous version as rejected.');
        }
      }

      // Default: update the field, set approvalstatus to approved
      try {
        await handleCellUpdate(
          item._id, 
          key, 
          editValue, 
          1, // state: approved
          'approved'
        );
        setPlacementData(prev =>
          prev.map(row =>
            row._id === item._id ? { ...row, [key]: editValue, approvalstatus: 'approved' } : row
          )
        );
      } catch (err) {
        toast.error('Failed to save change.');
      }
      setEditingCell(null);
      setOriginalEditItem(null);
    }
  };

  // New: Handle keydown in edit mode
  const handleEditKeyDown = (e, item) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave(item);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };
console.log(programInfo)
  // Count of approved placements
  const approvedCount = filteredPlacements.filter(
    (item) => String(item.approvalstatus).toLowerCase() === 'approved'
  ).length;

  // Handler for "Submit Now" button
  const handleSubmitNow = async () => {
    if (!id) {
      toast.error("No program ID found.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}submit-all-approved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Submitted all approved placements!");
        // Optionally, refresh data after submit
        setLoading(true);
        setTimeout(() => {
          // re-fetch placements
          fetch(`${API_URL}preapproved-placements?source_program_id=${id}`)
            .then(res => res.json())
            .then(data => {
              if (data && Array.isArray(data.placements)) {
                setPlacementData(data.placements);
              } else if (Array.isArray(data)) {
                setPlacementData(data);
              } else {
                setPlacementData([]);
              }
              setLastSyncedAt(new Date());
            })
            .catch(() => setPlacementData([]))
            .finally(() => setLoading(false));
        }, 500);
      } else {
        toast.error(data.error || "Failed to submit approved placements.");
      }
    } catch (err) {
      toast.error("Failed to submit approved placements.");
    }
  };

  return (
    <div className="admin-controls-wrapper" style={{ marginBottom: '1.5rem' }}>
      <div className="admin-controls-row" style={{ alignItems: 'center', gap: '1.5rem' }}>
        {loading ? (
          <p>Loading program details...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>Error: {error}</p>
        ) : programInfo ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.5rem',
              flexWrap: 'wrap',
              background: 'rgba(255,255,255,0.92)',
              borderRadius: '12px',
              boxShadow: '0 4px 24px 0 rgba(0,0,0,0.13), 0 1.5px 6px 0 rgba(0,0,0,0.07)',
              padding: '1.2rem 2rem',
              margin: '1rem 0 2rem 0',
              maxWidth: 1800,
              border: '1px solid #e3e3e3',
              fontSize: '1.04em'
            }}
          >
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: '1.25em', marginBottom: 6 }}>Placement View</div>
              <div style={{ color: '#888', fontSize: '0.98em' }}>
                Last synced at: {lastSyncedAt ? lastSyncedAt.toLocaleString() : '...'}
              </div>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ color: '#555', fontWeight: 500 }}>Program ID:</div>
              <div style={{ color: '#222', fontWeight: 600 }}>{id}</div>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ color: '#555', fontWeight: 500 }}>University:</div>
              <div style={{ color: '#222', fontWeight: 600 }}>
                {programInfo.university_url ? (
                  <a
                    href={programInfo.university_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', wordBreak: 'break-all', textDecoration: 'underline' }}
                  >
                    {programInfo.university}
                  </a>
                ) : (
                  programInfo.university
                )}
              </div>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ color: '#555', fontWeight: 500 }}>Program:</div>
              <div style={{ color: '#222', fontWeight: 600 }}>
                {programInfo.program_url ? (
                  <a
                    href={programInfo.program_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', wordBreak: 'break-all', textDecoration: 'underline' }}
                  >
                    {programInfo.program}
                  </a>
                ) : (
                  programInfo.program
                )}
              </div>
            </div>
            {programInfo.placement_url && (
              <div style={{ minWidth: 260 }}>
                <div style={{ color: '#555', fontWeight: 500 }}>Placement URL:</div>
                <div>
                  <a
                    href={programInfo.placement_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', wordBreak: 'break-all', textDecoration: 'underline' }}
                  >
                    {programInfo.placement_url}
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>No program information found for ID: {id}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <span style={{ fontWeight: 600, color: '#007bff' }}>
            Approved: {approvedCount}
          </span>
          {/* Bulk Accept/Reject Buttons */}
          <button
            className="button button-secondary"
            style={{ padding: '0.5rem 1.2rem', fontWeight: 600 }}
            disabled={isLoading || filteredPlacements.length === 0}
            onClick={async () => {
              // Bulk Accept: only update rows that are not already 'approved' or 'rejected'
              const idsToUpdate = filteredPlacements
                .filter(item => item.approvalstatus !== 'approved' && item.approvalstatus !== 'rejected')
                .map(item => item._id);
              if (idsToUpdate.length === 0) {
                toast.info('No rows to accept.');
                return;
              }
              // Optimistically update UI
              setPlacementData(prev =>
                prev.map(row =>
                  idsToUpdate.includes(row._id)
                    ? { ...row, approvalstatus: 'approved' }
                    : row
                )
              );
              // Send requests in background with suppressed toasts
              try {
                await Promise.all(
                  idsToUpdate.map(id =>
                    handleCellUpdate(id, 'approvalstatus', 'approved', 1, 'approved', true).catch(() => {})
                  )
                );
                toast.success(`Bulk accepted ${idsToUpdate.length} placement(s).`);
              } catch (err) {
                toast.error('Some updates failed during bulk accept.');
              }
            }}
          >
            Accept All
          </button>
          <button
            className="button button-secondary"
            style={{ padding: '0.5rem 1.2rem', fontWeight: 600 }}
            disabled={isLoading || filteredPlacements.length === 0}
            onClick={async () => {
              // Bulk Reject
              const idsToUpdate = filteredPlacements
                .filter(item => item.approvalstatus !== 'rejected')
                .map(item => item._id);
              if (idsToUpdate.length === 0) {
                toast.info('No rows to reject.');
                return;
              }
              // Optimistically update UI
              setPlacementData(prev =>
                prev.map(row =>
                  idsToUpdate.includes(row._id)
                    ? { ...row, approvalstatus: 'rejected' }
                    : row
                )
              );
              // Send requests in background with suppressed toasts
              try {
                await Promise.all(
                  idsToUpdate.map(id =>
                    handleCellUpdate(id, 'approvalstatus', 'rejected', 2, 'rejected', true).catch(() => {})
                  )
                );
                toast.success(`Bulk rejected ${idsToUpdate.length} placement(s).`);
              } catch (err) {
                toast.error('Some updates failed during bulk reject.');
              }
            }}
          >
            Reject All
          </button>
        </div>
      </div>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid #e3e3e3',
          marginBottom: '2rem',
          maxWidth: 1800,
        }}>
        <h3>Placements</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          maxWidth: '100%'
        }}>
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search... e.g., 'term1' or 'school:MIT; state:CA'"
            style={{
              flex: 1,
              minWidth: 220,
              padding: '10px 12px',
              fontSize: '1rem',
              borderRadius: '12px',
              border: '1px solid #ccc',
              maxWidth: 500,
            }}
          />
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
        {loading ? (
          <p>Loading placement data...</p>
        ) : placementData.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table admin-table-program-view">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Role</th>
                  <th>Institution</th>
                  <th>Approval Status</th>
                  <th>Source</th>
                  <th>Actions</th>
                          </tr>
                          </thead>
                          <tbody>
                          {showAddForm && (
                            <tr className="add-new-row">
                            <td>
                              <span className="new-entry-indicator">NEW</span>
                            </td>
                            <td>
                              <input
                              type="text"
                              name="name"
                              placeholder="Name*"
                              value={newPlacement.name}
                              onChange={handleAddInputChange}
                              className="inline-edit-input"
                              autoFocus
                              />
                            </td>
                            <td>
                              <input
                              type="text"
                              name="date"
                              placeholder="Year*"
                              value={newPlacement.date}
                              onChange={handleAddInputChange}
                              className="inline-edit-input"
                              />
                            </td>
                            <td>
                              <input
                              type="text"
                              name="role"
                              placeholder="Role*"
                              value={newPlacement.role}
                              onChange={handleAddInputChange}
                              className="inline-edit-input"
                              />
                            </td>
                            <td>
                              <input
                              type="text"
                              name="institution"
                              placeholder="Institution*"
                              value={newPlacement.institution}
                              onChange={handleAddInputChange}
                              className="inline-edit-input"
                              />
                            </td>
                            <td>
                              <select
                              name="approvalstatus"
                              value={newPlacement.approvalstatus}
                              onChange={handleAddApprovalChange}
                              className="inline-edit-input"
                              disabled={true} // Always disabled for new entry
                              >
                              <option value="">Select...</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                              <option value="submitted">Submitted</option>
                              </select>
                            </td>
                            <td>
                              <input
                              type="text"
                              name="source"
                              placeholder="Source"
                              value={newPlacement.source}
                              onChange={handleAddInputChange}
                              className="inline-edit-input"
                              />
                            </td>
                            <td>
                              <button className="button button-primary" onClick={handleAddSubmit}>Add</button>
                              <button className="button button-secondary" onClick={handleAddCancel}>Cancel</button>
                            </td>
                            </tr>
                          )}
                          {filteredPlacements.map((item, idx) => {
                  const isOptimistic = item.isOptimistic === true || (item.id && String(item.id).startsWith('temp-'));
                  const isNew = item.isNew === true || isOptimistic;
                  const isTempId = item.id && String(item.id).startsWith('temp-');
                  return (
                    <tr
                      key={item._id || item.id || idx}
                      className={
                        (copiedId === item._id ? 'copied-row ' : '') +
                        (isOptimistic ? 'optimistic-row ' : '')
                      }
                    >
                      <td
                        className={
                          "serial-number-cell clickable-id" +
                          (isTempId ? " temp-id-cell" : "")
                        }
                        style={{
                          cursor: item._id ? 'pointer' : undefined,
                          color: isTempId ? '#d32f2f' : undefined,
                          fontWeight: isTempId ? 700 : undefined
                        }}
                        onClick={async () => {
                          if (item._id) {
                            await navigator.clipboard.writeText(item._id);
                            setCopiedId(item._id);
                            toast.success(`ID "${item._id}" copied to clipboard.`);
                            setTimeout(() => setCopiedId(null), 1500);
                          }
                        }}
                        title={item._id ? `Click to copy ID: ${item._id}` : undefined}
                      >
                        {isTempId
                          ? <span className="new-entry-indicator" style={{ color: '#d32f2f', borderColor: '#d32f2f', background: 'rgba(211,47,47,0.08)' }}>NEW</span>
                          : isNew
                            ? <span className="new-entry-indicator">NEW</span>
                            : <span className="serial-number">{item._id ? idx + 1 : ''}</span>
                        }
                      </td>
                      {/* Editable cells */}
                      {['name', 'date', 'role', 'institution', 'approvalstatus', 'source'].map((key) =>
                        editingCell && editingCell.id === item._id && editingCell.key === key ? (
                          <td key={key}>
                            {key === 'approvalstatus' ? (
                              <select
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleEditSave(item)}
                                onKeyDown={e => handleEditKeyDown(e, item)}
                                autoFocus
                                className="inline-edit-input"
                              >
                                <option value="">Select...</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="submitted">Submitted</option>
                              </select>
                            ) : key === 'source' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={handleEditChange}
                                onBlur={() => handleEditSave(item)}
                                onKeyDown={e => handleEditKeyDown(e, item)}
                                autoFocus
                                className="inline-edit-input"
                                placeholder="Enter new Source (required)"
                              />
                            ) : (
                              <input
                                type="text"
                                value={editValue}
                                onChange={handleEditChange}
                                onBlur={() => handleEditSave(item)}
                                onKeyDown={e => handleEditKeyDown(e, item)}
                                autoFocus
                                className="inline-edit-input"
                              />
                            )}
                          </td>
                        ) : (
                          <td
                            key={key}
                            onDoubleClick={() => handleDoubleClick(item, key)}
                            style={{ cursor: 'pointer' }}
                            title="Double click to edit"
                          >
                            {key === 'approvalstatus'
                              ? (item.approvalstatus === 'approved'
                                  ? 'Approved'
                                  : item.approvalstatus === 'rejected'
                                    ? 'Rejected'
                                    : item.approvalstatus === 'submitted'
                                      ? 'Submitted'
                                      : '')
                              : key === 'source'
                                ? (
                                    String(item.source).toLowerCase() === 'univ placement' && programInfo && programInfo.program_url
                                      ? (
                                          <a
                                            href={programInfo.program_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#007bff', textDecoration: 'underline', wordBreak: 'break-all' }}
                                          >
                                            {item.source}
                                          </a>
                                        )
                                      : item.source
                                        ? (
                                            <a
                                              href={item.source}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ color: '#007bff', textDecoration: 'underline', wordBreak: 'break-all' }}
                                            >
                                              <span style={{ fontWeight: 600, color: '#e67e22', marginRight: 4 }}>edited</span>
                                            </a>
                                        )
                                        : ''
                                  )
                                : item[key]
                            }
                          </td>
                        )
                      )}
                      {/* Add empty actions cell for normal rows */}
                      <td></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{error ? `Could not load data.` : 'No placement data found for this program.'}</p>
        )}
      </div>
    </div>
  )
};

export default ProgramViewPage;