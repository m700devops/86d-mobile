import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
  PanResponder,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Check, ChevronLeft, Zap, Camera, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiService } from '../services/api';
import { scanDiagnostics, ScanLogEntry } from '../utils/diagnostics';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Bottle, LiquidLevel } from '../types';

// --- Types ---

type ScanState = 'idle' | 'capturing' | 'success';

interface Props {
  onReview: () => void;
  onBack?: () => void;
}

// --- Helpers ---

// Conservative deadband: readings within ±0.03 of a boundary map to the LOWER
// bucket.  This biases toward "less full" which triggers more ordering —
// the safer outcome for bar inventory.  Thresholds are aligned with the backend
// decimal_to_level() boundaries (0.875 / 0.625 / 0.375 / 0.125) plus deadband.
const LEVEL_DEADBAND = 0.03;

function levelToReadable(level: number): string {
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

const LOCK_SCAN_DELAY_MS = 500;          // delay between lock and actual scan firing
const SUCCESS_DISPLAY_MS = 1200;
const CAPTURE_WATCHDOG_MS = 18000;       // reset stuck isCapturing after 18s (API hang guard)

// --- Component ---

export default function CameraScan({ onReview, onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const { addBottle, removeBottle } = useInventory();
  const { logout } = useAuth();

  const [showStartScreen, setShowStartScreen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [bottleCount, setBottleCount] = useState(0);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusText, setStatusText] = useState('Set bottle level');
  const [lastBottleId, setLastBottleId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Level bar state
  const [levelValue, setLevelValue] = useState<number | null>(null);
  const [levelLocked, setLevelLocked] = useState(false);
  const [isLeftHanded, setIsLeftHanded] = useState(false);

  // Border: 0 = orange (scanning), 1 = green (success)
  const [borderColorAnim] = useState(new Animated.Value(0));
  const [flashAnim] = useState(new Animated.Value(0));

  // Pulse animation for empty bar state
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const soundRef = useRef<AudioPlayer | null>(null);
  const isCapturingRef = useRef(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const captureWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const errorAlertCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs mirroring state for use inside PanResponder / callbacks
  const levelValueRef = useRef<number | null>(null);
  const levelLockedRef = useRef(false);
  const isScanningRef = useRef(false);
  const isPausedRef = useRef(false);

  // Bar measurement refs
  const barRef = useRef<View>(null);
  const barTopRef = useRef(0);
  const barHeightRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => { isScanningRef.current = isScanning; }, [isScanning]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // --- Load left-handed setting ---

  useEffect(() => {
    AsyncStorage.getItem('@leftHanded').then(val => {
      if (val === 'true') setIsLeftHanded(true);
    });
  }, []);

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

  // --- Pulse animation (empty bar state) ---

  useEffect(() => {
    if (levelValue === null && isScanning && scanState === 'idle') {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    };
  }, [levelValue, isScanning, scanState, pulseAnim]);

  // --- Start scanning ---

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
    isCapturingRef.current = false;
    if (captureWatchdogRef.current) { clearTimeout(captureWatchdogRef.current); captureWatchdogRef.current = null; }
    if (lockTimerRef.current) { clearTimeout(lockTimerRef.current); lockTimerRef.current = null; }
    setScanState('idle');
    setBorderValue(0);
    setStatusText('Set bottle level');
    setLevelValue(null);
    levelValueRef.current = null;
    setLevelLocked(false);
    levelLockedRef.current = false;
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

  const triggerCapture = useCallback(async (userSetLevel: number) => {
    if (!cameraRef.current) return;
    const startTime = Date.now();
    let imageSizeKb = 0;

    setScanState('capturing');
    setLastBottleId(null);

    // Watchdog: if the API call hangs (Render cold start etc.), un-stick after 18s
    if (captureWatchdogRef.current) clearTimeout(captureWatchdogRef.current);
    captureWatchdogRef.current = setTimeout(() => {
      if (isCapturingRef.current) {
        isCapturingRef.current = false;
        setScanState('idle');
        setBorderValue(0);
        setLevelLocked(false);
        levelLockedRef.current = false;
        setStatusText('Set bottle level');
      }
      captureWatchdogRef.current = null;
    }, CAPTURE_WATCHDOG_MS);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });

      if (!photo?.base64) {
        isCapturingRef.current = false;
        setScanState('idle');
        setBorderValue(0);
        setLevelLocked(false);
        levelLockedRef.current = false;
        setStatusText('Set bottle level');
        return;
      }

      imageSizeKb = Math.round((photo.base64.length * 0.75) / 1024);

      // Bottle ID only — liquid level is set by the user via the scroll bar
      const result = await apiService.analyzeBottleImage(photo.base64);

      if (!result) {
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
        setLevelLocked(false);
        levelLockedRef.current = false;
        setStatusText('Set bottle level');
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

      const newBottle: Bottle = {
        id: `bottle_${Date.now()}`,
        name: result.name,
        brand: result.brand,
        category: result.category,
        size: '',
        currentLevel: userSetLevel,          // user's bar value — not the AI estimate
        parLevel: 1,
        level: levelToEnum(userSetLevel),    // user's bar value
        imageUrl: photo.uri,
        distributorId: (result as any).distributorId,
      };

      addBottle(newBottle);
      setLastBottleId(newBottle.id);
      setBottleCount(prev => prev + 1);
      setScanState('success');
      setBorderValue(1);
      setStatusText(`${result.name} — ${levelToReadable(userSetLevel)}`);
      await triggerSuccessFeedback();

      if (captureWatchdogRef.current) { clearTimeout(captureWatchdogRef.current); captureWatchdogRef.current = null; }

      // After success display, reset bar so user can set level for the next bottle
      successTimeoutRef.current = setTimeout(() => {
        setScanState('idle');
        setBorderValue(0);
        setLevelValue(null);
        levelValueRef.current = null;
        setLevelLocked(false);
        levelLockedRef.current = false;
        setStatusText('Set bottle level');
        isCapturingRef.current = false;
      }, SUCCESS_DISPLAY_MS);

    } catch (error: any) {
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

      if (errorType === 'auth_error') {
        setIsScanning(false);
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      setScanState('idle');
      setBorderValue(0);
      setLevelLocked(false);
      levelLockedRef.current = false;
      setStatusText('Set bottle level');
      isCapturingRef.current = false;

      if (!errorAlertCooldownRef.current) {
        Alert.alert('Scan Error', errorMessage, [{ text: 'OK' }]);
        errorAlertCooldownRef.current = setTimeout(() => {
          errorAlertCooldownRef.current = null;
        }, 5000);
      }
    }
  }, [addBottle, setBorderValue, triggerSuccessFeedback, logout]);

  // --- Level bar interaction ---

  const updateLevelFromPageY = useCallback((pageY: number) => {
    if (barHeightRef.current === 0) return;
    const relativeFromTop = pageY - barTopRef.current;
    const rawLevel = 1 - (relativeFromTop / barHeightRef.current);
    const clamped = Math.max(0, Math.min(1, rawLevel));
    setLevelValue(clamped);
    levelValueRef.current = clamped;
  }, []);

  // Use a stable callbacks ref so PanResponder (created once) always calls fresh functions
  const callbacksRef = useRef({
    updateLevelFromPageY,
    handleLockLevel: () => {},
  });

  const handleLockLevel = useCallback(() => {
    if (levelValueRef.current === null || levelLockedRef.current || isPausedRef.current) return;
    setLevelLocked(true);
    levelLockedRef.current = true;
    setStatusText('Scanning...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      lockTimerRef.current = null;
      if (levelLockedRef.current && levelValueRef.current !== null) {
        isCapturingRef.current = true;
        triggerCapture(levelValueRef.current);
      }
    }, LOCK_SCAN_DELAY_MS);
  }, [triggerCapture]);

  // Keep callbacksRef current
  callbacksRef.current = { updateLevelFromPageY, handleLockLevel };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !levelLockedRef.current && isScanningRef.current && !isPausedRef.current,
      onMoveShouldSetPanResponder: () =>
        !levelLockedRef.current && isScanningRef.current && !isPausedRef.current,
      onPanResponderGrant: (evt) => callbacksRef.current.updateLevelFromPageY(evt.nativeEvent.pageY),
      onPanResponderMove: (evt) => callbacksRef.current.updateLevelFromPageY(evt.nativeEvent.pageY),
      onPanResponderRelease: () => callbacksRef.current.handleLockLevel(),
    })
  ).current;

  const handleBarLayout = useCallback(() => {
    barRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
      barTopRef.current = pageY;
      barHeightRef.current = height;
    });
  }, []);

  const handleUnlockLevel = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    setLevelLocked(false);
    levelLockedRef.current = false;
    setStatusText('Set bottle level');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // --- Cleanup on unmount ---

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (captureWatchdogRef.current) clearTimeout(captureWatchdogRef.current);
      if (errorAlertCooldownRef.current) clearTimeout(errorAlertCooldownRef.current);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  const handleDone = () => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setIsScanning(false);
    onReview();
  };

  const handlePauseResume = useCallback(() => {
    setIsPaused(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Undo: remove last bottle and do a full reset back to level-setting
  const handleUndo = useCallback(() => {
    if (!lastBottleId) return;
    removeBottle(lastBottleId);
    setLastBottleId(null);
    setBottleCount(prev => Math.max(0, prev - 1));
    setScanState('idle');
    setBorderValue(0);
    setLevelValue(null);
    levelValueRef.current = null;
    setLevelLocked(false);
    levelLockedRef.current = false;
    if (lockTimerRef.current) { clearTimeout(lockTimerRef.current); lockTimerRef.current = null; }
    isCapturingRef.current = false;
    setStatusText('Set bottle level');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [lastBottleId, removeBottle, setBorderValue]);

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
          <View style={styles.startCard}>
            <View style={styles.startIconContainer}>
              <View style={styles.startIconBox}>
                <Camera size={32} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.startHeadline}>Scan Your Inventory</Text>
            <Text style={styles.startSubheadline}>
              Point your camera at each bottle. Set the liquid level using the bar on screen — AI identifies the bottle and logs it instantly.
            </Text>

            <View style={styles.startTips}>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Point camera at the bottle label</Text>
              </View>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Drag the level bar up to match how full the bottle is</Text>
              </View>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Release to lock and scan — tap Done when finished</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartScanning}
              activeOpacity={0.8}
            >
              <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
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

  const fillPercent = levelValue !== null ? levelValue * 100 : 0;

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
          {isPaused ? 'Paused' : bottleCount > 0
            ? `${bottleCount} bottle${bottleCount === 1 ? '' : 's'} scanned`
            : 'Scanning'}
        </Text>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={handlePauseResume}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        {isScanning ? (
          <CameraView ref={cameraRef} style={styles.camera} facing="back">

            {/* Animated border — orange while scanning, green on success */}
            <Animated.View style={[styles.borderOverlay, { borderColor }]} />

            {/* Green flash on capture */}
            <Animated.View style={[styles.flashOverlay, { opacity: flashOpacity }]} />

            {/* Corner guides */}
            <View style={styles.centerZone}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>

            {/* Status hint at top of camera */}
            {scanState === 'capturing' && (
              <View style={styles.statusHint}>
                <Text style={styles.statusHintText}>Scanning...</Text>
              </View>
            )}
            {scanState === 'idle' && levelValue === null && (
              <View style={styles.statusHint}>
                <Text style={styles.statusHintText}>Drag bar to set level</Text>
              </View>
            )}

            {/* Success badge */}
            {scanState === 'success' && (
              <View style={styles.successBadge}>
                <Check size={16} color={COLORS.primaryDark} />
                <Text style={styles.successBadgeText}>{statusText}</Text>
              </View>
            )}

            {/* Vertical level bar — right side (or left if left-handed) */}
            <Animated.View
              ref={barRef}
              style={[
                styles.levelBarWrapper,
                isLeftHanded ? styles.levelBarWrapperLeft : styles.levelBarWrapperRight,
                { opacity: pulseAnim },
              ]}
              onLayout={handleBarLayout}
              {...panResponder.panHandlers}
            >
              {/* Track outline — white normally, black when locked */}
              <View style={[
                styles.levelBarTrack,
                levelLocked && styles.levelBarTrackLocked,
              ]}>
                {/* Orange fill from bottom up */}
                {levelValue !== null && (
                  <View
                    style={[
                      styles.levelBarFill,
                      { height: `${fillPercent}%` as any },
                    ]}
                  />
                )}
              </View>

              {/* Padlock at top of bar when locked */}
              {levelLocked && (
                <TouchableOpacity
                  style={styles.padlockButton}
                  onPress={handleUnlockLevel}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Lock size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </Animated.View>

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
          <View style={styles.bottomContent}>
            <View style={styles.instructionBlock}>
              <Text style={[
                styles.instructionPrimary,
                scanState === 'success' && { color: COLORS.success },
              ]}>
                {statusText}
              </Text>
              <Text style={styles.instructionSub}>
                {scanState === 'success'
                  ? 'Move to next bottle'
                  : levelLocked
                    ? 'Tap lock to cancel'
                    : 'Drag bar · release to lock · scan fires'}
              </Text>
            </View>

            <View style={styles.bottomActions}>
              {lastBottleId && (
                <TouchableOpacity
                  style={styles.undoButton}
                  onPress={handleUndo}
                  activeOpacity={0.8}
                >
                  <Text style={styles.undoButtonText}>Undo</Text>
                </TouchableOpacity>
              )}
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
    flex: 1,
    textAlign: 'center',
  },
  pauseButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pauseButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
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
  statusHint: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 15,
  },
  statusHintText: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: LETTER_SPACING,
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

  // --- Level bar ---

  levelBarWrapper: {
    position: 'absolute',
    bottom: 20,
    width: 44,
    height: '60%',
    zIndex: 25,
    alignItems: 'center',
  },
  levelBarWrapperRight: {
    right: 16,
  },
  levelBarWrapperLeft: {
    left: 16,
  },
  levelBarTrack: {
    flex: 1,
    width: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    // Drop shadow for visibility in all lighting conditions
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
    justifyContent: 'flex-end',  // fill grows from bottom
  },
  levelBarTrackLocked: {
    borderColor: '#000000',
  },
  levelBarFill: {
    width: '100%',
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 16,
  },
  padlockButton: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 30,
  },

  // --- Bottom bar ---

  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1,
    borderTopColor: `${COLORS.border}50`,
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
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  undoButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  undoButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
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
