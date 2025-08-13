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

  console.log(`[API Service] Attempting to sync to URL: ${url}/health-data`);
  console.log(`[API Service] Using API Key (first 5 chars): ${apiKey ? apiKey.substring(0, 5) + '...' : 'N/A'}`);

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
      const errorText = await response.text(); // Read raw response text
      console.log('Server responded with non-OK status:', response.status, errorText); // Use console.log
      throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 200)}...`); // Log first 200 chars
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to sync health data', error);
    throw error;
  }
};