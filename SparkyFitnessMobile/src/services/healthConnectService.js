import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from './LogService';

const SYNC_DURATION_KEY = '@HealthConnect:syncDuration';

/**
 * Initializes the Health Connect client.
 * @returns {Promise<boolean>} True if initialization is successful, false otherwise.
 */
export const initHealthConnect = async () => {
  try {
    const isInitialized = await initialize();
    return isInitialized;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to initialize Health Connect: ${error.message}`);
    console.error('Failed to initialize Health Connect', error);
    return false;
  }
};

/**
 * Requests permission to read step data.
 * @returns {Promise<boolean>} True if permission is granted, false otherwise.
 */
export const requestHealthPermissions = async (permissionsToRequest) => {
  try {
    addLog(`[HealthConnectService] Requesting permissions: ${JSON.stringify(permissionsToRequest)}`);
    const grantedPermissions = await requestPermission(permissionsToRequest);

    // Check if all requested permissions are present in the grantedPermissions array
    const allGranted = permissionsToRequest.every(requestedPerm =>
      grantedPermissions.some(grantedPerm =>
        grantedPerm.recordType === requestedPerm.recordType &&
        grantedPerm.accessType === requestedPerm.accessType
      )
    );

    if (allGranted) {
      addLog(`[HealthConnectService] All requested permissions granted.`);
      console.log('[HealthConnectService] All requested permissions granted.');
      return true;
    } else {
      addLog(`[HealthConnectService] Not all requested permissions granted. Requested: ${JSON.stringify(permissionsToRequest)}. Granted: ${JSON.stringify(grantedPermissions)}`);
      console.log('[HealthConnectService] Not all requested permissions granted.', { requested: permissionsToRequest, granted: grantedPermissions });
      return false;
    }
  } catch (error) {
    addLog(`[HealthConnectService] Failed to request health permissions: ${error.message}. Full error: ${JSON.stringify(error)}`);
    console.error('Failed to request health permissions', error);
    return false;
  }
};

/**
 * Reads step records for a given date range.
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {Promise<Array>} An array of step records.
 */
export const readStepRecords = async (startDate, endDate) => {
  try {
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    addLog(`[HealthConnectService] Reading step records for timerange: ${startTime} to ${endTime}`);
    const result = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime,
        endTime: endTime,
      },
    });
    addLog(`[HealthConnectService] Raw result from readRecords: ${JSON.stringify(result)}`);
    addLog(`[HealthConnectService] Raw step records from Health Connect: ${JSON.stringify(result.records)}`);
    return result.records;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to read step records: ${error.message}. Full error: ${JSON.stringify(error)}`);
    console.error('Failed to read step records', error);
    return [];
  }
};

/**
 * Calculates the start date for data synchronization based on the selected duration.
 * @param {string} duration - The sync duration ('24h', '3d', '7d').
 * @returns {Date} The calculated start date.
 */
export const getSyncStartDate = (duration) => {
  const now = new Date();
  let startDate = new Date(now);

  switch (duration) {
    case '24h':
      startDate.setHours(now.getHours() - 24);
      break;
    case '3d':
      startDate.setDate(now.getDate() - 3);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    default:
      startDate.setHours(now.getHours() - 24); // Default to 24 hours
      break;
  }
  return startDate;
};

/**
 * Reads active calories burned records for a given date range.
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {Promise<Array>} An array of active calories burned records.
 */
export const readActiveCaloriesRecords = async (startDate, endDate) => {
  try {
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    addLog(`[HealthConnectService] Reading active calories records for timerange: ${startTime} to ${endTime}`);
    const result = await readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime,
        endTime: endTime,
      },
    });
    addLog(`[HealthConnectService] Raw result from readActiveCaloriesRecords: ${JSON.stringify(result)}`);
    addLog(`[HealthConnectService] Raw active calories records from Health Connect: ${JSON.stringify(result.records)}`);
    return result.records;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to read active calories records: ${error.message}. Full error: ${JSON.stringify(error)}`);
    console.error('Failed to read active calories records', error);
    return [];
  }
};

/**
 * Aggregates step records by date.
 * @param {Array} records - An array of step records from Health Connect.
 * @returns {Array} An array of objects, where each object has a date and the total steps for that date.
 */
export const aggregateStepsByDate = (records) => {
  if (!Array.isArray(records)) {
    addLog(`[HealthConnectService] aggregateStepsByDate received non-array records: ${JSON.stringify(records)}`);
    console.warn('aggregateStepsByDate received non-array records:', records);
    return [];
  }
  addLog(`[HealthConnectService] Input records for aggregation: ${JSON.stringify(records)}`);

  const aggregatedData = records.reduce((acc, record) => {
    const date = record.startTime.split('T')[0];
    const steps = record.count;

    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += steps;

    return acc;
  }, {});
  addLog(`[HealthConnectService] Aggregated data: ${JSON.stringify(aggregatedData)}`);

  return Object.keys(aggregatedData).map(date => ({
    date,
    value: aggregatedData[date],
    type: 'step',
  }));
};

/**
 * Aggregates active calories burned records by date.
 * @param {Array} records - An array of active calories burned records from Health Connect.
 * @returns {Array} An array of objects, where each object has a date and the total active calories for that date.
 */
export const aggregateActiveCaloriesByDate = (records) => {
  if (!Array.isArray(records)) {
    addLog(`[HealthConnectService] aggregateActiveCaloriesByDate received non-array records: ${JSON.stringify(records)}`);
    console.warn('aggregateActiveCaloriesByDate received non-array records:', records);
    return [];
  }
  addLog(`[HealthConnectService] Input records for active calories aggregation: ${JSON.stringify(records)}`);

  const aggregatedData = records.reduce((acc, record) => {
    const date = record.startTime.split('T')[0];
    const calories = record.energy.inCalories; // Assuming energy is in calories

    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += calories;

    return acc;
  }, {});
  addLog(`[HealthConnectService] Aggregated active calories data: ${JSON.stringify(aggregatedData)}`);

  return Object.keys(aggregatedData).map(date => ({
    date,
    value: aggregatedData[date],
    type: 'active_calories',
  }));
};

/**
 * Saves a Health Connect preference to AsyncStorage.
 * @param {string} key - The key for the preference (e.g., 'syncStepsEnabled').
 * @param {boolean} value - The boolean value of the preference.
 */
export const saveHealthPreference = async (key, value) => {
  try {
    await AsyncStorage.setItem(`@HealthConnect:${key}`, JSON.stringify(value));
    addLog(`[HealthConnectService] Saved preference ${key}: ${value}`);
  } catch (error) {
    addLog(`[HealthConnectService] Failed to save preference ${key}: ${error.message}`);
    console.error(`Failed to save preference ${key}`, error);
  }
};

/**
 * Loads a Health Connect preference from AsyncStorage.
 * @param {string} key - The key for the preference.
 * @returns {Promise<boolean|null>} The boolean value of the preference, or null if not found.
 */
export const loadHealthPreference = async (key) => {
  try {
    const value = await AsyncStorage.getItem(`@HealthConnect:${key}`);
    if (value !== null) {
      addLog(`[HealthConnectService] Loaded preference ${key}: ${value}`);
      return JSON.parse(value);
    }
    addLog(`[HealthConnectService] Preference ${key} not found.`);
    return null;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to load preference ${key}: ${error.message}`);
    console.error(`Failed to load preference ${key}`, error);
    return null;
  }
};

/**
 * Saves the sync duration preference to AsyncStorage.
 * @param {string} value - The sync duration value (e.g., '24h', '3d', '7d').
 */
export const saveSyncDuration = async (value) => {
  try {
    await AsyncStorage.setItem(SYNC_DURATION_KEY, value);
    addLog(`[HealthConnectService] Saved sync duration: ${value}`);
  } catch (error) {
    addLog(`[HealthConnectService] Failed to save sync duration: ${error.message}`);
    console.error(`Failed to save sync duration`, error);
  }
};

/**
 * Loads the sync duration preference from AsyncStorage.
 * @returns {Promise<string|null>} The sync duration value, or null if not found.
 */
export const loadSyncDuration = async () => {
  try {
    const value = await AsyncStorage.getItem(SYNC_DURATION_KEY);
    if (value !== null) {
      addLog(`[HealthConnectService] Loaded sync duration: ${value}`);
      return value;
    }
    addLog(`[HealthConnectService] Sync duration not found, returning default '24h'.`);
    return '24h'; // Default to 24 hours if not found
  } catch (error) {
    addLog(`[HealthConnectService] Failed to load sync duration: ${error.message}`);
    console.error(`Failed to load sync duration`, error);
    return '24h'; // Default to 24 hours on error
  }
};