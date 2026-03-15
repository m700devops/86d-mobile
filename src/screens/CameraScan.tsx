import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Check, ChevronLeft, Zap, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiService } from '../services/api';
import { scanDiagnostics, ScanLogEntry } from '../utils/diagnostics';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Bottle, LiquidLevel } from '../types';

// --- Types ---

type ScanState = 'idle' | 'stabilizing' | 'capturing' | 'needs_pen' | 'success';

interface Props {
  onReview: () => void;
  onBack?: () => void;
}

// --- Helpers ---

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

function frameDifference(hash1: number[], hash2: number[]): number {
  const len = Math.min(hash1.length, hash2.length);
  if (len === 0) return 1;
  let totalDiff = 0;
  for (let i = 0; i < len; i++) {
    totalDiff += Math.abs(hash1[i] - hash2[i]);
  }
  return totalDiff / (len * 128);
}

// Conservative deadband: readings within ±0.03 of a boundary map to the LOWER
// bucket.  This biases toward "less full" which triggers more ordering —
// the safer outcome for bar inventory.  Thresholds are aligned with the backend
// decimal_to_level() boundaries (0.875 / 0.625 / 0.375 / 0.125) plus deadband.
const LEVEL_DEADBAND = 0.03;

function levelToReadable(level: number): string {
  // Thresholds mirror levelToEnum — display text stays consistent with stored level.
  if (level >= 0.875 + LEVEL_DEADBAND) return 'Full';
  if (level >= 0.655) return 'Three quarters';
  if (level >= 0.405) return 'Half full';
  if (level >= 0.155) return 'Quarter full';
  return 'Almost empty';
}

function levelToEnum(level: number): LiquidLevel {
  if (level >= 0.875 + LEVEL_DEADBAND) return 'full';
  if (level >= 0.625 + LEVEL_DEADBAND) return '3/4';
  if (level >= 0.375 + LEVEL_DEADBAND) return 'half';
  if (level >= 0.125 + LEVEL_DEADBAND) return '1/4';
  return 'empty';
}

// --- Constants ---

const STABILITY_THRESHOLD = 0.30;   // was 0.12 — iOS auto-focus killed the old threshold
const FRAMES_NEEDED = 1;             // one stable pair is enough
const FRAME_INTERVAL_MS = 200;       // faster loop = faster auto-capture
const CAPTURE_COOLDOWN_MS = 1500;    // time between captures
const SUCCESS_DISPLAY_MS = 1200;
const AUTO_CAPTURE_TIMEOUT_MS = 3500; // if camera sees activity for 3.5s without stabilising, capture anyway
const CAPTURE_WATCHDOG_MS = 18000;   // reset stuck isCapturing after 18s (API hang guard)

// --- Component ---

export default function CameraScan({ onReview, onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const { addBottle } = useInventory();
  const { logout } = useAuth();

  const [showStartScreen, setShowStartScreen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [bottleCount, setBottleCount] = useState(0);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusText, setStatusText] = useState('Hold steady to scan');
  const [stabilityProgress, setStabilityProgress] = useState(0);

  // Border: 0 = orange (scanning), 1 = green (success)
  const [borderColorAnim] = useState(new Animated.Value(0));
  const [flashAnim] = useState(new Animated.Value(0));

  const cameraRef = useRef<CameraView>(null);
  const soundRef = useRef<AudioPlayer | null>(null);
  const previousHashRef = useRef<number[] | null>(null);
  const stableFrameCountRef = useRef(0);
  const isFrameProcessingRef = useRef(false);
  const isCapturingRef = useRef(false);
  const lastCaptureTimeRef = useRef(0);
  const stabilityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const captureWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const firstFrameTimeRef = useRef<number>(0); // when we first got a frame in this scan window
  const errorAlertCooldownRef = useRef<NodeJS.Timeout | null>(null);
  // Pen-reference state (refs so stability loop reads fresh values)
  const needsPenRef = useRef(false);
  const pendingBottleDataRef = useRef<{
    name: string;
    brand: string;
    category: string;
    distributorId?: string;
  } | null>(null);

  // --- Border / flash animations ---

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.accentPrimary, COLORS.success],
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

  // --- Start scanning (called when user taps "Start Scanning") ---

  const handleStartScanning = useCallback(async () => {
    setShowStartScreen(false);
    if (!permission) {
      const { granted } = await requestPermission();
      if (granted) initScanning();
    } else if (permission.granted) {
      initScanning();
    } else {
      const { granted } = await requestPermission();
      if (granted) initScanning();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  async function initScanning() {
    const token = await apiService.getAccessToken();
    if (!token) return;
    resetScanState();
    setIsScanning(true);
  }

  function resetScanState() {
    previousHashRef.current = null;
    stableFrameCountRef.current = 0;
    isCapturingRef.current = false;
    isFrameProcessingRef.current = false;
    needsPenRef.current = false;
    pendingBottleDataRef.current = null;
    firstFrameTimeRef.current = 0;
    if (captureWatchdogRef.current) { clearTimeout(captureWatchdogRef.current); captureWatchdogRef.current = null; }
    setStabilityProgress(0);
    setScanState('idle');
    setBorderValue(0);
    setStatusText('Hold steady to scan');
  }

  // --- Sound ---

  useEffect(() => {
    let mounted = true;
    try {
      const player = createAudioPlayer(require('../../assets/sounds/beep.mp3'));
      if (mounted) soundRef.current = player;
      else player.remove();
    } catch (err) {
      console.warn('CameraScan: could not load beep sound:', err);
    }
    return () => {
      mounted = false;
      soundRef.current?.remove();
      soundRef.current = null;
    };
  }, []);

  async function playBeep() {
    try {
      const player = soundRef.current;
      if (player) { player.seekTo(0); player.play(); }
    } catch {
      // haptic handles feedback
    }
  }

  // --- Flash animation ---

  const flashGreen = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [flashAnim]);

  const triggerSuccessFeedback = useCallback(async () => {
    await Promise.all([
      playBeep(),
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      Promise.resolve(flashGreen()),
    ]);
  }, [flashGreen]);

  // --- Capture & analyze ---

  const triggerCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    const startTime = Date.now();
    let imageSizeKb = 0;

    setScanState('capturing');
    setStatusText('Analyzing...');
    firstFrameTimeRef.current = 0; // reset so the auto-timeout doesn't double-fire

    // Watchdog: if the API call hangs (Render cold start etc.), un-stick after 18s
    if (captureWatchdogRef.current) clearTimeout(captureWatchdogRef.current);
    captureWatchdogRef.current = setTimeout(() => {
      if (isCapturingRef.current) {
        isCapturingRef.current = false;
        isFrameProcessingRef.current = false;
        setScanState(needsPenRef.current ? 'needs_pen' : 'idle');
        setBorderValue(0);
        setStatusText(needsPenRef.current ? 'Use pen for reference' : 'Hold steady to scan');
      }
      captureWatchdogRef.current = null;
    }, CAPTURE_WATCHDOG_MS);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });

      if (!photo?.base64) {
        isCapturingRef.current = false;
        setScanState(needsPenRef.current ? 'needs_pen' : 'idle');
        setBorderValue(0);
        setStatusText(needsPenRef.current ? 'Use pen for reference' : 'Hold steady to scan');
        return;
      }

      imageSizeKb = Math.round((photo.base64.length * 0.75) / 1024);

      if (needsPenRef.current && pendingBottleDataRef.current) {
        // ── Second pass: pen reference to determine level ──
        const penResult = await apiService.analyzeBottleWithPen(photo.base64);
        const pending = pendingBottleDataRef.current;

        await scanDiagnostics.logScan({
          timestamp: new Date().toISOString(),
          success: true,
          errorType: null,
          errorMessage: null,
          httpStatus: 200,
          responseTimeMs: Date.now() - startTime,
          imageSizeKb,
        });

        const newBottle: Bottle = {
          id: `bottle_${Date.now()}`,
          name: pending.name,
          brand: pending.brand,
          category: pending.category,
          size: '',
          currentLevel: penResult.liquidLevel,
          parLevel: 1,
          level: levelToEnum(penResult.liquidLevel),
          imageUrl: photo.uri,
          distributorId: pending.distributorId,
        };

        lastCaptureTimeRef.current = Date.now();
        addBottle(newBottle);
        setBottleCount(prev => prev + 1);
        setScanState('success');
        setBorderValue(1);
        setStatusText(`${pending.name} — ${levelToReadable(penResult.liquidLevel)}`);
        setStabilityProgress(0);
        await triggerSuccessFeedback();

        if (captureWatchdogRef.current) { clearTimeout(captureWatchdogRef.current); captureWatchdogRef.current = null; }
        successTimeoutRef.current = setTimeout(() => {
          needsPenRef.current = false;
          pendingBottleDataRef.current = null;
          setScanState('idle');
          setBorderValue(0);
          setStatusText('Hold steady to scan');
          isCapturingRef.current = false;
        }, SUCCESS_DISPLAY_MS);

      } else {
        // ── First pass: identify bottle and read level ──
        const result = await apiService.analyzeBottleImage(photo.base64);

        if (!result) {
          // No bottle detected
          await scanDiagnostics.logScan({
            timestamp: new Date().toISOString(),
            success: false,
            errorType: 'parse_error',
            errorMessage: 'API returned null — no bottle detected',
            httpStatus: 200,
            responseTimeMs: Date.now() - startTime,
            imageSizeKb,
          });
          setScanState('idle');
          setBorderValue(0);
          setStatusText('Hold steady to scan');
          isCapturingRef.current = false;
          return;
        }

        if (result.levelReadable === false || result.confidence < 0.35) {
          // Bottle found but level unreadable — prompt for pen reference
          pendingBottleDataRef.current = {
            name: result.name,
            brand: result.brand,
            category: result.category,
            distributorId: (result as any).distributorId,
          };
          needsPenRef.current = true;
          setScanState('needs_pen');
          setBorderValue(0);
          setStatusText('Use pen for reference');
          isCapturingRef.current = false;
          return;
        }

        await scanDiagnostics.logScan({
          timestamp: new Date().toISOString(),
          success: true,
          errorType: null,
          errorMessage: null,
          httpStatus: 200,
          responseTimeMs: Date.now() - startTime,
          imageSizeKb,
        });

        // Level readable — record immediately
        const newBottle: Bottle = {
          id: `bottle_${Date.now()}`,
          name: result.name,
          brand: result.brand,
          category: result.category,
          size: '',
          currentLevel: result.liquidLevel,
          parLevel: 1,
          level: levelToEnum(result.liquidLevel),
          imageUrl: photo.uri,
          distributorId: (result as any).distributorId,
        };

        lastCaptureTimeRef.current = Date.now();
        addBottle(newBottle);
        setBottleCount(prev => prev + 1);
        setScanState('success');
        setBorderValue(1);
        setStatusText(`${result.name} — ${levelToReadable(result.liquidLevel)}`);
        setStabilityProgress(0);
        await triggerSuccessFeedback();

        if (captureWatchdogRef.current) { clearTimeout(captureWatchdogRef.current); captureWatchdogRef.current = null; }
        successTimeoutRef.current = setTimeout(() => {
          firstFrameTimeRef.current = 0;
          setScanState('idle');
          setBorderValue(0);
          setStatusText('Hold steady to scan');
          isCapturingRef.current = false;
        }, SUCCESS_DISPLAY_MS);
      }

    } catch (error: any) {
      // --- Classify error ---
      let errorType: ScanLogEntry['errorType'] = 'unknown';
      let httpStatus: number | null = null;
      let errorMessage = error?.message || 'Unknown error';

      if (error?.response) {
        httpStatus = error.response.status;
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
        if (httpStatus === 401 || httpStatus === 403) {
          errorType = 'auth_error';
        } else {
          errorType = 'api_error';
        }
      } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorType = 'timeout';
      } else if (error?.request || error?.message?.includes('Network')) {
        errorType = 'network';
      }

      console.error('CameraScan capture error:', { errorType, httpStatus, errorMessage });

      await scanDiagnostics.logScan({
        timestamp: new Date().toISOString(),
        success: false,
        errorType,
        errorMessage,
        httpStatus,
        responseTimeMs: Date.now() - startTime,
        imageSizeKb,
      });

      if (captureWatchdogRef.current) { clearTimeout(captureWatchdogRef.current); captureWatchdogRef.current = null; }

      // Auth error: stop scanning and force re-login
      if (errorType === 'auth_error') {
        setIsScanning(false);
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      const penMode = needsPenRef.current;
      setScanState(penMode ? 'needs_pen' : 'idle');
      setBorderValue(0);
      setStatusText(penMode ? 'Use pen for reference' : 'Hold steady to scan');
      isCapturingRef.current = false;

      // Throttled error alert so we don't spam the user
      if (!errorAlertCooldownRef.current) {
        Alert.alert('Scan Error', errorMessage, [{ text: 'OK' }]);
        errorAlertCooldownRef.current = setTimeout(() => {
          errorAlertCooldownRef.current = null;
        }, 5000);
      }
    }
  }, [addBottle, setBorderValue, triggerSuccessFeedback, logout]);

  // --- Stability detection loop ---

  useEffect(() => {
    if (!isScanning) {
      if (stabilityIntervalRef.current) {
        clearInterval(stabilityIntervalRef.current);
        stabilityIntervalRef.current = null;
      }
      return;
    }

    stabilityIntervalRef.current = setInterval(async () => {
      if (isFrameProcessingRef.current || isCapturingRef.current) return;
      if (!cameraRef.current) return;
      if (Date.now() - lastCaptureTimeRef.current < CAPTURE_COOLDOWN_MS) return;

      isFrameProcessingRef.current = true;

      try {
        const frame = await cameraRef.current.takePictureAsync({ quality: 0.05, base64: true });
        if (!frame?.base64) { isFrameProcessingRef.current = false; return; }

        const now = Date.now();
        // Track first frame of this scan window (resets after each capture)
        if (firstFrameTimeRef.current === 0) firstFrameTimeRef.current = now;

        const currentHash = sampleBase64(frame.base64);

        if (previousHashRef.current) {
          const diff = frameDifference(previousHashRef.current, currentHash);

          if (diff < STABILITY_THRESHOLD) {
            stableFrameCountRef.current = Math.min(stableFrameCountRef.current + 1, FRAMES_NEEDED);
            setStabilityProgress(stableFrameCountRef.current / FRAMES_NEEDED);
            if (!needsPenRef.current) setScanState('stabilizing');
            setStatusText('Hold steady...');

            if (stableFrameCountRef.current >= FRAMES_NEEDED) {
              isCapturingRef.current = true;
              stableFrameCountRef.current = 0;
              previousHashRef.current = null;
              isFrameProcessingRef.current = false;
              triggerCapture();
              return;
            }
          } else {
            // Frames differ — show partial progress so user sees the app is active
            const elapsed = now - firstFrameTimeRef.current;
            const timeProgress = Math.min(elapsed / AUTO_CAPTURE_TIMEOUT_MS, 0.9);
            setStabilityProgress(timeProgress);

            if (!needsPenRef.current) setScanState('stabilizing');
            setStatusText('Hold steady...');

            // Auto-capture fallback: if we've been receiving frames long enough
            // without ever stabilising (camera moves too much), just go for it.
            if (elapsed > AUTO_CAPTURE_TIMEOUT_MS) {
              isCapturingRef.current = true;
              stableFrameCountRef.current = 0;
              previousHashRef.current = null;
              firstFrameTimeRef.current = 0;
              isFrameProcessingRef.current = false;
              triggerCapture();
              return;
            }
          }
        }

        previousHashRef.current = currentHash;
      } catch {
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
  }, [isScanning, triggerCapture]);

  // --- Cleanup on unmount ---

  useEffect(() => {
    return () => {
      if (stabilityIntervalRef.current) clearInterval(stabilityIntervalRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (captureWatchdogRef.current) clearTimeout(captureWatchdogRef.current);
      if (errorAlertCooldownRef.current) clearTimeout(errorAlertCooldownRef.current);
    };
  }, []);

  const handleDone = () => {
    if (stabilityIntervalRef.current) clearInterval(stabilityIntervalRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setIsScanning(false);
    onReview();
  };

  const handleTapCapture = useCallback(() => {
    if (isCapturingRef.current) return;
    if (scanState === 'success') return;
    isCapturingRef.current = true;
    stableFrameCountRef.current = 0;
    previousHashRef.current = null;
    triggerCapture();
  }, [scanState, triggerCapture]);

  // --- Start screen ---

  if (showStartScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.startScreenHeader}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.startScreenContent}>
          <Animated.View style={styles.startCard}>
            {/* Icon */}
            <View style={styles.startIconContainer}>
              <View style={styles.startIconBox}>
                <Camera size={32} color="#FFFFFF" />
              </View>
            </View>

            {/* Headline */}
            <Text style={styles.startHeadline}>Scan Your Inventory</Text>
            <Text style={styles.startSubheadline}>
              Point at any bottle to instantly detect it. AI reads the label and liquid level automatically.
            </Text>

            {/* How it works */}
            <View style={styles.startTips}>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Just hold the camera at the bottle — auto-captures instantly</Text>
              </View>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Tap Done when finished to review</Text>
              </View>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Use a pen at the liquid line if level is unclear</Text>
              </View>
            </View>

            {/* Start button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartScanning}
              activeOpacity={0.8}
            >
              <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Permission states ---

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Enable camera access to scan bottles for inventory.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Render ---

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
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
            : 'Scanning'}
        </Text>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        {isScanning ? (
          <CameraView ref={cameraRef} style={styles.camera} facing="back">

            {/* Animated border — orange while scanning, green on success */}
            <Animated.View style={[styles.borderOverlay, { borderColor }]} />

            {/* Green flash on capture */}
            <Animated.View style={[styles.flashOverlay, { opacity: flashOpacity }]} />

            {/* Tap-to-capture overlay */}
            <TouchableOpacity
              style={styles.tapOverlay}
              onPress={handleTapCapture}
              activeOpacity={1}
            />

            {/* Corner guides */}
            <View style={styles.centerZone}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>

            {/* Scanning indicator — pulses while the stability loop is running */}
            {(scanState === 'idle' || scanState === 'stabilizing') && (
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>
                  {scanState === 'stabilizing' ? 'Hold steady...' : 'Scanning...'}
                </Text>
              </View>
            )}

            {/* Success badge: "Grey Goose — Half full" */}
            {scanState === 'success' && (
              <View style={styles.successBadge}>
                <Check size={16} color={COLORS.primaryDark} />
                <Text style={styles.successBadgeText}>{statusText}</Text>
              </View>
            )}

            {/* Pen reference prompt */}
            {scanState === 'needs_pen' && (
              <View style={styles.penBadge}>
                <Text style={styles.penBadgeTitle}>Use pen for reference</Text>
                <Text style={styles.penBadgeSub}>Hold pen at liquid line and hold steady</Text>
              </View>
            )}

          </CameraView>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Starting camera...</Text>
          </View>
        )}
      </View>

      {/* Bottom bar */}
      {isScanning && (
        <View style={styles.bottomBar}>
          {/* Stability progress bar */}
          <View style={styles.stabilityTrack}>
            <View
              style={[
                styles.stabilityFill,
                {
                  width: `${stabilityProgress * 100}%` as any,
                  backgroundColor: scanState === 'success' ? COLORS.success : COLORS.accentPrimary,
                },
              ]}
            />
          </View>

          <View style={styles.bottomContent}>
            <View style={styles.instructionBlock}>
              <Text style={[
                styles.instructionPrimary,
                scanState === 'success' && { color: COLORS.success },
                scanState === 'needs_pen' && { color: COLORS.warning },
              ]}>
                {scanState === 'success'
                  ? statusText
                  : scanState === 'needs_pen'
                  ? 'Use pen for reference'
                  : statusText}
              </Text>
              <Text style={styles.instructionSub}>
                {scanState === 'success'
                  ? 'Move to next bottle'
                  : scanState === 'needs_pen'
                  ? 'Hold pen at liquid line'
                  : 'Auto-captures when steady — tap to force'}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  permissionTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: LETTER_SPACING,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  permissionButton: {
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
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
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  tapHint: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 15,
  },
  tapHintText: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: LETTER_SPACING,
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
    position: 'absolute', top: 0, left: 0,
    width: 40, height: 40,
    borderLeftWidth: 3, borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: 40, height: 40,
    borderRightWidth: 3, borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerBL: {
    position: 'absolute', bottom: 0, left: 0,
    width: 40, height: 40,
    borderLeftWidth: 3, borderBottomWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerBR: {
    position: 'absolute', bottom: 0, right: 0,
    width: 40, height: 40,
    borderRightWidth: 3, borderBottomWidth: 3,
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
  penBadge: {
    position: 'absolute',
    bottom: 24,
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: `${COLORS.warning}50`,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    zIndex: 30,
  },
  penBadgeTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.warning,
    letterSpacing: LETTER_SPACING,
    marginBottom: 4,
  },
  penBadgeSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
  // --- Start screen ---
  startScreenHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  startScreenContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['2xl'],
  },
  startCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  startIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  startIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accentPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  startHeadline: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: LETTER_SPACING,
    marginBottom: 12,
  },
  startSubheadline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  startTips: {
    gap: 12,
    marginBottom: 32,
  },
  startTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentPrimary,
  },
  startTipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  startButton: {
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.accentPrimary,
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
});
