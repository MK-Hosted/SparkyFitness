import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Switch, Text } from 'react-native';
import { getServerConfig, saveServerConfig, deleteServerConfig } from '../services/storage';
import { initHealthConnect, requestHealthPermissions, saveHealthPreference, loadHealthPreference, readStepRecords, readActiveCaloriesRecords } from '../services/healthConnectService';

const SettingsScreen = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isStepsSyncEnabled, setIsStepsSyncEnabled] = useState(false);
  const [isCaloriesSyncEnabled, setIsCaloriesSyncEnabled] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await getServerConfig();
      if (config) {
        setUrl(config.url);
        setApiKey(config.apiKey);
      }

      // Load Health Connect preferences
      const stepsEnabled = await loadHealthPreference('syncStepsEnabled');
      setIsStepsSyncEnabled(stepsEnabled !== null ? stepsEnabled : false);

      const caloriesEnabled = await loadHealthPreference('syncCaloriesEnabled');
      setIsCaloriesSyncEnabled(caloriesEnabled !== null ? caloriesEnabled : false);

      // Initialize Health Connect
      await initHealthConnect();
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!url || !apiKey) {
      Alert.alert('Error', 'Please enter both a server URL and an API key.');
      return;
    }
    try {
      await saveServerConfig({ url, apiKey });
      Alert.alert('Success', 'Configuration saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteServerConfig();
      setUrl('');
      setApiKey('');
      Alert.alert('Success', 'Configuration deleted.');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete configuration.');
    }
  };

  const handleToggleStepsSync = async (newValue) => {
    setIsStepsSyncEnabled(newValue);
    await saveHealthPreference('syncStepsEnabled', newValue);
    if (newValue) {
      const granted = await requestHealthPermissions([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'write', recordType: 'Steps' }
      ]);
      if (!granted) {
        Alert.alert('Permission Denied', 'Please grant steps permission in Health Connect settings.');
        setIsStepsSyncEnabled(false); // Revert toggle if permission not granted
        await saveHealthPreference('syncStepsEnabled', false);
      }
    }
  };

  const handleToggleCaloriesSync = async (newValue) => {
    setIsCaloriesSyncEnabled(newValue);
    await saveHealthPreference('syncCaloriesEnabled', newValue);
    if (newValue) {
      const granted = await requestHealthPermissions([{ accessType: 'read', recordType: 'ActiveCaloriesBurned' }]);
      if (!granted) {
        Alert.alert('Permission Denied', 'Please grant active calories permission in Health Connect settings.');
        setIsCaloriesSyncEnabled(false); // Revert toggle if permission not granted
        await saveHealthPreference('syncCaloriesEnabled', false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Server Configuration</Text>
      <TextInput
        style={styles.input}
        placeholder="Server URL"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      <TextInput
        style={styles.input}
        placeholder="API Key"
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
      />
      <View style={styles.buttonContainer}>
        <Button title="Save Server Config" onPress={handleSave} />
        <Button title="Delete Server Config" onPress={handleDelete} color="red" />
      </View>

      <Text style={styles.sectionTitle}>Health Connect Sync Settings</Text>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Sync Steps</Text>
        <Switch
          onValueChange={handleToggleStepsSync}
          value={isStepsSyncEnabled}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Sync Active Calories</Text>
        <Switch
          onValueChange={handleToggleCaloriesSync}
          value={isCaloriesSyncEnabled}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
  },
});

export default SettingsScreen;