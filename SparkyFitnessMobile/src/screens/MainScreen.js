import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Switch, Alert, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  initHealthConnect,
  readStepRecords,
  aggregateStepsByDate,
  readActiveCaloriesRecords,
  aggregateActiveCaloriesByDate,
  readHeartRateRecords,
  aggregateHeartRateByDate,
  readActiveMinutesRecords,
  aggregateActiveMinutesByDate,
  loadHealthPreference,
  saveStringPreference,
  loadStringPreference,
  getSyncStartDate,
} from '../services/healthConnectService';
import { syncHealthData } from '../services/api';
import { addLog } from '../services/LogService';

const MainScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [isStepsEnabled, setIsStepsEnabled] = useState(false); // Initialize to false, will load from storage
  const [isActiveCaloriesEnabled, setIsActiveCaloriesEnabled] = useState(false); // Initialize to false, will load from storage
  const [isHeartRateEnabled, setIsHeartRateEnabled] = useState(false);
  const [isActiveMinutesEnabled, setIsActiveMinutesEnabled] = useState(false);
  const [syncDuration, setSyncDuration] = useState(1); // This will be replaced by selectedTimeRange
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHealthConnectInitialized, setIsHealthConnectInitialized] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 24 Hours'); // New state for time range
  const [syncDurationSetting, setSyncDurationSetting] = useState('24h'); // State for sync duration from settings
  const [stepsData, setStepsData] = useState('0'); // State for steps data
  const [caloriesData, setCaloriesData] = useState('0'); // State for calories data
  const [heartRateData, setHeartRateData] = useState('0'); // State for heart rate data
  const [activeMinutesData, setActiveMinutesData] = useState('0'); // State for active minutes data
  const [isConnected, setIsConnected] = useState(false); // State for server connection status

  useEffect(() => {
    const initialize = async () => {
      addLog('Initializing Health Connect...');
      const initialized = await initHealthConnect();
      if (initialized) {
        addLog('Health Connect initialized successfully.', 'info', 'SUCCESS');
      } else {
        addLog('Health Connect initialization failed.', 'error', 'ERROR');
      }
      setIsHealthConnectInitialized(initialized);

      // Load preferences from AsyncStorage
      const stepsEnabled = await loadHealthPreference('syncStepsEnabled');
      setIsStepsEnabled(stepsEnabled !== null ? stepsEnabled : false);

      const caloriesEnabled = await loadHealthPreference('syncCaloriesEnabled');
      setIsActiveCaloriesEnabled(caloriesEnabled !== null ? caloriesEnabled : false);

      const heartRateEnabled = await loadHealthPreference('syncHeartRateEnabled');
      setIsHeartRateEnabled(heartRateEnabled !== null ? heartRateEnabled : false);

      const activeMinutesEnabled = await loadHealthPreference('syncActiveMinutesEnabled');
      setIsActiveMinutesEnabled(activeMinutesEnabled !== null ? activeMinutesEnabled : false);

      // Fetch initial health data
      await fetchHealthData();

      // Load selected time range preference
      const savedTimeRange = await loadStringPreference('selectedTimeRange');
      if (savedTimeRange) {
        setSelectedTimeRange(savedTimeRange);
      }

      // Load sync duration setting
      const durationSetting = await loadStringPreference('syncDuration');
      if (durationSetting) {
        setSyncDurationSetting(durationSetting);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [selectedTimeRange, isStepsEnabled, isActiveCaloriesEnabled, isHeartRateEnabled, isActiveMinutesEnabled]); // Re-fetch when time range or enabled states change

  const fetchHealthData = async () => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0); // Set to the beginning of today

    let currentSteps = 0;
    let currentCalories = 0;
    let currentHeartRate = 0;
    let currentActiveMinutes = 0;

    if (isStepsEnabled) {
      const stepRecords = await readStepRecords(startDate, endDate);
      const aggregatedStepsData = aggregateStepsByDate(stepRecords);
      currentSteps = aggregatedStepsData.reduce((sum, record) => sum + record.totalSteps, 0);
    }

    if (isActiveCaloriesEnabled) {
      const activeCaloriesRecords = await readActiveCaloriesRecords(startDate, endDate);
      const aggregatedActiveCaloriesData = aggregateActiveCaloriesByDate(activeCaloriesRecords);
      currentCalories = aggregatedActiveCaloriesData.reduce((sum, record) => sum + record.totalActiveCalories, 0);
    }


    setStepsData(currentSteps.toLocaleString());
    setCaloriesData(currentCalories.toLocaleString());
    setHeartRateData(currentHeartRate > 0 ? `${Math.round(currentHeartRate)} bpm` : '0 bpm');
    setActiveMinutesData(currentActiveMinutes > 0 ? `${Math.round(currentActiveMinutes)} min` : '0 min');
    setIsConnected(true);
  };

  // Remove toggle functions as they are now handled in SettingsScreen

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    addLog('Sync button pressed.');

    try {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // Use selectedTimeRange for manual sync logic
      const startDate = new Date(endDate);
      if (selectedTimeRange === '24h') {
        startDate.setDate(endDate.getDate());
      } else if (selectedTimeRange === '7d') {
        startDate.setDate(endDate.getDate() - 6);
      } else if (selectedTimeRange === '30d') {
        startDate.setDate(endDate.getDate() - 29);
      }
      startDate.setHours(0, 0, 0, 0);

      addLog(`[MainScreen] Syncing data from ${startDate.toISOString()} to ${endDate.toISOString()} for time range ${selectedTimeRange}.`);

      let allAggregatedData = [];

      if (isHeartRateEnabled) {
        addLog('Reading heart rate records...');
        const heartRateRecords = await readHeartRateRecords(startDate, endDate);
        addLog(`Found ${heartRateRecords.length} heart rate records.`);
        const aggregatedHeartRateData = aggregateHeartRateByDate(heartRateRecords);
        allAggregatedData = allAggregatedData.concat(aggregatedHeartRateData);
        const totalHeartRate = aggregatedHeartRateData.reduce((sum, record) => sum + record.value, 0);
        setHeartRateData(totalHeartRate > 0 ? `${Math.round(totalHeartRate)} bpm` : '0 bpm');

        if (aggregatedHeartRateData.length === 0) {
          addLog('No heart rate data found for the selected period.');
        }
      }

      if (isActiveMinutesEnabled) {
        addLog('Reading active minutes records...');
        const activeMinutesRecords = await readActiveMinutesRecords(startDate, endDate);
        addLog(`Found ${activeMinutesRecords.length} active minutes records.`);
        const aggregatedActiveMinutesData = aggregateActiveMinutesByDate(activeMinutesRecords);
        allAggregatedData = allAggregatedData.concat(aggregatedActiveMinutesData);
        const totalActiveMinutes = aggregatedActiveMinutesData.reduce((sum, record) => sum + record.value, 0);
        setActiveMinutesData(totalActiveMinutes > 0 ? `${Math.round(totalActiveMinutes)} min` : '0 min');

        if (aggregatedActiveMinutesData.length === 0) {
          addLog('No active minutes data found for the selected period.');
        }
      }

      if (isStepsEnabled) {
        addLog('Reading step records...');
        const stepRecords = await readStepRecords(startDate, endDate);
        addLog(`Found ${stepRecords.length} step records.`);
        const aggregatedStepsData = aggregateStepsByDate(stepRecords);
        allAggregatedData = allAggregatedData.concat(aggregatedStepsData);
        const totalSteps = aggregatedStepsData.reduce((sum, record) => sum + record.totalSteps, 0);
        setStepsData(totalSteps.toLocaleString());

        if (aggregatedStepsData.length === 0) {
          addLog('No step data found for the selected period.');
        }
      }

      if (isActiveCaloriesEnabled) {
        addLog('Reading active calories records...');
        const activeCaloriesRecords = await readActiveCaloriesRecords(startDate, endDate);
        addLog(`Found ${activeCaloriesRecords.length} active calories records.`);
        const aggregatedActiveCaloriesData = aggregateActiveCaloriesByDate(activeCaloriesRecords);
        allAggregatedData = allAggregatedData.concat(aggregatedActiveCaloriesData);
        const totalCalories = aggregatedActiveCaloriesData.reduce((sum, record) => sum + record.totalActiveCalories, 0);
        setCaloriesData(totalCalories.toLocaleString());

        if (aggregatedActiveCaloriesData.length === 0) {
          addLog('No active calories data found for the selected period.');
        }
      }

      if (allAggregatedData.length === 0) {
        addLog('No data selected or found for the selected period.');
        Alert.alert('No Data', 'No data selected or found for the selected period.');
        setIsSyncing(false);
        return;
      }
 
      const dataToSend = JSON.stringify(allAggregatedData, null, 2);
      console.log(`[MainScreen] Data to be synced: ${dataToSend}`); // Use console.log
      console.log('Syncing health data to server...'); // Use console.log
      await syncHealthData(allAggregatedData);
      addLog('Health data synced successfully.', 'info', 'SUCCESS');
      Alert.alert('Success', 'Health data synced successfully.');
    } catch (error) {
      addLog(`Sync Error: ${error.message}`, 'error', 'ERROR');
      Alert.alert('Sync Error', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Time Range */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.timeRangeContainer}>
            <Picker
              selectedValue={selectedTimeRange}
              style={styles.picker}
              onValueChange={async (itemValue) => {
                setSelectedTimeRange(itemValue);
                await saveStringPreference('selectedTimeRange', itemValue);
              }}
            >
              <Picker.Item label="Last 24 Hours" value="24h" />
              <Picker.Item label="Last 7 Days" value="7d" />
              <Picker.Item label="Last 30 Days" value="30d" />
            </Picker>
          </View>
        </View>

        {/* Health Overview */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <View style={styles.healthMetricsContainer}>
            {/* Steps */}
            <View style={styles.metricItem}>
              <Image source={require('../../assets/icons/steps.png')} style={styles.metricIcon} />
              <View>
                <Text style={styles.metricValue}>{stepsData}</Text>
                <Text style={styles.metricLabel}>Steps</Text>
              </View>
            </View>
            {/* Calories */}
            <View style={styles.metricItem}>
              <Image source={require('../../assets/icons/calories.png')} style={styles.metricIcon} />
              <View>
                <Text style={styles.metricValue}>{caloriesData}</Text>
                <Text style={styles.metricLabel}>Calories</Text>
              </View>
            </View>
            {/* Heart Rate */}
            <View style={styles.metricItem}>
              <Image source={require('../../assets/icons/heart_rate.png')} style={styles.metricIcon} />
              <View>
                <Text style={styles.metricValue}>{heartRateData}</Text>
                <Text style={styles.metricLabel}>Heart Rate</Text>
              </View>
            </View>
            {/* Active Minutes */}
            <View style={styles.metricItem}>
              <Image source={require('../../assets/icons/active_minutes.png')} style={styles.metricIcon} />
              <View>
                <Text style={styles.metricValue}>{activeMinutesData}</Text>
                <Text style={styles.metricLabel}>Active Minutes</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sync Now Button */}
        <TouchableOpacity style={styles.syncButtonContainer} onPress={handleSync} disabled={isSyncing || !isHealthConnectInitialized}>
          <Image source={require('../../assets/icons/sync_now.png')} style={styles.metricIcon} />
          <Text style={styles.syncButtonText}>{isSyncing ? "Syncing..." : "Sync Now"}</Text>
          <Text style={styles.syncButtonSubText}>Sync your health data to the server</Text>
        </TouchableOpacity>

        {/* Connected to server status */}
        {isConnected && (
          <View style={styles.connectedStatusContainer}>
            <View style={styles.dot}></View>
            <Text style={styles.connectedStatusText}>Connected to server</Text>
          </View>
        )}

        {!isHealthConnectInitialized && (
          <Text style={styles.errorText}>
            Health Connect is not available. Please make sure it is installed and enabled.
          </Text>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Main')}>
          <Image source={require('../../assets/icons/home.png')} style={[styles.navBarIcon, styles.navBarIconActive]} />
          <Text style={[styles.navBarText, styles.navBarTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Settings')}>
          <Image source={require('../../assets/icons/settings.png')} style={styles.navBarIcon} />
          <Text style={styles.navBarText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Logs')}>
          <Image source={require('../../assets/icons/logs.png')} style={styles.navBarIcon} />
          <Text style={styles.navBarText}>Logs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 80, // Adjust this value based on your bottomNavBar height
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#333', // Ensure text is visible
  },
  timeRangeText: {
    fontSize: 16,
    color: '#555',
  },
  healthMetricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%', // Approximately half width, adjust as needed
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  metricIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 14,
    color: '#777',
  },
  syncButtonContainer: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  syncButtonSubText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  connectedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e6ffe6', // Light green background
    alignSelf: 'center',
  },
  connectedStatusText: {
    color: '#28a745', // Green text
    marginLeft: 8,
    fontWeight: 'bold',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#28a745', // Green dot
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navBarItem: {
    alignItems: 'center',
  },
  navBarIcon: {
    width: 24,
    height: 24,
  },
  navBarIconActive: {
  },
  navBarText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  navBarTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
});

export default MainScreen;