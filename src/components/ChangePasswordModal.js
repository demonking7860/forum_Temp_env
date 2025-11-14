// src/components/ChangePasswordModal.js
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { updatePassword, fetchAuthSession } from 'aws-amplify/auth';
import './ChangePasswordModal.css';
import { PandaEyesOpen, PandaEyesClosed } from './PandaIcons';

export default function ChangePasswordModal({ onClose }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const getStrength = (password) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength(newPass);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (oldPass === newPass) {
      setError("New password must be different from the current password.");
      return;
    }

    try {
      await fetchAuthSession(); // Ensures valid auth state
      await updatePassword({ oldPassword: oldPass, newPassword: newPass });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Change password error:", err);
      setError(err.message || 'Failed to change password');
    }
  };

  const modalContent = (
    <div className="modal-backdrop">
      <div className="change-password-modal">
        <h2>Change Password</h2>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">Password changed successfully!</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Current Password
            <div className="input-wrapper">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                required
              />
              <span className="toggle-visibility" onClick={() => setShowOld(!showOld)}>
                {showOld ? <PandaEyesOpen /> : <PandaEyesClosed />}
              </span>
            </div>
          </label>

          <label>
            New Password
            <div className="input-wrapper">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
              />
              <span className="toggle-visibility" onClick={() => setShowNew(!showNew)}>
                {showNew ? <PandaEyesOpen /> : <PandaEyesClosed />}
              </span>
            </div>
          </label>

          <div className="strength-meter">
            <div className={`bar strength-${strength}`}></div>
            <span className="strength-label">
              {strength === 0
                ? ''
                : strength <= 2
                ? 'Weak'
                : strength <= 4
                ? 'Medium'
                : 'Strong'}
            </span>
          </div>

          <div className="buttons">
            <button
              type="submit"
              disabled={!oldPass || !newPass}
              title={!oldPass || !newPass ? 'Fill both fields' : ''}
            >
              Submit
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
