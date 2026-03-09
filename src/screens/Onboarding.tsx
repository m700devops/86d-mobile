import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Zap, Camera, ShieldCheck, BarChart3, ChevronRight } from 'lucide-react-native';

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBox}>
              <Zap size={32} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>
            Inventory at the{'\n'}
            <Text style={{ color: COLORS.accentPrimary, fontSize: FONT_SIZES['7xl'], letterSpacing: LETTER_SPACING }}>speed of light.</Text>
          </Text>

          {/* Subheadline */}
          <Text style={styles.subheadline}>
            Professional inventory for high-pressure bars. Scan, review, and order in seconds.
          </Text>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem
              icon={<Camera size={20} color={COLORS.accentPrimary} />}
              title="Visual Scanning"
              desc="Point your camera, detect bottles instantly."
            />
            <FeatureItem
              icon={<ShieldCheck size={20} color={COLORS.accentSecondary} />}
              title="Liquid Detection"
              desc="AI-powered level estimation with pen guide."
            />
            <FeatureItem
              icon={<BarChart3 size={20} color={COLORS.success} />}
              title="Smart Ordering"
              desc="Automatic par level comparison and export."
            />
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>By continuing, you agree to our Terms of Service.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING['3xl'],
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  headline: {
    fontSize: FONT_SIZES['6xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 40,
    letterSpacing: LETTER_SPACING,
  },
  subheadline: {
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
    maxWidth: 280,
  },
  features: {
    width: '100%',
    gap: SPACING.lg,
    marginBottom: SPACING['3xl'],
  },
  featureItem: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureText: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: LETTER_SPACING,
  },
  featureDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  terms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
