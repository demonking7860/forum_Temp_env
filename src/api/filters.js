// src/api/filters.js
import { APP_CONFIG } from '../config';
import { fetchData, logError } from './client';
import { fetchAuthSession } from 'aws-amplify/auth';


export async function addUniversities(universities) {
  try {
    return await fetchData(
      `${APP_CONFIG.ADMIN_API_BASE_URL}universities`,
      { method: 'POST', body: JSON.stringify({ universities }) }
    );
  } catch (error) {
    logError(error, 'addUniversities');
    throw error;
  }
}

export async function fetchAllUniversities() {
  try {
    const data = await fetchData(`${APP_CONFIG.PLACEMENTS_API_BASE_URL}/universities`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logError(error, 'fetchAllUniversities');
    return [];
  }
}


export async function fetchAllFilterData() {
  try {
    let token = null;
    try {
      const session = await fetchAuthSession();
      token = session.tokens?.accessToken?.toString();
    } catch (err) {
      console.warn('User not signed in or token fetch failed:', err);
    }

    const headers = {
      'X-API-Key': APP_CONFIG.API_KEY,
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };

    const url = `${APP_CONFIG.API_URL}/test/filters`;
    console.log('📡 Fetching filter data from:', url);

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Raw API response:', data);
    return data;
  } catch (error) {
    logError(error, 'fetchAllFilterData');
    return [{ degree: 'PhD', universities: [] }];
  }
}

