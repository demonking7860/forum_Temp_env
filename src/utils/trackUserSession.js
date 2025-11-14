import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';

import { mergeUserProfile as mergeUserProfileMutation } from '../graphql/mutations';

// Debug: Verify imports are working
console.log('🔧 trackUserSession loaded successfully');
console.log('📦 mergeUserProfileMutation available:', !!mergeUserProfileMutation);
            
const trackUserSession = (user, setUserProfile) => {
  if (!user) return;

  const client = generateClient();
  let lastSent = Date.now();

  const sendSessionData = async () => {
    const now = Date.now();
    const timeSpent = Math.floor((now - lastSent) / (1000 * 60));
    lastSent = now;
    if (timeSpent < 0) return;

    try {
      const session = await fetchAuthSession();
      const email = session.tokens?.idToken?.payload?.email?.toLowerCase();
      const userSub = session.tokens?.idToken?.payload?.sub;
      const identityProvider =
        session.tokens?.idToken?.payload?.identities?.[0]?.providerName || 'Email';

      if (!email || !userSub) {
        console.error('❌ Missing email or userSub in session.');
        return;
      }



      // ✅ Continue to merge/update user profile
      const input = {
        email,
        identityProvider,
        timeSpent
      };

      console.log('📤 Calling mergeUserProfile via Lambda with input:', input);

      const res = await client.graphql({
        query: mergeUserProfileMutation,
        variables: { input }
      });

      if (res?.errors) {
        console.error('❌ mergeUserProfile GraphQL error:', res.errors);
        return;
      }

      const mergedProfile = res?.data?.mergeUserProfile;

      if (setUserProfile && mergedProfile) {
        setUserProfile(mergedProfile);
        localStorage.setItem('userProfile', JSON.stringify(mergedProfile));
      }

      console.log('✅ Merged user profile:', mergedProfile);
    } catch (err) {
      console.error('❌ Error tracking session:', err);

      // Enhanced error logging
      if (err instanceof Error) {
        console.error('📛 Message:', err.message);
        if (err.stack) {
          console.error('📄 Stack:', err.stack);
        }
      } else if (typeof err === 'object' && err !== null) {
        // Handle GraphQL errors
        if (err.errors) {
          console.error('🔍 GraphQL Errors:', err.errors);
        }
        console.error('📦 Raw Error Object:', JSON.stringify(err, null, 2));
      } else {
        console.error('📦 Raw Error:', err);
      }

      // Don't rethrow - we want the app to continue working
    }
  };

  // 🚀 Run once on load with performance monitoring
  console.log('⏱️ Starting profile load...');
  const startTime = performance.now();

  sendSessionData().then(() => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    console.log(`⏱️ Profile load completed in: ${loadTime.toFixed(2)}ms`);

    // Performance classification
    if (loadTime > 2000) {
      console.warn(`🐌 SLOW: Profile load took ${loadTime.toFixed(2)}ms (should be <500ms)`);
    } else if (loadTime < 500) {
      console.log(`🚀 FAST: Profile load took ${loadTime.toFixed(2)}ms ✓`);
    } else {
      console.log(`⚡ GOOD: Profile load took ${loadTime.toFixed(2)}ms`);
    }

    // Store timing for comparison
    localStorage.setItem('lastProfileLoadTime', loadTime.toString());
    localStorage.setItem('lastProfileLoadTimestamp', new Date().toISOString());
  }).catch((error) => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    console.error(`❌ Profile load failed after ${loadTime.toFixed(2)}ms:`, error);
  });

  // // 🔁 Keep updating every 2 mins
  // const intervalId = setInterval(sendSessionData, 2 * 60 * 1000);
  // window.addEventListener('beforeunload', sendSessionData);

  // return () => {
  //   clearInterval(intervalId);
  //   window.removeEventListener('beforeunload', sendSessionData);
  // };
};

export default trackUserSession;