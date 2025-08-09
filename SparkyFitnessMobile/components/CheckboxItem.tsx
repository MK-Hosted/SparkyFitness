import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CheckboxItemProps {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
  infoText?: string;
}

const CheckboxItem: React.FC<CheckboxItemProps> = ({ label, isChecked, onToggle, infoText }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle}>
      <View style={styles.checkboxContainer}>
        <Ionicons
          name={isChecked ? 'checkbox-outline' : 'square-outline'}
          size={24}
          color={isChecked ? '#007bff' : '#555'}
        />
        <Text style={styles.label}>{label}</Text>
      </View>
      {infoText && (
        <TouchableOpacity onPress={() => alert(infoText)}>
          <Ionicons name="information-circle-outline" size={20} color="#888" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
});

export default CheckboxItem;