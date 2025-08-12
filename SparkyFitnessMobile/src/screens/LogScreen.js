import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { getLogs, clearLogs } from '../services/LogService';

const LogScreen = () => {
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    const storedLogs = await getLogs();
    setLogs(storedLogs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = async () => {
    await clearLogs();
    loadLogs();
  };

  const renderItem = ({ item }) => (
    <View style={styles.logItem}>
      <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
      <Text>{item.message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application Logs</Text>
      <Button title="Clear Logs" onPress={handleClearLogs} />
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  list: {
    marginTop: 10,
  },
  logItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
  },
  timestamp: {
    fontWeight: 'bold',
    color: '#555',
  },
});

export default LogScreen;