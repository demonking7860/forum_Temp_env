// src/components/ProfileDropdown.js
import React, { useState, useRef, useEffect } from 'react';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import SubscriptionModal from './SubscriptionModal';
import ChangePasswordModal from './ChangePasswordModal';
import { getConfigValue } from '../config';
import './ProfileDropdown.css';

const ProfileDropdown = ({ userProfile }) => {
  const [open, setOpen] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef();

  const [showSubscriptionButton, setShowSubscriptionButton] = useState(() =>
    getConfigValue('FEATURES.ENABLE_SUBSCRIPTION_BUTTON')
  );

  useEffect(() => {
    const detectAuthProvider = async () => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.payload;
        const provider = idToken?.['identities']?.[0]?.providerName || 'Cognito';

        if (provider === 'Google') {
          setShowChangePassword(false);
        } else {
          setShowChangePassword(true);
        }
      } catch (err) {
        console.error('Failed to detect auth provider:', err);
        setShowChangePassword(false); // safest fallback
      }
    };

    detectAuthProvider();
  }, []);

  useEffect(() => {
    const handleConfigChange = (e) => {
      if (e.detail?.key === 'FEATURES.ENABLE_SUBSCRIPTION_BUTTON') {
        setShowSubscriptionButton(e.detail.value);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'APP_CONFIG_FEATURES.ENABLE_SUBSCRIPTION_BUTTON') {
        try {
          setShowSubscriptionButton(JSON.parse(e.newValue));
        } catch (error) {
          console.warn('Failed to parse ENABLE_SUBSCRIPTION_BUTTON:', error);
        }
      }
    };

    window.addEventListener('configChanged', handleConfigChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('configChanged', handleConfigChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768 && open) setOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobile) {
        if (e.target.classList.contains('mobile-backdrop')) {
          setOpen(false);
          return;
        }
        if (dropdownRef.current?.contains(e.target)) return;
      } else {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setOpen(false);
        }
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      if (isMobile) document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, isMobile]);

  const handleSignOut = async () => {
    try {
      await signOut();
      localStorage.removeItem('userProfile');
      window.location.reload();
    } catch (err) {
      console.error('❌ Sign-out failed:', err);
    }
  };

  const handleAvatarClick = () => setOpen(prev => !prev);
  const handleBackdropClick = (e) => {
    e.stopPropagation();
    setOpen(false);
  };

  if (!userProfile) return null;

  const { username, email, avatar } = userProfile;
  const displayUsername = username || 'User';
  const displayEmail = email || 'No email';
  const displayAvatar = avatar || 'avatar1.png';

  return (
    <>
      <div
        className={`profile-dropdown ${isMobile && open ? 'mobile-open' : ''}`}
        ref={dropdownRef}
      >
        <img
          src={`/avatar/${displayAvatar}`}
          alt="Profile"
          className="profile-avatar"
          onClick={handleAvatarClick}
          onError={(e) => (e.target.src = '/avatar/avatar1.png')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAvatarClick();
            }
          }}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Open profile menu"
        />

        {open && (
          <>
            {isMobile && (
              <div
                className="mobile-backdrop"
                onClick={handleBackdropClick}
                onTouchStart={handleBackdropClick}
                aria-hidden="true"
              />
            )}

            <div className="dropdown-menu" role="menu" aria-label="Profile menu">
              <img
                src={`/avatar/${displayAvatar}`}
                alt="avatar"
                className="dropdown-avatar"
                onError={(e) => (e.target.src = '/avatar/avatar1.png')}
              />
              <div className="dropdown-info">
                <p className="dropdown-username">{displayUsername}</p>
                <p className="dropdown-email">{displayEmail}</p>
              </div>

              {showSubscriptionButton && (
                <button
                  className="subscription-button"
                  onClick={() => {
                    setShowSubscriptionModal(true);
                    setOpen(false);
                  }}
                  role="menuitem"
                  tabIndex={0}
                >
                  Subscribe
                </button>
              )}

              {showChangePassword && (
                <button
                  className="dropdown-change-password"
                  onClick={() => {
                    setShowChangePasswordModal(true);
                    setOpen(false);
                  }}
                  role="menuitem"
                  tabIndex={0}
                >
                  Change Password
                </button>
              )}

              <button
                className="dropdown-ticket"
                onClick={() => {
                  // Navigate to tickets tab using the app's routing mechanism
                  window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'tickets' } }));
                  setOpen(false);
                }}
                role="menuitem"
                tabIndex={0}
              >
                Report an Issue
              </button>

              <button
                className="dropdown-signout"
                onClick={handleSignOut}
                role="menuitem"
                tabIndex={0}
              >
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>

      {showSubscriptionButton && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          userEmail={userProfile?.email}
        />
      )}

      {showChangePassword && showChangePasswordModal && (
        <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
    </>
  );
};

export default ProfileDropdown;
