import React from 'react';
import './Header.css';
import ProfileDropdown from './ProfileDropdown';
import Spinner from './Spinner';

const Header = ({
  onPlacementClick,
  onAdminClick,
  onTicketsClick, // ✅ NEW
  currentView,
  isAdmin,
  onSignInClick,
  onSignOutClick,
  user,
  userProfile,
  isLoadingProfile,
  instantAvatar // 🚀 NEW: Ultra-fast avatar
}) => {
  return (
    <header className="app-header-component">
      <div className="header-logo-container">
        {!isAdmin && (
          <img className="header-app-logo" src="/logo.png" alt="PhD Placement Logo" />
        )}
      </div>

      <div className="header-actions">
        {/* 📌 Placement tab */}
        <div className="header-action-item">
          <button
            className={`button button-secondary placement-tab-button ${
              currentView === 'main' ? 'active' : ''
            }`}
            onClick={onPlacementClick}
          >
            Placement
          </button>
        </div>

        {/* 📌 Tickets tab */}
        

        {/* 📌 Admin tab for Admins only */}
        {isAdmin && (
          <div className="header-action-item">
            <button
              className={`button button-secondary admin-tab-button-main ${
                currentView === 'admin' ? 'active' : ''
              }`}
              onClick={onAdminClick}
            >
              Admin
            </button>
          </div>
        )}

        {/* 📌 User Profile / Sign In / Spinner */}
        <div className="header-action-item">
          {user ? (
            // 🚀 NEW: Show instant avatar for existing users
            instantAvatar ? (
              <ProfileDropdown
                userProfile={{ ...userProfile, avatar: instantAvatar }}
              />
            ) : userProfile ? (
              <ProfileDropdown userProfile={userProfile} />
            ) : isLoadingProfile ? (
              <div className="loading-spinner" style={{ width: '36px', height: '36px' }}>
                <Spinner size="medium" />
              </div>
            ) : (
              <div className="profile-dropdown">
                <img
                  src="/avatar/avatar1.png"
                  alt="Profile"
                  className="profile-avatar"
                  style={{ opacity: 0.7 }}
                />
              </div>
            )
          ) : (
            <button
              className="button button-secondary sign-in-button"
              onClick={onSignInClick}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};




export default Header;
