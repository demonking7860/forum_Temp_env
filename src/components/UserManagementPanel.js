import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { listBlockedUsers } from '../graphql/queries';
import { deleteBlockedUser } from '../graphql/mutations';
import { toast } from 'react-toastify';
import './AdminComponent.css';




const UserManagementPanel = () => {
  const client = generateClient();

 
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Separate input search for finding users to block
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [debouncedUserTerm, setDebouncedUserTerm] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('7d');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Debounce user search input
  useEffect(() => {
    const delay = setTimeout(() => setDebouncedUserTerm(searchUserTerm.trim()), 500);
    return () => clearTimeout(delay);
  }, [searchUserTerm]);

  // Immediately clear selected user and form when search box is empty for instant UI update
  useEffect(() => {
    if (searchUserTerm.trim() === '') {
      setSelectedUser(null);
      setBlockReason('');
      setShowConfirmModal(false);
    }
  }, [searchUserTerm]);

  // Fetch user to block
  useEffect(() => {
    const fetchUser = async () => {
      if (!debouncedUserTerm) {
        setSelectedUser(null);
        return;
      }
      try {
        const res = await client.graphql({
          query: /* GraphQL */ `
            query SearchUser($filter: ModelUserItemFilterInput) {
              listUserItems(filter: $filter) {
                items {
                  email
                  username
                  createdAt
                }
              }
            }
          `,
          variables: {
            filter: {
              or: [
                { email: { contains: debouncedUserTerm.toLowerCase() } },
                { username: { contains: debouncedUserTerm.toLowerCase() } }
              ],
              sk: { eq: 'PROFILE' }
            }
          },
          authMode: 'iam',
        });
        const found = res?.data?.listUserItems?.items?.[0];
        if (found) {
          setSelectedUser({
            email: found.email,
            username: found.username,
            signUpDate: found.createdAt,
          });
        } else {
          setSelectedUser(null);
        }
      } catch (err) {
        console.error('Error fetching user:', err.errors || err);
        setSelectedUser(null);
      }
    };
    fetchUser();
  }, [debouncedUserTerm]);

  // Load blocked users once on mount
  useEffect(() => {
    const fetchBlocked = async () => {
      try {
        const res = await client.graphql({
          query: listBlockedUsers,
          authMode: 'iam',
        });
        setBlockedUsers(res?.data?.listBlockedUsers?.items || []);
      } catch (err) {
        console.error('Error loading blocked users:', err.errors || err);
        setError('Failed to load blocked users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlocked();
  }, []);

  // Unblock user handler
  const handleUnblock = async (email) => {
    if (!window.confirm(`Unblock user ${email}?`)) return;
    try {
      await client.graphql({
        query: deleteBlockedUser,
        variables: { input: { email } },
        authMode: 'iam',
      });
      toast.success('User unblocked');
      setBlockedUsers((prev) => prev.filter((u) => u.email !== email));
    } catch (err) {
      toast.error('Failed to unblock user');
      console.error('Unblock error:', err.errors || err);
    }
  };

  // Block confirmation
  const handleBlockConfirm = async () => {
    if (!selectedUser?.email || !blockReason) {
      toast.error('Email or reason is missing.');
      return;
    }
    try {
      const session = await fetchAuthSession();
      const adminEmail = session.tokens?.idToken?.payload?.email;
      const now = Date.now();
      const ttlDays = { '1d': 1, '7d': 7, '30d': 30, lifetime: 3650 }[blockDuration];
      const blockedUntil = new Date(now + ttlDays * 86400000).toISOString();

      const newBlock = {
        email: selectedUser.email.toLowerCase(),
        reason: blockReason,
        blockedUntil,
        blockedBy: adminEmail || 'unknown',
        permanent: false,
      };

      const mutation = /* GraphQL */ `
        mutation BlockUser($input: CreateBlockedUserInput!) {
          createBlockedUser(input: $input) {
            email reason blockedUntil blockedBy permanent
          }
        }
      `;
      await client.graphql({
        query: mutation,
        variables: { input: newBlock },
        authMode: 'iam',
      });

      toast.success(`User ${selectedUser.email} blocked`);
      setBlockedUsers((prev) => [...prev.filter((u) => u.email !== newBlock.email), newBlock]);
      setBlockReason('');
      setSelectedUser(null);
      setShowConfirmModal(false);
    } catch (err) {
      toast.error('Block failed');
      console.error('Block error:', JSON.stringify(err, null, 2));
    }
  };

  // Toggle permanent block
  const handleTogglePermanentBlock = async (makePermanent) => {
    if (!selectedUser?.email) {
      toast.error('No user selected to (un)block');
      return;
    }
    try {
      const session = await fetchAuthSession();
      const adminEmail = session.tokens?.idToken?.payload?.email;

      const input = {
        email: selectedUser.email.toLowerCase(),
        reason: makePermanent ? 'Permanent ban' : 'Unblocked by admin',
        blockedBy: adminEmail || 'unknown',
        permanent: makePermanent,
        blockedUntil: null,
      };

      const mutation = /* GraphQL */ `
        mutation BlockUser($input: CreateBlockedUserInput!) {
          createBlockedUser(input: $input) {
            email reason blockedUntil blockedBy permanent
          }
        }
      `;

      await client.graphql({
        query: mutation,
        variables: { input },
        authMode: 'iam',
      });

      toast.success(makePermanent ? 'User permanently blocked' : 'Permanent block removed');

      setBlockedUsers((prev) =>
        makePermanent
          ? [...prev.filter((u) => u.email !== input.email), input]
          : prev.filter((u) => u.email !== input.email)
      );

      setSelectedUser(null);
    } catch (err) {
      toast.error('Failed to toggle permanent block');
      console.error('Toggle permanent block error:', JSON.stringify(err, null, 2));
    }
  };

  // Check if selected user is permanently blocked
  const isUserPermanentlyBlocked = useMemo(
    () => selectedUser && blockedUsers.some((u) => u.email === selectedUser.email && u.permanent === true),
    [selectedUser, blockedUsers]
  );

  // Show all blocked users (no filtering)
  const filteredBlocked = useMemo(() => blockedUsers, [blockedUsers]);

  // Close modal on clicking backdrop
  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="user-management-container">
      {/* Search input */}
      <div className="admin-controls-wrapper" style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search user (email or username)"
          value={searchUserTerm}
          onChange={(e) => setSearchUserTerm(e.target.value)}
          className="admin-search-input"
          style={{
            padding: '0.6rem 0.8rem',
            fontSize: '0.9rem',
            maxWidth: '320px',
            border: '1px solid var(--border-color-light)',
            borderRadius: 'var(--border-radius-medium)',
          }}
          autoComplete="off"
        />
      </div>

      {/* Selected user block form */}
      {selectedUser && (
        <div className="user-card card">
          <p><strong>Username:</strong> {selectedUser.username}</p>
          <p><strong>Email:</strong> {selectedUser.email}</p>
          <p><strong>Sign-up Date:</strong> {new Date(selectedUser.signUpDate).toLocaleString()}</p>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Reason for Blocking</label>
            <textarea
              rows="4"
              placeholder="Write a brief reason."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.6rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '8px',
                border: '1px solid #ccc',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={blockDuration}
              onChange={(e) => setBlockDuration(e.target.value)}
              style={{
                padding: '0.6rem 0.8rem',
                fontSize: '0.9rem',
                borderRadius: '8px',
                border: '1px solid #ccc',
              }}
            >
              <option value="1d">1 day</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="lifetime">Lifetime</option>
            </select>

            <button className="button button-primary" disabled={!blockReason} onClick={() => setShowConfirmModal(true)}>
              Block User
            </button>

            <button
              className={`button ${isUserPermanentlyBlocked ? 'button-secondary' : 'button-danger'}`}
              onClick={() => handleTogglePermanentBlock(!isUserPermanentlyBlocked)}
            >
              {isUserPermanentlyBlocked ? 'Unblock Permanently' : 'Permanently Block'}
            </button>
          </div>
        </div>
      )}

      {/* Blocked Users Table */}
      <h3 style={{ marginTop: '2rem' }}>Blocked Users</h3>
      {isLoading && <p>Loading blocked users.</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isLoading && !error && (
        <div className="blocked-user-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Reason</th>
                <th>Blocked Until</th>
                <th>Blocked By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBlocked.map((user, idx) => (
                <tr key={idx}>
                  <td>{user.email}</td>
                  <td>{user.reason}</td>
                  <td>{user.blockedUntil ? new Date(user.blockedUntil).toLocaleString() : '—'}</td>
                  <td>{user.blockedBy || 'N/A'}</td>
                  <td>
                    <button className="button button-secondary" onClick={() => handleUnblock(user.email)}>
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Block Modal */}
      {showConfirmModal && selectedUser && (
        <div className="modal-backdrop" onClick={handleModalBackdropClick}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>Confirm Block</h4>
            <p>
              Are you sure you want to block <strong>{selectedUser.email}</strong> for <strong>{blockDuration}</strong>?
              <br />
              Reason: <em>{blockReason}</em>
            </p>
            <button className="button button-primary" onClick={handleBlockConfirm}>
              Confirm
            </button>
            <button className="button" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPanel;
