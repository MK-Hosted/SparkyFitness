import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Switch, Text, TouchableOpacity, Image, Modal, FlatList, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { getActiveServerConfig, saveServerConfig, deleteServerConfig, getAllServerConfigs, setActiveServerConfig } from '../services/storage';
import { addLog } from '../services/LogService';
import { initHealthConnect, requestHealthPermissions, saveHealthPreference, loadHealthPreference, readStepRecords, readActiveCaloriesRecords, saveSyncDuration, loadSyncDuration, getSyncStartDate, saveStringPreference, loadStringPreference } from '../services/healthConnectService';
import { checkServerConnection } from '../services/api';

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isStepsSyncEnabled, setIsStepsSyncEnabled] = useState(false);
  const [isCaloriesSyncEnabled, setIsCaloriesSyncEnabled] = useState(false);
  const [isHeartRateSyncEnabled, setIsHeartRateSyncEnabled] = useState(false);
  const [isActiveMinutesSyncEnabled, setIsActiveMinutesSyncEnabled] = useState(false);
  const [syncDuration, setSyncDuration] = useState('24h'); // Default to 24 hours
  const [fourHourSyncTime, setFourHourSyncTime] = useState('00:00');
  const [dailySyncTime, setDailySyncTime] = useState('00:00');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [serverConfigs, setServerConfigs] = useState([]);
  const [activeConfigId, setActiveConfigId] = useState(null);
  const [currentConfigId, setCurrentConfigId] = useState(null); // For editing existing config
  const [appTheme, setAppTheme] = useState('System'); // Default to System
  const [isConnected, setIsConnected] = useState(false); // State for server connection status

  const loadConfig = async () => {
    const allConfigs = await getAllServerConfigs();
    setServerConfigs(allConfigs);

    const activeConfig = await getActiveServerConfig();
    if (activeConfig) {
      setUrl(activeConfig.url);
      setApiKey(activeConfig.apiKey);
      setActiveConfigId(activeConfig.id);
      setCurrentConfigId(activeConfig.id);
    } else if (allConfigs.length > 0 && !activeConfig) {
      // If no active config, but configs exist, set the first one as active
      await setActiveServerConfig(allConfigs[0].id);
      setUrl(allConfigs[0].url);
      setApiKey(allConfigs[0].apiKey);
      setActiveConfigId(allConfigs[0].id);
      setCurrentConfigId(allConfigs[0].id);
    } else if (allConfigs.length === 0) {
      // If no configs exist, clear everything
      setUrl('');
      setApiKey('');
      setActiveConfigId(null);
      setCurrentConfigId(null);
    }

    // Load Health Connect preferences
    const stepsEnabled = await loadHealthPreference('syncStepsEnabled');
    setIsStepsSyncEnabled(stepsEnabled !== null ? stepsEnabled : false);

    const caloriesEnabled = await loadHealthPreference('syncCaloriesEnabled');
    setIsCaloriesSyncEnabled(caloriesEnabled !== null ? caloriesEnabled : false);

    const heartRateEnabled = await loadHealthPreference('syncHeartRateEnabled');
    setIsHeartRateSyncEnabled(heartRateEnabled !== null ? heartRateEnabled : false);

    const activeMinutesEnabled = await loadHealthPreference('syncActiveMinutesEnabled');
    setIsActiveMinutesSyncEnabled(activeMinutesEnabled !== null ? activeMinutesEnabled : false);

    // Load sync duration preference
    const duration = await loadSyncDuration();
    setSyncDuration(duration !== null ? duration : '24h');

    const fourHourTime = await loadStringPreference('fourHourSyncTime');
    setFourHourSyncTime(fourHourTime !== null ? fourHourTime : '00:00');

    const dailyTime = await loadStringPreference('dailySyncTime');
    setDailySyncTime(dailyTime !== null ? dailyTime : '00:00');

    // Initialize Health Connect
    await initHealthConnect();

    // Load theme preference
    const theme = await loadStringPreference('appTheme');
    setAppTheme(theme !== null ? theme : 'System');

    // Check server connection status
    const connectionStatus = await checkServerConnection();
    setIsConnected(connectionStatus);
  };

  useEffect(() => {
    loadConfig();
  }, [activeConfigId]); // Re-check connection when active config changes

  const handleThemeChange = async (itemValue) => {
    setAppTheme(itemValue);
    await saveStringPreference('appTheme', itemValue);
  };

  const handleSaveConfig = async () => {
    if (!url || !apiKey) {
      Alert.alert('Error', 'Please enter both a server URL and an API key.');
      return;
    }
    try {
      const configToSave = {
        id: currentConfigId || Date.now().toString(), // Use existing ID or generate new
        url,
        apiKey,
      };
      await saveServerConfig(configToSave);


      await loadConfig(); // Reload all configs and active one
      Alert.alert('Success', 'Settings saved successfully.');
      setShowConfigModal(false);
      addLog('Settings saved successfully.', 'info', 'SUCCESS');
    } catch (error) {
      console.error('Failed to save settings:', error); // Log the actual error
      Alert.alert('Error', `Failed to save settings: ${error.message || error}`);
      addLog(`Failed to save settings: ${error.message || error}`, 'error', 'ERROR');
    }
  };

  const handleSetActiveConfig = async (configId) => {
    try {
      await setActiveServerConfig(configId);
      await loadConfig(); // Reload to update active config in UI
      Alert.alert('Success', 'Active server configuration changed.');
      setShowConfigModal(false);
      addLog('Active server configuration changed.', 'info', 'SUCCESS');
    } catch (error) {
      console.error('Failed to set active server configuration:', error); // Log the actual error
      addLog(`Failed to set active server configuration: ${error.message || error}`, 'error', 'ERROR');
      Alert.alert('Error', `Failed to set active server configuration: ${error.message || error}`);
    }
  };

  const handleDeleteConfig = async (configId) => {
    try {
      await deleteServerConfig(configId);
      await loadConfig(); // Reload configs
      if (activeConfigId === configId) {
        setUrl('');
        setApiKey('');
        setActiveConfigId(null);
        setCurrentConfigId(null);
      }
      Alert.alert('Success', 'Server configuration deleted.');
      addLog('Server configuration deleted.', 'info', 'SUCCESS');
    } catch (error) {
      console.error('Failed to delete server configuration:', error); // Log the actual error
      Alert.alert('Error', `Failed to delete server configuration: ${error.message || error}`);
      addLog(`Failed to delete server configuration: ${error.message || error}`, 'error', 'ERROR');
    }
  };

  const handleEditConfig = (config) => {
    setUrl(config.url);
    setApiKey(config.apiKey);
    setCurrentConfigId(config.id);
  };

  const handleAddNewConfig = () => {
    setUrl('');
    setApiKey('');
    setCurrentConfigId(null);
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
        addLog('Permission Denied: Steps permission not granted.', 'warn', 'WARNING');
      } else {
        addLog('Steps sync enabled and permissions granted.', 'info', 'SUCCESS');
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
        addLog('Permission Denied: Active Calories permission not granted.', 'warn', 'WARNING');
      } else {
        addLog('Active Calories sync enabled and permissions granted.', 'info', 'SUCCESS');
      }
    }
  };

  const handleToggleHeartRateSync = async (newValue) => {
    setIsHeartRateSyncEnabled(newValue);
    await saveHealthPreference('syncHeartRateEnabled', newValue);
    if (newValue) {
      const granted = await requestHealthPermissions([{ accessType: 'read', recordType: 'HeartRate' }]);
      if (!granted) {
        Alert.alert('Permission Denied', 'Please grant heart rate permission in Health Connect settings.');
        setIsHeartRateSyncEnabled(false);
        await saveHealthPreference('syncHeartRateEnabled', false);
        addLog('Permission Denied: Heart Rate permission not granted.', 'warn', 'WARNING');
      } else {
        addLog('Heart Rate sync enabled and permissions granted.', 'info', 'SUCCESS');
      }
    }
  };

  const handleToggleActiveMinutesSync = async (newValue) => {
    setIsActiveMinutesSyncEnabled(newValue);
    await saveHealthPreference('syncActiveMinutesEnabled', newValue);
    if (newValue) {
      const granted = await requestHealthPermissions([{ accessType: 'read', recordType: 'ActiveMinutes' }]);
      if (!granted) {
        Alert.alert('Permission Denied', 'Please grant active minutes permission in Health Connect settings.');
        setIsActiveMinutesSyncEnabled(false);
        await saveHealthPreference('syncActiveMinutesEnabled', false);
        addLog('Permission Denied: Active Minutes permission not granted.', 'warn', 'WARNING');
      } else {
        addLog('Active Minutes sync enabled and permissions granted.', 'info', 'SUCCESS');
      }
    }
  };

  const handleSyncDurationChange = async (itemValue) => {
    setSyncDuration(itemValue);
    await saveSyncDuration(itemValue);
  };

  const handleFourHourSyncTimeChange = async (itemValue) => {
    setFourHourSyncTime(itemValue);
    await saveStringPreference('fourHourSyncTime', itemValue);
  };

  const handleDailySyncTimeChange = async (itemValue) => {
    setDailySyncTime(itemValue);
    await saveStringPreference('dailySyncTime', itemValue);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.contentContainer}>
          {/* Server Configuration */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Server Configuration</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server URL</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  placeholder="https://api.healthsync.com"
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TouchableOpacity style={styles.iconButton} onPress={async () => setUrl(await Clipboard.getStringAsync())}>
                  <Image source={require('../../assets/icons/paste.png')} style={styles.icon} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>API Key</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChangeText={setApiKey}
                  secureTextEntry
                />
                <TouchableOpacity style={styles.iconButton} onPress={async () => setApiKey(await Clipboard.getStringAsync())}>
                  <Image source={require('../../assets/icons/paste.png')} style={styles.icon} />
                </TouchableOpacity>
              </View>
            </View>
            <Button title="Save Current Config" onPress={handleSaveConfig} />
          </View>

          {/* Display existing configurations */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manage Configurations</Text>
            {serverConfigs.map((item) => (
              <View key={item.id} style={styles.serverConfigItem}>
                <Text style={styles.serverConfigText}>
                  {item.url} {item.id === activeConfigId ? '(Active)' : ''}
                </Text>
                <View style={styles.serverConfigActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#007bff' }]}
                    onPress={() => handleSetActiveConfig(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Set Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#ffc107' }]}
                    onPress={() => handleEditConfig(item)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
                    onPress={() => handleDeleteConfig(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addConfigButton} onPress={handleAddNewConfig}>
              <Text style={styles.addConfigButtonText}>Add New Configuration</Text>
            </TouchableOpacity>
          </View>

          {/* Health Data to Sync */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Health Data to Sync</Text>
            <View style={styles.settingItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={require('../../assets/icons/steps.png')} style={styles.icon} />
                <Text style={[styles.settingLabel, { marginLeft: 8 }]}>Steps</Text>
              </View>
              <Switch
                onValueChange={handleToggleStepsSync}
                value={isStepsSyncEnabled}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={require('../../assets/icons/calories.png')} style={styles.icon} />
                <Text style={[styles.settingLabel, { marginLeft: 8 }]}>Active Calories</Text>
              </View>
              <Switch
                onValueChange={handleToggleCaloriesSync}
                value={isCaloriesSyncEnabled}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={require('../../assets/icons/heart_rate.png')} style={styles.icon} />
                <Text style={[styles.settingLabel, { marginLeft: 8 }]}>Heart Rate</Text>
              </View>
              <Switch
                onValueChange={handleToggleHeartRateSync}
                value={isHeartRateSyncEnabled}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={require('../../assets/icons/active_minutes.png')} style={styles.icon} />
                <Text style={[styles.settingLabel, { marginLeft: 8 }]}>Active Minutes</Text>
              </View>
              <Switch
                onValueChange={handleToggleActiveMinutesSync}
                value={isActiveMinutesSyncEnabled}
              />
            </View>
          </View>

          {/* Sync Frequency */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sync Frequency</Text>
            <View style={styles.inputGroup}>
              <Picker
                selectedValue={syncDuration}
                style={styles.picker}
                onValueChange={handleSyncDurationChange}
                itemStyle={styles.pickerItem} // Apply itemStyle here
              >
                <Picker.Item label="Hourly" value="1h" />
                <Picker.Item label="Every 4 Hours" value="4h" />
                <Picker.Item label="Daily" value="24h" />
              </Picker>
              <Text style={styles.label}>How often should your health data be synced automatically?</Text>
            </View>
            {syncDuration === '4h' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Prompt Time (Every 4 Hours)</Text>
                <Picker
                  selectedValue={fourHourSyncTime}
                  style={styles.picker}
                  onValueChange={handleFourHourSyncTimeChange}
                  itemStyle={styles.pickerItem} // Apply itemStyle here
                >
                  {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map(time => (
                    <Picker.Item key={time} label={time} value={time} />
                  ))}
                </Picker>
              </View>
            )}
            {syncDuration === '24h' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Prompt Time (Daily)</Text>
                <Picker
                  selectedValue={dailySyncTime}
                  style={styles.picker}
                  onValueChange={handleDailySyncTimeChange}
                  itemStyle={styles.pickerItem} // Apply itemStyle here
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return <Picker.Item key={hour} label={`${hour}:00`} value={`${hour}:00`} />;
                  })}
                </Picker>
              </View>
            )}
          </View>

          {/* Appearance */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.settingItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={require('../../assets/icons/settings.png')} style={styles.icon} />
                <Text style={[styles.settingLabel, { marginLeft: 8 }]}>Theme</Text>
              </View>
              <Picker
                selectedValue={appTheme}
                style={styles.picker}
                onValueChange={handleThemeChange}
                itemStyle={styles.pickerItem} // Apply itemStyle here
              >
                <Picker.Item label="Light" value="Light" />
                <Picker.Item label="Dark" value="Dark" />
                <Picker.Item label="System" value="System" />
              </Picker>
            </View>
          </View>


          {/* Configuration required status */}
          {!activeConfigId && (
            <View style={styles.configRequiredContainer}>
              <View style={[styles.dot, { backgroundColor: '#ffc107' }]}></View>
              <Text style={styles.configRequiredText}>Configuration required</Text>
            </View>
          )}

          {/* Connected to server status */}
          {activeConfigId && (
            <View style={styles.connectedStatusContainer}>
              <View style={[styles.dot, { backgroundColor: isConnected ? '#28a745' : '#dc3545' }]}></View>
              <Text style={[styles.connectedStatusText, { color: isConnected ? '#28a745' : '#dc3545' }]}>
                {isConnected ? 'Connected to server' : 'Connection failed'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Main')}>
          <Image source={require('../../assets/icons/home.png')} style={styles.navBarIcon} />
          <Text style={styles.navBarText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Settings')}>
          <Image source={require('../../assets/icons/settings.png')} style={[styles.navBarIcon, styles.navBarIconActive]} />
          <Text style={[styles.navBarText, styles.navBarTextActive]}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Logs')}>
          <Image source={require('../../assets/icons/logs.png')} style={styles.navBarIcon} />
          <Text style={styles.navBarText}>Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Server Configuration Modal - Remove this section */}
      {/* The modal content is now integrated directly into the main screen */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentContainer: {
    flex: 1, // Take all available space
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
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingRight: 10,
  },
  iconButton: {
    padding: 8,
  },
  icon: {
    width: 24,
    height: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333', // Ensure text is visible
  },
  pickerItem: {
    color: '#333', // Ensure text is visible for individual items
  },
  saveButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  configRequiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff3cd', // Light yellow background
    alignSelf: 'center',
    marginTop: 16,
  },
  configRequiredText: {
    color: '#856404', // Dark yellow text
    marginLeft: 8,
    fontWeight: 'bold',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e6ffe6', // Light green background
    alignSelf: 'center',
    marginTop: 16,
  },
  connectedStatusText: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  serverConfigItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverConfigText: {
    fontSize: 16,
    color: '#333',
  },
  serverConfigActions: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow buttons to wrap to the next line
    justifyContent: 'flex-end', // Align buttons to the right
    flex: 1, // Take available space
  },
  actionButton: {
    marginLeft: 5, // Reduced margin
    marginBottom: 5, // Add some vertical spacing
    padding: 6, // Reduced padding
    borderRadius: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12, // Reduced font size
  },
  addConfigButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addConfigButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

export default SettingsScreen;