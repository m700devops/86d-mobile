import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { ArrowLeft, Trash2, Edit2, Check, ChevronRight, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Types for scanned bottles from continuous scan
interface ScannedBottle {
  id: string;
  name: string;
  brand: string;
  category: string;
  level: number; // 0-1 decimal
  timestamp: number;
  imageUri?: string;
}

interface Props {
  bottles: ScannedBottle[];
  onBack: () => void;
  onComplete: (bottles: ScannedBottle[]) => void;
  onEdit: (bottle: ScannedBottle) => void;
}

export default function PenScanReview({ bottles, onBack, onComplete, onEdit }: Props) {
  const [scannedBottles, setScannedBottles] = useState<ScannedBottle[]>(bottles);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScannedBottles(prev => prev.filter(b => b.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    Alert.alert(
      'Delete Selected?',
      `Remove ${selectedIds.size} bottle(s) from the scan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setScannedBottles(prev => prev.filter(b => !selectedIds.has(b.id)));
            setSelectedIds(new Set());
          }
        },
      ]
    );
  };

  const toggleSelection = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = (bottle: ScannedBottle) => {
    onEdit(bottle);
  };

  const handleDone = async () => {
    if (scannedBottles.length === 0) {
      Alert.alert('No Bottles', 'You need to scan at least one bottle to continue.');
      return;
    }
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(scannedBottles);
  };

  const getLevelLabel = (level: number): string => {
    if (level >= 0.9) return 'Full';
    if (level >= 0.75) return '3/4';
    if (level >= 0.5) return 'Half';
    if (level >= 0.25) return '1/4';
    return 'Empty';
  };

  const getLevelColor = (level: number): string => {
    if (level >= 0.75) return COLORS.success;
    if (level >= 0.5) return COLORS.warning;
    if (level >= 0.25) return COLORS.error;
    return '#F44336';
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Scans</Text>
          <Text style={styles.headerSubtitle}>{scannedBottles.length} bottles captured</Text>
        </View>
        {selectedIds.size > 0 ? (
          <TouchableOpacity onPress={handleDeleteSelected} style={styles.deleteSelectedButton}>
            <Trash2 size={20} color={COLORS.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <AlertCircle size={16} color={COLORS.accentSecondary} />
        <Text style={styles.infoText}>
          Tap any bottle to edit. Swipe left to delete.
        </Text>
      </View>

      {/* Bottle List */}
      {scannedBottles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No bottles scanned yet</Text>
          <Text style={styles.emptySubtitle}>
            Go back and start scanning to capture bottles.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: COLORS.accentPrimary }]}
            onPress={onBack}
          >
            <Text style={styles.emptyButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scannedBottles}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <BottleRow
              bottle={item}
              index={index}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelection(item.id)}
              onDelete={() => handleDelete(item.id)}
              onEdit={() => handleEdit(item)}
              getLevelLabel={getLevelLabel}
              getLevelColor={getLevelColor}
              formatTime={formatTime}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Footer */}
      {scannedBottles.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerCount}>{scannedBottles.length} bottles</Text>
            <Text style={styles.footerHint}>Tap Done to continue</Text>
          </View>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: COLORS.success }]}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

interface BottleRowProps {
  bottle: ScannedBottle;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  getLevelLabel: (level: number) => string;
  getLevelColor: (level: number) => string;
  formatTime: (timestamp: number) => string;
}

function BottleRow({
  bottle,
  index,
  isSelected,
  onToggleSelect,
  onDelete,
  onEdit,
  getLevelLabel,
  getLevelColor,
  formatTime,
}: BottleRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.bottleRow,
        isSelected && styles.bottleRowSelected,
      ]}
      onPress={onToggleSelect}
      onLongPress={onEdit}
      delayLongPress={500}
    >
      {/* Selection Checkbox */}
      <View style={styles.checkbox}>
        {isSelected ? (
          <View style={[styles.checkboxChecked, { backgroundColor: COLORS.accentPrimary }]}>
            <Check size={14} color="#FFFFFF" />
          </View>
        ) : (
          <View style={styles.checkboxUnchecked} />
        )}
      </View>

      {/* Index Number */}
      <View style={styles.indexContainer}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>

      {/* Bottle Info */}
      <View style={styles.bottleInfo}>
        <Text style={styles.bottleName} numberOfLines={1}>
          {bottle.name}
        </Text>
        <Text style={styles.bottleTime}>{formatTime(bottle.timestamp)}</Text>
      </View>

      {/* Level Indicator */}
      <View style={styles.levelContainer}>
        <View style={styles.levelBar}>
          <View
            style={[
              styles.levelFill,
              {
                backgroundColor: getLevelColor(bottle.level),
                width: `${bottle.level * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.levelText, { color: getLevelColor(bottle.level) }]}>
          {getLevelLabel(bottle.level)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
          <Edit2 size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Trash2 size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
  backButton: {
    padding: SPACING.md,
    marginLeft: -SPACING.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  deleteSelectedButton: {
    padding: SPACING.md,
    marginRight: -SPACING.md,
  },
  placeholder: {
    width: 48,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.accentSecondary}15`,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 8,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accentSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.md,
  },
  bottleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bottleRowSelected: {
    borderColor: COLORS.accentPrimary,
    backgroundColor: `${COLORS.accentPrimary}10`,
  },
  checkbox: {
    marginRight: SPACING.md,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  indexContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.accentPrimary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  indexText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  bottleInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  bottleName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  bottleTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  levelContainer: {
    width: 80,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  levelBar: {
    width: '100%',
    height: 6,
    backgroundColor: `${COLORS.textPrimary}10`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 3,
  },
  levelText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING['2xl'],
  },
  emptyButton: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primaryDark,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerInfo: {
    flex: 1,
  },
  footerCount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  footerHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  doneButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  doneButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
  },
});
