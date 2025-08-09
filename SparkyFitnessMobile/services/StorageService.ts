import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import StorageServiceWeb from './StorageService.web'; // Import the web-specific service

const SERVER_URL_KEY = 'serverUrl';
const API_KEY_KEY = 'apiKey';
const SELECTED_DATA_TYPES_KEY = 'selectedDataTypes';
const LAST_SYNC_TIMESTAMP_KEY = 'lastSyncTimestamp';
const SYNC_PERIOD_KEY = 'syncPeriod'; // New key for sync period

interface AppConfig {
  serverUrl: string | null;
  apiKey: string | null;
}

const StorageService = {
  /**
   * Saves the server URL and API key to local storage.
   * API key is stored securely using SecureStore.
   * @param serverUrl The server URL.
   * @param apiKey The API key.
   */
  saveConfig: async (serverUrl: string, apiKey: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.saveConfig(serverUrl, apiKey);
    }
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, serverUrl);
      await SecureStore.setItemAsync(API_KEY_KEY, apiKey);
      console.log('Configuration saved successfully.');
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  },

  /**
   * Retrieves the saved server URL and API key from local storage.
   * @returns A promise that resolves to an object containing serverUrl and apiKey.
   */
  getConfig: async (): Promise<AppConfig> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.getConfig();
    }
    try {
      const serverUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
      const apiKey = await SecureStore.getItemAsync(API_KEY_KEY);
      return { serverUrl, apiKey };
    } catch (error) {
      console.error('Error retrieving configuration:', error);
      throw error;
    }
  },

  /**
   * Saves the list of selected health data types.
   * @param dataTypes An array of strings representing selected data types.
   */
  saveSelectedDataTypes: async (dataTypes: string[]): Promise<void> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.saveSelectedDataTypes(dataTypes);
    }
    try {
      await AsyncStorage.setItem(SELECTED_DATA_TYPES_KEY, JSON.stringify(dataTypes));
      console.log('Selected data types saved successfully.');
    } catch (error) {
      console.error('Error saving selected data types:', error);
      throw error;
    }
  },

  /**
   * Retrieves the list of selected health data types.
   * @returns A promise that resolves to an array of strings.
   */
  getSelectedDataTypes: async (): Promise<string[]> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.getSelectedDataTypes();
    }
    try {
      const data = await AsyncStorage.getItem(SELECTED_DATA_TYPES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving selected data types:', error);
      throw error;
    }
  },

  /**
   * Saves the timestamp of the last successful data sync.
   * @param timestamp The timestamp string (e.g., ISO 8601 format).
   */
  saveLastSyncTimestamp: async (timestamp: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.saveLastSyncTimestamp(timestamp);
    }
    try {
      await AsyncStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, timestamp);
      console.log('Last sync timestamp saved successfully.');
    } catch (error) {
      console.error('Error saving last sync timestamp:', error);
      throw error;
    }
  },

  /**
   * Retrieves the timestamp of the last successful data sync.
   * @returns A promise that resolves to the timestamp string or null if not found.
   */
  getLastSyncTimestamp: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.getLastSyncTimestamp();
    }
    try {
      return await AsyncStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error retrieving last sync timestamp:', error);
      throw error;
    }
  },

  /**
   * Saves the selected sync period (e.g., '1_day', '3_days', '7_days').
   * @param period The selected sync period string.
   */
  saveSyncPeriod: async (period: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.saveSyncPeriod(period);
    }
    try {
      await AsyncStorage.setItem(SYNC_PERIOD_KEY, period);
      console.log('Sync period saved successfully.');
    } catch (error) {
      console.error('Error saving sync period:', error);
      throw error;
    }
  },

  /**
   * Retrieves the selected sync period.
   * @returns A promise that resolves to the sync period string or null if not found.
   */
  getSyncPeriod: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return StorageServiceWeb.getSyncPeriod();
    }
    try {
      return await AsyncStorage.getItem(SYNC_PERIOD_KEY);
    } catch (error) {
      console.error('Error retrieving sync period:', error);
      throw error;
    }
  },
};

export default StorageService;