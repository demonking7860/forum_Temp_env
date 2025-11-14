import React, { useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import './CustomAuthenticator.css';

const CustomAuthenticator = ({ children, onClose }) => {
  const components = {
    Header() {
      return (
        <div className="custom-auth-header">
          <div className="auth-logo-container">
            <img src="/logo.png" alt="PandainUniv Logo" className="auth-logo" />
          </div>
          <h2 className="auth-welcome-title">PandainUniv</h2>
        </div>
      );
    },

    Footer() {
      return (
        <div className="custom-auth-footer">
          <p className="auth-footer-text">© {new Date().getFullYear()} PandainUniv</p>
          <div className="auth-footer-links">
            <a href="mailto:pandainuniv@gmail.com" className="auth-footer-link">
              Contact Support
            </a>
            <span className="auth-footer-separator">•</span>
            <a href="#" className="auth-footer-link">
              Privacy Policy
            </a>
          </div>
        </div>
      );
    },

    SignIn: {
      Header() {
        return (
          <div className="auth-form-header">
          </div>
        );
      },
    },

    SignUp: {
      Header() {
        return (
          <div className="auth-form-header">
          </div>
        );
      },
      Footer() {
        return (
          <div className="auth-form-footer">
          </div>
        );
      },
    },

    ConfirmSignUp: {
      Header() {
        return (
          <div className="auth-form-header">
            <h3 className="auth-form-title">Verify your email</h3>
            <p className="auth-form-subtitle">We sent a verification code to your email</p>
          </div>
        );
      },
    },

    ForgotPassword: {
      Header() {
        return (
          <div className="auth-form-header">
            <h3 className="auth-form-title">Reset your password</h3>
            <p className="auth-form-subtitle">Enter your email to receive reset instructions</p>
          </div>
        );
      },
    },
  };


  // Handler for overlay click
  const handleOverlayClick = (e) => {
    // Only close if clicked directly on the overlay (not on modal content)
    if (e.target.classList.contains('custom-authenticator-wrapper')) {
      if (onClose) onClose();
    }
  };

  // Prevent browser back navigation while modal is open
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    // Safari: reload page on back/forward navigation (bfcache restore)
    const handlePageShow = function (event) {
      if (event.persisted || (performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <div
      className="custom-authenticator-wrapper"
      onClick={handleOverlayClick}
      role="presentation"
      tabIndex={-1}
      aria-modal="true"
    >
      <div
        className="custom-authenticator"
        onClick={e => e.stopPropagation()}
      >
        <Authenticator
          className="custom-authenticator"
          components={components}
          loginMechanisms={['email']}
          socialProviders={['google']}
          signUpAttributes={[]}
        >
          {children}
        </Authenticator>
      </div>
    </div>
  );
};

export default CustomAuthenticator;