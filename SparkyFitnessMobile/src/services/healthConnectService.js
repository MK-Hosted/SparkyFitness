import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';
import { addLog } from './LogService';

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
export const requestStepsPermission = async () => {
  try {
    console.log('[HealthConnectService] Inside requestStepsPermission function.');
    const permissions = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    if (permissions.length > 0) {
      addLog(`[HealthConnectService] Steps permission granted.`);
      console.log('[HealthConnectService] Steps permission granted.');
    } else {
      addLog(`[HealthConnectService] Steps permission NOT granted.`);
      console.log('[HealthConnectService] Steps permission NOT granted.');
    }
    addLog(`[HealthConnectService] requestStepsPermission returning: ${permissions.length > 0}`);
    console.log(`[HealthConnectService] requestStepsPermission returning: ${permissions.length > 0}`);
    return permissions.length > 0;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to request steps permission: ${error.message}.`);
    console.error('Failed to request steps permission', error);
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