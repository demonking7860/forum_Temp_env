import { useEffect, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';

export const useAuthManager = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState('loading');

  useEffect(() => {
    // Check for existing user on mount
    checkUser();

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', (data) => {
      const { payload } = data;
      console.log('Auth event:', payload.event);
      
      switch (payload.event) {
        case 'signInWithRedirect':
          console.log('Sign in with redirect successful');
          checkUser();
          break;
        case 'signInWithRedirect_failure':
          console.error('Sign in with redirect failed:', payload.data);
          setAuthState('signedOut');
          setIsLoading(false);
          // Clear any stuck URL parameters
          clearAuthParams();
          break;
        case 'signedIn':
          console.log('User signed in');
          setUser(payload.data);
          setAuthState('signedIn');
          setIsLoading(false);
          // Clear auth params after successful sign in
          clearAuthParams();
          break;
        case 'signedOut':
          console.log('User signed out');
          setUser(null);
          setAuthState('signedOut');
          setIsLoading(false);
          break;
        case 'tokenRefresh':
          console.log('Token refreshed');
          break;
        case 'tokenRefresh_failure':
          console.error('Token refresh failed');
          setAuthState('signedOut');
          setUser(null);
          setIsLoading(false);
          break;
      }
    });

    // Handle auth code in URL on component mount
    handleAuthCallback();

    return unsubscribe;
  }, []);

  const checkUser = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setAuthState('signedIn');
    } catch (error) {
      console.log('No authenticated user:', error);
      setUser(null);
      setAuthState('signedOut');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('Auth error in URL:', error);
      clearAuthParams();
      setAuthState('signedOut');
      setIsLoading(false);
      return;
    }

    if (code) {
      console.log('Auth code found in URL, processing...');
      // Give Amplify time to process the callback
      setTimeout(() => {
        checkUser();
      }, 1000);
    }
  };

  const clearAuthParams = () => {
    // Remove auth-related parameters from URL without page reload
    const url = new URL(window.location);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    
    // Only update URL if there were auth params to remove
    if (window.location.search !== url.search) {
      window.history.replaceState({}, document.title, url.toString());
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Force Google account selection by adding prompt=select_account
      await signInWithRedirect({
        provider: 'Google',
        customState: JSON.stringify({ prompt: 'select_account' })
      });
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    isLoading,
    authState,
    signInWithGoogle,
    signOut: handleSignOut,
    checkUser
  };
};