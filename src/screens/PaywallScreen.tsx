import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Linking, Alert, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Lock, RefreshCw, LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

// Shown instead of the normal app flow once a trial has expired and no
// subscription is active. Checkout happens in the system browser — nothing
// Stripe-related ever runs inside this app.
export default function PaywallScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubscribe = async () => {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    try {
      const { checkout_url } = await apiService.createCheckoutSession();
      await Linking.openURL(checkout_url);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      Alert.alert(
        "Couldn't start checkout",
        detail?.message ?? 'Check your connection and try again.'
      );
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setIsRefreshing(false);
    }
  };

  const trialEndedRecently = user?.subscription_status === 'trial';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Lock size={32} color={COLORS.accentPrimary} />
        </View>

        <Text style={styles.title}>
          {trialEndedRecently ? 'Your free trial has ended' : 'Subscription needed'}
        </Text>
        <Text style={styles.subtitle}>
          Subscribe to keep scanning, ordering, and tracking your bar's inventory.
        </Text>

        {/* Keep in sync with the live Stripe price (price_1TuyoSR4DRSILPkokV8ffVnK) */}
        <Text style={styles.price}>
          $29.99<Text style={styles.priceUnit}>/month</Text>
        </Text>

        <TouchableOpacity
          style={[styles.subscribeButton, isStartingCheckout && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={isStartingCheckout}
          activeOpacity={0.8}
        >
          {isStartingCheckout ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          You'll be taken to a secure checkout page. Once you've subscribed, come back here.
        </Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleRefresh} disabled={isRefreshing} activeOpacity={0.7}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
          ) : (
            <RefreshCw size={16} color={COLORS.textSecondary} />
          )}
          <Text style={styles.secondaryButtonText}>I've subscribed — refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={logout} activeOpacity={0.7}>
          <LogOut size={16} color={COLORS.textTertiary} />
          <Text style={[styles.secondaryButtonText, { color: COLORS.textTertiary }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: `${COLORS.accentPrimary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: LETTER_SPACING,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  price: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
    marginBottom: SPACING.md,
  },
  priceUnit: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  subscribeButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
});
