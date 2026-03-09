import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, FlatList, TextInput } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Search, Plus, ChevronRight, Trash2, Minus } from 'lucide-react-native';
import { useInventory } from '../context/InventoryContext';
import { Bottle, LiquidLevel } from '../types';
import { LEVELS } from '../constants';

interface Props {
  onGenerateOrder: () => void;
  onAddManual: () => void;
}

export default function ReviewGrid({ onGenerateOrder, onAddManual }: Props) {
  const { bottles, updateBottle, removeBottle } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBottles = bottles.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review & Par</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredBottles.length} Items</Text>
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddManual}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottle List */}
      <FlatList
        data={filteredBottles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <BottleRow
            bottle={item}
            onUpdate={(updates) => updateBottle(item.id, updates)}
            onRemove={() => removeBottle(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerGradient} />
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

function BottleRow({ bottle, onUpdate, onRemove }: { bottle: Bottle; onUpdate: (updates: Partial<Bottle>) => void; onRemove: () => void }) {
  const [isPressed, setIsPressed] = useState(false);

  // Get 4 level options for display
  const displayLevels = ['empty', 'half', '3/4', 'full'];

  return (
    <View style={styles.bottleRow}>
      {/* Left: Bottle Info (50%) */}
      <View style={styles.bottleInfo}>
        <Text style={styles.bottleName} numberOfLines={1}>
          {bottle.name}
        </Text>
        <Text style={styles.bottleBrand}>{bottle.brand}</Text>
      </View>

      {/* Right: Controls (50%) */}
      <View style={styles.controls}>
        {/* Column 1: Level Selector */}
        <View style={styles.controlColumn}>
          <View style={styles.levelButtons}>
            {displayLevels.map((levelValue) => {
              const isSelected = bottle.level === levelValue;
              const levelData = LEVELS.find(l => l.value === levelValue);
              return (
                <TouchableOpacity
                  key={levelValue}
                  style={[
                    styles.levelButton,
                    isSelected && styles.levelButtonSelected,
                  ]}
                  onPress={() => onUpdate({ level: levelValue as LiquidLevel })}
                >
                  {isSelected && (
                    <View style={styles.levelIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.levelLabel}>{(bottle.level || 'EMPTY').toUpperCase()}</Text>
        </View>

        {/* Column 2: Backup Stepper */}
        <View style={styles.controlColumn}>
          <View style={styles.stepperBox}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => onUpdate({ currentStock: Math.max(0, (bottle.currentStock || 0) - 1) })}
            >
              <Minus size={10} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{bottle.currentStock || 0}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => onUpdate({ currentStock: (bottle.currentStock || 0) + 1 })}
            >
              <Plus size={10} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.stepperLabel}>BACKUP</Text>
        </View>

        {/* Column 3: Par Stepper */}
        <View style={styles.controlColumn}>
          <View style={[styles.stepperBox, styles.parStepperBox]}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => onUpdate({ parLevel: Math.max(0, bottle.parLevel - 1) })}
            >
              <Minus size={10} color={COLORS.accentPrimary} />
            </TouchableOpacity>
            <Text style={[styles.stepperValue, styles.parStepperValue]}>{bottle.parLevel}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => onUpdate({ parLevel: bottle.parLevel + 1 })}
            >
              <Plus size={10} color={COLORS.accentPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.parLabel}>PAR</Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={onRemove}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
        >
          <Trash2 size={14} color={isPressed ? COLORS.error : COLORS.textTertiary} />
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: SPACING.lg,
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
    marginBottom: SPACING.lg,
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
  listContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: 160,
  },
  bottleRow: {
    backgroundColor: `${COLORS.surface}30`,
    borderWidth: 1,
    borderColor: `${COLORS.border}30`,
    borderRadius: 8,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottleInfo: {
    width: '40%',
    paddingRight: SPACING.sm,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  controlColumn: {
    flex: 1,
    alignItems: 'center',
  },
  levelButtons: {
    flexDirection: 'row',
    width: '100%',
    height: 24,
    gap: 2,
  },
  levelButton: {
    flex: 1,
    backgroundColor: `${COLORS.border}20`,
    borderWidth: 1,
    borderColor: `${COLORS.border}40`,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelButtonSelected: {
    backgroundColor: COLORS.accentPrimary,
    borderColor: COLORS.accentPrimary,
  },
  levelIndicator: {
    width: 4,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  levelLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentSecondary,
    letterSpacing: 1,
    marginTop: 4,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    backgroundColor: `${COLORS.textPrimary}05`,
    borderWidth: 1,
    borderColor: `${COLORS.textPrimary}10`,
    borderRadius: 6,
    paddingHorizontal: SPACING.xs,
    width: '100%',
  },
  parStepperBox: {
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
  parStepperValue: {
    color: COLORS.accentPrimary,
  },
  stepperLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginTop: 4,
  },
  parLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 1,
    marginTop: 4,
  },
  deleteButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primaryDark,
  },
  footerGradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'transparent',
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
    marginTop: SPACING.md,
  },
});
