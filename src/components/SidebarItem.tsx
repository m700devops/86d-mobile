import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';

interface Props {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  // Trailing count, for items whose destination already has work in it.
  badge?: string;
  // Throws work away. Coloured like Sign Out so it never reads as one more
  // place to navigate to.
  destructive?: boolean;
  // Secondary line under the label — used to spell out the consequence of a
  // destructive action before it's tapped.
  sublabel?: string;
  onPress: () => void;
}

export default function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  destructive = false,
  sublabel,
  onPress,
}: Props) {
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
      <View style={styles.labelColumn}>
        <Text style={[styles.label, active && styles.activeLabel, destructive && styles.destructiveLabel]}>
          {label}
        </Text>
        {!!sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
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
  labelColumn: {
    flex: 1,
  },
  destructiveLabel: {
    color: COLORS.error,
  },
  sublabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  badge: {
    marginLeft: 'auto',
    minWidth: 24,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: `${COLORS.accentPrimary}20`,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
});
