import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
  SectionList, TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Search, Plus, ChevronRight, Trash2, Minus, WifiOff, Check } from 'lucide-react-native';
import { useInventory } from '../context/InventoryContext';
import { useDistributors } from '../context/DistributorContext';
import { useLocation } from '../context/LocationContext';
import { apiService } from '../services/api';
import { Bottle } from '../types';
import ConnectionNotice from '../components/ConnectionNotice';
import NumericDoneAccessory, { NUMERIC_ACCESSORY_ID } from '../components/NumericDoneAccessory';

interface Props {
  onGenerateOrder: () => void;
  onAddManual: () => void;
  onNavigateToSettings: () => void;
}

const STOCK_MAX = 999.99;
const STOCK_TAP_STEP = 0.25;
const STOCK_HOLD_STEP = 1.0;
const STOCK_HOLD_FAST_STEP = 5.0;
const STOCK_HOLD_FAST_AFTER_MS = 2000;
const STOCK_HOLD_INTERVAL_MS = 300;

function clampStock(value: number): number {
  return Math.min(STOCK_MAX, Math.max(0, Math.round(value * 100) / 100));
}

// 3 → "3", 2.25 → "2.25", 0.5 → "0.5" — no trailing .00 on whole numbers
function formatStock(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export default function ReviewGrid({ onGenerateOrder, onAddManual, onNavigateToSettings }: Props) {
  const { bottles, isHydrated, updateBottle, removeBottle, retryScan, autoResolvedCount, acknowledgeAutoResolved } = useInventory();
  const { distributors } = useDistributors();
  const { currentLocation, loadFailed: locationLoadFailed, reload: reloadLocations } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningBottle, setAssigningBottle] = useState<Bottle | null>(null);
  const stockSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const pendingNetworkRetries = bottles.filter(
    b => b.scanStatus === 'failed' && b.failureReason === 'network'
  ).length;

  const unsetParCount = bottles.filter(
    b => b.scanStatus === undefined && !b.parLevelSet
  ).length;

  // Orders are quantity = par − current stock, so an untouched default par
  // (1) silently produces a wrong order quantity — not a case to let through
  // with a "do it anyway" escape hatch. A bar that taps past the warning
  // every time trains itself to stop reading it, and the wrong quantity ships
  // anyway. Block it outright: fix the par levels, then generate the order.
  const handleGenerateOrder = () => {
    if (unsetParCount === 0) {
      onGenerateOrder();
      return;
    }
    Alert.alert(
      'Set par levels first',
      `${unsetParCount} item${unsetParCount === 1 ? ' still has' : 's still have'} the default par level (1). Set a real par level for ${unsetParCount === 1 ? 'it' : 'each'} below before generating an order — order quantities are calculated from it.`,
      [{ text: 'Got It' }]
    );
  };

  // Debounced write-through: rapid stepper taps / long-press repeats collapse
  // into one PATCH per bottle once the value settles.
  const handleBottleUpdate = (bottle: Bottle, updates: Partial<Bottle>) => {
    updateBottle(bottle.id, updates);
    if (updates.currentStock === undefined || !bottle.productId || !currentLocation) return;
    const productId = bottle.productId;
    const locationId = currentLocation.id;
    const patch = { current_stock: updates.currentStock };
    if (stockSaveTimers.current[bottle.id]) clearTimeout(stockSaveTimers.current[bottle.id]);
    stockSaveTimers.current[bottle.id] = setTimeout(() => {
      delete stockSaveTimers.current[bottle.id];
      apiService.updateProductStock(locationId, productId, patch)
        .catch(err => console.error('[ReviewGrid] failed to save stock:', err));
    }, 600);
  };

  // Load saved distributor assignments on mount. Prices deliberately aren't
  // hydrated onto bottles here — they're looked up from the price book by
  // productId wherever they're needed (see PricingContext), so counting never
  // has to stop for a price and an edit in Pricing applies to orders at once.
  useEffect(() => {
    if (!currentLocation) return;
    apiService.getProductDistributors(currentLocation.id)
      .then(assignments => {
        assignments.forEach(assignment => {
          const bottle = bottles.find(b => b.productId === assignment.product_id);
          if (bottle) {
            updateBottle(bottle.id, { distributorId: assignment.distributor_id });
          }
        });
      })
      .catch(err => console.error('[ReviewGrid] failed to load assignments:', err));
  }, [currentLocation]);

  const filtered = bottles.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group bottles by distributor for section headers
  const sections = useMemo(() => {
    const grouped: Record<string, Bottle[]> = {};
    filtered.forEach(bottle => {
      const key = bottle.distributorId ?? '__none__';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(bottle);
    });

    const result: { id: string; title: string; data: Bottle[] }[] = [];

    distributors.forEach(d => {
      if (grouped[d.id]?.length) {
        result.push({ id: d.id, title: d.name, data: grouped[d.id] });
      }
    });

    if (grouped['__none__']?.length) {
      result.push({ id: '__none__', title: 'Unassigned', data: grouped['__none__'] });
    }

    // If no distributors configured, show all as one flat section
    if (result.length === 0 && filtered.length > 0) {
      result.push({ id: '__all__', title: '', data: filtered });
    }

    return result;
  }, [filtered, distributors]);

  // Hydration is gated on having a location — if locations failed from both
  // cache and server, this spinner would never resolve. Surface that as a
  // retry state instead of spinning forever (the grocery-store bug: bad
  // network → no location → 30+ minutes of spinner).
  if (!isHydrated && locationLoadFailed) {
    return <ConnectionNotice onRetry={reloadLocations} />;
  }

  // Bottles load asynchronously (local draft, then a server fallback) —
  // without this, resuming straight into Review after a killed app would
  // flash an empty list before the real data lands. Bounded: hydration is
  // local-first and the server fallback carries a request timeout, and the
  // no-location dead end is caught above.
  if (!isHydrated) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingCentered]}>
        <ActivityIndicator color={COLORS.accentPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review & Par</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filtered.length} Items</Text>
        </View>
      </View>

      {/* Search Row */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={16} color={COLORS.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bottles..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAddManual} activeOpacity={0.8}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {autoResolvedCount > 0 && (
        <TouchableOpacity style={styles.resolvedBanner} onPress={acknowledgeAutoResolved} activeOpacity={0.7}>
          <Check size={14} color={COLORS.success} />
          <Text style={styles.resolvedBannerText}>
            {autoResolvedCount} scan{autoResolvedCount === 1 ? '' : 's'} finished identifying in the background
          </Text>
        </TouchableOpacity>
      )}

      {pendingNetworkRetries > 0 && (
        <View style={styles.offlineBanner}>
          <WifiOff size={14} color={COLORS.warning} />
          <Text style={styles.offlineBannerText}>
            {pendingNetworkRetries} scan{pendingNetworkRetries === 1 ? '' : 's'} waiting on a better connection — {'they’ll'} identify {'themselves'} as soon as {'there’s'} signal, no tapping needed
          </Text>
        </View>
      )}

      {/* Bottle List */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
              {section.id === '__none__' && (
                <Text style={styles.sectionHeaderHint}>Tap item to assign</Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <BottleRow
            bottle={item}
            onUpdate={(updates) => handleBottleUpdate(item, updates)}
            onRemove={() => removeBottle(item.id)}
            onRetryIdentify={item.scanStatus === 'failed' ? () => retryScan(item) : undefined}
            onAssign={!item.distributorId ? () => {
              if (!currentLocation) {
                Alert.alert('Location Required', 'Set up a location in Settings before assigning distributors.');
                return;
              }
              setAssigningBottle(item);
            } : undefined}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {/* Assign Distributor Modal */}
      <Modal
        visible={assigningBottle !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAssigningBottle(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAssigningBottle(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Distributor</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {assigningBottle?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssigningBottle(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {distributors.length === 0 ? (
              <View style={styles.modalEmptyState}>
                <Text style={styles.modalEmptyTitle}>You're one step away from magic ✨</Text>
                <Text style={styles.modalEmptyBody}>
                  Add your distributors' emails in Settings and we'll send your entire inventory order to all of them at once — with one tap.
                </Text>
                <TouchableOpacity
                  style={styles.modalEmptyButton}
                  onPress={() => {
                    setAssigningBottle(null);
                    onNavigateToSettings();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalEmptyButtonText}>Add My Distributors →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              distributors.map(dist => (
                <TouchableOpacity
                  key={dist.id}
                  style={styles.modalDistRow}
                  onPress={() => {
                    if (assigningBottle) {
                      if (assigningBottle.productId && currentLocation) {
                        apiService.assignProductDistributor(currentLocation.id, assigningBottle.productId, dist.id)
                          .catch(err => console.error('Failed to save assignment:', err));
                      }
                      updateBottle(assigningBottle.id, { distributorId: dist.id });
                      setAssigningBottle(null);
                    }
                  }}
                >
                  <View style={styles.modalDistBadge}>
                    <Text style={styles.modalDistInitials}>
                      {dist.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.modalDistName}>{dist.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateOrder}
          activeOpacity={0.8}
        >
          <Text style={styles.generateButtonText}>Generate Order Summary</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.footerText, unsetParCount > 0 && styles.footerTextWarning]}>
          {unsetParCount > 0
            ? `${unsetParCount} item${unsetParCount === 1 ? '' : 's'} missing a par level`
            : 'Finalize inventory and par levels'}
        </Text>
      </View>
      {/* One accessory for every stepper row — the stock steppers use a
          decimal pad, which has no return key on iOS. */}
      <NumericDoneAccessory />
    </SafeAreaView>
  );
}

function BottleRow({
  bottle,
  onUpdate,
  onRemove,
  onAssign,
  onRetryIdentify,
}: {
  bottle: Bottle;
  onUpdate: (updates: Partial<Bottle>) => void;
  onRemove: () => void;
  onAssign?: () => void;
  onRetryIdentify?: () => void;
}) {
  const [deletePressed, setDeletePressed] = useState(false);
  const [stockDraft, setStockDraft] = useState<string | null>(null);

  // Refs so long-press interval callbacks always see the latest value
  const stockRef = useRef(bottle.currentStock ?? 0);
  stockRef.current = bottle.currentStock ?? 0;
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart = useRef(0);

  const stepStock = (delta: number) => {
    onUpdate({ currentStock: clampStock(stockRef.current + delta) });
  };

  const startStockHold = (dir: 1 | -1) => {
    holdStart.current = Date.now();
    stepStock(dir * STOCK_HOLD_STEP);
    repeatTimer.current = setInterval(() => {
      const held = Date.now() - holdStart.current;
      stepStock(dir * (held >= STOCK_HOLD_FAST_AFTER_MS ? STOCK_HOLD_FAST_STEP : STOCK_HOLD_STEP));
    }, STOCK_HOLD_INTERVAL_MS);
  };

  const endStockHold = () => {
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  };

  useEffect(() => endStockHold, []);

  const commitStockDraft = () => {
    if (stockDraft !== null && stockDraft.trim() !== '') {
      const parsed = parseFloat(stockDraft);
      if (!Number.isNaN(parsed)) {
        onUpdate({ currentStock: clampStock(parsed) });
      }
    }
    // Empty or unparseable input reverts to the previous value
    setStockDraft(null);
  };

  return (
    <View style={styles.bottleRow}>
      {/* Name + Brand */}
      <View style={styles.bottleInfo}>
        {/* Brand is the headline (Sprite, Gatorade, Tito's); variant is the
            small line under it. Rows without a brand (Identifying…/Unknown
            bottle/manual adds) fall back to the name as the headline. */}
        <Text
          style={[styles.bottleName, bottle.scanStatus === 'pending' && styles.bottleNamePending]}
          numberOfLines={1}
        >
          {bottle.brand || bottle.name}
        </Text>
        <Text style={styles.bottleBrand} numberOfLines={1}>
          {(bottle.brand ? bottle.name : '').toUpperCase()}
        </Text>
        {/* Two very different failures wear the same chip otherwise: a weak
            connection (self-heals, and tapping now will just fail again) vs.
            a photo the AI genuinely couldn't read (only a tap will fix it).
            Saying which is why a retry "did nothing" in a dead zone. */}
        {bottle.scanStatus === 'failed' && onRetryIdentify && (
          bottle.failureReason === 'network' ? (
            <TouchableOpacity
              style={[styles.retryChip, styles.retryChipWaiting]}
              onPress={onRetryIdentify}
              activeOpacity={0.7}
            >
              <Text style={[styles.retryChipText, styles.retryChipWaitingText]}>
                Waiting for a stronger signal — retries on its own
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.retryChip} onPress={onRetryIdentify} activeOpacity={0.7}>
              <Text style={styles.retryChipText}>Couldn't read the photo — tap to retry</Text>
            </TouchableOpacity>
          )
        )}
        <View style={styles.chipRow}>
          {onAssign && bottle.scanStatus === undefined && (
            <TouchableOpacity style={styles.assignChip} onPress={onAssign} activeOpacity={0.7}>
              <Text style={styles.assignChipText}>Assign →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Current stock stepper — tap ±0.25, hold ±1.0 (±5.0 after 2s), tap number to type */}
      <View style={styles.stepperColumn}>
        <View style={styles.stepperBox}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => stepStock(-STOCK_TAP_STEP)}
            onLongPress={() => startStockHold(-1)}
            delayLongPress={500}
            onPressOut={endStockHold}
          >
            <Minus size={10} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.stepperInput}
            value={stockDraft ?? formatStock(bottle.currentStock ?? 0)}
            keyboardType="decimal-pad"
            inputAccessoryViewID={NUMERIC_ACCESSORY_ID}
            returnKeyType="done"
            onFocus={() => setStockDraft(formatStock(bottle.currentStock ?? 0))}
            onChangeText={(text) => setStockDraft(text.replace(/[^0-9.]/g, ''))}
            onBlur={commitStockDraft}
            onSubmitEditing={commitStockDraft}
            selectTextOnFocus
          />
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => stepStock(STOCK_TAP_STEP)}
            onLongPress={() => startStockHold(1)}
            delayLongPress={500}
            onPressOut={endStockHold}
          >
            <Plus size={10} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.stepperLabel}>CURRENT STOCK</Text>
      </View>

      {/* Par stepper */}
      <View style={[styles.stepperColumn, styles.parColumn]}>
        <View style={[styles.stepperBox, styles.parBox]}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onUpdate({ parLevel: Math.max(0, bottle.parLevel - 1), parLevelSet: true })}
          >
            <Minus size={10} color={COLORS.accentPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, styles.parValue]}>{bottle.parLevel}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onUpdate({ parLevel: bottle.parLevel + 1, parLevelSet: true })}
          >
            <Plus size={10} color={COLORS.accentPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.parLabel}>PAR</Text>
        {!bottle.parLevelSet && bottle.scanStatus === undefined && (
          <Text style={styles.parUnsetBadge}>Not set</Text>
        )}
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onRemove}
        onPressIn={() => setDeletePressed(true)}
        onPressOut={() => setDeletePressed(false)}
      >
        <Trash2 size={14} color={deletePressed ? COLORS.error : COLORS.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  loadingCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 68,
    paddingRight: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  countBadge: {
    backgroundColor: `${COLORS.surface}50`,
    borderWidth: 1,
    borderColor: `${COLORS.border}50`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.surface}50`,
    borderWidth: 1,
    borderColor: `${COLORS.border}50`,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: `${COLORS.warning}12`,
    borderWidth: 1,
    borderColor: `${COLORS.warning}30`,
    borderRadius: 10,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.warning,
  },
  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: `${COLORS.success}12`,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
    borderRadius: 10,
  },
  resolvedBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.success,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    flexDirection: 'column',
  },
  sectionHeaderText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 160,
    gap: SPACING.sm,
  },
  bottleRow: {
    backgroundColor: `${COLORS.surface}30`,
    borderWidth: 1,
    borderColor: `${COLORS.border}30`,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  bottleInfo: {
    flex: 1,
    paddingRight: SPACING.xs,
    overflow: 'hidden',
  },
  bottleName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  bottleBrand: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  bottleNamePending: {
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  retryChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${COLORS.error}60`,
    backgroundColor: `${COLORS.error}15`,
  },
  retryChipText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
    letterSpacing: 0.5,
  },
  // Amber, not red: a weak signal is a wait-state that resolves itself, not
  // an error the user has to go fix.
  retryChipWaiting: {
    borderColor: `${COLORS.warning}60`,
    backgroundColor: `${COLORS.warning}15`,
  },
  retryChipWaitingText: {
    color: COLORS.warning,
  },
  stepperColumn: {
    alignItems: 'center',
    width: 80,
  },
  // The row's uniform 4pt gap put the two steppers as close to each other as
  // the bottle name is to the first one, so two same-width boxes read as one
  // segmented control instead of two separate numbers. Push them apart so
  // "what's on hand" and "what we stock to" are visibly different fields.
  parColumn: {
    marginLeft: SPACING.sm,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
    backgroundColor: `${COLORS.textPrimary}05`,
    borderWidth: 1,
    borderColor: `${COLORS.textPrimary}10`,
    borderRadius: 6,
    paddingHorizontal: SPACING.xs,
    width: '100%',
  },
  parBox: {
    backgroundColor: `${COLORS.accentPrimary}10`,
    borderColor: `${COLORS.accentPrimary}30`,
  },
  stepperButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  stepperInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    textAlign: 'center',
    padding: 0,
  },
  parValue: {
    color: COLORS.accentPrimary,
  },
  stepperLabel: {
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginTop: 3,
    textAlign: 'center',
  },
  parLabel: {
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 1,
    marginTop: 3,
  },
  parUnsetBadge: {
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  deleteButton: {
    padding: SPACING.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.primaryDark,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.border}40`,
  },
  generateButton: {
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
  generateButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerTextWarning: {
    color: COLORS.error,
  },
  sectionHeaderHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentPrimary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  assignChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}60`,
    backgroundColor: `${COLORS.accentPrimary}15`,
  },
  assignChipText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: `${COLORS.border}80`,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}40`,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  modalClose: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textTertiary,
    padding: SPACING.sm,
  },
  modalEmptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalEmptyTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalEmptyBody: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalEmptyButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accentPrimary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 10,
  },
  modalEmptyButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
  modalDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}20`,
  },
  modalDistBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${COLORS.accentPrimary}20`,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}40`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDistInitials: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 0.5,
  },
  modalDistName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
});
