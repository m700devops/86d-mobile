import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
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
      <View style={[styles.icon, active && styles.activeIcon]}>{icon}</View>
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
    borderRadius: 10,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
  },
  active: {
    backgroundColor: `${COLORS.accentPrimary}10`,
  },
  icon: {
    width: 20,
    alignItems: 'center',
  },
  activeIcon: {
    // Icon color handled by parent
  },
  label: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    letterSpacing: LETTER_SPACING,
  },
  activeLabel: {
    color: COLORS.accentPrimary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
