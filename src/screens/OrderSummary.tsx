import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, Animated, Modal } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Mail, FileText, Printer, Copy, CheckCircle2, ChevronRight, Truck, AlertTriangle, X } from 'lucide-react-native';
import { useInventory } from '../context/InventoryContext';
import { useDistributors } from '../context/DistributorContext';
import { OrderItem, Distributor } from '../types';

interface Props {
  onRestart: () => void;
}

export default function OrderSummary({ onRestart }: Props) {
  const { bottles, updateBottle } = useInventory();
  const { distributors } = useDistributors();
  const [isSending, setIsSending] = useState(false);
  const [sentDistributors, setSentDistributors] = useState<string[]>([]);
  const [checkAnim] = useState(new Animated.Value(0));
  const [assigningItem, setAssigningItem] = useState<OrderItem | null>(null);

  const orderItems: OrderItem[] = bottles
    .map(b => {
      const baseQuantity = Math.max(0, b.parLevel - (b.currentStock || 0));
      const extraQuantity = b.level === 'half' || b.level === '1/4' ? 1 : 0;
      const totalQuantity = baseQuantity + extraQuantity;

      return {
        bottleId: b.id,
        name: b.name,
        quantity: totalQuantity,
        price: b.price || 0,
        category: b.category,
        urgency: totalQuantity > 5 ? 'critical' : 'normal',
        distributorId: b.distributorId,
      };
    })
    .filter(b => b.quantity > 0);

  const groupedByDistributor = distributors
    .map(dist => ({
      distributor: dist,
      items: orderItems.filter(item => item.distributorId === dist.id),
    }))
    .filter(group => group.items.length > 0);

  const unassignedItems = orderItems.filter(item => !item.distributorId);

  const handleSendOrders = () => {
    setIsSending(true);
    setTimeout(() => {
      setSentDistributors(groupedByDistributor.map(g => g.distributor.id));
      setIsSending(false);
      // Animate checkmark
      Animated.spring(checkAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };

  // Empty state
  if (orderItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <CheckCircle2 size={40} color={COLORS.success} />
          </View>
          <Text style={styles.emptyTitle}>All Stocked!</Text>
          <Text style={styles.emptyText}>
            Your current inventory matches all par levels. No orders needed right now.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={onRestart}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Success state after sending
  if (sentDistributors.length > 0) {
    const scale = checkAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successIcon, { transform: [{ scale }] }]}>
            <CheckCircle2 size={48} color={COLORS.success} />
          </Animated.View>
          <Text style={styles.successTitle}>Orders Sent!</Text>

          <View style={styles.distributorList}>
            {groupedByDistributor.map(group => (
              <View key={group.distributor.id} style={styles.sentDistributorCard}>
                <View style={styles.distributorBadge}>
                  <Text style={styles.distributorInitials}>
                    {group.distributor.initials || 'D'}
                  </Text>
                </View>
                <View style={styles.distributorInfo}>
                  <Text style={styles.distributorName}>{group.distributor.name}</Text>
                  <Text style={styles.distributorEmail}>
                    {group.distributor.email || 'No email'}
                  </Text>
                </View>
                <View style={styles.sentBadge}>
                  <Text style={styles.sentBadgeText}>Sent</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { marginTop: SPACING.xl }]}
            onPress={onRestart}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <Text style={styles.headerSubtitle}>
          {orderItems.length} items to order • Main Bar
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Distributor Breakdown (Sidebar on desktop, top on mobile) */}
        <View style={styles.distributorSection}>
          <Text style={styles.sectionHeader}>Distributor Breakdown</Text>
          {groupedByDistributor.map((group, idx) => (
            <View
              key={group.distributor.id}
              style={[
                styles.distributorCard,
                idx === 0 && styles.distributorCardOrange,
                idx === 1 && styles.distributorCardBlue,
                idx === 2 && styles.distributorCardGreen,
              ]}
            >
              <View style={styles.distributorCardHeader}>
                <Text style={styles.distributorCardTitle}>{group.distributor.name}</Text>
                <View style={[
                  styles.initialsBadge,
                  idx === 0 && styles.initialsBadgeOrange,
                  idx === 1 && styles.initialsBadgeBlue,
                  idx === 2 && styles.initialsBadgeGreen,
                ]}>
                  <Text style={styles.initialsText}>
                    {group.distributor.initials || 'D'}
                  </Text>
                </View>
              </View>
              {group.items.map(item => (
                <View key={item.bottleId} style={styles.distributorItem}>
                  <Text style={styles.distributorItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.distributorItemQty}>x{item.quantity}</Text>
                </View>
              ))}
            </View>
          ))}

          {unassignedItems.length > 0 && (
            <View style={styles.unassignedCard}>
              <View style={styles.unassignedHeader}>
                <AlertTriangle size={14} color={COLORS.warning} />
                <Text style={styles.unassignedTitle}>Unassigned</Text>
                <Text style={styles.unassignedHint}>Tap to assign</Text>
              </View>
              {unassignedItems.map(item => (
                <TouchableOpacity
                  key={item.bottleId}
                  style={styles.unassignedItem}
                  onPress={() => setAssigningItem(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.unassignedItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.assignChip}>
                    <Text style={styles.assignChipText}>Assign →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Assign Distributor Modal */}
          <Modal
            visible={assigningItem !== null}
            transparent
            animationType="slide"
            onRequestClose={() => setAssigningItem(null)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setAssigningItem(null)}
            >
              <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Assign Distributor</Text>
                    <Text style={styles.modalSubtitle} numberOfLines={1}>
                      {assigningItem?.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setAssigningItem(null)}>
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                {distributors.length === 0 ? (
                  <Text style={styles.modalEmpty}>No distributors added yet.</Text>
                ) : (
                  distributors.map(dist => (
                    <TouchableOpacity
                      key={dist.id}
                      style={styles.modalDistRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (assigningItem) {
                          updateBottle(assigningItem.bottleId, { distributorId: dist.id });
                          setAssigningItem(null);
                        }
                      }}
                    >
                      <View style={styles.modalDistBadge}>
                        <Text style={styles.modalDistInitials}>
                          {dist.initials || dist.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.modalDistName}>{dist.name}</Text>
                      <ChevronRight size={16} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  ))
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </View>

        {/* Items by Category */}
        <View style={styles.itemsSection}>
          {['Spirits', 'Beer', 'Wine', 'Other'].map(cat => {
            const catItems = orderItems.filter(i => i.category === cat);
            if (catItems.length === 0) return null;

            return (
              <View key={cat} style={styles.categorySection}>
                <Text style={styles.categoryHeader}>{cat}</Text>
                {catItems.map(item => (
                  <OrderItemRow 
                    key={item.bottleId} 
                    item={item} 
                    distributors={distributors} 
                  />
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Export Buttons */}
        <View style={styles.exportButtons}>
          <ExportButton icon={<Mail size={20} />} label="Email" />
          <ExportButton icon={<FileText size={20} />} label="PDF" />
          <ExportButton icon={<Printer size={20} />} label="Print" />
          <ExportButton icon={<Copy size={20} />} label="Copy" />
        </View>

        {/* Main Action Button */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            (isSending || unassignedItems.length > 0) && styles.mainButtonDisabled,
          ]}
          onPress={handleSendOrders}
          disabled={isSending || unassignedItems.length > 0}
          activeOpacity={0.8}
        >
          <Text style={styles.mainButtonText}>
            {isSending 
              ? 'Sending...' 
              : unassignedItems.length > 0 
                ? 'Assign All Distributors' 
                : 'Confirm & Email Distributors'}
          </Text>
          {!isSending && <ChevronRight size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function OrderItemRow({ item, distributors }: { item: OrderItem; distributors: Distributor[] }) {
  const { updateBottle } = useInventory();
  const [selectedDist, setSelectedDist] = useState(item.distributorId);

  return (
    <View style={styles.orderItemRow}>
      {/* Distributor Selector */}
      <View style={styles.distributorSelector}>
        {distributors.map(dist => (
          <TouchableOpacity
            key={dist.id}
            style={[
              styles.distButton,
              selectedDist === dist.id && styles.distButtonSelected,
            ]}
            onPress={() => {
              setSelectedDist(dist.id);
              updateBottle(item.bottleId, { distributorId: dist.id });
            }}
          >
            <Text style={[
              styles.distButtonText,
              selectedDist === dist.id && styles.distButtonTextSelected,
            ]}>
              {dist.initials || dist.name.charAt(0)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Item Details */}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemMeta}>
          {selectedDist && (
            <Text style={styles.itemDistributor}>
              {distributors.find(d => d.id === selectedDist)?.initials || 'D'}
            </Text>
          )}
          <Text style={styles.itemQuantity}>x{item.quantity}</Text>
        </View>
      </View>
    </View>
  );
}

function ExportButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <TouchableOpacity style={styles.exportButton} activeOpacity={0.7}>
      {icon}
      <Text style={styles.exportLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  scrollContent: {
    paddingBottom: 280,
  },
  distributorSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  distributorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  distributorCardOrange: {
    backgroundColor: `${COLORS.accentPrimary}08`,
    borderColor: `${COLORS.accentPrimary}20`,
  },
  distributorCardBlue: {
    backgroundColor: '#3B82F608',
    borderColor: '#3B82F620',
  },
  distributorCardGreen: {
    backgroundColor: '#10B98108',
    borderColor: '#10B98120',
  },
  distributorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  distributorCardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  initialsBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsBadgeOrange: {
    backgroundColor: `${COLORS.accentPrimary}15`,
  },
  initialsBadgeBlue: {
    backgroundColor: '#3B82F615',
  },
  initialsBadgeGreen: {
    backgroundColor: '#10B98115',
  },
  initialsText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  distributorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}30`,
  },
  distributorItemName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  distributorItemQty: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    fontFamily: 'monospace',
  },
  unassignedCard: {
    backgroundColor: `${COLORS.surface}50`,
    borderWidth: 1,
    borderColor: `${COLORS.border}50`,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  unassignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  unassignedTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.warning,
    flex: 1,
  },
  unassignedHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  unassignedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  unassignedItemName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    flex: 1,
  },
  unassignedItemQty: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
  },
  assignChip: {
    backgroundColor: `${COLORS.accentPrimary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}30`,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  assignChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  modalEmpty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    padding: SPACING.xl,
  },
  modalDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}50`,
    gap: SPACING.md,
  },
  modalDistBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${COLORS.accentPrimary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDistInitials: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  modalDistName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  itemsSection: {
    paddingHorizontal: SPACING.lg,
  },
  categorySection: {
    marginBottom: SPACING.lg,
  },
  categoryHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  orderItemRow: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  distributorSelector: {
    flexDirection: 'row',
    padding: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: `${COLORS.primaryDark}50`,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  distButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.textPrimary}08`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distButtonSelected: {
    backgroundColor: COLORS.accentPrimary,
  },
  distButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
  },
  distButtonTextSelected: {
    color: '#FFFFFF',
  },
  itemDetails: {
    padding: SPACING.md,
  },
  itemName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  itemDistributor: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 0.5,
  },
  itemQuantity: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    fontFamily: 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primaryDark,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  exportButton: {
    flex: 1,
    height: 72,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  exportLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  mainButton: {
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
  mainButtonDisabled: {
    opacity: 0.5,
  },
  mainButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.success}20`,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: LETTER_SPACING,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    maxWidth: 280,
  },
  emptyButton: {
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  successIcon: {
    width: 96,
    height: 96,
    backgroundColor: `${COLORS.success}20`,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    letterSpacing: LETTER_SPACING,
  },
  distributorList: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  sentDistributorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  distributorBadge: {
    width: 40,
    height: 40,
    backgroundColor: `${COLORS.accentPrimary}15`,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributorInfo: {
    flex: 1,
  },
  distributorName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  distributorEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  sentBadge: {
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  sentBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
    letterSpacing: 0.5,
  },
  button: {
    height: 56,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
});
