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
import { Check, ChevronRight } from 'lucide-react-native';
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
  usedPen: boolean;
}

interface ScanResult {
  name: string;
  brand: string;
  category: string;
  liquidLevel: number;
  confidence: number;
  levelReadable?: boolean;
}

interface Props {
  onReview: (bottles: ScannedBottle[]) => void;
}

// Scanning states
type ScanState = 'idle' | 'detecting' | 'analyzing' | 'success' | 'needs_pen' | 'pen_analyzing';

export default function CameraScan({ onReview }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBottles, setScannedBottles] = useState<ScannedBottle[]>([]);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [currentTag, setCurrentTag] = useState<string>('Point at bottle');
  const [borderColorAnim] = useState(new Animated.Value(0));
  const [flashAnim] = useState(new Animated.Value(0));
  const [lastScannedName, setLastScannedName] = useState<string>('');
  
  const cameraRef = useRef<CameraView>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dedupeSetRef = useRef<Set<string>>(new Set());

  // Border color interpolation
  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [
      `${COLORS.textTertiary}30`, // Gray (idle)
      COLORS.accentPrimary,        // Orange (detecting/analyzing)
      COLORS.success,              // Green (success)
      COLORS.error,                // Red (needs pen)
    ],
  });

  // Flash animation on capture
  const flashOpacity = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  // Set border color based on state
  const setBorderForState = useCallback((state: ScanState) => {
    const value = state === 'idle' ? 0 : 
                  state === 'detecting' || state === 'analyzing' || state === 'pen_analyzing' ? 1 :
                  state === 'success' ? 2 : 3;
    
    Animated.timing(borderColorAnim, {
      toValue: value,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [borderColorAnim]);

  // Play haptic feedback
  const playHaptic = useCallback(async (type: 'success' | 'error' | 'light') => {
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Flash green on success
  const flashSuccess = useCallback(() => {
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
  }, [flashAnim]);

  // Check if bottle already scanned (deduplication)
  const isDuplicate = useCallback((name: string): boolean => {
    const normalized = name.toLowerCase().trim();
    if (dedupeSetRef.current.has(normalized)) {
      return true;
    }
    dedupeSetRef.current.add(normalized);
    return false;
  }, []);

  // Main scanning loop
  useEffect(() => {
    if (!isScanning) return;

    const scanInterval = setInterval(async () => {
      if (scanState !== 'idle' && scanState !== 'detecting') return;
      
      await performScan();
    }, 1500); // Scan every 1.5 seconds

    return () => clearInterval(scanInterval);
  }, [isScanning, scanState]);

  const performScan = async () => {
    if (!cameraRef.current) return;

    setScanState('detecting');
    setBorderForState('detecting');
    setCurrentTag('Scanning...');

    try {
      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (!photo?.uri) {
        setScanState('idle');
        setBorderForState('idle');
        setCurrentTag('Point at bottle');
        return;
      }

      setScanState('analyzing');

      // First pass - analyze bottle
      const result = await analyzeBottleImage(photo.uri);

      if (!result) {
        setScanState('idle');
        setBorderForState('idle');
        setCurrentTag('Point at bottle');
        return;
      }

      // Check for duplicates
      if (isDuplicate(result.name)) {
        setScanState('success');
        setBorderForState('success');
        setCurrentTag(`${result.name} — ${Math.round(result.liquidLevel * 100)}% ✓${scannedBottles.length}`);
        flashSuccess();
        playHaptic('light');
        
        setTimeout(() => {
          setScanState('idle');
          setBorderForState('idle');
          setCurrentTag('Point at bottle');
        }, 1500);
        return;
      }

      // Check if level is readable
      if (result.levelReadable === false || result.confidence < 0.6) {
        // Need pen fallback
        setScanState('needs_pen');
        setBorderForState('needs_pen');
        setCurrentTag('Hold pen at line ✏️');
        playHaptic('error');
        
        // Wait for pen detection (simplified - in real app would do second scan)
        scanTimeoutRef.current = setTimeout(async () => {
          if (scanState === 'needs_pen') {
            setScanState('pen_analyzing');
            setCurrentTag('Reading pen...');
            
            // Second pass with pen
            const penResult = await analyzeBottleImage(photo.uri, true);
            
            if (penResult) {
              const newBottle: ScannedBottle = {
                id: `bottle_${Date.now()}`,
                name: result.name,
                brand: result.brand,
                category: result.category,
                level: penResult.liquidLevel,
                timestamp: Date.now(),
                imageUri: photo.uri,
                usedPen: true,
              };

              setScannedBottles(prev => [...prev, newBottle]);
              setLastScannedName(result.name);
              setScanState('success');
              setBorderForState('success');
              setCurrentTag(`${result.name} — ${Math.round(penResult.liquidLevel * 100)}% ✓${scannedBottles.length + 1}`);
              flashSuccess();
              playHaptic('success');
              
              setTimeout(() => {
                setScanState('idle');
                setBorderForState('idle');
                setCurrentTag('Point at bottle');
              }, 2000);
            }
          }
        }, 2000);
        
        return;
      }

      // Success with direct reading
      const newBottle: ScannedBottle = {
        id: `bottle_${Date.now()}`,
        name: result.name,
        brand: result.brand,
        category: result.category,
        level: result.liquidLevel,
        timestamp: Date.now(),
        imageUri: photo.uri,
        usedPen: false,
      };

      setScannedBottles(prev => [...prev, newBottle]);
      setLastScannedName(result.name);
      setScanState('success');
      setBorderForState('success');
      setCurrentTag(`${result.name} — ${Math.round(result.liquidLevel * 100)}% ✓${scannedBottles.length + 1}`);
      flashSuccess();
      playHaptic('success');
      
      setTimeout(() => {
        setScanState('idle');
        setBorderForState('idle');
        setCurrentTag('Point at bottle');
      }, 2000);

    } catch (error) {
      console.error('Scan error:', error);
      setScanState('idle');
      setBorderForState('idle');
      setCurrentTag('Point at bottle');
    }
  };

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
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    onReview(scannedBottles);
  };

  // Get tag color based on state
  const getTagColor = () => {
    switch (scanState) {
      case 'success': return COLORS.success;
      case 'needs_pen': return COLORS.error;
      case 'detecting':
      case 'analyzing':
      case 'pen_analyzing': return COLORS.accentPrimary;
      default: return COLORS.textTertiary;
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
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
            {/* Animated Border */}
            <Animated.View 
              style={[
                styles.borderOverlay,
                { borderColor: borderColor }
              ]} 
            />
            
            {/* Success Flash */}
            <Animated.View 
              style={[
                styles.flashOverlay,
                { opacity: flashOpacity }
              ]} 
            />
            
            {/* Center Zone Guide */}
            <View style={styles.centerZone}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
          </CameraView>
        ) : (
          <View style={styles.startScreen}>
            <View style={styles.startContent}>
              <Text style={styles.startTitle}>Center-Zone Scanning</Text>
              <Text style={styles.startDesc}>
                Hold phone vertical. Point at one bottle at a time. AI auto-detects and captures.
              </Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>• Center bottle in frame</Text>
                <Text style={styles.featureItem}>• Auto-captures when detected</Text>
                <Text style={styles.featureItem}>• Pen fallback for dark bottles</Text>
              </View>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartScan}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start Scanning</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Bar */}
      {isScanning && (
        <View style={styles.bottomBar}>
          <View style={styles.tagContainer}>
            <Text style={[styles.tagText, { color: getTagColor() }]}>
              {currentTag}
            </Text>
            {scanState === 'success' && (
              <Check size={16} color={COLORS.success} style={styles.tagIcon} />
            )}
          </View>
          
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Done</Text>
            <Text style={styles.doneButtonCount}>({scannedBottles.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 6,
    margin: 0,
    zIndex: 10,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.success,
    zIndex: 20,
  },
  centerZone: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    right: '20%',
    bottom: '30%',
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
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
    borderTopColor: `${COLORS.border}50`,
  },
  tagContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    letterSpacing: LETTER_SPACING,
  },
  tagIcon: {
    marginLeft: SPACING.sm,
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
