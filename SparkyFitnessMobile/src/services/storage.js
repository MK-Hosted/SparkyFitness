import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_CONFIGS_KEY = 'serverConfigs';
const ACTIVE_SERVER_CONFIG_ID_KEY = 'activeServerConfigId';

/**
 * Saves a new server configuration or updates an existing one.
 * If a config with the same ID exists, it updates it. Otherwise, it adds a new one.
 * Also sets the saved/updated config as the active one.
 * @param {object} config - The configuration object, must have a unique 'id'.
 * @returns {Promise<void>}
 */
export const saveServerConfig = async (config) => {
  try {
    let configs = await getAllServerConfigs();
    const index = configs.findIndex(c => c.id === config.id);

    if (index > -1) {
      configs[index] = config; // Update existing
    } else {
      configs.push(config); // Add new
    }

    await AsyncStorage.setItem(SERVER_CONFIGS_KEY, JSON.stringify(configs));
    await setActiveServerConfig(config.id); // Set as active
  } catch (e) {
    console.error('Failed to save server config.', e);
    throw e;
  }
};

/**
 * Retrieves the currently active server configuration.
 * @returns {Promise<object|null>} The active configuration object or null if not found.
 */
export const getActiveServerConfig = async () => {
  try {
    const activeId = await AsyncStorage.getItem(ACTIVE_SERVER_CONFIG_ID_KEY);
    if (!activeId) {
      console.log('[storage.js] No active config ID found.');
      return null;
    }
    console.log(`[storage.js] Active config ID: ${activeId}`);

    const configs = await getAllServerConfigs();
    return configs.find(config => config.id === activeId) || null;
  } catch (e) {
    console.error('Failed to retrieve active server config.', e);
    throw e;
  }
};

/**
 * Retrieves all saved server configurations.
 * @returns {Promise<Array<object>>} An array of configuration objects.
 */
export const getAllServerConfigs = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(SERVER_CONFIGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to retrieve all server configs.', e);
    return [];
  }
};

/**
 * Sets a specific server configuration as the active one.
 * @param {string} configId - The ID of the configuration to set as active.
 * @returns {Promise<void>}
 */
export const setActiveServerConfig = async (configId) => {
  try {
    await AsyncStorage.setItem(ACTIVE_SERVER_CONFIG_ID_KEY, configId);
  } catch (e) {
    console.error('Failed to set active server config.', e);
    throw e;
  }
};

/**
 * Deletes a specific server configuration.
 * If the deleted config was active, it clears the active config.
 * @param {string} configId - The ID of the configuration to delete.
 * @returns {Promise<void>}
 */
export const deleteServerConfig = async (configId) => {
  try {
    let configs = await getAllServerConfigs();
    configs = configs.filter(config => config.id !== configId);
    await AsyncStorage.setItem(SERVER_CONFIGS_KEY, JSON.stringify(configs));

    const activeId = await AsyncStorage.getItem(ACTIVE_SERVER_CONFIG_ID_KEY);
    if (activeId === configId) {
      await AsyncStorage.removeItem(ACTIVE_SERVER_CONFIG_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to delete server config.', e);
    throw e;
  }
};