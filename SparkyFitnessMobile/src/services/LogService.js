import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'app_logs';

/**
 * Adds a new log entry.
 * @param {string} message - The log message.
 */
export const addLog = async (message) => {
  try {
    console.log(`[LogService] Attempting to add log: ${message}`);
    const existingLogs = await AsyncStorage.getItem(LOG_KEY);
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      timestamp: new Date().toISOString(),
      message,
    };
    logs.unshift(newLog); // Add to the beginning for descending order
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(logs));
    console.log(`[LogService] Successfully added log: ${message}`);
  } catch (error) {
    console.error(`[LogService] Failed to add log: ${error.message}`, error);
  }
};

/**
 * Retrieves all log entries.
 * @returns {Promise<Array>} An array of log objects.
 */
export const getLogs = async () => {
  try {
    const logs = await AsyncStorage.getItem(LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Failed to get logs', error);
    return [];
  }
};

/**
 * Clears all log entries.
 */
export const clearLogs = async () => {
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch (error) {
    console.error('Failed to clear logs', error);
  }
};