import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Animated, Modal, Alert, Linking, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as Print from 'expo-print';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Mail, Printer, Phone, Copy, CheckCircle2, ChevronRight, Truck, AlertTriangle, X } from 'lucide-react-native';
import { useInventory } from '../context/InventoryContext';
import { useDistributors } from '../context/DistributorContext';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../context/StaffContext';
import { apiService } from '../services/api';
import { OrderItem, Distributor, OrderDistributorSummary } from '../types';

interface Props {
  onRestart: () => void;
  onViewOrders: () => void;
  // Only `distributors` is read — accepts both the list-row Order shape and
  // the fuller OrderDetail shape returned by GET /orders/{id}.
  presetOrder?: { distributors: OrderDistributorSummary[] } | null;
}

export default function OrderSummary({ onRestart, onViewOrders, presetOrder }: Props) {
  const { bottles, isHydrated, updateBottle, clearBottles } = useInventory();
  const { distributors } = useDistributors();
  const { currentLocation } = useLocation();
  const { user, updateProfile } = useAuth();
  const { staff } = useStaff();
  const [countedBy, setCountedBy] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentDistributors, setSentDistributors] = useState<string[]>([]);
  const [checkAnim] = useState(new Animated.Value(0));
  const [assigningItem, setAssigningItem] = useState<OrderItem | null>(null);
  const [showRestaurantSetup, setShowRestaurantSetup] = useState(false);
  const [restaurantNameInput, setRestaurantNameInput] = useState('');
  const [managerNameInput, setManagerNameInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCallList, setShowCallList] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Reordering a past order skips the bottles/par-level derivation entirely —
  // the items and quantities come straight from what was ordered before.
  const orderItems: OrderItem[] = presetOrder
    ? presetOrder.distributors.flatMap((dist, di) =>
        dist.items.map((item, ii) => ({
          bottleId: `reorder-${di}-${ii}`,
          bottleName: item.name,
          name: item.name,
          quantity: item.quantity,
          price: item.price || 0,
          category: 'Other',
          urgency: 'normal' as OrderItem['urgency'],
          distributorId: dist.distributor_id || undefined,
        }))
      )
    : bottles
        .map(b => {
          // Stock is decimal (4.75 = 4 backups + one open at 3/4) — order whole
          // bottles. 'nearest' (default) skips ordering for a shortfall under
          // half a bottle; 'up' always rounds up so it never under-orders.
          const shortfall = b.parLevel - (b.currentStock || 0);
          const roundedShortfall = currentLocation?.order_rounding_mode === 'up'
            ? Math.ceil(shortfall)
            : Math.round(shortfall);
          const totalQuantity = Math.max(0, roundedShortfall);

          return {
            bottleId: b.id,
            // Order lines show the full product: "Sprite Original", "Gatorade Blue Bolt"
            bottleName: [b.brand, b.name].filter(Boolean).join(' '),
            name: [b.brand, b.name].filter(Boolean).join(' '),
            quantity: totalQuantity,
            price: b.price || 0,
            category: b.category,
            urgency: (totalQuantity > 5 ? 'critical' : 'normal') as OrderItem['urgency'],
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
    if (isSending || groupedByDistributor.length === 0) return;

    if (!currentLocation) {
      Alert.alert("Can't send yet", 'Still loading your bar location — try again in a moment.');
      return;
    }

    if (!user?.business_name) {
      setRestaurantNameInput(user?.business_name ?? '');
      setManagerNameInput(user?.manager_name ?? '');
      setShowRestaurantSetup(true);
      return;
    }

    performSend();
  };

  const handleSaveRestaurantInfo = async () => {
    if (!restaurantNameInput.trim() || savingProfile) return;

    setSavingProfile(true);
    try {
      await updateProfile({
        business_name: restaurantNameInput.trim(),
        manager_name: managerNameInput.trim() || undefined,
      });
      setShowRestaurantSetup(false);
      performSend();
    } catch (error: any) {
      Alert.alert('Save failed', "Couldn't save your restaurant info. Check your connection and try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const performSend = async () => {
    if (!currentLocation) return;

    setIsSending(true);
    try {
      const response = await apiService.sendOrderEmails({
        location_id: currentLocation.id,
        location_name: currentLocation.name ?? 'My Bar',
        staff_name: countedBy ?? undefined,
        orders: groupedByDistributor.map(g => ({
          distributor_id: g.distributor.id,
          items: g.items.map(i => ({
            name: i.name || i.bottleName,
            quantity: i.quantity,
            price: i.price || undefined,
          })),
        })),
      });

      const sentIds = response.results
        .filter(r => r.status === 'sent')
        .map(r => r.distributor_id);
      const failures = response.results.filter(r => r.status !== 'sent');

      if (failures.length > 0) {
        const lines = failures.map(f => {
          const who = f.distributor_name ?? 'Distributor';
          return f.status === 'no_email'
            ? `${who}: no email on file — add one in Settings`
            : `${who}: ${f.error ?? 'send failed'}`;
        });
        Alert.alert(
          sentIds.length > 0 ? 'Some emails failed' : "Emails didn't send",
          lines.join('\n')
        );
      }

      if (sentIds.length > 0) {
        setSentDistributors(sentIds);
        Animated.spring(checkAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();
        // Only clear the scan draft for a normal send — a Reorder doesn't
        // touch `bottles` at all, and clearing here would wipe an unrelated
        // in-progress scan the user might have going.
        if (!presetOrder) {
          clearBottles();
        }
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message = detail?.error === 'email_not_configured'
        ? "Email sending isn't set up on the server yet (RESEND_API_KEY missing)."
        : detail?.message ?? "Couldn't reach the server. Check your connection and try again.";
      Alert.alert('Send failed', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const telUrl = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    setShowCallList(false);
    Linking.openURL(telUrl).catch(() => {
      Alert.alert("Can't place call", 'This device cannot make phone calls.');
    });
  };

  const handlePrint = async () => {
    if (isPrinting) return;

    setIsPrinting(true);
    try {
      await Print.printAsync({ html: buildOrderHtml() });
    } catch (error: any) {
      if (error?.message && !/cancel/i.test(error.message)) {
        Alert.alert('Print failed', "Couldn't open the print dialog. Try again.");
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(buildOrderText());
      Alert.alert('Copied', 'Order summary copied — paste it anywhere (Notes, Messages, another printing app).');
    } catch {
      Alert.alert("Couldn't copy", 'Try again.');
    }
  };

  // Plain-text mirror of buildOrderHtml — the universal fallback that works
  // regardless of what printer (or lack of one) a distributor/client has.
  const buildOrderText = () => {
    const title = user?.business_name || currentLocation?.name || 'Order Summary';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const sections = groupedByDistributor.map(group => {
      const lines = group.items.map(item => `  - ${item.name || item.bottleName} x${item.quantity}`).join('\n');
      return `${group.distributor.name}\n${lines}`;
    }).join('\n\n');

    return `${title}\n${dateStr}\n\n${sections}`;
  };

  const buildOrderHtml = () => {
    const title = user?.business_name || currentLocation?.name || 'Order Summary';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const sections = groupedByDistributor.map(group => `
      <h2>${escapeHtml(group.distributor.name)}</h2>
      <table>
        <tr><th>Item</th><th>Qty</th></tr>
        ${group.items.map(item => `<tr><td>${escapeHtml(item.name || item.bottleName)}</td><td>${item.quantity}</td></tr>`).join('')}
      </table>
    `).join('');

    return `
      <html>
        <head><meta charset="utf-8" /></head>
        <body style="font-family: -apple-system, sans-serif; padding: 24px;">
          <h1>${escapeHtml(title)}</h1>
          <p style="color: #666;">${dateStr}</p>
          ${sections}
        </body>
      </html>
    `;
  };

  // Bottles load asynchronously (local draft, then a server fallback) — a
  // preset Reorder doesn't depend on that at all, but a live order does, and
  // without this a resumed app (or a fresh screen mount before hydration
  // lands) would flash "All Stocked!" instead of the real order.
  if (!presetOrder && !isHydrated) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingCentered]}>
        <ActivityIndicator color={COLORS.accentPrimary} />
      </SafeAreaView>
    );
  }

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
            onPress={onViewOrders}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>View Order History</Text>
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
            {groupedByDistributor.filter(g => sentDistributors.includes(g.distributor.id)).map(group => (
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

          {/* "Sent" means the email service accepted it, not that a human
              read it — nudge toward confirming the first order by phone. */}
          <Text style={styles.successHint}>
            First order with a distributor? A quick call to confirm they got it never hurts.
          </Text>

          <TouchableOpacity
            style={[styles.button, { marginTop: SPACING.lg }]}
            onPress={onViewOrders}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>View All Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={onRestart}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryLinkText}>Start a New Scan</Text>
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
          {orderItems.length} items to order
          {user?.business_name ? ` • ${user.business_name}` : ''}
          {currentLocation?.name && currentLocation.name !== user?.business_name
            ? ` • ${currentLocation.name}`
            : ''}
        </Text>
      </View>

      {staff.length > 0 && (
        <View style={styles.countedByRow}>
          <Text style={styles.countedByLabel}>Counted by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countedByChips}>
            {staff.map(name => (
              <TouchableOpacity
                key={name}
                style={[styles.countedByChip, countedBy === name && styles.countedByChipActive]}
                onPress={() => setCountedBy(countedBy === name ? null : name)}
                activeOpacity={0.8}
              >
                <Text style={[styles.countedByChipText, countedBy === name && styles.countedByChipTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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

        {/* Items by Category — bottle.category comes back lowercase from both
            the AI scan (backend normalizes it) and Manual Add, so group on
            that raw value and only capitalize for display. A hardcoded
            Title-Case bucket list here previously matched nothing and
            silently dropped every scanned item from this section. */}
        <View style={styles.itemsSection}>
          {Array.from(new Set(orderItems.map(i => i.category))).sort().map(cat => {
            const catItems = orderItems.filter(i => i.category === cat);
            if (catItems.length === 0) return null;
            const label = cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Other';

            return (
              <View key={cat} style={styles.categorySection}>
                <Text style={styles.categoryHeader}>{label}</Text>
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

      {/* Restaurant Setup Modal */}
      <Modal
        visible={showRestaurantSetup}
        transparent
        animationType="slide"
        onRequestClose={() => !savingProfile && setShowRestaurantSetup(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Before we send this</Text>
                <Text style={styles.modalSubtitle}>
                  Distributors need to know who the order is from
                </Text>
              </View>
              <TouchableOpacity onPress={() => !savingProfile && setShowRestaurantSetup(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.setupForm}>
              <Text style={styles.setupLabel}>Restaurant / Bar Name</Text>
              <TextInput
                style={styles.setupInput}
                value={restaurantNameInput}
                onChangeText={setRestaurantNameInput}
                placeholder="e.g. The Copper Owl"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
                autoFocus
              />
              <Text style={styles.setupLabel}>Bar Manager Name</Text>
              <TextInput
                style={styles.setupInput}
                value={managerNameInput}
                onChangeText={setManagerNameInput}
                placeholder="e.g. Alex Rivera"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  { marginTop: SPACING.lg },
                  (!restaurantNameInput.trim() || savingProfile) && styles.mainButtonDisabled,
                ]}
                onPress={handleSaveRestaurantInfo}
                disabled={!restaurantNameInput.trim() || savingProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.mainButtonText}>
                  {savingProfile ? 'Saving...' : 'Save & Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Call Distributors Modal */}
      <Modal
        visible={showCallList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCallList(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCallList(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Call a Distributor</Text>
                <Text style={styles.modalSubtitle}>Tap one to call</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCallList(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {groupedByDistributor.map(group => (
              <TouchableOpacity
                key={group.distributor.id}
                style={styles.modalDistRow}
                activeOpacity={group.distributor.phone ? 0.7 : 1}
                onPress={() => handleCall(group.distributor.phone)}
                disabled={!group.distributor.phone}
              >
                <View style={styles.modalDistBadge}>
                  <Text style={styles.modalDistInitials}>
                    {group.distributor.initials || group.distributor.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalDistName}>{group.distributor.name}</Text>
                  <Text style={styles.modalDistPhone}>
                    {group.distributor.phone || 'No phone on file — add one in Settings'}
                  </Text>
                </View>
                {group.distributor.phone && <Phone size={16} color={COLORS.accentPrimary} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Export Buttons */}
        <View style={styles.exportButtons}>
          {/* Email/Call/Print are wired up; Copy is the universal fallback for
              distributors/clients whose printer isn't AirPrint compatible */}
          <ExportButton
            icon={<Mail size={20} />}
            label="Email"
            onPress={unassignedItems.length === 0 && !isSending ? handleSendOrders : undefined}
          />
          <ExportButton
            icon={<Phone size={20} />}
            label="Call"
            onPress={groupedByDistributor.length > 0 ? () => setShowCallList(true) : undefined}
          />
          <ExportButton
            icon={<Printer size={20} />}
            label="Print"
            onPress={!isPrinting ? handlePrint : undefined}
          />
          <ExportButton
            icon={<Copy size={20} />}
            label="Copy"
            onPress={groupedByDistributor.length > 0 ? handleCopy : undefined}
          />
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function ExportButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.exportButton, !onPress && { opacity: 0.4 }]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
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
  loadingCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingLeft: 70,
    paddingRight: SPACING.lg,
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
  countedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  countedByLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  countedByChips: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  countedByChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countedByChipActive: {
    backgroundColor: COLORS.accentPrimary,
    borderColor: COLORS.accentPrimary,
  },
  countedByChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  countedByChipTextActive: {
    color: '#FFFFFF',
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
  modalDistPhone: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  setupForm: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  setupLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  setupInput: {
    height: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
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
  successHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
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
  distributorInitials: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 0.5,
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
  secondaryLink: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  secondaryLinkText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: LETTER_SPACING,
  },
});
