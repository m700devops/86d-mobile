import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, FlatList, TextInput } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
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
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Review & Par</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredBottles.length} Items</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={14} color={COLORS.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: COLORS.accentPrimary }]}
          onPress={onAddManual}
        >
          <Plus size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: COLORS.accentPrimary }]}
          onPress={onGenerateOrder}
        >
          <Text style={styles.buttonText}>Generate Order Summary</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.footerText}>Finalize inventory and par levels</Text>
      </View>
    </SafeAreaView>
  );
}

function BottleRow({ bottle, onUpdate, onRemove }: { bottle: Bottle; onUpdate: (updates: Partial<Bottle>) => void; onRemove: () => void }) {
  return (
    <View style={styles.bottleRow}>
      <View style={styles.bottleInfo}>
        <Text style={styles.bottleName}>{bottle.name}</Text>
        <Text style={styles.bottleBrand}>{bottle.brand}</Text>
      </View>

      <View style={styles.controls}>
        {/* Liquid Level */}
        <View style={styles.controlGroup}>
          <View style={styles.levelButtons}>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.value}
                style={[
                  styles.levelButton,
                  {
                    backgroundColor: bottle.level === l.value ? COLORS.accentPrimary : `${COLORS.border}33`,
                    borderColor: bottle.level === l.value ? COLORS.accentPrimary : `${COLORS.border}66`,
                  },
                ]}
                onPress={() => onUpdate({ level: l.value as LiquidLevel })}
              />
            ))}
          </View>
          <Text style={styles.controlLabel}>{bottle.level || 'Empty'}</Text>
        </View>

        {/* Current Stock */}
        <View style={styles.controlGroup}>
          <View style={styles.inputBox}>
            <TouchableOpacity
              onPress={() => onUpdate({ currentStock: Math.max(0, (bottle.currentStock || 0) - 1) })}
              style={styles.inputButton}
            >
              <Minus size={12} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.inputValue}>{bottle.currentStock || 0}</Text>
            <TouchableOpacity
              onPress={() => onUpdate({ currentStock: (bottle.currentStock || 0) + 1 })}
              style={styles.inputButton}
            >
              <Plus size={12} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.controlLabel}>Back up</Text>
        </View>

        {/* Par Level */}
        <View style={styles.controlGroup}>
          <View style={[styles.inputBox, { backgroundColor: `${COLORS.accentPrimary}1A`, borderColor: `${COLORS.accentPrimary}4D` }]}>
            <TouchableOpacity
              onPress={() => onUpdate({ parLevel: Math.max(0, bottle.parLevel - 1) })}
              style={styles.inputButton}
            >
              <Minus size={12} color={COLORS.accentPrimary} />
            </TouchableOpacity>
            <Text style={[styles.inputValue, { color: COLORS.accentPrimary }]}>{bottle.parLevel}</Text>
            <TouchableOpacity
              onPress={() => onUpdate({ parLevel: bottle.parLevel + 1 })}
              style={styles.inputButton}
            >
              <Plus size={12} color={COLORS.accentPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.controlLabel, { color: COLORS.accentPrimary }]}>Par</Text>
        </View>

        {/* Delete */}
        <TouchableOpacity onPress={onRemove} style={styles.deleteButton}>
          <Trash2 size={14} color={COLORS.textTertiary} />
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: `${COLORS.surface}80`,
    borderWidth: 1,
    borderColor: `${COLORS.border}80`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchIcon: {
    marginLeft: SPACING.md,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: `${COLORS.surface}80`,
    borderWidth: 1,
    borderColor: `${COLORS.border}80`,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xs,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    paddingBottom: 200,
  },
  bottleRow: {
    backgroundColor: `${COLORS.surface}4D`,
    borderWidth: 1,
    borderColor: `${COLORS.border}4D`,
    borderRadius: 8,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  bottleInfo: {
    width: '50%',
  },
  bottleName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  bottleBrand: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  controlGroup: {
    flex: 1,
    alignItems: 'center',
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 2,
    width: '100%',
    marginBottom: SPACING.sm,
  },
  levelButton: {
    flex: 1,
    height: 24,
    borderRadius: 1,
    borderWidth: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    backgroundColor: `${COLORS.textPrimary}0A`,
    borderWidth: 1,
    borderColor: `${COLORS.textPrimary}1A`,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    width: '100%',
  },
  inputButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  controlLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
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
    backgroundColor: COLORS.primaryDark,
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
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.md,
    letterSpacing: 0.5,
  },
});
