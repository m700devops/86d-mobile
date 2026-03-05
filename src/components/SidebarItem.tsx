import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';

interface Props {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
}

export default function SidebarItem({ icon, label, active = false, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        active && styles.active,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.icon}>{icon}</View>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
  },
  active: {
    backgroundColor: `${COLORS.accentPrimary}1A`,
  },
  icon: {
    width: 18,
  },
  label: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  activeLabel: {
    color: COLORS.accentPrimary,
  },
});
