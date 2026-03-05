import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Modal } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { X, Camera, Check } from 'lucide-react-native';
import { CATEGORIES } from '../constants';

interface Props {
  onClose: () => void;
  onAdd: (bottle: any) => void;
}

export default function ManualAdd({ onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Spirits');

  const handleSubmit = () => {
    if (!name.trim() || !brand.trim()) return;
    onAdd({ name, brand, category });
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Product</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Photo Upload */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoButton}>
              <Camera size={32} color={COLORS.textTertiary} />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Product Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Product Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grey Goose Vodka"
                placeholderTextColor={COLORS.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Brand */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Brand</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bacardi"
                placeholderTextColor={COLORS.textTertiary}
                value={brand}
                onChangeText={setBrand}
              />
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: category === cat ? COLORS.accentPrimary : COLORS.surface,
                        borderColor: category === cat ? COLORS.accentPrimary : COLORS.border,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { color: category === cat ? '#FFFFFF' : COLORS.textSecondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Barcode Scanner */}
            <TouchableOpacity style={styles.barcodeButton}>
              <Text style={styles.barcodeButtonText}>Scan Barcode Instead</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: COLORS.accentPrimary },
              (!name.trim() || !brand.trim()) && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || !brand.trim()}
          >
            <Text style={styles.buttonText}>Add to Inventory</Text>
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
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
    paddingVertical: SPACING.xl,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: SPACING['2xl'],
  },
  photoButton: {
    width: 128,
    height: 128,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  photoButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  formContainer: {
    gap: SPACING.xl,
    marginBottom: SPACING['2xl'],
  },
  fieldGroup: {
    gap: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    paddingLeft: SPACING.md,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  categoryButton: {
    flex: 1,
    minWidth: '48%',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  barcodeButton: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
