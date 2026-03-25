import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Props {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export function GradientButton({ title, onPress, style, textStyle, disabled }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={disabled} style={style}>
      <LinearGradient
        colors={[...Gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, disabled && styles.disabled]}
      >
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: Layout.radius,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  text: {
    color: Colors.text,
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
});
