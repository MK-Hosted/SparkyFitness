import { getServerConfig } from './storage';

/**
 * Sends health data to the server.
 * @param {Array} data - The health data to send.
 * @returns {Promise<object>} The server's response.
 */
export const syncHealthData = async (data) => {
  const config = await getServerConfig();
  if (!config) {
    throw new Error('Server configuration not found.');
  }

  const { url, apiKey } = config;

  try {
    const response = await fetch(`${url}/health-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync data.');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to sync health data', error);
    throw error;
  }
};