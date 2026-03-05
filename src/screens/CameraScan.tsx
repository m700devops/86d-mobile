import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Camera, Zap, ChevronRight, PenTool } from 'lucide-react-native';

interface Props {
  onReview: () => void;
  onPenDetect: () => void;
}

const { width, height } = Dimensions.get('window');

export default function CameraScan({ onReview, onPenDetect }: Props) {
  const [hasStarted, setHasStarted] = useState(false);
  const [bottlesDetected, setBottlesDetected] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!hasStarted) return;

    setIsLoading(true);
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    const detectionTimer = setTimeout(() => {
      setIsLoading(false);
      setBottlesDetected(12);
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(detectionTimer);
    };
  }, [hasStarted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      {/* Camera Feed Simulation */}
      <View style={styles.cameraFeed} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory Scan</Text>
          <View style={styles.statusRow}>
            <Zap size={14} color={COLORS.accentPrimary} />
            <Text style={styles.statusText}>
              {hasStarted ? `${bottlesDetected} bottles detected` : 'Ready to scan'}
            </Text>
          </View>
        </View>

        {hasStarted && (
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(elapsed)} elapsed</Text>
          </View>
        )}
      </View>

      {/* Detection Boxes */}
      {hasStarted && !isLoading && (
        <View style={styles.detectionContainer}>
          <DetectionBox x="20%" y="30%" name="Grey Goose" level="75%" color={COLORS.success} />
          <DetectionBox x="60%" y="45%" name="Casamigos" level="50%" color={COLORS.warning} />
          <DetectionBox x="15%" y="60%" name="Hendrick's" level="25%" color={COLORS.error} />
          <DetectionBox x="55%" y="20%" name="Jack Daniel's" level="100%" color={COLORS.success} />
        </View>
      )}

      {/* Center Content */}
      <View style={styles.centerContent}>
        {!hasStarted ? (
          <View style={styles.startContainer}>
            <View style={styles.cameraIcon}>
              <Camera size={32} color={COLORS.accentPrimary} />
            </View>
            <Text style={styles.startTitle}>Position your camera</Text>
            <Text style={styles.startDesc}>
              Ensure bottles are clearly visible and well-lit for the most accurate detection.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: COLORS.accentPrimary }]}
              onPress={() => setHasStarted(true)}
            >
              <Text style={styles.buttonText}>Start Inventory Scan</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accentPrimary} />
            <Text style={styles.loadingText}>Initializing AI Vision...</Text>
          </View>
        ) : null}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: COLORS.border }]}
          onPress={onPenDetect}
        >
          <PenTool size={18} color={COLORS.accentSecondary} />
          <Text style={styles.secondaryButtonText}>Pen Guide</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: COLORS.accentPrimary, marginTop: SPACING.lg },
            (!hasStarted || isLoading) && { opacity: 0.5 },
          ]}
          onPress={onReview}
          disabled={!hasStarted || isLoading}
        >
          <Text style={styles.buttonText}>
            Review All ({bottlesDetected})
          </Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DetectionBox({
  x,
  y,
  name,
  level,
  color,
}: {
  x: string;
  y: string;
  name: string;
  level: string;
  color: string;
}) {
  const xPercent = parseFloat(x);
  const yPercent = parseFloat(y);

  return (
    <View
      style={[
        styles.detectionBox,
        {
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          borderColor: COLORS.accentPrimary,
        },
      ]}
    >
      <View style={styles.detectionLabel}>
        <Text style={styles.detectionName}>{name}</Text>
        <View style={styles.levelBar}>
          <View
            style={[
              styles.levelFill,
              { backgroundColor: color, width: level },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  cameraFeed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primaryDark,
    opacity: 0.8,
  },
  header: {
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONT_SIZES['4xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  timerBadge: {
    backgroundColor: `${COLORS.accentPrimary}33`,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}4D`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  timerText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.accentPrimary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  detectionContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  detectionBox: {
    position: 'absolute',
    width: 128,
    height: 192,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: COLORS.accentPrimary,
  },
  detectionLabel: {
    position: 'absolute',
    bottom: -50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  detectionName: {
    backgroundColor: COLORS.accentPrimary,
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  levelBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  startContainer: {
    alignItems: 'center',
  },
  cameraIcon: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.accentPrimary}1A`,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}33`,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  startTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  startDesc: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING['2xl'],
    maxWidth: 260,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.primaryDark,
    zIndex: 20,
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
  secondaryButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: `${COLORS.surface}CC`,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
});
