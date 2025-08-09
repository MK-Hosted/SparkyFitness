import axios from 'axios';
import StorageService from './StorageService';

interface ApiConfig {
  serverUrl: string | null;
  apiKey: string | null;
}

const ApiService = {
  /**
   * Fetches API configuration from storage.
   * @returns A promise that resolves to ApiConfig or null if not found.
   */
  getApiConfig: async (): Promise<ApiConfig | null> => {
    const config = await StorageService.getConfig();
    return config;
  },

  /**
   * Saves API configuration to storage.
   * @param config The API configuration to save.
   * @returns A promise that resolves when the configuration is saved.
   */
  saveApiConfig: async (config: ApiConfig): Promise<void> => {
    if (config.serverUrl && config.apiKey) {
      await StorageService.saveConfig(config.serverUrl, config.apiKey);
    } else {
      throw new Error('Server URL and API Key cannot be null when saving config.');
    }
  },

  /**
   * Submits health data to the configured API endpoint.
   * @param data The health data to submit.
   * @returns A promise that resolves to the API response.
   */
  submitHealthData: async (data: any): Promise<any> => {
    const config = await ApiService.getApiConfig();
    if (!config || !config.serverUrl || !config.apiKey) {
      throw new Error('API configuration is missing. Please set server URL and API key.');
    }

    try {
      const response = await axios.post(`${config.serverUrl}/health-data`, data, {
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API submission failed:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to submit health data.');
      }
      console.error('An unexpected error occurred during API submission:', error);
      throw new Error('An unexpected error occurred.');
    }
  },
};

export default ApiService;