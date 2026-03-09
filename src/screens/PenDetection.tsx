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
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
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
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How Pen Scan Works</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Visual Demo */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockup}>
            {/* Scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  top: scanLineY,
                },
              ]}
            />

            {/* Liquid line */}
            <Animated.View
              style={[
                styles.liquidLine,
                {
                  top: liquidLineY,
                },
              ]}
            />

            {/* Pen */}
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
              <Text style={styles.statusText}>PEN DETECTED • HOLD STEADY</Text>
            </View>
          </View>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <StepItem
            number="01"
            title="Position the bottle"
            desc="Point camera at a bottle. The AI looks for the bottle shape automatically."
          />
          <StepItem
            number="02"
            title="Hold pen at liquid line"
            desc="Place pen tip exactly where the liquid meets the air. This is your reference point."
          />
          <StepItem
            number="03"
            title="Hold steady for 1 second"
            desc="Keep the pen still. The progress bar fills up, then auto-captures."
          />
          <StepItem
            number="04"
            title="Move to next bottle"
            desc="You'll hear a beep and feel a vibration. No tapping needed — just move to the next bottle."
          />
        </View>

        {/* Feedback explanation */}
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackTitle}>You'll know it worked when:</Text>
          <View style={styles.feedbackItems}>
            <FeedbackItem icon="🔊" text="Short beep sound" />
            <FeedbackItem icon="📳" text="Phone vibrates" />
            <FeedbackItem icon="✅" text="Green flash on screen" />
            <FeedbackItem icon="📊" text="Counter goes up" />
          </View>
        </View>

        {/* Pro Tip */}
        <View style={styles.proTipBox}>
          <View style={styles.proTipIcon}>
            <Info size={20} color={COLORS.accentSecondary} />
          </View>
          <Text style={styles.proTipText}>
            <Text style={{ fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary }}>
              Pro Tip:{' '}
            </Text>
            Using a pen reduces error by 40% compared to eye-balling, especially in dark bar environments. Any pen or pencil works.
          </Text>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: COLORS.accentPrimary }]}
          onPress={handleComplete}
        >
          <Camera size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Start Scanning</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepNumberContainer}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function FeedbackItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.feedbackItem}>
      <Text style={styles.feedbackIcon}>{icon}</Text>
      <Text style={styles.feedbackItemText}>{text}</Text>
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
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accentPrimary,
    opacity: 0.6,
    shadowColor: COLORS.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liquidLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accentSecondary,
    shadowColor: COLORS.accentSecondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  pen: {
    position: 'absolute',
    width: 140,
    height: 12,
    justifyContent: 'center',
  },
  penBar: {
    flex: 1,
    backgroundColor: '#A0A0A0',
    borderRadius: 6,
  },
  penTip: {
    position: 'absolute',
    left: 0,
    width: 12,
    height: 12,
    backgroundColor: '#000000',
    borderRadius: 6,
  },
  pulse: {
    position: 'absolute',
    left: '40%',
    top: '58%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    backgroundColor: COLORS.success,
    borderRadius: 20,
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
    alignItems: 'flex-start',
  },
  stepNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.accentPrimary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    lineHeight: 20,
  },
  feedbackBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  feedbackTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  feedbackItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.primaryDark}80`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  feedbackIcon: {
    fontSize: FONT_SIZES.lg,
  },
  feedbackItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
