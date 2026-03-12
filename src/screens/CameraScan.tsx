import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Check, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiService } from '../services/api';

const { width, height } = Dimensions.get('window');

// --- Types ---

interface ScannedBottle {
  id: string;
  name: string;
  brand: string;
  category: string;
  level: number;
  timestamp: number;
  imageUri?: string;
  usedPen: boolean;
}

interface Props {
  onReview: (bottles: ScannedBottle[]) => void;
  onBack?: () => void;
}

// Simplified state machine: no more needs_pen
type ScanState = 'idle' | 'stabilizing' | 'capturing' | 'success';

// --- Stability detection helpers (pure functions, no API calls) ---

/**
 * Samples N evenly-spaced char codes from the middle 80% of a base64 string.
 * Skips JPEG header/footer bytes that don't change between frames.
 */
function sampleBase64(base64: string, sampleCount = 100): number[] {
  const startOffset = Math.floor(base64.length * 0.1);
  const endOffset = Math.floor(base64.length * 0.9);
  const range = endOffset - startOffset;
  const step = Math.max(1, Math.floor(range / sampleCount));
  const samples: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const idx = startOffset + i * step;
    if (idx >= base64.length) break;
    samples.push(base64.charCodeAt(idx));
  }
  return samples;
}

/**
 * Returns a normalized difference (0–1) between two frame samples.
 * Base64 chars are ASCII 43–122, range ≈ 80. We normalize by 128 for safety.
 */
function frameDifference(hash1: number[], hash2: number[]): number {
  const len = Math.min(hash1.length, hash2.length);
  if (len === 0) return 1;
  let totalDiff = 0;
  for (let i = 0; i < len; i++) {
    totalDiff += Math.abs(hash1[i] - hash2[i]);
  }
  return totalDiff / (len * 128);
}

// --- Constants ---

const STABILITY_THRESHOLD = 0.05; // 5% pixel difference — stable if below this
const FRAMES_NEEDED = 3;          // 3 consecutive stable frames ≈ 1.5 seconds
const FRAME_INTERVAL_MS = 500;    // Sample every 500ms
const CAPTURE_COOLDOWN_MS = 2000; // Minimum 2s between captures (debounce)
const SUCCESS_DISPLAY_MS = 2000;  // How long to show success state

// --- Component ---

export default function CameraScan({ onReview, onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBottles, setScannedBottles] = useState<ScannedBottle[]>([]);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusText, setStatusText] = useState('Hold pen at liquid line');
  const [stabilityProgress, setStabilityProgress] = useState(0); // 0–1 fill bar

  // Animations
  const [borderColorAnim] = useState(new Animated.Value(0));
  const [flashAnim] = useState(new Animated.Value(0));

  // Refs — use refs for values read inside the interval to avoid stale closures
  const cameraRef = useRef<CameraView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previousHashRef = useRef<number[] | null>(null);
  const stableFrameCountRef = useRef(0);
  const isFrameProcessingRef = useRef(false); // prevents overlapping frame grabs
  const isCapturingRef = useRef(false);       // prevents overlapping API calls
  const lastCaptureTimeRef = useRef(0);
  const stabilityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorAlertCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const scannedBottlesRef = useRef<ScannedBottle[]>([]); // mirror of state for interval reads

  // Keep ref in sync with state
  useEffect(() => {
    scannedBottlesRef.current = scannedBottles;
  }, [scannedBottles]);

  // --- Border color interpolation ---
  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      `${COLORS.textTertiary}30`, // 0 = idle (dim gray)
      COLORS.accentPrimary,       // 1 = stabilizing (orange)
      COLORS.success,             // 2 = success (green)
    ],
  });

  const flashOpacity = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  const setBorderValue = useCallback((value: number) => {
    Animated.timing(borderColorAnim, {
      toValue: value,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [borderColorAnim]);

  // --- Sound ---
  useEffect(() => {
    let mounted = true;

    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/beep.mp3')
        );
        if (mounted) {
          soundRef.current = sound;
        } else {
          sound.unloadAsync();
        }
      } catch (err) {
        // expo-av not installed, or beep.mp3 missing — degrade gracefully to haptics only
        console.warn('CameraScan: could not load beep sound:', err);
      }
    }

    loadSound();

    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  async function playBeep() {
    try {
      await soundRef.current?.replayAsync();
    } catch {
      // Sound unavailable — haptic already handles feedback
    }
  }

  // --- Flash animation ---
  const flashGreen = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flashAnim]);

  // --- Reset stability tracking ---
  const resetStability = useCallback(() => {
    previousHashRef.current = null;
    stableFrameCountRef.current = 0;
    setStabilityProgress(0);
  }, []);

  // --- Success feedback: beep + haptic + flash (all simultaneously) ---
  const triggerSuccessFeedback = useCallback(async () => {
    await Promise.all([
      playBeep(),
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      Promise.resolve(flashGreen()),
    ]);
  }, [flashGreen]);

  // --- API capture: called once scene is stable ---
  const triggerCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    setScanState('capturing');
    setBorderValue(1);
    setStatusText('Analyzing...');

    try {
      // Full-quality capture for API
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!photo?.base64) {
        setScanState('idle');
        setBorderValue(0);
        setStatusText('Hold pen at liquid line');
        isCapturingRef.current = false;
        return;
      }

      const result = await apiService.analyzeBottleImage(photo.base64);

      if (!result) {
        setScanState('idle');
        setBorderValue(0);
        setStatusText('Point at bottle');
        isCapturingRef.current = false;
        return;
      }

      // Success
      const newBottle: ScannedBottle = {
        id: `bottle_${Date.now()}`,
        name: result.name,
        brand: result.brand,
        category: result.category,
        level: result.liquidLevel,
        timestamp: Date.now(),
        imageUri: photo.uri,
        usedPen: true, // pen is always primary in this mode
      };

      lastCaptureTimeRef.current = Date.now();
      setScannedBottles(prev => [...prev, newBottle]);
      setScanState('success');
      setBorderValue(2);
      setStatusText(`${result.name} — ${Math.round(result.liquidLevel * 100)}%`);
      setStabilityProgress(0);

      await triggerSuccessFeedback();

      successTimeoutRef.current = setTimeout(() => {
        setScanState('idle');
        setBorderValue(0);
        setStatusText('Hold pen at liquid line');
        isCapturingRef.current = false;
      }, SUCCESS_DISPLAY_MS);

    } catch (error: any) {
      console.error('CameraScan capture error:', error);
      setScanState('idle');
      setBorderValue(0);
      setStatusText('Hold pen at liquid line');
      isCapturingRef.current = false;

      // Throttled error alert — only once per 5s to avoid spam
      if (!errorAlertCooldownRef.current) {
        const msg = error?.message || 'Scan failed. Point at bottle and try again.';
        Alert.alert('Scan Error', msg, [{ text: 'OK' }]);
        errorAlertCooldownRef.current = setTimeout(() => {
          errorAlertCooldownRef.current = null;
        }, 5000);
      }
    }
  }, [setBorderValue, triggerSuccessFeedback]);

  // --- Stability detection loop ---
  useEffect(() => {
    if (!isScanning) {
      if (stabilityIntervalRef.current) {
        clearInterval(stabilityIntervalRef.current);
        stabilityIntervalRef.current = null;
      }
      resetStability();
      return;
    }

    stabilityIntervalRef.current = setInterval(async () => {
      // Skip if we're already processing a frame or doing an API capture
      if (isFrameProcessingRef.current || isCapturingRef.current) return;
      if (!cameraRef.current) return;

      // Enforce cooldown after a successful capture
      if (Date.now() - lastCaptureTimeRef.current < CAPTURE_COOLDOWN_MS) return;

      isFrameProcessingRef.current = true;

      try {
        // Tiny low-quality snapshot — client-side ONLY, never sent to API
        const frame = await cameraRef.current.takePictureAsync({
          quality: 0.05,
          base64: true,
        });

        if (!frame?.base64) {
          isFrameProcessingRef.current = false;
          return;
        }

        const currentHash = sampleBase64(frame.base64);

        if (previousHashRef.current) {
          const diff = frameDifference(previousHashRef.current, currentHash);

          if (diff < STABILITY_THRESHOLD) {
            // Scene is stable — increment counter
            stableFrameCountRef.current = Math.min(
              stableFrameCountRef.current + 1,
              FRAMES_NEEDED
            );

            const progress = stableFrameCountRef.current / FRAMES_NEEDED;
            setStabilityProgress(progress);
            setScanState('stabilizing');
            setBorderValue(1);
            setStatusText(
              stableFrameCountRef.current < FRAMES_NEEDED
                ? 'Hold steady...'
                : 'Capturing...'
            );

            if (stableFrameCountRef.current >= FRAMES_NEEDED) {
              // Lock and trigger API capture
              isCapturingRef.current = true;
              stableFrameCountRef.current = 0;
              previousHashRef.current = null;
              isFrameProcessingRef.current = false;
              triggerCapture();
              return;
            }
          } else {
            // Scene moved — reset
            stableFrameCountRef.current = 0;
            setStabilityProgress(0);
            setScanState('idle');
            setBorderValue(0);
            setStatusText('Hold pen at liquid line');
          }
        }

        previousHashRef.current = currentHash;
      } catch {
        // Camera not ready or other transient error — ignore and retry next tick
        stableFrameCountRef.current = 0;
      }

      isFrameProcessingRef.current = false;
    }, FRAME_INTERVAL_MS);

    return () => {
      if (stabilityIntervalRef.current) {
        clearInterval(stabilityIntervalRef.current);
        stabilityIntervalRef.current = null;
      }
    };
  }, [isScanning, triggerCapture, resetStability, setBorderValue]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (stabilityIntervalRef.current) clearInterval(stabilityIntervalRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (errorAlertCooldownRef.current) clearTimeout(errorAlertCooldownRef.current);
    };
  }, []);

  // --- Handlers ---
  const handleStartScan = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access to scan bottles.'
        );
        return;
      }
    }

    const token = await apiService.getAccessToken();
    if (!token) {
      Alert.alert('Login Required', 'Please log in to use the scanning feature.');
      return;
    }

    resetStability();
    isCapturingRef.current = false;
    isFrameProcessingRef.current = false;
    lastCaptureTimeRef.current = 0;
    setScanState('idle');
    setBorderValue(0);
    setStatusText('Hold pen at liquid line');
    setIsScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDone = () => {
    if (stabilityIntervalRef.current) {
      clearInterval(stabilityIntervalRef.current);
      stabilityIntervalRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setIsScanning(false);
    onReview(scannedBottlesRef.current);
  };

  // --- Permission loading state ---
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bottleCount = scannedBottles.length;

  // --- Render ---
  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header (always visible) ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack ?? handleDone}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.counterText}>
          {bottleCount > 0
            ? `${bottleCount} bottle${bottleCount === 1 ? '' : 's'} scanned`
            : 'Pen Scan'}
        </Text>
      </View>

      {/* ── Camera / Start area ── */}
      <View style={styles.cameraContainer}>
        {isScanning ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            {/* Animated border overlay */}
            <Animated.View
              style={[styles.borderOverlay, { borderColor }]}
            />

            {/* Green flash overlay on capture */}
            <Animated.View
              style={[styles.flashOverlay, { opacity: flashOpacity }]}
            />

            {/* Corner bracket guides */}
            <View style={styles.centerZone}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>

            {/* Success indicator (shown briefly after capture) */}
            {scanState === 'success' && (
              <View style={styles.successBadge}>
                <Check size={20} color={COLORS.primaryDark} />
                <Text style={styles.successBadgeText}>{statusText}</Text>
              </View>
            )}
          </CameraView>
        ) : (
          <View style={styles.startScreen}>
            <View style={styles.startContent}>
              <Text style={styles.startTitle}>Pen Scan Mode</Text>
              <Text style={styles.startDesc}>
                Point at a bottle, hold your pen at the liquid line, and stay
                steady. The app auto-captures when stable — no tapping needed.
              </Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>• Hold pen at liquid line</Text>
                <Text style={styles.featureItem}>• Stay steady for ~1.5 seconds</Text>
                <Text style={styles.featureItem}>• Beep + vibrate = captured</Text>
                <Text style={styles.featureItem}>• Move to next bottle and repeat</Text>
              </View>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartScan}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start Pen Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom bar (only while scanning) ── */}
      {isScanning && (
        <View style={styles.bottomBar}>
          {/* Stability progress bar */}
          <View style={styles.stabilityTrack}>
            <Animated.View
              style={[
                styles.stabilityFill,
                {
                  width: `${stabilityProgress * 100}%`,
                  backgroundColor:
                    scanState === 'success' ? COLORS.success : COLORS.accentPrimary,
                },
              ]}
            />
          </View>

          <View style={styles.bottomContent}>
            <View style={styles.instructionBlock}>
              <Text style={[
                styles.instructionPrimary,
                scanState === 'success' && { color: COLORS.success },
                scanState === 'stabilizing' && { color: COLORS.accentPrimary },
              ]}>
                {statusText}
              </Text>
              <Text style={styles.instructionSub}>
                {scanState === 'success'
                  ? 'Move to next bottle after beep'
                  : 'Hold pen at liquid line'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
              {bottleCount > 0 && (
                <Text style={styles.doneButtonCount}>({bottleCount})</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// --- Styles ---

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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}60`,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  counterText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 5,
    zIndex: 10,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.success,
    zIndex: 20,
  },
  centerZone: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '25%',
    zIndex: 5,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  successBadge: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 24,
    zIndex: 30,
  },
  successBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primaryDark,
    letterSpacing: LETTER_SPACING,
  },
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  startContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  startTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: LETTER_SPACING,
    textAlign: 'center',
  },
  startDesc: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: SPACING['2xl'],
    gap: SPACING.sm,
  },
  featureItem: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  startButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  startButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1,
    borderTopColor: `${COLORS.border}50`,
  },
  stabilityTrack: {
    height: 3,
    backgroundColor: `${COLORS.border}80`,
    width: '100%',
  },
  stabilityFill: {
    height: 3,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  instructionBlock: {
    flex: 1,
    marginRight: SPACING.md,
  },
  instructionPrimary: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
    marginBottom: 2,
  },
  instructionSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    letterSpacing: LETTER_SPACING,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  doneButtonCount: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    fontFamily: 'monospace',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
});
