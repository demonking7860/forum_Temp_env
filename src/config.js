export const APP_CONFIG = {
  // Set to true to display country short codes (e.g., USA, GBR) next to university names.
  // Set to false to hide them.
  SHOW_COUNTRY_CODE: false,
  
  // Feature flags
  FEATURES: {
    // Set to true to display the subscription button in the profile dropdown
    // Set to false to hide it
    ENABLE_SUBSCRIPTION_BUTTON: true,

    // Set to true to show sign in functionality
    // Set to false to hide it
    SHOW_SIGN_IN: true,

    // Set to true to show placement tab
    // Set to false to hide it
    SHOW_PLACEMENT: true,

    // Set to true to show admin functionality
    // Set to false to hide it
    SHOW_ADMIN: true,

    // Set to true to show the sign-in prompt popup to non-authenticated users
    // Set to false to hide it
    SHOW_SIGN_IN_PROMPT: true,
  }
};

// Function to get config value with localStorage override
export const getConfigValue = (key) => {
  const storageKey = `APP_CONFIG_${key}`;
  const storedValue = localStorage.getItem(storageKey);
  
  if (storedValue !== null) {
    try {
      return JSON.parse(storedValue);
    } catch (e) {
      console.warn(`Failed to parse stored config value for ${key}`);
    }
  }
  
  // Navigate nested config object
  const keys = key.split('.');
  let value = APP_CONFIG;
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value;
};

// Function to set config value in localStorage
export const setConfigValue = (key, value) => {
  const storageKey = `APP_CONFIG_${key}`;
  localStorage.setItem(storageKey, JSON.stringify(value));
  
  // Dispatch custom event for same-tab config changes
  const event = new CustomEvent('configChanged', {
    detail: { key, value }
  });
  window.dispatchEvent(event);
};
