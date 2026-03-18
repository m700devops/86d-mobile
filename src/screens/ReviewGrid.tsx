import React, { useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
  SectionList, TextInput,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Search, Plus, ChevronRight, Trash2, Minus } from 'lucide-react-native';
import { useInventory } from '../context/InventoryContext';
import { useDistributors } from '../context/DistributorContext';
import { Bottle, LiquidLevel } from '../types';
import { LEVELS } from '../constants';

interface Props {
  onGenerateOrder: () => void;
  onAddManual: () => void;
}

const LEVEL_ORDER: LiquidLevel[] = ['empty', '1/4', 'half', '3/4', 'almost_full', 'full'];

function levelToPercent(level?: LiquidLevel): number {
  const found = LEVELS.find(l => l.value === level);
  return found ? found.percent : 0;
}

function levelLabel(level?: LiquidLevel): string {
  if (!level) return 'EMPTY';
  const map: Record<LiquidLevel, string> = {
    empty: 'EMPTY',
    '1/4': '1/4',
    half: 'HALF',
    '3/4': '3/4',
    almost_full: 'ALMOST FULL',
    full: 'FULL',
  };
  return map[level] ?? level.toUpperCase();
}

function cycleLevelUp(level?: LiquidLevel): LiquidLevel {
  const idx = LEVEL_ORDER.indexOf(level as LiquidLevel);
  return LEVEL_ORDER[(idx + 1) % LEVEL_ORDER.length];
}

export default function ReviewGrid({ onGenerateOrder, onAddManual }: Props) {
  const { bottles, updateBottle, removeBottle } = useInventory();
  const { distributors } = useDistributors();
  const [searchQuery, setSearchQuery] = useState('');

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

      {/* Bottle List */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <BottleRow
            bottle={item}
            onUpdate={(updates) => updateBottle(item.id, updates)}
            onRemove={() => removeBottle(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={onGenerateOrder}
          activeOpacity={0.8}
        >
          <Text style={styles.generateButtonText}>Generate Order Summary</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.footerText}>Finalize inventory and par levels</Text>
      </View>
    </SafeAreaView>
  );
}

function BottleRow({
  bottle,
  onUpdate,
  onRemove,
}: {
  bottle: Bottle;
  onUpdate: (updates: Partial<Bottle>) => void;
  onRemove: () => void;
}) {
  const [deletePressed, setDeletePressed] = useState(false);
  const percent = levelToPercent(bottle.level);

  return (
    <View style={styles.bottleRow}>
      {/* Name + Brand */}
      <View style={styles.bottleInfo}>
        <Text style={styles.bottleName} numberOfLines={1}>{bottle.name}</Text>
        <Text style={styles.bottleBrand} numberOfLines={1}>
          {bottle.brand.toUpperCase()}
        </Text>
      </View>

      {/* Level bar (tap to cycle) */}
      <TouchableOpacity
        style={styles.levelColumn}
        onPress={() => onUpdate({ level: cycleLevelUp(bottle.level) })}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.levelBar}>
          <View style={[styles.levelFill, { height: `${percent}%` as any }]} />
        </View>
        <Text style={styles.levelLabel}>{levelLabel(bottle.level)}</Text>
      </TouchableOpacity>

      {/* Backup stepper */}
      <View style={styles.stepperColumn}>
        <View style={styles.stepperBox}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onUpdate({ currentStock: Math.max(0, (bottle.currentStock ?? 0) - 1) })}
          >
            <Minus size={10} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{bottle.currentStock ?? 0}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onUpdate({ currentStock: (bottle.currentStock ?? 0) + 1 })}
          >
            <Plus size={10} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.stepperLabel}>BACK UP</Text>
      </View>

      {/* Par stepper */}
      <View style={styles.stepperColumn}>
        <View style={[styles.stepperBox, styles.parBox]}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onUpdate({ parLevel: Math.max(0, bottle.parLevel - 1) })}
          >
            <Minus size={10} color={COLORS.accentPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, styles.parValue]}>{bottle.parLevel}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onUpdate({ parLevel: bottle.parLevel + 1 })}
          >
            <Plus size={10} color={COLORS.accentPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.parLabel}>PAR</Text>
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
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
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
  levelColumn: {
    alignItems: 'center',
    width: 36,
  },
  levelBar: {
    width: 10,
    height: 32,
    backgroundColor: `${COLORS.border}60`,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  levelFill: {
    width: '100%',
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 3,
  },
  levelLabel: {
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 3,
    textAlign: 'center',
  },
  stepperColumn: {
    alignItems: 'center',
    width: 64,
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
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
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
  },
  parLabel: {
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 1,
    marginTop: 3,
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
});
