import { Picker } from '@react-native-picker/picker'; // Import Picker
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import CheckboxItem from '../../components/CheckboxItem';
import InputField from '../../components/InputField';
import ApiService from '../../services/ApiService';
import HealthDataService from '../../services/HealthDataService';
import PermissionService, { HEALTH_DATA_TYPES } from '../../services/PermissionService';
import StorageService from '../../services/StorageService';

const SYNC_PERIOD_OPTIONS = [
  { label: 'Last 1 Day', value: '1_day' },
  { label: 'Last 3 Days', value: '3_days' },
  { label: 'Last 7 Days', value: '7_days' },
];

const MainScreen = () => {
  // Configuration State
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [isConfigPresent, setIsConfigPresent] = useState(false); // Tracks if config exists
  const [isEditingMode, setIsEditingMode] = useState(false); // Tracks if currently editing config

  // Health Data Sync State
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [syncPeriod, setSyncPeriod] = useState<string>(SYNC_PERIOD_OPTIONS[2].value); // Default to 7 days

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    checkAllPermissions();
  }, [selectedDataTypes]); // Re-check permissions if selected data types change

  const loadAllData = async () => {
    await loadConfig();
    await loadSelectedDataTypes();
    await loadLastSyncDate();
    await loadSyncPeriod();
  };

  // Configuration Functions
  const loadConfig = async () => {
    try {
      setConfigLoading(true);
      const config = await ApiService.getApiConfig();
      if (config && config.serverUrl && config.apiKey) {
        setServerUrl(config.serverUrl);
        setApiKey(config.apiKey);
        setIsConfigPresent(true);
        setIsEditingMode(false); // Not in editing mode initially
      } else {
        setServerUrl('');
        setApiKey('');
        setIsConfigPresent(false);
        setIsEditingMode(true); // If no config, start in add mode
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      Alert.alert('Error', 'Failed to load saved configuration.');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) {
      Alert.alert('Validation Error', 'Server URL and API Key cannot be empty.');
      return;
    }

    try {
      new URL(serverUrl);
    } catch (e) {
      Alert.alert('Validation Error', 'Please enter a valid Server URL.');
      return;
    }

    setConfigLoading(true);
    try {
      await ApiService.saveApiConfig({ serverUrl, apiKey });
      Alert.alert('Success', 'Configuration saved successfully!');
      setIsConfigPresent(true);
      setIsEditingMode(false); // Exit editing mode after saving
    } catch (error) {
      console.error('Failed to save configuration:', error);
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleEditConfig = () => {
    setIsEditingMode(true);
  };

  const handleCancelEdit = async () => {
    // Revert to saved config or clear if no config was present
    await loadConfig();
    setIsEditingMode(false);
  };

  const handleDeleteConfig = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete the saved configuration?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await StorageService.saveConfig('', ''); // Clear config
              setServerUrl('');
              setApiKey('');
              setIsConfigPresent(false);
              setIsEditingMode(true); // Switch to add mode after deleting
              Alert.alert('Success', 'Configuration deleted successfully!');
            } catch (error) {
              console.error('Failed to delete configuration:', error);
              Alert.alert('Error', 'Failed to delete configuration. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Health Data Sync Functions
  const loadSelectedDataTypes = async () => {
    const types = await StorageService.getSelectedDataTypes();
    setSelectedDataTypes(types);
  };

  const loadLastSyncDate = async () => {
    const timestamp = await StorageService.getLastSyncTimestamp();
    if (timestamp) {
      setLastSyncDate(new Date(timestamp));
    }
  };

  const loadSyncPeriod = async () => {
    const period = await StorageService.getSyncPeriod();
    if (period) {
      setSyncPeriod(period);
    }
  };

  const handleSyncPeriodChange = async (itemValue: string) => {
    setSyncPeriod(itemValue);
    await StorageService.saveSyncPeriod(itemValue);
  };

  const checkAllPermissions = async () => {
    if (selectedDataTypes.length === 0) {
      setPermissionsGranted(false);
      return;
    }
    const hasPermissions = await PermissionService.checkHealthPermissions(selectedDataTypes as any);
    setPermissionsGranted(hasPermissions);
  };

  const handleToggleDataType = async (type: string) => {
    const newSelectedTypes = selectedDataTypes.includes(type)
      ? selectedDataTypes.filter(t => t !== type)
      : [...selectedDataTypes, type];
    setSelectedDataTypes(newSelectedTypes);
    await StorageService.saveSelectedDataTypes(newSelectedTypes);
  };

  const handleRequestPermissions = async () => {
    const requestedPermissions = await PermissionService.requestHealthPermissions(selectedDataTypes as any);
    if (requestedPermissions) {
      setPermissionsGranted(true);
      Alert.alert('Success', 'Permissions granted successfully.');
    } else {
      Alert.alert('Error', 'Failed to grant permissions. Please check your device settings.');
    }
  };

  const handleSyncData = async () => {
    if (selectedDataTypes.length === 0) {
      Alert.alert('No Selection', 'Please select at least one data type to sync.');
      return;
    }

    if (!permissionsGranted) {
      Alert.alert('Permissions Required', 'Please grant health data permissions before syncing.');
      return;
    }

    setIsSyncing(true);
    try {
      const endDate = new Date();
      let startDate = lastSyncDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days

      // Calculate start date based on sync period
      if (syncPeriod === '1_day') {
        startDate = new Date(endDate.getTime() - 1 * 24 * 60 * 60 * 1000);
      } else if (syncPeriod === '3_days') {
        startDate = new Date(endDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      } else if (syncPeriod === '7_days') {
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const healthData = await HealthDataService.fetchHealthData(
        selectedDataTypes as any,
        startDate,
        endDate
      );

      if (healthData.length > 0) {
        const apiResponse = await ApiService.submitHealthData(healthData);
        console.log('API Response:', apiResponse);
        await StorageService.saveLastSyncTimestamp(endDate.toISOString());
        setLastSyncDate(endDate);
        Alert.alert('Sync Complete', 'Health data has been synced successfully.');
      } else {
        Alert.alert('No Data', 'No new health data found for the selected period.');
      }
    } catch (error: any) {
      console.error('Error syncing health data:', error);
      Alert.alert('Sync Error', error.message || 'An error occurred while syncing data.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>API Configuration</Text>
      <InputField
        label="Server URL"
        placeholder="e.g., https://your-api.com/health-data"
        value={serverUrl}
        onChangeText={setServerUrl}
        keyboardType="url"
        editable={isEditingMode} // Editable only in editing mode
      />
      <InputField
        label="API Key"
        placeholder="Your API Key"
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
        editable={isEditingMode} // Editable only in editing mode
      />
      <View style={styles.buttonRow}>
        {!isConfigPresent ? (
          <Button
            title="Add Configuration"
            onPress={handleSaveConfig}
            disabled={configLoading}
            isLoading={configLoading}
          />
        ) : isEditingMode ? (
          <>
            <Button
              title="Save Changes"
              onPress={handleSaveConfig}
              disabled={configLoading}
              isLoading={configLoading}
            />
            <Button
              title="Cancel"
              onPress={handleCancelEdit}
              disabled={configLoading}
              style={styles.cancelButton}
            />
          </>
        ) : (
          <>
            <Button
              title="Edit Configuration"
              onPress={handleEditConfig}
              disabled={configLoading}
            />
            <Button
              title="Delete Configuration"
              onPress={handleDeleteConfig}
              disabled={configLoading}
              style={styles.deleteButton}
            />
          </>
        )}
      </View>

      <View style={styles.separator} />

      <Text style={styles.sectionTitle}>Health Data Sync</Text>
      <Text style={styles.subtitle}>
        Select the health data types you want to sync with the server.
      </Text>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Sync Period:</Text>
        <Picker
          selectedValue={syncPeriod}
          onValueChange={handleSyncPeriodChange}
          style={styles.picker}
        >
          {SYNC_PERIOD_OPTIONS.map(option => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>

      {lastSyncDate && (
        <Text style={styles.lastSyncText}>
          Last Synced: {lastSyncDate.toLocaleString()}
        </Text>
      )}

      {Object.keys(HEALTH_DATA_TYPES).map(type => (
        <CheckboxItem
          key={type}
          label={type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          isChecked={selectedDataTypes.includes(type)}
          onToggle={() => handleToggleDataType(type)}
        />
      ))}

      {!permissionsGranted && (
        <Button
          title="Grant Permissions"
          onPress={handleRequestPermissions}
          disabled={selectedDataTypes.length === 0}
        />
      )}

      <Button
        title={isSyncing ? 'Syncing...' : 'Sync Now'}
        onPress={handleSyncData}
        disabled={isSyncing || selectedDataTypes.length === 0 || !permissionsGranted}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  lastSyncText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#dc3545', // Red color for delete
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#6c757d', // Gray color for cancel
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 30,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  picker: {
    flex: 1,
    height: 50,
  },
});

export default MainScreen;