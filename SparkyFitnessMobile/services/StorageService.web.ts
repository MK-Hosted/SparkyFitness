import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = 'serverUrl';
const API_KEY_KEY = 'apiKey';
const SELECTED_DATA_TYPES_KEY = 'selectedDataTypes';
const LAST_SYNC_TIMESTAMP_KEY = 'lastSyncTimestamp';
const SYNC_PERIOD_KEY = 'syncPeriod';

interface AppConfig {
  serverUrl: string | null;
  apiKey: string | null;
}

const StorageServiceWeb = {
  saveConfig: async (serverUrl: string, apiKey: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, serverUrl);
      localStorage.setItem(API_KEY_KEY, apiKey); // Use localStorage for web
      console.log('Configuration saved successfully (Web).');
    } catch (error) {
      console.error('Error saving configuration (Web):', error);
      throw error;
    }
  },

  getConfig: async (): Promise<AppConfig> => {
    try {
      const serverUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
      const apiKey = localStorage.getItem(API_KEY_KEY); // Use localStorage for web
      return { serverUrl, apiKey };
    } catch (error) {
      console.error('Error retrieving configuration (Web):', error);
      throw error;
    }
  },

  saveSelectedDataTypes: async (dataTypes: string[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(SELECTED_DATA_TYPES_KEY, JSON.stringify(dataTypes));
      console.log('Selected data types saved successfully (Web).');
    } catch (error) {
      console.error('Error saving selected data types (Web):', error);
      throw error;
    }
  },

  getSelectedDataTypes: async (): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(SELECTED_DATA_TYPES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving selected data types (Web):', error);
      throw error;
    }
  },

  saveLastSyncTimestamp: async (timestamp: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, timestamp);
      console.log('Last sync timestamp saved successfully (Web).');
    } catch (error) {
      console.error('Error saving last sync timestamp (Web):', error);
      throw error;
    }
  },

  getLastSyncTimestamp: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error retrieving last sync timestamp (Web):', error);
      throw error;
    }
  },

  saveSyncPeriod: async (period: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(SYNC_PERIOD_KEY, period);
      console.log('Sync period saved successfully (Web).');
    } catch (error) {
      console.error('Error saving sync period (Web):', error);
      throw error;
    }
  },

  getSyncPeriod: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(SYNC_PERIOD_KEY);
    } catch (error) {
      console.error('Error retrieving sync period (Web):', error);
      throw error;
    }
  },
};

export default StorageServiceWeb;