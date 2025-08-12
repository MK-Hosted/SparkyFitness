import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Switch, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  initHealthConnect,
  requestStepsPermission,
  readStepRecords,
  aggregateStepsByDate,
} from '../services/healthConnectService';
import { syncHealthData } from '../services/api';
import { addLog } from '../services/LogService';

const MainScreen = ({ navigation }) => {
  const [isStepsEnabled, setIsStepsEnabled] = useState(true);
  const [syncDuration, setSyncDuration] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHealthConnectInitialized, setIsHealthConnectInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      addLog('Initializing Health Connect...');
      const initialized = await initHealthConnect();
      if (initialized) {
        addLog('Health Connect initialized successfully.');
      } else {
        addLog('Health Connect initialization failed.');
      }
      setIsHealthConnectInitialized(initialized);
    };
    initialize();
  }, []);

  const toggleSteps = () => setIsStepsEnabled(previousState => !previousState);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    addLog('Sync button pressed.');

    try {
      addLog('Requesting steps permission...');
      const permissionGranted = await requestStepsPermission();
      addLog(`Permission granted: ${permissionGranted}`);
      if (!permissionGranted) {
        addLog('Permission denied by user.');
        Alert.alert('Permission Denied', 'Cannot sync without permission to read steps data.');
        setIsSyncing(false);
        return;
      }

      const endDate = new Date();
      // Set endDate to the end of the current day in local time
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(endDate); // Start with the same date as endDate
      // Set startDate to the beginning of the day 'syncDuration - 1' days ago
      startDate.setDate(endDate.getDate() - syncDuration + 1);
      startDate.setHours(0, 0, 0, 0);

      addLog('Reading step records...');
      const stepRecords = await readStepRecords(startDate, endDate);
      addLog(`Found ${stepRecords.length} step records.`);
      const aggregatedData = aggregateStepsByDate(stepRecords);

      if (aggregatedData.length === 0) {
        addLog('No step data found for the selected period.');
        Alert.alert('No Data', 'No step data found for the selected period.');
        setIsSyncing(false);
        return;
      }

      addLog('Syncing health data to server...');
      await syncHealthData(aggregatedData);
      addLog('Health data synced successfully.');
      Alert.alert('Success', 'Health data synced successfully.');
    } catch (error) {
      addLog(`Sync Error: ${error.message}`);
      Alert.alert('Sync Error', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SparkyFitness</Text>

      <View style={styles.optionContainer}>
        <Text>Track Steps</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isStepsEnabled ? "#f5dd4b" : "#f4f3f4"}
          onValueChange={toggleSteps}
          value={isStepsEnabled}
        />
      </View>

      <Picker
        selectedValue={syncDuration}
        style={styles.picker}
        onValueChange={(itemValue) => setSyncDuration(itemValue)}
      >
        <Picker.Item label="Sync Last 24 Hours" value={1} />
        <Picker.Item label="Sync Last 3 Days" value={3} />
        <Picker.Item label="Sync Last 7 Days" value={7} />
      </Picker>

      <Button title={isSyncing ? "Syncing..." : "Sync Now"} onPress={handleSync} disabled={isSyncing || !isHealthConnectInitialized} />
      {!isHealthConnectInitialized && (
        <Text style={styles.errorText}>
          Health Connect is not available. Please make sure it is installed and enabled.
        </Text>
      )}

      <View style={styles.settingsButton}>
        <Button
          title="Go to Settings"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      <View style={styles.logButton}>
        <Button
          title="View Logs"
          onPress={() => navigation.navigate('Logs')}
          color="#841584"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 20,
  },
  picker: {
    height: 50,
    width: '80%',
    marginBottom: 20,
  },
  settingsButton: {
    marginTop: 40,
  },
  logButton: {
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default MainScreen;