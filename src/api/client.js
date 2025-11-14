// src/api/client.js
import { APP_CONFIG } from '../config';

export function logError(error, context = '') {
  console.error(`[${context}]`, error);
}

export async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Referer": APP_CONFIG.API_KEY,
        ...options.headers
      }
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        const errorDetails = JSON.parse(errorText);
        throw new Error(
          errorDetails.message ||
          `API Error: ${response.status} - ${errorText}`
        );
      } catch {
        throw new Error(
          `API Error: ${response.status} - ${errorText || 'Could not read error response'}`
        );
      }
    }

    return await response.json();
  } catch (error) {
    logError(error, `API Request to ${url}`);
    throw error;
  }
}
