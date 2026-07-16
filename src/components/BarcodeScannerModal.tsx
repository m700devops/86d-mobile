import React, { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

// Shared full-screen barcode scanner used both from the live camera screen
// and from Manual Add — one place to get scan debouncing / permissions right.
export default function BarcodeScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScannedRef = useRef(false);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScanned(result.data);
  };

  const handleShow = () => {
    hasScannedRef.current = false;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={handleShow}>
      <SafeAreaView style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              {permission === null ? 'Checking camera access…' : 'Camera access is needed to scan barcodes.'}
            </Text>
            {permission && !permission.granted && (
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
                <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.frame} pointerEvents="none">
          <View style={styles.frameBox} />
          <Text style={styles.frameHint}>Point at the barcode</Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <X size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.base,
    letterSpacing: LETTER_SPACING,
  },
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  frameBox: {
    width: '75%',
    height: 140,
    borderWidth: 2,
    borderColor: COLORS.accentPrimary,
    borderRadius: 16,
  },
  frameHint: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    letterSpacing: LETTER_SPACING,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
