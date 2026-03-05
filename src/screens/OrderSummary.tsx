import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Mail, FileText, Printer, Copy, CheckCircle2, ChevronRight, Truck, AlertTriangle } from 'lucide-react-native';
import { useInventory } from '../context/InventoryContext';
import { useDistributors } from '../context/DistributorContext';
import { OrderItem, Distributor } from '../types';

interface Props {
  onRestart: () => void;
}

export default function OrderSummary({ onRestart }: Props) {
  const { bottles } = useInventory();
  const { distributors } = useDistributors();
  const [isSending, setIsSending] = useState(false);
  const [sentDistributors, setSentDistributors] = useState<string[]>([]);

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
    }, 2000);
  };

  if (orderItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <CheckCircle2 size={48} color={COLORS.success} />
          </View>
          <Text style={styles.emptyTitle}>All Stocked!</Text>
          <Text style={styles.emptyText}>
            Your current inventory matches all par levels. No orders needed right now.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.accentPrimary }]}
            onPress={onRestart}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (sentDistributors.length > 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={56} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Orders Sent!</Text>

          <View style={styles.distributorList}>
            {groupedByDistributor.map(group => (
              <View key={group.distributor.id} style={styles.sentDistributorCard}>
                <View style={styles.distributorBadge}>
                  <Text style={styles.distributorInitials}>{group.distributor.initials || 'D'}</Text>
                </View>
                <View style={styles.distributorInfo}>
                  <Text style={styles.distributorName}>{group.distributor.name}</Text>
                  <Text style={styles.distributorEmail}>{group.distributor.email || 'No email'}</Text>
                </View>
                <Text style={styles.sentBadge}>SENT</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.accentPrimary, marginTop: SPACING.xl }]}
            onPress={onRestart}
          >
            <Text style={styles.buttonText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Order Summary</Text>
          <View style={styles.headerSubtitle}>
            <Text style={styles.subtitleText}>{orderItems.length} items to order</Text>
            <View style={styles.dot} />
            <Text style={styles.subtitleText}>Main Bar</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.leftColumn}>
          {['Spirits', 'Beer', 'Wine', 'Other'].map(cat => {
            const catItems = orderItems.filter(i => i.category === cat);
            if (catItems.length === 0) return null;

            return (
              <View key={cat}>
                <Text style={styles.categoryHeader}>{cat}</Text>
                {catItems.map(item => (
                  <OrderItemRow key={item.bottleId} item={item} distributors={distributors} />
                ))}
              </View>
            );
          })}
        </View>

        <View style={styles.rightColumn}>
          <Text style={styles.categoryHeader}>Distributor Breakdown</Text>
          {groupedByDistributor.map((group, idx) => (
            <View
              key={group.distributor.id}
              style={[
                styles.distributorCard,
                {
                  backgroundColor: idx % 3 === 0 ? `${COLORS.accentPrimary}0D` : idx % 3 === 1 ? '#0D47A11A' : '#0596691A',
                  borderColor: idx % 3 === 0 ? `${COLORS.accentPrimary}33` : idx % 3 === 1 ? '#0D47A133' : '#05966933',
                },
              ]}
            >
              <View style={styles.distributorCardHeader}>
                <Text style={styles.distributorCardTitle}>{group.distributor.name}</Text>
                <View style={styles.initialsTag}>
                  <Text style={styles.initialsText}>{group.distributor.initials || 'D'}</Text>
                </View>
              </View>
              {group.items.map(item => (
                <View key={item.bottleId} style={styles.distributorItem}>
                  <Text style={styles.distributorItemName}>{item.name}</Text>
                  <Text style={styles.distributorItemQty}>x{item.quantity}</Text>
                </View>
              ))}
            </View>
          ))}

          {unassignedItems.length > 0 && (
            <View style={styles.unassignedCard}>
              <View style={styles.unassignedHeader}>
                <Text style={styles.unassignedTitle}>Unassigned</Text>
                <AlertTriangle size={12} color={COLORS.warning} />
              </View>
              {unassignedItems.map(item => (
                <View key={item.bottleId} style={styles.unassignedItem}>
                  <Text style={styles.unassignedItemName}>{item.name}</Text>
                  <Text style={styles.unassignedItemQty}>x{item.quantity}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.exportButtons}>
          <ExportButton icon={<Mail size={20} />} label="Email" />
          <ExportButton icon={<FileText size={20} />} label="PDF" />
          <ExportButton icon={<Printer size={20} />} label="Print" />
          <ExportButton icon={<Copy size={20} />} label="Copy" />
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: COLORS.accentPrimary },
            (isSending || unassignedItems.length > 0) && { opacity: 0.5 },
          ]}
          onPress={handleSendOrders}
          disabled={isSending || unassignedItems.length > 0}
        >
          <Text style={styles.buttonText}>
            {isSending ? 'Sending Emails...' : unassignedItems.length > 0 ? 'Assign All Distributors' : 'Confirm & Email Distributors'}
          </Text>
          {!isSending && <ChevronRight size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function OrderItemRow({ item, distributors }: { item: OrderItem; distributors: Distributor[] }) {
  const [selectedDist, setSelectedDist] = useState(item.distributorId);

  return (
    <View style={styles.orderItemRow}>
      <View style={styles.distributorSelector}>
        <View style={styles.selectorLabel}>
          <Truck size={10} color={COLORS.textTertiary} />
          <Text style={styles.selectorText}>Distributor:</Text>
        </View>
        {distributors.map(dist => (
          <TouchableOpacity
            key={dist.id}
            style={[
              styles.distButton,
              { backgroundColor: selectedDist === dist.id ? COLORS.accentPrimary : 'rgba(255,255,255,0.05)' },
            ]}
            onPress={() => setSelectedDist(dist.id)}
          >
            <Text style={[styles.distButtonText, { color: selectedDist === dist.id ? '#FFFFFF' : COLORS.textTertiary }]}>
              {dist.initials || dist.name.charAt(0)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemMeta}>
          {selectedDist && (
            <Text style={styles.itemDistributor}>{distributors.find(d => d.id === selectedDist)?.initials || 'D'}</Text>
          )}
          <Text style={styles.itemQuantity}>x{item.quantity}</Text>
        </View>
      </View>
    </View>
  );
}

function ExportButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <TouchableOpacity style={styles.exportButton}>
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
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES['5xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  subtitleText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  scrollContent: {
    paddingBottom: 280,
  },
  leftColumn: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  rightColumn: {
    width: '100%',
    backgroundColor: `${COLORS.primaryDark}33`,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.lg,
  },
  categoryHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    marginBottom: SPACING.lg,
  },
  orderItemRow: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: `${COLORS.border}80`,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  distributorSelector: {
    backgroundColor: `${COLORS.primaryDark}33`,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}4D`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectorLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectorText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
  },
  distButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    borderWidth: 0,
  },
  distButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  itemDetails: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  itemName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  itemDistributor: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 0.5,
  },
  itemQuantity: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  distributorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  distributorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  distributorCardTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  initialsTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
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
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  distributorItemName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
  distributorItemQty: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  unassignedCard: {
    backgroundColor: `${COLORS.surface}4D`,
    borderWidth: 1,
    borderColor: `${COLORS.border}4D`,
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
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
  },
  unassignedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  unassignedItemName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  unassignedItemQty: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
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
    backgroundColor: `${COLORS.success}33`,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES['4xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
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
    backgroundColor: `${COLORS.success}33`,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: FONT_SIZES['5xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  distributorList: {
    width: '100%',
    gap: SPACING.md,
  },
  sentDistributorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  distributorBadge: {
    width: 32,
    height: 32,
    backgroundColor: `${COLORS.accentPrimary}1A`,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributorInfo: {
    flex: 1,
  },
  distributorName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  distributorEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  sentBadge: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
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
    gap: SPACING.md,
  },
  exportLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
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
