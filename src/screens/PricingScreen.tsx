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
import { Search, X, DollarSign, Tag, Merge, BookOpen } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { useProductBook, PriceableProduct, BookEntry } from '../context/ProductBookContext';
import { useInventory } from '../context/InventoryContext';
import { useLocation } from '../context/LocationContext';
import { useDistributors } from '../context/DistributorContext';
import { apiService } from '../services/api';
import { Product } from '../types';
import NumericDoneAccessory, { NUMERIC_ACCESSORY_ID } from '../components/NumericDoneAccessory';

const SEARCH_DEBOUNCE_MS = 300;

const displayName = (p: { brand?: string | null; name: string }) =>
  [p.brand, p.name].filter(Boolean).join(' ').trim() || p.name;

// A bottle is "set up" when all three of its decisions are made. Par and
// distributor matter as much as price here: without a par the order quantity
// is guesswork, and without a distributor the line has nowhere to go.
const isComplete = (e: BookEntry) =>
  e.price !== undefined && e.par !== undefined && e.distributorId !== undefined;

export default function PricingScreen() {
  const {
    entries,
    loading,
    priceFor,
    parFor,
    distributorFor,
    setPrice,
    clearPrice,
    setPar,
    setDistributor,
    clearDistributor,
    trackProduct,
    mergeInto,
  } = useProductBook();
  const { bottles, repointProduct } = useInventory();
  const { currentLocation } = useLocation();
  const { distributors } = useDistributors();

  const [query, setQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  // Whether the book list is narrowed to bottles still missing something. Off
  // by default: the list is also how you look a bottle up, not only a to-do.
  const [showOnlyGaps, setShowOnlyGaps] = useState(false);

  const [editing, setEditing] = useState<PriceableProduct | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [parInput, setParInput] = useState('');
  const [distDraft, setDistDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The duplicate being folded into a bottle already in the book, once the
  // client spots that the AI read the same label two different ways.
  const [merging, setMerging] = useState<PriceableProduct | null>(null);
  const [mergeBusyId, setMergeBusyId] = useState<string | null>(null);

  const distributorName = useCallback(
    (id?: string) => distributors.find(d => d.id === id)?.name,
    [distributors]
  );

  // Bottles counted in the current session that still need something. This is
  // the whole reason the book gets its own screen: instead of hunting row by
  // row while counting, everything unfinished collects here in one list.
  const sessionGaps = useMemo(() => {
    const seen = new Set<string>();
    const out: PriceableProduct[] = [];
    bottles.forEach(b => {
      if (!b.productId || b.scanStatus !== undefined) return;
      if (seen.has(b.productId)) return;
      const settled =
        priceFor(b.productId) !== undefined &&
        parFor(b.productId) !== undefined &&
        distributorFor(b.productId) !== undefined;
      if (settled) return;
      seen.add(b.productId);
      out.push({ id: b.productId, name: b.name, brand: b.brand, size: b.size, category: b.category });
    });
    return out;
  }, [bottles, priceFor, parFor, distributorFor]);

  const normalizedQuery = query.trim().toLowerCase();

  // The book list minus whatever the NEEDS SETUP section is already showing, so
  // a bottle counted this session appears once on the screen, not twice.
  const bookEntries = useMemo(() => {
    const shownAbove = new Set(sessionGaps.map(p => p.id));
    return entries.filter(e => !shownAbove.has(e.productId));
  }, [entries, sessionGaps]);

  const gapCount = useMemo(() => bookEntries.filter(e => !isComplete(e)).length, [bookEntries]);

  const filteredEntries = useMemo(() => {
    let list = showOnlyGaps ? bookEntries.filter(e => !isComplete(e)) : bookEntries;
    if (normalizedQuery) {
      list = list.filter(e => displayName(e).toLowerCase().includes(normalizedQuery));
    }
    return list;
  }, [bookEntries, showOnlyGaps, normalizedQuery]);

  // Catalog search only fills the gap the book can't: products this bar hasn't
  // scanned yet but wants to set up ahead of time.
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

  // Anything the book or the needs-setup list already covers is dropped here so
  // a product never shows up twice on one screen.
  const catalogSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    const known = new Set([...entries.map(e => e.productId), ...sessionGaps.map(p => p.id)]);
    return catalogResults.filter(p => !known.has(p.id));
  }, [catalogResults, entries, sessionGaps, normalizedQuery]);

  const openEditor = useCallback(
    (product: PriceableProduct) => {
      setEditing(product);
      const price = priceFor(product.id);
      const par = parFor(product.id);
      setPriceInput(price !== undefined ? String(price) : '');
      setParInput(par !== undefined ? String(par) : '');
      setDistDraft(distributorFor(product.id) ?? null);
    },
    [priceFor, parFor, distributorFor]
  );

  const closeEditor = () => {
    setEditing(null);
    setPriceInput('');
    setParInput('');
    setDistDraft(null);
    setSaving(false);
  };

  // One save for all three fields. Only what actually changed is written, so
  // opening a bottle to check it and closing again costs nothing.
  const handleSave = async () => {
    if (!editing) return;
    const product = editing;

    const priceRaw = priceInput.trim();
    const parRaw = parInput.trim();

    let nextPrice: number | undefined;
    if (priceRaw) {
      const value = parseFloat(priceRaw);
      if (Number.isNaN(value) || value <= 0) {
        Alert.alert('Check the price', 'Type what you pay for this bottle, e.g. 24.99 — or leave it blank.');
        return;
      }
      nextPrice = Math.round(value * 100) / 100;
    }

    let nextPar: number | undefined;
    if (parRaw) {
      const value = parseInt(parRaw, 10);
      if (Number.isNaN(value) || value < 1) {
        Alert.alert('Check the par level', 'Par is how many bottles you want on hand — 1 or more, or leave it blank.');
        return;
      }
      nextPar = value;
    }

    const prevPrice = priceFor(product.id);
    const prevPar = parFor(product.id);
    const prevDist = distributorFor(product.id);
    const wroteSomething =
      nextPrice !== prevPrice || nextPar !== prevPar || (distDraft ?? undefined) !== prevDist;

    setSaving(true);
    try {
      // Price first, and awaited: it's the only one of the three that reports a
      // failure back rather than queueing (see ProductBookContext), so a dead
      // connection should stop here instead of half-saving the row.
      if (nextPrice !== prevPrice) {
        if (nextPrice !== undefined) await setPrice(product, nextPrice);
        else await clearPrice(product.id);
      }
      if (nextPar !== prevPar) setPar(product, nextPar ?? 0);
      if ((distDraft ?? undefined) !== prevDist) {
        if (distDraft) setDistributor(product, distDraft);
        else clearDistributor(product.id);
      }
      // Saved with nothing filled in — usually a catalog bottle being added
      // ahead of time. Still give it a book row so it's here to come back to.
      if (!wroteSomething && !entries.some(e => e.productId === product.id)) {
        trackProduct(product);
      }
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
      `"${displayName(source)}" will be folded into "${displayName(target)}" and use its price, par and distributor. ` +
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

  if (!currentLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bottle Book</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Set up a bar in Settings before adding bottles.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderSetupLine = (entry: BookEntry) => {
    const parts: { key: string; text: string; missing: boolean }[] = [
      {
        key: 'price',
        text: entry.price !== undefined ? `$${entry.price.toFixed(2)}` : 'No price',
        missing: entry.price === undefined,
      },
      {
        key: 'par',
        text: entry.par !== undefined ? `Par ${entry.par}` : 'No par',
        missing: entry.par === undefined,
      },
      {
        key: 'dist',
        text: distributorName(entry.distributorId) ?? 'No distributor',
        missing: entry.distributorId === undefined,
      },
    ];
    return (
      <View style={styles.setupLine}>
        {parts.map((part, i) => (
          <React.Fragment key={part.key}>
            {i > 0 && <Text style={styles.setupDot}>·</Text>}
            <Text
              style={[styles.setupvalue, part.missing && styles.setupValueMissing]}
              numberOfLines={1}
            >
              {part.text}
            </Text>
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bottle Book</Text>
        <Text style={styles.headerSubtitle}>
          Price, par and distributor — set once, used on every order
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
        {sessionGaps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEEDS SETUP</Text>
            <Text style={styles.sectionHint}>Counted this session, not finished yet</Text>
            {sessionGaps.map(product => (
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
                    {renderSetupLine({
                      productId: product.id,
                      name: product.name,
                      price: priceFor(product.id),
                      par: parFor(product.id),
                      distributorId: distributorFor(product.id),
                    })}
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
                  <Text style={styles.addPriceText}>Set up</Text>
                </View>
              </TouchableOpacity>
            ))}
            {entries.length > 0 && (
              <Text style={styles.sectionHint}>
                Already in the book under another name? Tap the merge icon to combine them.
              </Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              YOUR BOTTLES{bookEntries.length > 0 ? ` (${bookEntries.length})` : ''}
            </Text>
            {gapCount > 0 && (
              <TouchableOpacity
                style={[styles.filterChip, showOnlyGaps && styles.filterChipActive]}
                onPress={() => setShowOnlyGaps(v => !v)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, showOnlyGaps && styles.filterChipTextActive]}>
                  {showOnlyGaps ? 'Show all' : `Needs setup (${gapCount})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionHint}>
            Saved for this bar — tap any bottle to change its price, par or distributor
          </Text>

          {loading && entries.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.accentPrimary} />
            </View>
          ) : filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={28} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>
                {normalizedQuery
                  ? 'No bottles match that search.'
                  : showOnlyGaps
                    ? 'Every bottle in your book is fully set up.'
                    : 'No bottles yet. Scan a few, or search above to set one up now.'}
              </Text>
            </View>
          ) : (
            filteredEntries.map(entry => (
              <TouchableOpacity
                key={entry.productId}
                style={[styles.row, !isComplete(entry) && styles.rowIncomplete]}
                onPress={() =>
                  openEditor({
                    id: entry.productId,
                    name: entry.name,
                    brand: entry.brand,
                    size: entry.size,
                    category: entry.category,
                  })
                }
                activeOpacity={0.8}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.rowBadge}>
                    <DollarSign
                      size={14}
                      color={isComplete(entry) ? COLORS.accentPrimary : COLORS.textTertiary}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{displayName(entry)}</Text>
                    {renderSetupLine(entry)}
                  </View>
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
                  <Text style={styles.addPriceText}>Set up</Text>
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
              Which bottle in your book is this the same as?
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
                    <Text style={styles.mergeOptionPrice}>
                      {entry.price !== undefined ? `$${entry.price.toFixed(2)}` : '—'}
                    </Text>
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
            <Text style={styles.modalSubtitle}>
              Set once — every future scan of this bottle uses it
            </Text>

            <ScrollView
              style={styles.editorScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>WHAT YOU PAY</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textTertiary}
                  value={priceInput}
                  onChangeText={text => setPriceInput(text.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={NUMERIC_ACCESSORY_ID}
                  returnKeyType="done"
                />
              </View>

              <Text style={styles.fieldLabel}>PAR — HOW MANY TO KEEP ON HAND</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Not set"
                  placeholderTextColor={COLORS.textTertiary}
                  value={parInput}
                  onChangeText={text => setParInput(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  inputAccessoryViewID={NUMERIC_ACCESSORY_ID}
                  returnKeyType="done"
                />
              </View>

              <Text style={styles.fieldLabel}>DISTRIBUTOR</Text>
              {distributors.length === 0 ? (
                <Text style={styles.fieldHint}>
                  No distributors yet — add them in Settings, then come back to assign one.
                </Text>
              ) : (
                <View style={styles.distChips}>
                  <TouchableOpacity
                    style={[styles.distChip, distDraft === null && styles.distChipActive]}
                    onPress={() => setDistDraft(null)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.distChipText, distDraft === null && styles.distChipTextActive]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {distributors.map(dist => (
                    <TouchableOpacity
                      key={dist.id}
                      style={[styles.distChip, distDraft === dist.id && styles.distChipActive]}
                      onPress={() => setDistDraft(dist.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.distChipText,
                          distDraft === dist.id && styles.distChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {dist.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldHint}>
                Leave a field blank to clear it.
              </Text>
            </ScrollView>

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
        <NumericDoneAccessory />
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
  // A bottle missing one of its three settings reads as unfinished without
  // shouting — it's a normal row with a dimmer edge, not a warning.
  rowIncomplete: {
    borderColor: `${COLORS.border}`,
    backgroundColor: 'transparent',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    borderColor: COLORS.accentPrimary,
    backgroundColor: `${COLORS.accentPrimary}1A`,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.accentPrimary,
  },
  // The three settings on one line under the name. Missing ones stay visible
  // rather than being omitted — the gap is the information.
  setupLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 3,
  },
  setupvalue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  setupValueMissing: {
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  setupDot: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  editorScroll: {
    marginTop: SPACING.md,
    maxHeight: 380,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
    marginTop: SPACING.lg,
  },
  fieldHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },
  distChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  distChip: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.primaryDark,
  },
  distChipActive: {
    borderColor: COLORS.accentPrimary,
    backgroundColor: `${COLORS.accentPrimary}1A`,
  },
  distChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  distChipTextActive: {
    color: COLORS.accentPrimary,
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
    marginTop: SPACING.sm,
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
    minWidth: 0,
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
