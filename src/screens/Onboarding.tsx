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
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Icon with pulse animation */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconBox}>
              <View style={styles.iconBackground}>
                <View style={styles.verticalLine1} />
                <View style={styles.verticalLine2} />
                <View style={styles.verticalLine3} />
              </View>
              <Zap size={28} color="#FFFFFF" fill="#FFFFFF" style={styles.iconZap} />
            </View>
          </Animated.View>

          {/* Headline */}
          <Text style={styles.headlineLine1}>Inventory at the</Text>
          <Text style={styles.headlineLine2}>speed of light.</Text>

          {/* Subheadline */}
          <Text style={styles.subheadline}>
            Professional inventory for high-pressure bars. Scan, review, and order in seconds.
          </Text>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem
              icon={<Camera size={18} color="#FF6B35" />}
              title="Visual Scanning"
              desc="Point your camera, detect bottles instantly."
            />
            <FeatureItem
              icon={<ShieldCheck size={18} color="#FFB800" />}
              title="Liquid Detection"
              desc="AI-powered level estimation with pen guide."
            />
            <FeatureItem
              icon={<BarChart3 size={18} color="#4CAF50" />}
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
            <ChevronRight size={18} color="#1A1A1A" />
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
    backgroundColor: '#0D0D0D',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 32,
    margin: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  iconBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalLine1: {
    width: 2,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginHorizontal: 3,
  },
  verticalLine2: {
    width: 2,
    height: '80%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginHorizontal: 3,
  },
  verticalLine3: {
    width: 2,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginHorizontal: 3,
  },
  iconZap: {
    zIndex: 1,
  },
  headlineLine1: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: LETTER_SPACING,
    lineHeight: 34,
  },
  headlineLine2: {
    fontSize: 36,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    letterSpacing: LETTER_SPACING,
    lineHeight: 42,
    marginBottom: 16,
    color: '#FF6B35',
  },
  subheadline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  features: {
    width: '100%',
    gap: 16,
    marginBottom: 28,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#2D2D2D',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
    letterSpacing: LETTER_SPACING,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  terms: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    opacity: 0.7,
  },
});
