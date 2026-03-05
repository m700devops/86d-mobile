import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, Animated } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { ArrowLeft, Check, Info } from 'lucide-react-native';

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export default function PenDetection({ onBack, onComplete }: Props) {
  const liquidLineAnim = useState(new Animated.Value(0))[0];
  const penPosAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
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
  }, []);

  const liquidLineY = liquidLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['58%', '60%'],
  });

  const penX = penPosAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['40%', '50%'],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.5],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pen Detection Guide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mockupContainer}>
          <View style={styles.mockup}>
            <Animated.View
              style={[
                styles.liquidLine,
                {
                  top: liquidLineY,
                  shadowColor: COLORS.accentSecondary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 10,
                },
              ]}
            />

            <Animated.View
              style={[
                styles.pen,
                {
                  left: penX,
                  top: '58%',
                },
              ]}
            >
              <View style={styles.penBar} />
              <View style={styles.penTip} />
            </Animated.View>

            <Animated.View
              style={[
                styles.pulse,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>LIQUID LINE DETECTED</Text>
            </View>
          </View>
        </View>

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

        <View style={styles.proTipBox}>
          <View style={styles.proTipIcon}>
            <Info size={20} color={COLORS.accentSecondary} />
          </View>
          <Text style={styles.proTipText}>
            <Text style={{ fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary }}>
              Pro Tip:{' '}
            </Text>
            Using a pen reduces error by 40% compared to eye-balling, especially in dark environments.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: COLORS.accentPrimary }]}
          onPress={onComplete}
        >
          <Text style={styles.buttonText}>Got it, let's scan</Text>
          <Check size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <View style={styles.stepItem}>
      <Text style={styles.stepNumber}>{number}</Text>
      <View>
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
  },
  placeholder: {
    width: 40,
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  liquidLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accentSecondary,
  },
  pen: {
    position: 'absolute',
    width: 160,
    height: 16,
    justifyContent: 'center',
  },
  penBar: {
    flex: 1,
    backgroundColor: '#A0A0A0',
    borderRadius: 8,
  },
  penTip: {
    position: 'absolute',
    left: 0,
    width: 16,
    height: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
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
    bottom: SPACING.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: `${COLORS.accentSecondary}33`,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.accentSecondary}66`,
    paddingVertical: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentSecondary,
    letterSpacing: 1,
  },
  stepsContainer: {
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  stepItem: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  stepNumber: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  stepDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    lineHeight: 16,
  },
  proTipBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  proTipIcon: {
    width: 40,
    height: 40,
    backgroundColor: `${COLORS.accentSecondary}1A`,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proTipText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  button: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  buttonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
  },
});
