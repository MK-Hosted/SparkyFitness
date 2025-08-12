import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { getServerConfig, saveServerConfig, deleteServerConfig } from '../services/storage';

const SettingsScreen = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      const config = await getServerConfig();
      if (config) {
        setUrl(config.url);
        setApiKey(config.apiKey);
      }
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

  return (
    <View style={styles.container}>
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
        <Button title="Save" onPress={handleSave} />
        <Button title="Delete" onPress={handleDelete} color="red" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default SettingsScreen;