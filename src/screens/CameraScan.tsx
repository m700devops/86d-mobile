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
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Camera, Zap, Check, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { analyzeBottleImage } from '../services/geminiVision';

const { width, height } = Dimensions.get('window');

// Types for scanned bottles
interface ScannedBottle {
  id: string;
  name: string;
  brand: string;
  category: string;
  level: number;
  timestamp: number;
  imageUri?: string;
}

interface Props {
  onReview: (bottles: ScannedBottle[]) => void;
  onPenDetect: () => void;
}

export default function CameraScan({ onReview, onPenDetect }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBottles, setScannedBottles] = useState<ScannedBottle[]>([]);
  const [flashAnim] = useState(new Animated.Value(0));
  const [borderColorAnim] = useState(new Animated.Value(0));
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [stabilizeProgress, setStabilizeProgress] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));
  
  const cameraRef = useRef<CameraView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pulse animation for capture button
  useEffect(() => {
    if (isScanning && !isStabilizing) {
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
    } else {
      pulseAnim.setValue(1);
    }
  }, [isScanning, isStabilizing, pulseAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Play haptic feedback and flash animation on capture
  const playCaptureFeedback = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    Animated.sequence([
      Animated.timing(borderColorAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(borderColorAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [flashAnim, borderColorAnim]);

  // Real AI detection using Gemini Vision
  const captureAndAnalyze = useCallback(async () => {
    if (!cameraRef.current || isStabilizing) return;

    setIsStabilizing(true);
    setStabilizeProgress(0);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo?.uri) {
        setIsStabilizing(false);
        return;
      }

      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress += 5;
        setStabilizeProgress(Math.min(progress, 90));
      }, 100);

      const result = await analyzeBottleImage(photo.uri);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setStabilizeProgress(100);

      if (result && result.confidence > 0.7) {
        const newBottle: ScannedBottle = {
          id: `bottle_${Date.now()}`,
          name: result.name,
          brand: result.brand,
          category: result.category,
          level: result.liquidLevel,
          timestamp: Date.now(),
          imageUri: photo.uri,
        };

        setScannedBottles(prev => [...prev, newBottle]);
        playCaptureFeedback();
      }
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setIsStabilizing(false);
      setStabilizeProgress(0);
    }
  }, [isStabilizing, playCaptureFeedback]);

  const handleStartScan = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera Permission Required', 'Please enable camera access to scan bottles.');
        return;
      }
    }
    setIsScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDone = () => {
    setIsScanning(false);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    onReview(scannedBottles);
  };

  const getLevelColor = (level: number) => {
    if (level >= 0.75) return COLORS.success;
    if (level >= 0.5) return COLORS.warning;
    if (level >= 0.25) return COLORS.error;
    return '#F44336';
  };

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.accentPrimary, COLORS.success],
  });

  const flashOpacity = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.accentPrimary} />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera Feed */}
      <View style={styles.cameraContainer}>
        {isScanning ? (
          <CameraView 
            ref={cameraRef}
            style={styles.camera} 
            facing="back"
          >
            <Animated.View 
              style={[
                styles.detectionOverlay,
                { borderColor: borderColor }
              ]} 
            />
            
            <Animated.View 
              style={[
                styles.flashOverlay,
                { opacity: flashOpacity }
              ]} 
            />
            
            {isStabilizing && (
              <View style={styles.stabilizingContainer}>
                <View style={styles.stabilizingBar}>
                  <View 
                    style={[
                      styles.stabilizingProgress,
                      { width: `${stabilizeProgress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.stabilizingText}>Analyzing with AI...</Text>
              </View>
            )}
            
            <View style={styles.guideContainer}>
              <View style={styles.guideCorner} />
              <View style={[styles.guideCorner, styles.guideCornerTopRight]} />
              <View style={[styles.guideCorner, styles.guideCornerBottomLeft]} />
              <View style={[styles.guideCorner, styles.guideCornerBottomRight]} />
            </View>
            
            <View style={styles.vignetteOverlay} />
          </CameraView>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <View style={styles.cameraIconLarge}>
              <Camera size={48} color={COLORS.accentPrimary} />
            </View>
            <Text style={styles.cameraPlaceholderText}>Camera Preview</Text>
          </View>
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {isScanning ? 'Scanning...' : 'AI Scanner'}
          </Text>
          <View style={styles.statusRow}>
            <Sparkles size={14} color={COLORS.accentSecondary} />
            <Text style={styles.statusText}>
              {isScanning 
                ? `${scannedBottles.length} bottles scanned` 
                : 'Gemini Vision powered'}
            </Text>
          </View>
        </View>

        {isScanning && (
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{scannedBottles.length}</Text>
          </View>
        )}
      </View>

      {/* Center Content - Start Screen */}
      {!isScanning && (
        <View style={styles.centerContent}>
          <View style={styles.startContainer}>
            <View style={styles.iconBox}>
              <Camera size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.startTitle}>AI Bottle Scanner</Text>
            <Text style={styles.startDesc}>
              Position a bottle with a pen at the liquid line. Tap capture to analyze.
            </Text>
            <View style={styles.featureList}>
              <FeatureItem icon="✓" text="Gemini Vision AI" />
              <FeatureItem icon="✓" text="Pen level detection" />
              <FeatureItem icon="✓" text="One-tap capture" />
            </View>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartScan}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>Start Scanning</Text>
              <Zap size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {!isScanning ? (
          <TouchableOpacity
            style={styles.penGuideButton}
            onPress={onPenDetect}
          >
            <Text style={styles.penGuideText}>View Pen Guide</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.scanningControls}>
            <View style={styles.liveCounter}>
              <Text style={styles.liveCounterNumber}>{scannedBottles.length}</Text>
              <Text style={styles.liveCounterLabel}>bottles scanned</Text>
            </View>
            
            {scannedBottles.length > 0 && (
              <View style={styles.recentScan}>
                <Text style={styles.recentScanLabel}>Last: {scannedBottles[scannedBottles.length - 1].name}</Text>
                <View style={styles.levelBar}>
                  <View 
                    style={[
                      styles.levelFill,
                      { 
                        backgroundColor: getLevelColor(scannedBottles[scannedBottles.length - 1].level),
                        width: `${scannedBottles[scannedBottles.length - 1].level * 100}%`
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
            
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={captureAndAnalyze}
                disabled={isStabilizing}
                activeOpacity={0.8}
              >
                <Camera size={24} color="#FFFFFF" />
                <Text style={styles.captureButtonText}>
                  {isStabilizing ? 'Analyzing...' : 'Capture'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function ActivityIndicator({ size, color }: { size: 'large' | 'small'; color: string }) {
  return (
    <View style={[styles.spinnerContainer, { borderColor: color }]}>
      <View style={[styles.spinner, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  cameraContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  camera: {
    flex: 1,
  },
  detectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: COLORS.accentPrimary,
    margin: SPACING.lg,
    borderRadius: 24,
    zIndex: 10,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.success,
    zIndex: 20,
  },
  stabilizingContainer: {
    position: 'absolute',
    bottom: height * 0.35,
    left: SPACING.xl,
    right: SPACING.xl,
    alignItems: 'center',
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: SPACING.lg,
  },
  stabilizingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stabilizingProgress: {
    height: '100%',
    backgroundColor: COLORS.accentSecondary,
  },
  stabilizingText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: SPACING.md,
    letterSpacing: LETTER_SPACING,
  },
  guideContainer: {
    ...StyleSheet.absoluteFillObject,
    margin: SPACING.xl,
    zIndex: 5,
  },
  guideCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    top: 0,
    left: 0,
  },
  guideCornerTopRight: {
    right: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  guideCornerBottomLeft: {
    bottom: 0,
    top: undefined,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  guideCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 120,
    zIndex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconLarge: {
    width: 96,
    height: 96,
    backgroundColor: `${COLORS.accentPrimary}20`,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cameraPlaceholderText: {
    color: COLORS.textTertiary,
    fontSize: FONT_SIZES.lg,
  },
  header: {
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  counterBadge: {
    backgroundColor: COLORS.accentPrimary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  counterText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  startContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  iconBox: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  startTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: LETTER_SPACING,
  },
  startDesc: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    maxWidth: 280,
    lineHeight: 22,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: SPACING['2xl'],
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIcon: {
    color: COLORS.success,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  featureText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
  },
  startButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.primaryDark,
    zIndex: 100,
  },
  penGuideButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  penGuideText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  scanningControls: {
    gap: SPACING.md,
  },
  liveCounter: {
    alignItems: 'center',
  },
  liveCounterNumber: {
    fontSize: FONT_SIZES['5xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  liveCounterLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recentScan: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentScanLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
  levelBar: {
    height: 6,
    backgroundColor: `${COLORS.textPrimary}10`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 3,
  },
  captureButton: {
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  captureButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  doneButton: {
    height: 48,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  doneButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  spinnerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderTopColor: 'transparent',
  },
});
