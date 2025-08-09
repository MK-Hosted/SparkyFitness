import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import Button from '../../components/Button';
import InputField from '../../components/InputField';
import ApiService from '../../services/ApiService'; // Import ApiService

const ConfigurationScreen: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await ApiService.getApiConfig(); // Use ApiService
      if (config && config.serverUrl) {
        setServerUrl(config.serverUrl);
      }
      if (config && config.apiKey) {
        setApiKey(config.apiKey);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      Alert.alert('Error', 'Failed to load saved configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) {
      Alert.alert('Validation Error', 'Server URL and API Key cannot be empty.');
      return;
    }

    // Basic URL validation
    try {
      new URL(serverUrl);
    } catch (e) {
      Alert.alert('Validation Error', 'Please enter a valid Server URL.');
      return;
    }

    setLoading(true);
    try {
      await ApiService.saveApiConfig({ serverUrl, apiKey }); // Use ApiService
      Alert.alert('Success', 'Configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <InputField
        label="Server URL"
        placeholder="e.g., https://your-api.com/health-data"
        value={serverUrl}
        onChangeText={setServerUrl}
        keyboardType="url"
      />
      <InputField
        label="API Key"
        placeholder="Your API Key"
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
      />
      <Button
        title="Save Configuration"
        onPress={handleSave}
        disabled={loading}
        isLoading={loading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
});

export default ConfigurationScreen;