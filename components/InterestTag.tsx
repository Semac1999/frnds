import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}

export function InterestTag({ label, selected, onPress, small }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.tag, selected && styles.selected, small && styles.small]}
      disabled={!onPress}
    >
      <Text style={[styles.text, selected && styles.selectedText, small && styles.smallText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.bgInput,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(108,92,231,0.2)',
  },
  small: { paddingVertical: 4, paddingHorizontal: 10 },
  text: { fontSize: 13, color: Colors.textSecondary },
  selectedText: { color: Colors.primaryLight },
  smallText: { fontSize: 12 },
});
