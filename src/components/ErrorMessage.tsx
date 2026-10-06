import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

// The one look for an error message: COLORS.error plus an alert icon. The
// brand accent is red too, so colour alone can't tell an error from a label —
// the icon is what does.
//   inline (default) — under a field: small, left-aligned
//   box              — a form-level error: tinted panel, centred
interface Props {
  message: string;
  variant?: 'inline' | 'box';
  style?: StyleProp<ViewStyle>;
}

export default function ErrorMessage({ message, variant = 'inline', style }: Props) {
  const box = variant === 'box';
  return (
    <View style={[box ? styles.box : styles.inline, style]} accessibilityRole="alert">
      <AlertCircle size={box ? 16 : 13} color={COLORS.error} style={styles.icon} />
      <Text style={box ? styles.boxText : styles.inlineText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  inlineText: {
    flexShrink: 1,
    fontSize: 12,
    color: COLORS.error,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${COLORS.error}1F`,
    borderWidth: 1,
    borderColor: `${COLORS.error}66`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  boxText: {
    flexShrink: 1,
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  icon: {
    flexShrink: 0,
  },
});
