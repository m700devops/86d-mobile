import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';

// Shown when a screen's data genuinely can't load — locations gone from both
// cache and server. The one rule: a screen may show a spinner only while
// something is actually still in flight; once every avenue has failed it must
// land here, with a way forward, never on a spinner that can't resolve.
export default function ConnectionNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <WifiOff size={32} color={COLORS.textTertiary} />
        <Text style={styles.title}>Can't reach the server</Text>
        <Text style={styles.body}>
          Check your connection and try again. Anything you've already counted
          is saved on this phone.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Try Again</Text>
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
    gap: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  body: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
});
