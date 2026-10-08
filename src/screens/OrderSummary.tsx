import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Animated, Modal, Alert, Linking, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as Print from 'expo-print';
import * as Clipboard from 'expo-clipboard';
import { COLORS, DISTRIBUTOR_COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Mail, Printer, Phone, Copy, CheckCircle2, ChevronRight, Truck, AlertTriangle, X, Hash } from 'lucide-react-native';
import { emailProblemText } from '../utils/emailProblem';
import { useInventory, newOrderRef } from '../context/InventoryContext';
import { useDistributors } from '../context/DistributorContext';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useProductBook, useBottleDefaults, bookProduct } from '../context/ProductBookContext';
import { apiService } from '../services/api';
import { OrderItem, OrderDistributorSummary } from '../types';
import { bottleSubtitle } from '../utils/bottleSubtitle';
import { orderQuantity } from '../utils/orderQuantity';
import { planOrderLine, weeklyUse, shortQty, longQty, UsageData } from '../utils/caseOrder';
import ConnectionNotice from '../components/ConnectionNotice';

interface Props {
  onRestart: () => void;
  onViewOrders: () => void;
  // Only `distributors` is read — accepts both the list-row Order shape and
  // the fuller OrderDetail shape returned by GET /orders/{id}.
  presetOrder?: { distributors: OrderDistributorSummary[] } | null;
}

export default function OrderSummary({ onRestart, onViewOrders, presetOrder }: Props) {
  const { bottles, isHydrated, updateBottle, clearBottles, getOrderRef } = useInventory();
  // A reorder from history isn't a count's draft: one id for this screen.
  const reorderRef = useRef(newOrderRef());
  const { distributors, initialsFor, accountFor, setAccountNumber, refresh: refreshDistributors } = useDistributors();
  // A bounce Resend reported since launch should show before this order goes.
  useEffect(() => { refreshDistributors(); }, [refreshDistributors]);
  const { currentLocation, loadFailed: locationLoadFailed, reload: reloadLocations } = useLocation();
  const { user, updateProfile } = useAuth();
  const { priceFor, setDistributor, orderChoiceFor, caseSizeFor, setOrderChoice } = useProductBook();
  const { parOf, distributorOf } = useBottleDefaults();
  const [isSending, setIsSending] = useState(false);
  const [sentDistributors, setSentDistributors] = useState<string[]>([]);
  // Snapshot of what actually went out, captured before the draft is cleared.
  // The success screen used to read live `groupedByDistributor`, which derives
  // from `bottles` — already emptied by clearBottles() in the same handler, so
  // it rendered "Orders Sent!" above an empty list.
  const [sentGroups, setSentGroups] = useState<
    { id: string; name: string; email?: string | null; initials: string; orderNumber?: number | null }[]
  >([]);
  // Order number each distributor's email carried, by distributor id. Kept
  // across sends: a distributor that failed and was re-sent went out as a new
  // order with its own number, so one number for the whole screen would be
  // wrong for someone.
  const [sentNumbers, setSentNumbers] = useState<Record<string, number>>({});
  const [checkAnim] = useState(new Animated.Value(0));
  const [assigningItem, setAssigningItem] = useState<OrderItem | null>(null);
  const [showRestaurantSetup, setShowRestaurantSetup] = useState(false);
  const [restaurantNameInput, setRestaurantNameInput] = useState('');
  const [managerNameInput, setManagerNameInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCallList, setShowCallList] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // The account number, asked right where it's needed: a distributor with none
  // saved shows "+ Add account #" in its box. Saved for good on Save; if that
  // fails (bar wifi) the order still carries what was typed and the server
  // saves it with the send.
  const [accountEditing, setAccountEditing] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState<Record<string, string>>({});
  const [accountUnsaved, setAccountUnsaved] = useState<Record<string, string>>({});
  const accountShown = (distId: string) => accountUnsaved[distId] || accountFor(distId);
  const saveAccount = async (distId: string) => {
    const value = (accountDraft[distId] || '').trim();
    setAccountEditing(null);
    if (!value || value === accountFor(distId)) return;
    setAccountUnsaved(prev => ({ ...prev, [distId]: value }));
    try {
      await setAccountNumber(distId, value);
      setAccountUnsaved(prev => {
        const next = { ...prev };
        delete next[distId];
        return next;
      });
    } catch {
      // Kept in accountUnsaved: it goes with the order and is saved then.
    }
  };

  // How fast this bar goes through each bottle, from its own sent orders —
  // what decides whether a shortfall rounds up to a case (utils/caseOrder).
  // Unavailable (offline, an older server) is fine: par stands in for it.
  const [usage, setUsage] = useState<UsageData | null>(null);
  const locationId = currentLocation?.id;
  useEffect(() => {
    if (!locationId || presetOrder) return;
    let live = true;
    apiService.getOrderUsage(locationId)
      .then(u => { if (live) setUsage(u); })
      .catch(() => { if (live) setUsage(null); });
    return () => { live = false; };
  }, [locationId, presetOrder]);

  // Reordering a past order skips the bottles/par-level derivation entirely —
  // the items and quantities come straight from what was ordered before.
  const orderItems: OrderItem[] = presetOrder
    ? presetOrder.distributors.flatMap((dist, di) =>
        dist.items.map((item, ii) => ({
          bottleId: `reorder-${di}-${ii}`,
          bottleName: item.name,
          name: item.name,
          // Bottles; a case line comes back as one, so a reorder keeps its cases.
          quantity: item.quantity,
          price: item.price || 0,
          category: 'Other',
          urgency: 'normal' as OrderItem['urgency'],
          distributorId: dist.distributor_id || undefined,
          productId: item.product_id || undefined,
          size: item.size || undefined,
          unit: item.unit === 'case' && item.case_size ? ('case' as const) : ('bottle' as const),
          caseSize: item.unit === 'case' ? item.case_size ?? null : null,
        }))
      )
    : bottles
        .map(b => {
          // Par comes from the product book by product, for the same reason the
          // price does: set once for this bar, and already correct on a bottle
          // this week's scan just identified. The quantity rule itself is shared
          // with Review & Par's "N SHORT" badge (utils/orderQuantity).
          const shortfall = orderQuantity(b.currentStock, parOf(b), currentLocation?.reorder_threshold);

          // Order lines show the full product: "Belvedere Vodka", "Gatorade Blue Bolt" —
          // never the raw scanned name, which is literally "Original" for a base product.
          const label = [b.brand, bottleSubtitle(b)].filter(Boolean).join(' ') || b.name;

          // Case or bottles: decided here from how fast this bar goes through
          // the bottle, unless the bar chose (utils/caseOrder). Nobody is asked.
          const caseSize = caseSizeFor(b.productId, b.size) ?? null;
          const { perWeek } = weeklyUse({ productId: b.productId, name: label, par: parOf(b), usage });
          const plan = planOrderLine({
            shortfall, caseSize, choice: orderChoiceFor(b.productId), perWeek,
          });
          const totalQuantity = plan.quantity;

          return {
            bottleId: b.id,
            bottleName: label,
            name: label,
            quantity: totalQuantity,
            // Looked up from the price book by product rather than read off the
            // bottle, so a bottle the AI just identified is already priced and a
            // price edited in Pricing shows up here without re-counting anything.
            price: priceFor(b.productId) ?? 0,
            category: b.category,
            urgency: (totalQuantity > 5 ? 'critical' : 'normal') as OrderItem['urgency'],
            distributorId: distributorOf(b),
            productId: b.productId,
            // Sent so the email can name it ("Tito's 1L") — unless the label
            // already says it.
            size: b.size && !label.toLowerCase().includes(b.size.toLowerCase()) ? b.size : undefined,
            unit: plan.unit,
            caseSize: plan.caseSize,
            shortfall,
            reason: plan.reason,
            chosen: plan.chosen,
            canSwitch: !!caseSize && !!b.productId,
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

  // The same colour for a distributor on every order (constants/colors).
  const distributorColor = (id: string) => {
    const i = distributors.findIndex(d => d.id === id);
    return DISTRIBUTOR_COLORS[(i < 0 ? 0 : i) % DISTRIBUTOR_COLORS.length];
  };

  // "Acct #4471" — what the email will carry.
  const cardInfo = (distId: string) => {
    const out: string[] = [];
    const acct = accountShown(distId);
    if (acct) out.push(`Acct #${acct}`);
    return out;
  };

  // One tap flips a line between cases and bottles, and the bar's choice is
  // saved for that bottle — so it's never asked again, and the app never
  // second-guesses it on a later order.
  const switchUnit = (item: OrderItem) => {
    const bottle = bottles.find(b => b.id === item.bottleId);
    const product = bottle ? bookProduct(bottle) : undefined;
    if (!product || !item.canSwitch) return;
    const size = caseSizeFor(product.id, product.size);
    if (item.unit === 'case') setOrderChoice(product, 'bottle');
    else if (size) setOrderChoice(product, 'case', size);
  };

  // The small grey line under a bottle: why it's a case or bottles, or that
  // the bar chose it. Nothing when there was nothing to decide.
  const lineNote = (item: OrderItem) => {
    if (presetOrder || !item.canSwitch) return '';
    if (item.chosen) return item.unit === 'case' ? 'You order this by the case · tap to switch' : 'You order this by the bottle · tap to switch';
    return item.reason ? `${capitalize(item.reason)} · tap to switch` : '';
  };

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

    // Never re-email a distributor that already received this order. Without
    // this, fixing one bad address and hitting send again lands a duplicate
    // order on everyone who succeeded the first time — and a duplicate order
    // means a duplicate delivery the bar has to pay for.
    const pending = groupedByDistributor.filter(
      g => !sentDistributors.includes(g.distributor.id)
    );
    if (pending.length === 0) return;

    setIsSending(true);
    try {
      const clientRef = presetOrder ? reorderRef.current : await getOrderRef();
      const response = await apiService.sendOrderEmails({
        client_ref: clientRef,
        location_id: currentLocation.id,
        location_name: currentLocation.name ?? 'My Bar',
        orders: pending.map(g => ({
          distributor_id: g.distributor.id,
          ...(accountUnsaved[g.distributor.id] ? { account_number: accountUnsaved[g.distributor.id] } : {}),
          items: g.items.map(i => ({
            name: i.name || i.bottleName,
            quantity: i.quantity,          // bottles, case lines included
            price: i.price || undefined,
            size: i.size || undefined,
            product_id: i.productId,
            ...(i.unit === 'case' && i.caseSize ? { unit: 'case' as const, case_size: i.caseSize } : {}),
          })),
        })),
      });

      const sentIds = response.results
        .filter(r => r.status === 'sent')
        .map(r => r.distributor_id);
      const failures = response.results.filter(r => r.status !== 'sent');

      const allSentIds = Array.from(new Set([...sentDistributors, ...sentIds]));
      if (sentIds.length > 0) setSentDistributors(allSentIds);
      // Each distributor's own number: one already emailed on an earlier try
      // (a retry after a lost response) keeps the number that email carried.
      const allNumbers = { ...sentNumbers };
      response.results.forEach(r => {
        const num = r.order_number ?? response.order_number;
        if (r.status === 'sent' && num) allNumbers[r.distributor_id] = num;
      });
      setSentNumbers(allNumbers);

      const everySent =
        groupedByDistributor.length > 0 &&
        groupedByDistributor.every(g => allSentIds.includes(g.distributor.id));

      if (failures.length > 0) {
        const lines = failures.map(f => {
          const who = f.distributor_name ?? 'Distributor';
          return f.status === 'no_email'
            ? `${who}: no email on file — add one in Settings`
            : `${who}: ${f.error ?? 'send failed'}`;
        });
        Alert.alert(
          sentIds.length > 0 ? 'Some emails failed' : "Emails didn't send",
          [
            ...lines,
            '',
            'Your counts are saved. Fix the problem and send again — anyone who already got their order will not be emailed twice.',
          ].join('\n')
        );
      }

      // The draft is the only copy of a count that took real time to collect,
      // so it is destroyed only once EVERY distributor has actually been
      // emailed. This used to fire whenever any single one succeeded, which
      // wiped the whole count and left no way to order from the distributor
      // that failed short of recounting the entire bar.
      if (everySent) {
        setSentGroups(
          groupedByDistributor.map(g => ({
            id: g.distributor.id,
            name: g.distributor.name,
            email: g.distributor.email,
            initials: initialsFor(g.distributor.id),
            orderNumber: allNumbers[g.distributor.id] ?? null,
          }))
        );
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
        : detail?.message ?? "Couldn't reach the server. Check your connection and try again — it's safe to resend: nobody who already got this order is emailed twice.";
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
      const lines = group.items.map(item => `  - ${item.name || item.bottleName} x ${longQty(lineQty(item))}`).join('\n');
      const info = cardInfo(group.distributor.id).join(' · ');
      return `${group.distributor.name}${info ? `\n${info}` : ''}\n${lines}`;
    }).join('\n\n');

    return `${title}\n${dateStr}\n\n${sections}`;
  };

  const buildOrderHtml = () => {
    const title = user?.business_name || currentLocation?.name || 'Order Summary';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const sections = groupedByDistributor.map(group => `
      <h2>${escapeHtml(group.distributor.name)}</h2>
      ${cardInfo(group.distributor.id).length ? `<p>${escapeHtml(cardInfo(group.distributor.id).join(' · '))}</p>` : ''}
      <table>
        <tr><th>Item</th><th>Qty</th></tr>
        ${group.items.map(item => `<tr><td>${escapeHtml(item.name || item.bottleName)}</td><td>${escapeHtml(longQty(lineQty(item)))}</td></tr>`).join('')}
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
    // Same dead end as Review: hydration can't happen without a location, so
    // a total location failure has to land on a retry state, not a spinner.
    if (locationLoadFailed) {
      return <ConnectionNotice onRetry={reloadLocations} />;
    }
    return (
      <SafeAreaView style={[styles.container, styles.loadingCentered]}>
        <ActivityIndicator color={COLORS.accentText} />
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

  // Success state — only once every distributor has been emailed. A partial
  // send keeps the user on the order screen with their counts intact so they
  // can fix the failure and finish, instead of being shown a green checkmark
  // over an order that never fully went out.
  if (sentGroups.length > 0) {
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
            {sentGroups.map(group => (
              <View key={group.id} style={styles.sentDistributorCard}>
                <View style={styles.distributorBadge}>
                  <Text style={styles.distributorInitials}>
                    {group.initials}
                  </Text>
                </View>
                <View style={styles.distributorInfo}>
                  <Text style={styles.distributorName}>{group.name}</Text>
                  <Text style={styles.distributorEmail}>
                    {group.email || 'No email'}
                  </Text>
                  {group.orderNumber ? (
                    <Text style={styles.distributorEmail}>Order #{group.orderNumber}</Text>
                  ) : null}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Distributor Breakdown (Sidebar on desktop, top on mobile) */}
        <View style={styles.distributorSection}>
          <Text style={styles.sectionHeader}>Distributor Breakdown</Text>
          {groupedByDistributor.map(group => (
            <View
              key={group.distributor.id}
              style={[
                styles.distributorCard,
                {
                  backgroundColor: `${distributorColor(group.distributor.id)}08`,
                  borderColor: `${distributorColor(group.distributor.id)}20`,
                },
              ]}
            >
              <View style={styles.distributorCardHeader}>
                <Text style={styles.distributorCardTitle}>{group.distributor.name}</Text>
                <View style={[
                  styles.initialsBadge,
                  { backgroundColor: `${distributorColor(group.distributor.id)}15` },
                ]}>
                  <Text style={styles.initialsText}>
                    {initialsFor(group.distributor.id)}
                  </Text>
                </View>
              </View>
              {emailProblemText(group.distributor) ? (
                <View style={styles.emailProblem}>
                  <AlertTriangle size={14} color={COLORS.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emailProblemTitle}>{emailProblemText(group.distributor)!.title}</Text>
                    <Text style={styles.emailProblemDetail}>{emailProblemText(group.distributor)!.detail}</Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.cardInfoRow}>
                {accountEditing === group.distributor.id ? (
                  <View style={styles.accountEdit}>
                    <Hash size={13} color={COLORS.textTertiary} />
                    <TextInput
                      style={styles.accountInput}
                      autoFocus
                      placeholder="Account # (on any invoice)"
                      placeholderTextColor={COLORS.textTertiary}
                      value={accountDraft[group.distributor.id] ?? accountShown(group.distributor.id) ?? ''}
                      onChangeText={t => setAccountDraft(prev => ({ ...prev, [group.distributor.id]: t }))}
                      onSubmitEditing={() => saveAccount(group.distributor.id)}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                    <TouchableOpacity onPress={() => saveAccount(group.distributor.id)} activeOpacity={0.7}>
                      <Text style={styles.infoAction}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.infoChip}
                    onPress={() => {
                      setAccountDraft(prev => ({ ...prev, [group.distributor.id]: accountShown(group.distributor.id) ?? '' }));
                      setAccountEditing(group.distributor.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={accountShown(group.distributor.id) ? styles.infoText : styles.infoAction}>
                      {accountShown(group.distributor.id) ? `Acct #${accountShown(group.distributor.id)}` : 'Add account #'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {group.items.map(item => (
                <View key={item.bottleId} style={styles.distributorItem}>
                  <View style={styles.distributorItemText}>
                    <Text style={styles.distributorItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {lineNote(item) ? (
                      <Text style={styles.distributorItemReason} numberOfLines={2}>
                        {lineNote(item)}
                      </Text>
                    ) : null}
                  </View>
                  {item.canSwitch && !presetOrder ? (
                    <TouchableOpacity
                      onPress={() => switchUnit(item)}
                      style={styles.unitChip}
                      activeOpacity={0.7}
                      accessibilityLabel={`${longQty(lineQty(item))}. Tap to order ${item.unit === 'case' ? 'bottles' : 'by the case'} instead`}
                    >
                      <Text style={styles.distributorItemQty}>{shortQty(lineQty(item))}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.distributorItemQty}>{shortQty(lineQty(item))}</Text>
                  )}
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
                          // Saved against the product, not just this order —
                          // assigning here was previously local-only, so the
                          // same bottle came back unassigned on the next count.
                          const bottle = bottles.find(b => b.id === assigningItem.bottleId);
                          const product = bottle ? bookProduct(bottle) : undefined;
                          if (product) setDistributor(product, dist.id);
                          updateBottle(assigningItem.bottleId, { distributorId: dist.id });
                          setAssigningItem(null);
                        }
                      }}
                    >
                      <View style={styles.modalDistBadge}>
                        <Text style={styles.modalDistInitials}>
                          {initialsFor(dist.id)}
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
                    {initialsFor(group.distributor.id)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalDistName}>{group.distributor.name}</Text>
                  <Text style={styles.modalDistPhone}>
                    {group.distributor.phone || 'No phone on file — add one in Settings'}
                  </Text>
                </View>
                {group.distributor.phone && <Phone size={16} color={COLORS.accentText} />}
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

const lineQty = (item: OrderItem) => ({
  quantity: item.quantity,
  unit: item.unit === 'case' ? ('case' as const) : ('bottle' as const),
  caseSize: item.caseSize ?? null,
});

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

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
  emailProblem: {
    flexDirection: 'row',
    gap: 8,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.warning}55`,
    backgroundColor: `${COLORS.warning}12`,
    marginBottom: SPACING.sm,
  },
  emailProblemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.warning,
  },
  emailProblemDetail: {
    fontSize: FONT_SIZES.xs + 1,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  cardInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: `${COLORS.textPrimary}0D`,
  },
  infoText: {
    fontSize: FONT_SIZES.xs + 1,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  infoAction: {
    fontSize: FONT_SIZES.xs + 1,
    color: COLORS.accentText,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  accountEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}60`,
  },
  accountInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    paddingVertical: 3,
  },
  distributorItemText: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  distributorItemName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  distributorItemReason: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  unitChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}60`,
    backgroundColor: `${COLORS.accentPrimary}14`,
  },
  distributorItemQty: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentText,
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
    color: COLORS.accentText,
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
    color: COLORS.accentText,
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
    shadowColor: COLORS.accentPrimary,
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
    shadowColor: COLORS.accentPrimary,
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
    color: COLORS.accentText,
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
    shadowColor: COLORS.accentPrimary,
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
