import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Zap, Camera, ShieldCheck, BarChart3, ChevronRight } from 'lucide-react-native';

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in and slide up animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Icon with pulse animation */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconBox}>
              <Zap size={32} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Headline */}
          <Text style={styles.headline}>
            Inventory at the{'\n'}
            <Text style={styles.headlineAccent}>speed of light.</Text>
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

          {/* CTA Button with enhanced shadow */}
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
        </Animated.View>
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
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  headline: {
    fontSize: FONT_SIZES['6xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 44,
    letterSpacing: LETTER_SPACING,
  },
  headlineAccent: {
    color: COLORS.accentPrimary,
    fontSize: FONT_SIZES['7xl'],
    letterSpacing: LETTER_SPACING,
  },
  subheadline: {
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
    maxWidth: 300,
    lineHeight: 28,
  },
  features: {
    width: '100%',
    gap: SPACING.lg,
    marginBottom: SPACING['3xl'],
  },
  featureItem: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  featureIcon: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    lineHeight: 18,
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
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
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
    opacity: 0.8,
  },
});
