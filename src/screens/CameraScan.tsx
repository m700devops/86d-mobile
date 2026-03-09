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
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Camera, Zap, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { analyzeBottleImage } from '../services/geminiVision';

const { width, height } = Dimensions.get('window');

// Types for scanned bottles
interface ScannedBottle {
  id: string;
  name: string;
  brand: string;
  category: string;
  level: number; // 0-1 decimal
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
  
  const cameraRef = useRef<CameraView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    // Haptic feedback - strong vibration
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Green flash animation
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
    
    // Border flash animation
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
      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo?.uri) {
        setIsStabilizing(false);
        return;
      }

      // Progress animation while AI analyzes
      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress += 5;
        setStabilizeProgress(Math.min(progress, 90));
      }, 100);

      // Send to Gemini
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

  // Animated border color
  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.accentPrimary, COLORS.success],
  });

  // Flash overlay opacity
  const flashOpacity = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.accentPrimary} />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      {/* Camera Feed */}
      <View style={styles.cameraContainer}>
        {isScanning ? (
          <CameraView 
            ref={cameraRef}
            style={styles.camera} 
            facing="back"
          >
            {/* Detection Overlay */}
            <Animated.View 
              style={[
                styles.detectionOverlay,
                { borderColor: borderColor }
              ]} 
            />
            
            {/* Flash Effect */}
            <Animated.View 
              style={[
                styles.flashOverlay,
                { opacity: flashOpacity, backgroundColor: COLORS.success }
              ]} 
            />
            
            {/* Stabilizing Indicator */}
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
            
            {/* Detection Guide */}
            <View style={styles.guideContainer}>
              <View style={styles.guideCorner} />
              <View style={[styles.guideCorner, styles.guideCornerTopRight]} />
              <View style={[styles.guideCorner, styles.guideCornerBottomLeft]} />
              <View style={[styles.guideCorner, styles.guideCornerBottomRight]} />
            </View>
          </CameraView>
        ) : (
          <View style={[styles.camera, { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <Camera size={64} color={COLORS.textTertiary} />
            <Text style={styles.cameraPlaceholderText}>Camera Preview</Text>
          </View>
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {isScanning ? 'Scanning...' : 'Pen Scan Mode'}
          </Text>
          <View style={styles.statusRow}>
            <Zap size={14} color={COLORS.accentPrimary} />
            <Text style={styles.statusText}>
              {isScanning 
                ? `${scannedBottles.length} bottles scanned` 
                : 'AI-powered detection'}
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
            <View style={styles.cameraIcon}>
              <Camera size={32} color={COLORS.accentPrimary} />
            </View>
            <Text style={styles.startTitle}>AI Bottle Scanner</Text>
            <Text style={styles.startDesc}>
              Position a bottle with a pen at the liquid line. Tap capture to analyze with Gemini AI.
            </Text>
            <View style={styles.featureList}>
              <FeatureItem icon="✓" text="Gemini Vision AI" />
              <FeatureItem icon="✓" text="Pen level detection" />
              <FeatureItem icon="✓" text="Vibrate + flash on capture" />
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: COLORS.accentPrimary }]}
              onPress={handleStartScan}
            >
              <Text style={styles.buttonText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {!isScanning ? (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: COLORS.border }]}
            onPress={onPenDetect}
          >
            <Text style={styles.secondaryButtonText}>View Pen Guide</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.scanningControls}>
            {/* Live Counter */}
            <View style={styles.liveCounter}>
              <Text style={styles.liveCounterNumber}>{scannedBottles.length}</Text>
              <Text style={styles.liveCounterLabel}>bottles scanned</Text>
            </View>
            
            {/* Recent Scans Preview */}
            {scannedBottles.length > 0 && (
              <View style={styles.recentScans}>
                <Text style={styles.recentScansTitle}>Last captured:</Text>
                <View style={styles.recentScanItem}>
                  <Text style={styles.recentScanName}>
                    {scannedBottles[scannedBottles.length - 1].name}
                  </Text>
                  <View 
                    style={[
                      styles.levelIndicator,
                      { 
                        backgroundColor: getLevelColor(scannedBottles[scannedBottles.length - 1].level),
                        width: `${scannedBottles[scannedBottles.length - 1].level * 100}%`
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
            
            {/* Manual Capture Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: COLORS.accentPrimary }]}
              onPress={captureAndAnalyze}
              disabled={isStabilizing}
            >
              <Camera size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {isStabilizing ? 'Analyzing...' : 'Capture Bottle'}
              </Text>
            </TouchableOpacity>
            
            {/* Done Button */}
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: COLORS.success }]}
              onPress={handleDone}
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

// ActivityIndicator component for loading state
function ActivityIndicator({ size, color }: { size: 'large' | 'small'; color: string }) {
  return (
    <View style={[styles.activityIndicator, { borderColor: color }]}>
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
    borderWidth: 4,
    borderColor: COLORS.accentPrimary,
    margin: SPACING.md,
    borderRadius: 16,
    zIndex: 10,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  stabilizingContainer: {
    position: 'absolute',
    bottom: height * 0.3,
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
    zIndex: 30,
  },
  stabilizingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stabilizingProgress: {
    height: '100%',
    backgroundColor: COLORS.accentSecondary,
  },
  stabilizingText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: SPACING.md,
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
    borderColor: 'rgba(255,255,255,0.5)',
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
  cameraPlaceholderText: {
    color: COLORS.textTertiary,
    fontSize: FONT_SIZES.lg,
    marginTop: SPACING.md,
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
  counterBadge: {
    backgroundColor: COLORS.accentPrimary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    fontSize: FONT_SIZES['2xl'],
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
    marginBottom: SPACING.xl,
    maxWidth: 300,
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
    fontSize: FONT_SIZES.lg,
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
  button: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
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
  scanningControls: {
    gap: SPACING.lg,
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
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  recentScans: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  recentScansTitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentScanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  recentScanName: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.semibold,
    flex: 1,
  },
  levelIndicator: {
    height: 8,
    borderRadius: 4,
    width: 60,
  },
  doneButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  doneButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  activityIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderTopColor: 'transparent',
  },
});
