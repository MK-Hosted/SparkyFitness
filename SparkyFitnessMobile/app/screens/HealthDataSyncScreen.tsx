import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import Button from '../../components/Button';
import CheckboxItem from '../../components/CheckboxItem';
import ApiService from '../../services/ApiService'; // Import ApiService
import HealthDataService from '../../services/HealthDataService'; // Import HealthDataService
import PermissionService, { HEALTH_DATA_TYPES } from '../../services/PermissionService';
import StorageService from '../../services/StorageService'; // Import StorageService

const HealthDataSyncScreen = () => {
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);

  useEffect(() => {
    const initScreen = async () => {
      await loadSelectedDataTypes();
      await loadLastSyncDate();
      await checkAllPermissions();
    };
    initScreen();
  }, []);

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

  const checkAllPermissions = async () => {
    const types = Object.keys(HEALTH_DATA_TYPES);
    const hasPermissions = await PermissionService.checkHealthPermissions(types as any);
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
      const startDate = lastSyncDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days if no last sync date

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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sync Health Data</Text>
      <Text style={styles.subtitle}>
        Select the health data types you want to sync with the server.
      </Text>

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
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
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
});

export default HealthDataSyncScreen;