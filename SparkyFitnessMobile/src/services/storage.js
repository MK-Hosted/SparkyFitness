import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_KEY = 'serverConfig';

/**
 * Saves the server configuration (URL and API key) to AsyncStorage.
 * @param {object} config - The configuration object, e.g., { url: '...', apiKey: '...' }.
 * @returns {Promise<void>}
 */
export const saveServerConfig = async (config) => {
  try {
    const jsonValue = JSON.stringify(config);
    await AsyncStorage.setItem(CONFIG_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save server config.', e);
    throw e;
  }
};

/**
 * Retrieves the server configuration from AsyncStorage.
 * @returns {Promise<object|null>} The configuration object or null if not found.
 */
export const getServerConfig = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(CONFIG_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Failed to retrieve server config.', e);
    throw e;
  }
};

/**
 * Deletes the server configuration from AsyncStorage.
 * @returns {Promise<void>}
 */
export const deleteServerConfig = async () => {
  try {
    await AsyncStorage.removeItem(CONFIG_KEY);
  } catch (e) {
    console.error('Failed to delete server config.', e);
    throw e;
  }
};