import React, { useEffect, useState } from 'react';
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
import { ArrowLeft, Check, Info, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export default function PenDetection({ onBack, onComplete }: Props) {
  const liquidLineAnim = useState(new Animated.Value(0))[0];
  const penPosAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(0))[0];
  const scanLineAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Animate liquid line
    Animated.loop(
      Animated.sequence([
        Animated.timing(liquidLineAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(liquidLineAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Animate pen position
    Animated.loop(
      Animated.sequence([
        Animated.timing(penPosAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(penPosAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Animate pulse effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Animate scan line
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const liquidLineY = liquidLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['58%', '60%'],
  });

  const penX = penPosAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['35%', '45%'],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.5],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['30%', '70%'],
  });

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pen Detection Guide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Visual Demo Card */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockup}>
            {/* Scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                { top: scanLineY },
              ]}
            />

            {/* Liquid line */}
            <Animated.View
              style={[
                styles.liquidLine,
                { top: liquidLineY },
              ]}
            />

            {/* Pen */}
            <Animated.View
              style={[
                styles.pen,
                { left: penX, top: '58%' },
              ]}
            >
              <View style={styles.penBar} />
              <View style={styles.penTip} />
            </Animated.View>

            {/* Detection pulse */}
            <Animated.View
              style={[
                styles.pulse,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            {/* Status badge */}
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>LIQUID LINE DETECTED</Text>
            </View>
          </View>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <StepItem
            number="01"
            title="Hold pen at liquid line"
            desc="Align the tip of a pen or pencil with the top of the liquid."
          />
          <StepItem
            number="02"
            title="Wait for gold pulse"
            desc="Our AI uses the pen as a physical reference for 99.9% accuracy."
          />
          <StepItem
            number="03"
            title="Confirm level"
            desc="Tap the screen to lock in the precise volume."
          />
        </View>

        {/* Pro Tip */}
        <View style={styles.proTipBox}>
          <View style={styles.proTipIcon}>
            <Info size={20} color={COLORS.accentSecondary} />
          </View>
          <Text style={styles.proTipText}>
            <Text style={styles.proTipHighlight}>Pro Tip:{' '}</Text>
            Using a pen reduces error by 40% compared to eye-balling, especially in dark environments.
          </Text>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Got it, let's scan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <View style={styles.stepItem}>
      <Text style={styles.stepNumber}>{number}</Text>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    padding: SPACING.md,
    marginLeft: -SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
    letterSpacing: LETTER_SPACING,
  },
  placeholder: {
    width: 48,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  mockupContainer: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  mockup: {
    width: 280,
    aspectRatio: 3 / 4,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accentPrimary,
    opacity: 0.5,
    shadowColor: COLORS.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  liquidLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.accentSecondary,
    shadowColor: COLORS.accentSecondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  pen: {
    position: 'absolute',
    width: 140,
    height: 12,
    justifyContent: 'center',
  },
  penBar: {
    flex: 1,
    backgroundColor: '#C0C0C0',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  penTip: {
    position: 'absolute',
    left: 0,
    width: 12,
    height: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
  },
  pulse: {
    position: 'absolute',
    left: '40%',
    top: '58%',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    backgroundColor: COLORS.accentSecondary,
    borderRadius: 24,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: `${COLORS.accentSecondary}20`,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.accentSecondary}50`,
    paddingVertical: SPACING.md,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentSecondary,
    letterSpacing: 2,
  },
  stepsContainer: {
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  stepItem: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    fontFamily: 'monospace',
    width: 32,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: LETTER_SPACING,
  },
  stepDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    lineHeight: 20,
  },
  proTipBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  proTipIcon: {
    width: 44,
    height: 44,
    backgroundColor: `${COLORS.accentSecondary}15`,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proTipText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  proTipHighlight: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  button: {
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
});
