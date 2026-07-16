import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Modal, Animated, Image, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { X, Camera, Check, Barcode } from 'lucide-react-native';
import { CATEGORIES } from '../constants';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/api';
import { Bottle, Product } from '../types';

interface Props {
  onClose: () => void;
  onAdd: (bottle: Bottle) => void;
  onScanBarcode?: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export default function ManualAdd({ onClose, onAdd, onScanBarcode }: Props) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Spirits');
  const [stock, setStock] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [matchedProductId, setMatchedProductId] = useState<string | undefined>(undefined);

  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    setIsVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onClose();
    });
  };

  // Catalog search-as-you-type — lets a user correct a misidentified bottle
  // (or just add one from memory) without typing every field from scratch.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const query = name.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const token = ++searchSeq.current;
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const result = await apiService.searchProducts(query, 6);
        if (token !== searchSeq.current) return; // stale response
        setSuggestions(result.products);
      } catch {
        if (token === searchSeq.current) setSuggestions([]);
      } finally {
        if (token === searchSeq.current) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [name]);

  const selectSuggestion = (product: Product) => {
    setName(product.name);
    setBrand(product.brand ?? '');
    if (product.category) setCategory(product.category);
    if (product.image_url) setSelectedImage(product.image_url);
    setMatchedProductId(product.id);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const stockValue = parseFloat(stock);
  const isStockValid = stock.trim() !== '' && !isNaN(stockValue) && stockValue >= 0;
  const canSubmit = !!name.trim() && !!brand.trim() && isStockValid;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const bottle: Bottle = {
      id: `bottle_${Date.now()}`,
      productId: matchedProductId,
      name: name.trim(),
      brand: brand.trim(),
      category,
      size: '',
      currentLevel: 1,
      parLevel: 1,
      currentStock: stockValue,
      imageUrl: selectedImage ?? undefined,
    };
    onAdd(bottle);
    handleClose();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal transparent visible={true} onRequestClose={handleClose} animationType="none">
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Product</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Photo Upload */}
            <View style={styles.photoSection}>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage} activeOpacity={0.8}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <>
                    <View style={styles.photoIconBox}>
                      <Camera size={32} color={COLORS.accentPrimary} />
                    </View>
                    <Text style={styles.photoButtonText}>ADD PHOTO</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Product Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PRODUCT NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Grey Goose Vodka"
                  placeholderTextColor={COLORS.textTertiary}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setMatchedProductId(undefined);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && (isSearching || suggestions.length > 0) && (
                  <View style={styles.suggestionsBox}>
                    {isSearching && suggestions.length === 0 ? (
                      <View style={styles.suggestionRow}>
                        <ActivityIndicator size="small" color={COLORS.accentPrimary} />
                        <Text style={styles.suggestionSubtext}>Searching catalog…</Text>
                      </View>
                    ) : (
                      suggestions.map(product => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.suggestionRow}
                          onPress={() => selectSuggestion(product)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggestionName}>{product.name}</Text>
                            <Text style={styles.suggestionSubtext}>
                              {[product.brand, product.category].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Brand */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>BRAND</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Bacardi"
                  placeholderTextColor={COLORS.textTertiary}
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>

              {/* Current Stock */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CURRENT STOCK</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Number of bottles"
                  placeholderTextColor={COLORS.textTertiary}
                  value={stock}
                  onChangeText={(text) => setStock(text.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonSelected,
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          category === cat && styles.categoryButtonTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Barcode Scanner */}
              {onScanBarcode && (
                <TouchableOpacity style={styles.barcodeButton} activeOpacity={0.8} onPress={onScanBarcode}>
                  <Barcode size={20} color={COLORS.textSecondary} />
                  <Text style={styles.barcodeButtonText}>Scan Barcode Instead</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                !canSubmit && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Add to Inventory</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  safeArea: {
    flex: 1,
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
    letterSpacing: LETTER_SPACING,
  },
  placeholder: {
    width: 48,
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
  photoIconBox: {
    width: 56,
    height: 56,
    backgroundColor: `${COLORS.accentPrimary}15`,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    resizeMode: 'cover',
  },
  formContainer: {
    gap: SPACING.xl,
    marginBottom: SPACING['2xl'],
  },
  fieldGroup: {
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    letterSpacing: LETTER_SPACING,
  },
  suggestionsBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  suggestionSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    height: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: `${COLORS.accentPrimary}10`,
    borderColor: COLORS.accentPrimary,
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: LETTER_SPACING,
  },
  categoryButtonTextSelected: {
    color: COLORS.accentPrimary,
  },
  barcodeButton: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  barcodeButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: LETTER_SPACING,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
});
