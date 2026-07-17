import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Check, ChevronLeft, ChevronDown, Zap, Camera, Delete, Barcode, Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiService } from '../services/api';
import { scanDiagnostics, ScanLogEntry } from '../utils/diagnostics';
import { persistScanPhoto, deleteScanPhoto } from '../utils/scanPhotos';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Bottle } from '../types';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

// --- Types ---

type ScanState = 'idle' | 'capturing' | 'success';
type IdentifyStatus = 'pending' | 'ok' | 'failed';
type ScanApiResult = NonNullable<Awaited<ReturnType<typeof apiService.analyzeBottleImage>>>;

interface Props {
  onReview: () => void;
  onBack?: () => void;
}

// --- Constants ---

const SUCCESS_DISPLAY_MS = 1200;
const CAPTURE_WATCHDOG_MS = 25000;       // fail a stuck scan after 25s (backend scan cap is 20s)
const IDLE_STATUS = 'Point at bottle';
const STOCK_MAX = 999.99;

function clampStock(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(STOCK_MAX, Math.max(0, Math.round(value * 100) / 100));
}

// 2.5 → "2.5", 3 → "3" — no trailing .00 on whole numbers
function formatStock(value: number): string {
  return String(Math.round(value * 100) / 100);
}

const KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

// --- Component ---

export default function CameraScan({ onReview, onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const { bottles, addBottle, updateBottle, removeBottle, resolveScan, markScanFailed } = useInventory();
  const { logout, refreshUser } = useAuth();

  const [showStartScreen, setShowStartScreen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [bottleCount, setBottleCount] = useState(0);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusText, setStatusText] = useState(IDLE_STATUS);
  const [lastBottleId, setLastBottleId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Stock number pad state
  const [padVisible, setPadVisible] = useState(false);
  const [stockInput, setStockInput] = useState('');
  const [identifyStatus, setIdentifyStatus] = useState<IdentifyStatus>('pending');
  const [identifiedLabel, setIdentifiedLabel] = useState<string | null>(null);
  const [failMessage, setFailMessage] = useState<string | null>(null);
  // Set when the scanned product is already in this session — commit updates
  // that row's count instead of adding a duplicate
  const [existingBottle, setExistingBottle] = useState<Bottle | null>(null);

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  // "Did I already scan that?" — a quick searchable look at everything
  // scanned this session, without ever leaving the camera. Matters most on
  // a big count (100+ bottles), where that doubt comes up constantly and a
  // full trip to Review is real friction mid-flow.
  const [showScannedList, setShowScannedList] = useState(false);
  const [scannedListQuery, setScannedListQuery] = useState('');
  // A barcode miss has no photo to retake — the fallback action is to try
  // the normal camera scan instead, so the pad button needs different copy.
  const [failedViaBarcode, setFailedViaBarcode] = useState(false);

  // Border: 0 = orange (scanning), 1 = green (success)
  const [borderColorAnim] = useState(new Animated.Value(0));
  const [flashAnim] = useState(new Animated.Value(0));

  const cameraRef = useRef<CameraView>(null);
  const isCapturingRef = useRef(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorAlertCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const [catalogToast, setCatalogToast] = useState<string | null>(null);
  const catalogToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Per-scan token: pad-cancel bumps this so a stale result can't touch the pad
  const scanSeq = useRef(0);
  // Fire-and-forget: scan token → row id saved before identification landed.
  // The in-flight continuation resolves that row instead of the pad UI.
  const pendingCommits = useRef<Map<number, string>>(new Map());
  const identifyStatusRef = useRef<IdentifyStatus | 'idle'>('idle');
  const scanResultRef = useRef<ScanApiResult | null>(null);
  const photoUriRef = useRef<string | null>(null);

  const isPausedRef = useRef(false);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

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

  const flashGreen = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [flashAnim]);

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
    // Warm the backend's AI connection now so the first scan isn't slow
    apiService.warmScanPath();
    resetToIdle();
    setIsScanning(true);
  }

  function resetToIdle() {
    isCapturingRef.current = false;
    identifyStatusRef.current = 'idle';
    setScanState('idle');
    setBorderValue(0);
    setStatusText(IDLE_STATUS);
  }

  // --- Capture & analyze ---

  const failScan = useCallback((token: number, message: string) => {
    if (token !== scanSeq.current) return;
    identifyStatusRef.current = 'failed';
    setIdentifyStatus('failed');
    setFailMessage(message);
  }, []);

  const triggerCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    if (isCapturingRef.current || isPausedRef.current) return;

    const token = ++scanSeq.current;
    const startTime = Date.now();
    let imageSizeKb = 0;

    isCapturingRef.current = true;
    scanResultRef.current = null;
    identifyStatusRef.current = 'pending';
    setScanState('capturing');
    setStatusText('Scanning...');
    setLastBottleId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Per-scan watchdog: if the API call hangs, fail this scan — the saved row
    // if the user already moved on, otherwise the pad UI. Late firings are
    // no-ops (guards below), so it never needs explicit clearing.
    setTimeout(() => {
      const committedRowId = pendingCommits.current.get(token);
      if (committedRowId !== undefined) {
        pendingCommits.current.delete(token);
        markScanFailed(committedRowId);
        return;
      }
      if (token === scanSeq.current && identifyStatusRef.current === 'pending') {
        failScan(token, 'Scan timed out — try again');
      }
    }, CAPTURE_WATCHDOG_MS);

    try {
      // skipProcessing + low quality = fast shutter; we resize/compress below anyway
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        skipProcessing: true,
      });

      if (token !== scanSeq.current) return;
      if (!photo?.uri) {
        resetToIdle();
        return;
      }
      photoUriRef.current = photo.uri;
      // Camera captures land in the OS cache dir, which iOS can evict under
      // memory pressure — copy to durable storage in the background so a
      // later retry (this session or after a relaunch) can still find it.
      // Non-blocking: if the user hits "Add" before this lands, the
      // fire-and-forget path below just gets the ephemeral URI instead —
      // same behavior as before this existed, not a regression.
      persistScanPhoto(photo.uri).then(persisted => { photoUriRef.current = persisted; }).catch(() => {});

      // Open the number pad immediately — the user types their back-up count
      // while the AI identifies the bottle in the background.
      setStockInput('');
      setIdentifyStatus('pending');
      setIdentifiedLabel(null);
      setFailMessage(null);
      setExistingBottle(null);
      setFailedViaBarcode(false);
      setPadVisible(true);

      // Downscale before upload — full-res photos are several MB of base64,
      // which blows past the backend's scan timeout on slow connections.
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // From here on the user may have saved the row and moved to the next
      // bottle (fire-and-forget) — check the committed map before the pad UI.
      if (token !== scanSeq.current && !pendingCommits.current.has(token)) return;
      if (!resized.base64) {
        const committedRowId = pendingCommits.current.get(token);
        if (committedRowId !== undefined) {
          pendingCommits.current.delete(token);
          markScanFailed(committedRowId);
        } else {
          failScan(token, 'Capture failed — try again');
        }
        return;
      }

      imageSizeKb = Math.round((resized.base64.length * 0.75) / 1024);

      const result = await apiService.analyzeBottleImage(resized.base64);

      const scanOk = result != null && !!result.matched_product_id;
      await scanDiagnostics.logScan({
        timestamp: new Date().toISOString(),
        success: scanOk,
        errorType: scanOk ? null : 'parse_error',
        errorMessage: scanOk ? null
          : result == null ? 'API returned null — no bottle detected'
          : 'No product match — confidence too low',
        httpStatus: 200,
        responseTimeMs: Date.now() - startTime,
        imageSizeKb,
      });

      // Auto-created: briefly surface so bad auto-creates are visible during testing
      if (scanOk && result.is_new_product) {
        const label = [result.brand, result.name].filter(Boolean).join(' ');
        setCatalogToast(`Adding to catalog: ${label}`);
        if (catalogToastTimerRef.current) clearTimeout(catalogToastTimerRef.current);
        catalogToastTimerRef.current = setTimeout(() => setCatalogToast(null), 1500);
      }

      // Fire-and-forget: the row was saved before identification finished —
      // fill it in (or flag it) and leave the pad/scanner UI alone.
      const committedRowId = pendingCommits.current.get(token);
      if (committedRowId !== undefined) {
        pendingCommits.current.delete(token);
        if (scanOk) {
          resolveScan(committedRowId, {
            productId: result.matched_product_id ?? undefined,
            name: result.name,
            brand: result.brand,
            category: result.category,
          });
        } else {
          markScanFailed(committedRowId);
        }
        return;
      }

      if (token !== scanSeq.current) return;

      if (result == null) {
        failScan(token, 'No bottle detected — try again');
        return;
      }
      // Low-confidence: no exact match, confidence too low for auto-create
      if (!result.matched_product_id) {
        failScan(token, "Couldn't recognize — add it manually");
        return;
      }

      // Same product already scanned this session? Update its row, don't duplicate
      const existing = bottles.find(b =>
        b.scanStatus === undefined &&
        ((result.matched_product_id && b.productId === result.matched_product_id) ||
          (b.name.toLowerCase() === result.name.toLowerCase() &&
           b.brand.toLowerCase() === result.brand.toLowerCase()))
      );
      setExistingBottle(existing ?? null);

      scanResultRef.current = result;
      identifyStatusRef.current = 'ok';
      setIdentifiedLabel([result.brand, result.name].filter(Boolean).join(' — '));
      setIdentifyStatus('ok');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

      const committedRowId = pendingCommits.current.get(token);

      // Trial ended / no active subscription — refresh the cached user so
      // App.tsx's entitlement check swaps in the paywall, rather than
      // surfacing this as a generic "scan failed" error.
      if (httpStatus === 402) {
        if (committedRowId !== undefined) {
          pendingCommits.current.delete(token);
          markScanFailed(committedRowId);
        }
        setPadVisible(false);
        refreshUser();
        return;
      }

      if (errorType === 'auth_error') {
        if (committedRowId !== undefined) {
          pendingCommits.current.delete(token);
          markScanFailed(committedRowId);
        }
        setPadVisible(false);
        setIsScanning(false);
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      // Fire-and-forget: flag the saved row so it can be retried from Review.
      // Network/timeout failures also auto-retry once connectivity returns.
      if (committedRowId !== undefined) {
        pendingCommits.current.delete(token);
        markScanFailed(committedRowId, errorType === 'network' || errorType === 'timeout' ? 'network' : 'other');
        return;
      }

      if (token !== scanSeq.current) return;

      failScan(token,
        errorType === 'timeout' ? 'Scan timed out — try again'
        : errorType === 'network' ? 'No connection — check your network'
        : 'Scan failed — try again');
    }
  }, [failScan, logout, setBorderValue, bottles, resolveScan, markScanFailed]);

  // --- Number pad: commit / fail / cancel ---

  const closePadWithFail = useCallback(() => {
    // Not-yet-committed failure — no bottle row exists for this attempt, so
    // nothing will ever reference this photo. (A fire-and-forget row that's
    // already saved keeps its own imageUrl and isn't touched by this.)
    deleteScanPhoto(photoUriRef.current);
    scanSeq.current++;
    const message = failMessage ?? 'Scan failed — try again';
    setPadVisible(false);
    isCapturingRef.current = false;
    identifyStatusRef.current = 'idle';
    setScanState('idle');
    setBorderValue(0);
    setStatusText(message);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setStatusText(IDLE_STATUS), 2500);
  }, [failMessage, setBorderValue]);

  const commitBottle = useCallback(() => {
    const result = scanResultRef.current;
    if (!result) {
      closePadWithFail();
      return;
    }
    const stock = clampStock(parseFloat(stockInput === '' || stockInput === '.' ? '0' : stockInput));
    const label = [result.brand, result.name].filter(Boolean).join(', ');

    // Identified synchronously (before the user hit Add) — this row will
    // never need a retry, so there's nothing worth keeping the photo for.
    deleteScanPhoto(photoUriRef.current);

    if (existingBottle) {
      // Re-scan of a product already in the session — replace its count
      updateBottle(existingBottle.id, { currentStock: stock });
      setLastBottleId(null);   // no undo for count updates
      setStatusText(`${label} — updated to ${formatStock(stock)}`);
    } else {
      const newBottle: Bottle = {
        id: `bottle_${Date.now()}`,   // always unique — productId tracks the catalog match
        productId: result.matched_product_id ?? undefined,
        name: result.name,
        brand: result.brand,
        category: result.category,
        size: '',
        currentLevel: 1,
        parLevel: 1,
        currentStock: stock,       // typed on the pad — total back-up bottles
        distributorId: (result as any).distributorId,
      };
      addBottle(newBottle);
      setLastBottleId(newBottle.id);
      setBottleCount(prev => prev + 1);
      setStatusText(label);
    }

    setPadVisible(false);
    setScanState('success');
    setBorderValue(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    flashGreen();

    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      resetToIdle();
    }, SUCCESS_DISPLAY_MS);
  }, [stockInput, existingBottle, addBottle, updateBottle, setBorderValue, flashGreen, closePadWithFail]);

  const handlePadAdd = useCallback(() => {
    if (identifyStatus === 'ok') {
      commitBottle();
      return;
    }
    if (identifyStatus === 'failed') {
      closePadWithFail();
      return;
    }

    // Fire-and-forget: save the row NOW with the typed count and move on —
    // the in-flight identification fills in the name when it lands.
    const token = scanSeq.current;
    const stock = clampStock(parseFloat(stockInput === '' || stockInput === '.' ? '0' : stockInput));
    const newBottle: Bottle = {
      id: `bottle_${Date.now()}`,
      name: 'Identifying…',
      brand: '',
      category: 'other',
      size: '',
      currentLevel: 1,
      parLevel: 1,
      currentStock: stock,
      imageUrl: photoUriRef.current ?? undefined,
      scanStatus: 'pending',
    };
    addBottle(newBottle);
    pendingCommits.current.set(token, newBottle.id);
    setLastBottleId(newBottle.id);
    setBottleCount(prev => prev + 1);

    setPadVisible(false);
    setScanState('success');
    setBorderValue(1);
    setStatusText('Saved — identifying in background');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    flashGreen();

    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      resetToIdle();
    }, SUCCESS_DISPLAY_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifyStatus, commitBottle, closePadWithFail, stockInput, addBottle, setBorderValue, flashGreen]);

  const handlePadCancel = useCallback(() => {
    // No bottle row was ever created for this attempt (fire-and-forget
    // commits happen in handlePadAdd, not here), so the photo is orphaned.
    deleteScanPhoto(photoUriRef.current);
    scanSeq.current++;   // invalidate the in-flight scan
    setPadVisible(false);
    resetToIdle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-tap retake — for a failed scan (glare, bad angle) or a synchronously
  // "ok" result that just got the wrong bottle. Discards the current photo
  // and result, then immediately re-opens the shutter instead of making the
  // user close the pad and find the capture button themselves.
  const handleRetakePhoto = useCallback(() => {
    deleteScanPhoto(photoUriRef.current);
    scanSeq.current++;   // invalidate the in-flight/finished scan
    setPadVisible(false);
    resetToIdle();
    setTimeout(() => { triggerCapture(); }, 350);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCapture]);

  // Barcode path: skip the AI vision call entirely and look the UPC straight
  // up in the catalog. No photo is involved, so there's nothing to retry —
  // a miss just tells the user to add it via Manual Add (which registers
  // the barcode for next time).
  const handleBarcodeScanned = useCallback(async (code: string) => {
    setShowBarcodeScanner(false);
    const token = ++scanSeq.current;
    photoUriRef.current = null;
    scanResultRef.current = null;
    setStockInput('');
    setIdentifyStatus('pending');
    setIdentifiedLabel(null);
    setFailMessage(null);
    setExistingBottle(null);
    setFailedViaBarcode(false);
    setPadVisible(true);

    try {
      const product = await apiService.getProductByBarcode(code);

      // The user may have already hit "Add Bottle" while this was in flight
      // (fire-and-forget) — fill in that saved row instead of the pad UI.
      const committedRowId = pendingCommits.current.get(token);
      if (committedRowId !== undefined) {
        pendingCommits.current.delete(token);
        if (product) {
          resolveScan(committedRowId, {
            productId: product.id,
            name: product.name,
            brand: product.brand ?? '',
            category: product.category,
          });
        } else {
          markScanFailed(committedRowId, 'other');
        }
        return;
      }

      if (token !== scanSeq.current) return;

      if (!product) {
        setFailedViaBarcode(true);
        failScan(token, "Not in catalog — add it via Add Manual in Review");
        return;
      }

      const result: ScanApiResult = {
        name: product.name,
        brand: product.brand ?? '',
        category: product.category,
        liquidLevel: 1,
        confidence: 1,
        matched_product_id: product.id,
        is_new_product: false,
      };

      const existing = bottles.find(b =>
        b.scanStatus === undefined && b.productId === product.id
      );
      setExistingBottle(existing ?? null);

      scanResultRef.current = result;
      identifyStatusRef.current = 'ok';
      setIdentifiedLabel([result.brand, result.name].filter(Boolean).join(' — '));
      setIdentifyStatus('ok');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      const committedRowId = pendingCommits.current.get(token);
      if (committedRowId !== undefined) {
        pendingCommits.current.delete(token);
        markScanFailed(committedRowId, 'other');
        return;
      }
      if (token !== scanSeq.current) return;
      setFailedViaBarcode(true);
      failScan(token, 'Barcode lookup failed — check your connection');
    }
  }, [bottles, failScan, resolveScan, markScanFailed]);

  const handleKeyPress = useCallback((key: string) => {
    Haptics.selectionAsync();
    setStockInput(prev => {
      if (key === 'back') return prev.slice(0, -1);
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev === '' ? '0.' : prev + '.';
      }
      const next = prev + key;
      if (!/^\d{0,3}(\.\d{0,2})?$/.test(next)) return prev;
      if (parseFloat(next) > STOCK_MAX) return prev;
      return next;
    });
  }, []);

  // --- Cleanup on unmount ---

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (errorAlertCooldownRef.current) clearTimeout(errorAlertCooldownRef.current);
      if (catalogToastTimerRef.current) clearTimeout(catalogToastTimerRef.current);
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

  // Undo: remove last bottle and reset back to idle. Doesn't touch scanSeq —
  // other in-flight identifications must keep resolving. If the undone row's
  // scan is still in flight, resolveScan finds no row and no-ops.
  const handleUndo = useCallback(() => {
    if (!lastBottleId) return;
    removeBottle(lastBottleId);
    setLastBottleId(null);
    setBottleCount(prev => Math.max(0, prev - 1));
    resetToIdle();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBottleId, removeBottle]);

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
              Point, tap, type a count. AI identifies each bottle instantly.
            </Text>

            <View style={styles.startTips}>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Point camera at the bottle label</Text>
              </View>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Tap the shutter — AI identifies the bottle</Text>
              </View>
              <View style={styles.startTip}>
                <View style={styles.startTipDot} />
                <Text style={styles.startTipText}>Type your total stock count on the number pad</Text>
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

  const isCapturing = scanState === 'capturing';

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
        <TouchableOpacity
          style={styles.counterButton}
          onPress={() => bottleCount > 0 && setShowScannedList(true)}
          disabled={bottleCount === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.counterText, isCapturing && styles.counterTextActive]} numberOfLines={1}>
            {isPaused ? 'Paused'
              : isCapturing ? 'Scanning'
              : bottleCount > 0
                ? `${bottleCount} bottle${bottleCount === 1 ? '' : 's'} scanned`
                : 'Scanning'}
          </Text>
          {bottleCount > 0 && <ChevronDown size={14} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.barcodeToggleButton}
          onPress={() => setShowBarcodeScanner(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Barcode size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
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
            {isCapturing && (
              <View style={styles.statusHint}>
                <Text style={[styles.statusHintText, styles.statusHintTextActive]}>Scanning...</Text>
              </View>
            )}
            {scanState === 'idle' && (
              <View style={styles.statusHint}>
                <Text style={styles.statusHintText}>Point at bottle · tap shutter</Text>
              </View>
            )}

            {/* Catalog auto-create toast */}
            {catalogToast ? (
              <View style={styles.catalogToast}>
                <Text style={styles.catalogToastText}>{catalogToast}</Text>
              </View>
            ) : null}

            {/* Success badge */}
            {scanState === 'success' && (
              <View style={styles.successBadge}>
                <Check size={16} color={COLORS.primaryDark} />
                <Text style={styles.successBadgeText}>{statusText}</Text>
              </View>
            )}

            {/* Shutter button */}
            {scanState !== 'success' && !padVisible && (
              <TouchableOpacity
                style={[styles.shutterButton, (isCapturing || isPaused) && styles.shutterButtonDisabled]}
                onPress={triggerCapture}
                disabled={isCapturing || isPaused}
                activeOpacity={0.7}
              >
                <View style={styles.shutterInner}>
                  <Text style={styles.shutterText}>SCAN</Text>
                </View>
              </TouchableOpacity>
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
          <View style={styles.bottomContent}>
            <View style={styles.instructionBlock}>
              <Text style={[
                styles.instructionPrimary,
                (scanState === 'success' || isCapturing) && { color: COLORS.success },
              ]}>
                {statusText}
              </Text>
              <Text style={styles.instructionSub}>
                {scanState === 'success'
                  ? 'Move to next bottle'
                  : isCapturing
                    ? 'Identifying bottle...'
                    : 'Tap the shutter to scan'}
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

      {/* Stock count number pad — half-screen sheet, camera stays visible behind */}
      <Modal
        visible={padVisible}
        transparent
        animationType="slide"
        onRequestClose={handlePadCancel}
      >
        <View style={styles.padOverlay}>
          <View style={styles.padSheet}>
            <View style={styles.padHandle} />

            {/* Identification status */}
            <View style={styles.padStatusRow}>
              {identifyStatus === 'pending' && (
                <>
                  <ActivityIndicator size="small" color={COLORS.textTertiary} />
                  <Text style={styles.padStatusPending}>Identifying bottle...</Text>
                </>
              )}
              {identifyStatus === 'ok' && (
                <>
                  <Check size={16} color={COLORS.success} />
                  <Text style={styles.padStatusOk} numberOfLines={1}>{identifiedLabel}</Text>
                </>
              )}
              {identifyStatus === 'failed' && (
                <Text style={styles.padStatusFailed}>{failMessage}</Text>
              )}
            </View>

            {/* Synchronous "ok" result can still be the wrong bottle (glare,
                similar label) — offer a one-tap way out before it's committed. */}
            {identifyStatus === 'ok' && (
              <TouchableOpacity onPress={handleRetakePhoto} activeOpacity={0.7} hitSlop={8} style={styles.padRetakeRow}>
                <Text style={styles.padRetakeLink}>Wrong bottle? Retake photo</Text>
              </TouchableOpacity>
            )}

            {/* While the AI works, tell new users to keep going — the scan runs itself */}
            {identifyStatus === 'pending' && (
              <Text style={styles.padHintNote}>
                Still identifying — add your count and keep scanning.
              </Text>
            )}

            {/* Duplicate scan — updating the existing row, not adding a new one */}
            {identifyStatus === 'ok' && existingBottle && (
              <Text style={styles.padDuplicateNote}>
                Already scanned — {formatStock(existingBottle.currentStock ?? 0)} in stock. Enter your new total.
              </Text>
            )}

            {/* Typed value */}
            <View style={styles.padValueRow}>
              <Text style={styles.padValue}>{stockInput === '' ? '0' : stockInput}</Text>
              <Text style={styles.padValueLabel}>CURRENT STOCK</Text>
            </View>

            {/* Keypad */}
            <View style={styles.keypad}>
              {KEYPAD_ROWS.map((row, i) => (
                <View key={i} style={styles.keypadRow}>
                  {row.map(key => (
                    <TouchableOpacity
                      key={key}
                      style={styles.keypadKey}
                      onPress={() => handleKeyPress(key)}
                      activeOpacity={0.6}
                    >
                      {key === 'back'
                        ? <Delete size={22} color={COLORS.textPrimary} />
                        : <Text style={styles.keypadKeyText}>{key}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.padActions}>
              <TouchableOpacity
                style={styles.padCancelButton}
                onPress={handlePadCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.padCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.padAddButton,
                  stockInput === '' && identifyStatus !== 'failed' && styles.padAddButtonDisabled,
                ]}
                onPress={identifyStatus === 'failed' ? handleRetakePhoto : handlePadAdd}
                disabled={stockInput === '' && identifyStatus !== 'failed'}
                activeOpacity={0.8}
              >
                <Text style={styles.padAddText}>
                  {identifyStatus === 'failed' ? (failedViaBarcode ? 'Try Camera Scan' : 'Retake Photo')
                    : existingBottle ? 'Update Count'
                    : 'Add Bottle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanned={handleBarcodeScanned}
      />

      {/* "Did I already scan that?" — searchable, read-only, dismisses
          straight back to the camera. No navigation away from scanning. */}
      <Modal
        visible={showScannedList}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowScannedList(false); setScannedListQuery(''); }}
      >
        <View style={styles.scannedListOverlay}>
          <View style={styles.scannedListSheet}>
            <View style={styles.scannedListHandle} />
            <View style={styles.scannedListHeader}>
              <Text style={styles.scannedListTitle}>Scanned So Far ({bottleCount})</Text>
              <TouchableOpacity
                onPress={() => { setShowScannedList(false); setScannedListQuery(''); }}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.scannedListSearchRow}>
              <Search size={16} color={COLORS.textTertiary} />
              <TextInput
                style={styles.scannedListSearchInput}
                placeholder="Search what you've scanned…"
                placeholderTextColor={COLORS.textTertiary}
                value={scannedListQuery}
                onChangeText={setScannedListQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {scannedListQuery.length > 0 && (
                <TouchableOpacity onPress={() => setScannedListQuery('')} hitSlop={8}>
                  <X size={16} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={bottles.filter(b => {
                const q = scannedListQuery.trim().toLowerCase();
                if (!q) return true;
                return b.name.toLowerCase().includes(q) || b.brand.toLowerCase().includes(q);
              })}
              keyExtractor={b => b.id}
              style={styles.scannedListItems}
              contentContainerStyle={{ paddingBottom: SPACING.xl }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.scannedListEmpty}>
                  {scannedListQuery ? 'No match' : 'Nothing scanned yet'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.scannedListRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scannedListRowName} numberOfLines={1}>
                      {item.brand || item.name}
                    </Text>
                    {!!item.brand && (
                      <Text style={styles.scannedListRowSub} numberOfLines={1}>{item.name}</Text>
                    )}
                  </View>
                  {item.scanStatus === 'pending' ? (
                    <ActivityIndicator size="small" color={COLORS.textTertiary} />
                  ) : item.scanStatus === 'failed' ? (
                    <Text style={styles.scannedListRowFailed}>Failed</Text>
                  ) : (
                    <Text style={styles.scannedListRowCount}>{formatStock(item.currentStock ?? 0)}</Text>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

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
  counterButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: LETTER_SPACING,
  },
  counterTextActive: {
    color: COLORS.success,
  },
  barcodeToggleButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
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
    top: '27%',
    left: '27%',
    right: '27%',
    bottom: '37%',
    zIndex: 5,
  },
  cornerTL: {
    position: 'absolute', top: 0, left: 0,
    width: 34, height: 34,
    borderLeftWidth: 3, borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: 34, height: 34,
    borderRightWidth: 3, borderTopWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerBL: {
    position: 'absolute', bottom: 0, left: 0,
    width: 34, height: 34,
    borderLeftWidth: 3, borderBottomWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerBR: {
    position: 'absolute', bottom: 0, right: 0,
    width: 34, height: 34,
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
  statusHintTextActive: {
    color: COLORS.success,
    fontWeight: FONT_WEIGHTS.bold,
  },
  catalogToast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 140, 60, 0.90)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 40,
  },
  catalogToastText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
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

  // --- Shutter ---

  shutterButton: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 25,
  },
  shutterButtonDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterText: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'AvenirNext-DemiBold', default: undefined }),
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primaryDark,
    letterSpacing: 1.5,
  },

  // --- Stock number pad ---

  padOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  padSheet: {
    backgroundColor: COLORS.primaryDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: `${COLORS.border}80`,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '55%',
  },
  padHandle: {
    width: 36,
    height: 4,
    backgroundColor: `${COLORS.border}80`,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  scannedListOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannedListSheet: {
    backgroundColor: COLORS.primaryDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: `${COLORS.border}80`,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    height: '70%',
  },
  scannedListHandle: {
    width: 36,
    height: 4,
    backgroundColor: `${COLORS.border}80`,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  scannedListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  scannedListTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  scannedListSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    height: 44,
    marginBottom: SPACING.md,
  },
  scannedListSearchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
  },
  scannedListItems: {
    flex: 1,
  },
  scannedListEmpty: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xl,
  },
  scannedListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}60`,
  },
  scannedListRowName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  scannedListRowSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  scannedListRowCount: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    fontFamily: 'monospace',
  },
  scannedListRowFailed: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
  },
  padStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 24,
    marginBottom: 2,
  },
  padStatusPending: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    letterSpacing: LETTER_SPACING,
  },
  padStatusOk: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
    letterSpacing: LETTER_SPACING,
    maxWidth: '85%',
  },
  padStatusFailed: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
    letterSpacing: LETTER_SPACING,
    textAlign: 'center',
  },
  padRetakeRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  padRetakeLink: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accentPrimary,
    letterSpacing: LETTER_SPACING,
    textDecorationLine: 'underline',
  },
  padDuplicateNote: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accentPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  padHintNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: 4,
  },
  padValueRow: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  padValue: {
    fontSize: 40,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  padValueLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
  },
  keypad: {
    gap: 8,
    marginBottom: SPACING.md,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keypadKey: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    backgroundColor: `${COLORS.surface}90`,
    borderWidth: 1,
    borderColor: `${COLORS.border}50`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  padActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  padCancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padCancelText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: LETTER_SPACING,
  },
  padAddButton: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padAddButtonDisabled: {
    opacity: 0.5,
  },
  padAddText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
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
    color: COLORS.textSecondary,
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
