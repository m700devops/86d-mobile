import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { X } from 'lucide-react-native';
import { apiService } from '../services/api';

interface Props {
  daysLeft: number;
}

// Sits above the screen content (not an overlay) so it never hides behind a
// full-bleed camera view — a few days of a slightly shorter camera area is a
// fair trade for not silently letting the trial cliff surprise anyone.
export default function TrialBanner({ daysLeft }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  if (dismissed) return null;

  const handleSubscribe = async () => {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    try {
      const { checkout_url } = await apiService.createCheckoutSession();
      await Linking.openURL(checkout_url);
    } catch {
      Alert.alert("Couldn't start checkout", 'Check your connection and try again.');
    } finally {
      setIsStartingCheckout(false);
    }
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.text} numberOfLines={1}>
        {daysLeft === 1 ? 'Trial ends tomorrow' : `Trial ends in ${daysLeft} days`}
      </Text>
      <TouchableOpacity onPress={handleSubscribe} disabled={isStartingCheckout} activeOpacity={0.8} hitSlop={8}>
        <Text style={styles.subscribeText}>{isStartingCheckout ? 'Opening…' : 'Subscribe'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={8} activeOpacity={0.7}>
        <X size={14} color={COLORS.primaryDark} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.accentSecondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primaryDark,
    letterSpacing: LETTER_SPACING,
  },
  subscribeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primaryDark,
    textDecorationLine: 'underline',
  },
});
