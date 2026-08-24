import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search, X, Trash2, DollarSign, Tag, Merge } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { usePricing, PriceableProduct } from '../context/PricingContext';
import { useInventory } from '../context/InventoryContext';
import { useLocation } from '../context/LocationContext';
import { apiService } from '../services/api';
import { Product } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

const displayName = (p: { brand?: string | null; name: string }) =>
  [p.brand, p.name].filter(Boolean).join(' ').trim() || p.name;

export default function PricingScreen() {
  const { entries, loading, priceFor, setPrice, clearPrice, mergeInto } = usePricing();
  const { bottles, repointProduct } = useInventory();
  const { currentLocation } = useLocation();

  const [query, setQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  const [editing, setEditing] = useState<PriceableProduct | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [saving, setSaving] = useState(false);

  // The duplicate being folded into an already-priced bottle, once the client
  // spots that the AI read the same label two different ways.
  const [merging, setMerging] = useState<PriceableProduct | null>(null);
  const [mergeBusyId, setMergeBusyId] = useState<string | null>(null);

  // Bottles counted in the current session that the price book has no answer
  // for. This is the whole reason pricing gets its own screen: instead of
  // hunting row by row while counting, everything missing a price collects
  // here in one list.
  const needsPrice = useMemo(() => {
    const seen = new Set<string>();
    const out: PriceableProduct[] = [];
    bottles.forEach(b => {
      if (!b.productId || b.scanStatus !== undefined) return;
      if (seen.has(b.productId)) return;
      if (priceFor(b.productId) !== undefined) return;
      seen.add(b.productId);
      out.push({ id: b.productId, name: b.name, brand: b.brand, size: b.size, category: b.category });
    });
    return out;
  }, [bottles, priceFor]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) return entries;
    return entries.filter(e => displayName(e).toLowerCase().includes(normalizedQuery));
  }, [entries, normalizedQuery]);

  // Catalog search only fills the gap the price book can't: products this bar
  // hasn't scanned yet but wants to price ahead of time.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (normalizedQuery.length < 2) {
      setCatalogResults([]);
      setIsSearching(false);
      return;
    }
    const token = ++searchSeq.current;
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const result = await apiService.searchProducts(query.trim(), 10);
        if (token !== searchSeq.current) return; // stale response
        setCatalogResults(result.products);
      } catch {
        if (token === searchSeq.current) setCatalogResults([]);
      } finally {
        if (token === searchSeq.current) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [normalizedQuery, query]);

  // Anything the price book or the needs-price list already covers is dropped
  // here so a product never shows up twice on one screen.
  const catalogSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    const known = new Set([...entries.map(e => e.productId), ...needsPrice.map(p => p.id)]);
    return catalogResults.filter(p => !known.has(p.id));
  }, [catalogResults, entries, needsPrice, normalizedQuery]);

  const openEditor = useCallback((product: PriceableProduct, existing?: number) => {
    setEditing(product);
    setPriceInput(existing !== undefined ? String(existing) : '');
  }, []);

  const closeEditor = () => {
    setEditing(null);
    setPriceInput('');
    setSaving(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    const value = parseFloat(priceInput.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(value) || value <= 0) {
      Alert.alert('Enter a price', 'Type what you pay for this bottle, e.g. 24.99.');
      return;
    }
    setSaving(true);
    try {
      await setPrice(editing, value);
      closeEditor();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'That price did not save. Check your connection and try again.');
    }
  };

  const handleMerge = (target: { productId: string; name: string; brand?: string | null }) => {
    if (!merging) return;
    const source = merging;
    Alert.alert(
      'Same bottle?',
      `"${displayName(source)}" will be folded into "${displayName(target)}" and use its price. ` +
        'Future scans of either name will land on the same bottle.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          onPress: async () => {
            setMergeBusyId(target.productId);
            try {
              await mergeInto(source.id, target.productId);
              // Rows already counted in this draft still point at the retired
              // product — repoint them so they price correctly on this order,
              // not just the next one.
              repointProduct(source.id, {
                productId: target.productId,
                name: target.name,
                brand: target.brand ?? '',
              });
              setMerging(null);
            } catch {
              Alert.alert(
                'Could not merge',
                'That merge did not save. Check your connection and try again.'
              );
            } finally {
              setMergeBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleClear = (productId: string, label: string) => {
    Alert.alert('Remove price?', `${label} will have no price on future orders.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          clearPrice(productId).catch(() =>
            Alert.alert('Could not remove', 'That change did not save. Check your connection and try again.')
          );
        },
      },
    ]);
  };

  if (!currentLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pricing</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Set up a bar in Settings before adding prices.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pricing</Text>
        <Text style={styles.headerSubtitle}>
          What you pay per bottle — set once, used on every order
        </Text>
      </View>

      <View style={styles.searchWrapper}>
        <Search size={16} color={COLORS.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your bottles"
          placeholderTextColor={COLORS.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
            <X size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {needsPrice.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEEDS A PRICE</Text>
            <Text style={styles.sectionHint}>Counted this session, no price yet</Text>
            {needsPrice.map(product => (
              <TouchableOpacity
                key={product.id}
                style={[styles.row, styles.rowUnpriced]}
                onPress={() => openEditor(product)}
                activeOpacity={0.8}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowBadge, styles.rowBadgeUnpriced]}>
                    <Tag size={14} color={COLORS.accentSecondary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{displayName(product)}</Text>
                    {product.size ? <Text style={styles.rowMeta}>{product.size}</Text> : null}
                  </View>
                </View>
                <View style={styles.rowRight}>
                  {entries.length > 0 && (
                    <TouchableOpacity
                      onPress={e => {
                        e.stopPropagation();
                        setMerging(product);
                      }}
                      hitSlop={8}
                      style={styles.mergeButton}
                    >
                      <Merge size={15} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.addPriceText}>Add price</Text>
                </View>
              </TouchableOpacity>
            ))}
            {entries.length > 0 && (
              <Text style={styles.sectionHint}>
                Already priced under another name? Tap the merge icon to combine them.
              </Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PRICE BOOK{entries.length > 0 ? ` (${entries.length})` : ''}
          </Text>
          <Text style={styles.sectionHint}>Saved for this bar — tap any bottle to change it</Text>

          {loading && entries.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.accentPrimary} />
            </View>
          ) : filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={28} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>
                {normalizedQuery
                  ? 'No priced bottles match that search.'
                  : 'No prices yet. Scan a few bottles, or search above to price one now.'}
              </Text>
            </View>
          ) : (
            filteredEntries.map(entry => (
              <TouchableOpacity
                key={entry.productId}
                style={styles.row}
                onPress={() =>
                  openEditor(
                    {
                      id: entry.productId,
                      name: entry.name,
                      brand: entry.brand,
                      size: entry.size,
                      category: entry.category,
                    },
                    entry.price
                  )
                }
                activeOpacity={0.8}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.rowBadge}>
                    <DollarSign size={14} color={COLORS.accentPrimary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{displayName(entry)}</Text>
                    {entry.size ? <Text style={styles.rowMeta}>{entry.size}</Text> : null}
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowPrice}>${entry.price.toFixed(2)}</Text>
                  <TouchableOpacity
                    onPress={e => {
                      e.stopPropagation();
                      handleClear(entry.productId, displayName(entry));
                    }}
                    hitSlop={8}
                    style={styles.clearButton}
                  >
                    <Trash2 size={15} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {normalizedQuery.length >= 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADD FROM CATALOG</Text>
            {isSearching ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.accentPrimary} />
              </View>
            ) : catalogSuggestions.length === 0 ? (
              <Text style={styles.sectionHint}>No other bottles match that search.</Text>
            ) : (
              catalogSuggestions.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.row}
                  onPress={() =>
                    openEditor({
                      id: product.id,
                      name: product.name,
                      brand: product.brand,
                      size: product.size,
                      category: product.category,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.rowBadge}>
                      <Tag size={14} color={COLORS.textTertiary} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>{displayName(product)}</Text>
                      {product.size ? <Text style={styles.rowMeta}>{product.size}</Text> : null}
                    </View>
                  </View>
                  <Text style={styles.addPriceText}>Add price</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        visible={merging !== null}
        onRequestClose={() => setMerging(null)}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={2}>
              {merging ? displayName(merging) : ''}
            </Text>
            <Text style={styles.modalSubtitle}>
              Which priced bottle is this the same as?
            </Text>

            <ScrollView style={styles.mergeList} keyboardShouldPersistTaps="handled">
              {entries.map(entry => (
                <TouchableOpacity
                  key={entry.productId}
                  style={styles.mergeOption}
                  onPress={() => handleMerge(entry)}
                  disabled={mergeBusyId !== null}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mergeOptionName} numberOfLines={1}>
                    {displayName(entry)}
                  </Text>
                  {mergeBusyId === entry.productId ? (
                    <ActivityIndicator size="small" color={COLORS.accentPrimary} />
                  ) : (
                    <Text style={styles.mergeOptionPrice}>${entry.price.toFixed(2)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setMerging(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={editing !== null} onRequestClose={closeEditor} animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={2}>
              {editing ? displayName(editing) : ''}
            </Text>
            <Text style={styles.modalSubtitle}>What do you pay per bottle?</Text>

            <View style={styles.priceInputRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textTertiary}
                value={priceInput}
                onChangeText={text => setPriceInput(text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeEditor} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  header: {
    // paddingLeft clears the hamburger button App.tsx overlays at top:60/
    // left:20 on every non-camera screen — matches Settings/OrderHistory/
    // ReviewGrid, which all pad the same way instead of centering the
    // hamburger over the title.
    paddingLeft: 70,
    paddingRight: SPACING.lg,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    padding: 0,
  },
  scrollContent: {
    paddingBottom: SPACING['3xl'],
  },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 2,
  },
  sectionHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowUnpriced: {
    borderColor: `${COLORS.accentSecondary}55`,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  rowBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBadgeUnpriced: {
    backgroundColor: `${COLORS.accentSecondary}1A`,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  rowMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  mergeButton: {
    padding: SPACING.xs,
  },
  mergeList: {
    marginTop: SPACING.lg,
    maxHeight: 280,
  },
  mergeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.primaryDark,
    marginBottom: SPACING.sm,
  },
  mergeOptionName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  mergeOptionPrice: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  addPriceText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accentPrimary,
  },
  loadingRow: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.primaryDark,
  },
  currency: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  priceInput: {
    flex: 1,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    padding: 0,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
});
