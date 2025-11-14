// src/AuthErrorToast.js
import { useEffect } from 'react';
import { toast } from 'react-toastify';

const AuthErrorToast = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorDesc = params.get('error_description');

    if (errorDesc) {
      toast.error(decodeURIComponent(errorDesc));

      // Clean up URL to avoid showing again on refresh
      const url = new URL(window.location);
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  return null; // no UI component
};

export default AuthErrorToast;
