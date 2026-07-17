import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
} from 'react-native';
import * as Print from 'expo-print';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import {
  CheckCircle2, XCircle, MailX, ChevronRight, X, Inbox, Search, RotateCcw, Share2, Printer, TrendingUp,
} from 'lucide-react-native';
import { useLocation } from '../context/LocationContext';
import { apiService } from '../services/api';
import { Order, OrderDetail, OrderDistributorSummary } from '../types';

const PAGE_SIZE = 20;

type FilterKey = 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year', label: 'This Year' },
  { key: 'last_year', label: 'Last Year' },
];

type Row =
  | { type: 'header'; key: string; label: string }
  | { type: 'order'; key: string; order: Order };

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function groupLabel(d: Date, now: Date): string {
  if (isSameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getDateRange(filter: FilterKey): { start?: string; end?: string } {
  const now = new Date();
  switch (filter) {
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
    case 'last_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        end: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1).toISOString() };
    case 'last_year':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
        end: new Date(now.getFullYear(), 0, 1).toISOString(),
      };
    default:
      return {};
  }
}

function formatCost(cost: number | null | undefined): string | null {
  if (cost === null || cost === undefined) return null;
  return `$${cost.toFixed(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Props {
  onBack: () => void;
  onReorder: (order: { distributors: OrderDistributorSummary[] }) => void;
}

export default function OrderHistory({ onBack, onReorder }: Props) {
  const { currentLocation } = useLocation();
  const [viewMode, setViewMode] = useState<'history' | 'trends'>('history');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trendOrders, setTrendOrders] = useState<Order[] | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isPrintingDetail, setIsPrintingDetail] = useState(false);

  // Debounce free-text search before hitting the server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset + refetch whenever the location, filter, or search term changes
  useEffect(() => {
    if (!currentLocation) return;
    let cancelled = false;
    setLoading(true);
    const { start, end } = getDateRange(activeFilter);
    apiService.getOrders({
      locationId: currentLocation.id,
      limit: PAGE_SIZE,
      offset: 0,
      q: debouncedQuery || undefined,
      startDate: start,
      endDate: end,
    })
      .then(res => {
        if (cancelled) return;
        setOrders(res.orders);
        setTotal(res.total);
      })
      .catch(() => {
        if (cancelled) return;
        setOrders([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentLocation, activeFilter, debouncedQuery]);

  // Trends pulls up to 100 orders in range and aggregates client-side — the
  // list endpoint already returns full item/distributor data per order (from
  // the stored order_data blob), so no new backend work is needed for a v1
  // usage view. Real order history, not the old pen-era scans/usage_history
  // tables, which are never written to.
  useEffect(() => {
    if (viewMode !== 'trends' || !currentLocation) return;
    let cancelled = false;
    setTrendsLoading(true);
    const { start, end } = getDateRange(activeFilter);
    apiService.getOrders({
      locationId: currentLocation.id,
      limit: 100,
      offset: 0,
      startDate: start,
      endDate: end,
    })
      .then(res => { if (!cancelled) setTrendOrders(res.orders); })
      .catch(() => { if (!cancelled) setTrendOrders([]); })
      .finally(() => { if (!cancelled) setTrendsLoading(false); });
    return () => { cancelled = true; };
  }, [viewMode, currentLocation, activeFilter]);

  const handleLoadMore = async () => {
    if (!currentLocation || loadingMore || orders.length >= total) return;
    setLoadingMore(true);
    try {
      const { start, end } = getDateRange(activeFilter);
      const res = await apiService.getOrders({
        locationId: currentLocation.id,
        limit: PAGE_SIZE,
        offset: orders.length,
        q: debouncedQuery || undefined,
        startDate: start,
        endDate: end,
      });
      setOrders(prev => [...prev, ...res.orders]);
      setTotal(res.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const openOrder = (id: string) => {
    setSelectedOrderId(id);
    setLoadingDetail(true);
    setOrderDetail(null);
    apiService.getOrder(id)
      .then(setOrderDetail)
      .catch(() => {
        Alert.alert("Couldn't load order", 'Check your connection and try again.');
        setSelectedOrderId(null);
      })
      .finally(() => setLoadingDetail(false));
  };

  const handleReorder = () => {
    if (!orderDetail) return;
    onReorder({ distributors: orderDetail.distributors });
    setSelectedOrderId(null);
  };

  const handleShare = async () => {
    if (!orderDetail) return;
    const dateStr = new Date(orderDetail.created_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    const lines = orderDetail.distributors.map(d =>
      `${d.distributor_name ?? 'Distributor'} (${d.status}):\n` +
      d.items.map(i => `  - ${i.name}${i.size ? ` ${i.size}` : ''} x${i.quantity}`).join('\n')
    ).join('\n\n');
    try {
      await Share.share({ message: `Order — ${dateStr}\n\n${lines}` });
    } catch {
      // user cancelled or share failed silently — nothing actionable to show
    }
  };

  const handlePrintDetail = async () => {
    if (!orderDetail || isPrintingDetail) return;
    setIsPrintingDetail(true);
    try {
      const title = orderDetail.business_name || orderDetail.location.name || 'Order';
      const dateStr = new Date(orderDetail.created_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });
      const sections = orderDetail.distributors.map(d => `
        <h2>${escapeHtml(d.distributor_name ?? 'Distributor')}</h2>
        <table>
          <tr><th>Item</th><th>Qty</th></tr>
          ${d.items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td></tr>`).join('')}
        </table>
      `).join('');
      await Print.printAsync({
        html: `
          <html>
            <head><meta charset="utf-8" /></head>
            <body style="font-family: -apple-system, sans-serif; padding: 24px;">
              <h1>${escapeHtml(title)}</h1>
              <p style="color: #666;">${dateStr}</p>
              ${sections}
            </body>
          </html>
        `,
      });
    } catch (error: any) {
      if (error?.message && !/cancel/i.test(error.message)) {
        Alert.alert('Print failed', "Couldn't open the print dialog. Try again.");
      }
    } finally {
      setIsPrintingDetail(false);
    }
  };

  const now = new Date();
  const rows: Row[] = (() => {
    const out: Row[] = [];
    let lastLabel = '';
    for (const o of orders) {
      const label = groupLabel(new Date(o.created_at), now);
      if (label !== lastLabel) {
        out.push({ type: 'header', key: `h-${label}-${o.id}`, label });
        lastLabel = label;
      }
      out.push({ type: 'order', key: o.id, order: o });
    }
    return out;
  })();

  const canLoadMore = orders.length < total;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>What you've ordered, and when</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, viewMode === 'history' && styles.tabButtonActive]}
          onPress={() => setViewMode('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, viewMode === 'history' && styles.tabButtonTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, viewMode === 'trends' && styles.tabButtonActive]}
          onPress={() => setViewMode('trends')}
          activeOpacity={0.8}
        >
          <TrendingUp size={14} color={viewMode === 'trends' ? '#FFFFFF' : COLORS.textSecondary} />
          <Text style={[styles.tabButtonText, viewMode === 'trends' && styles.tabButtonTextActive]}>Trends</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'trends' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TrendsView orders={trendOrders} loading={trendsLoading} />
          <TouchableOpacity style={styles.backLink} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backLinkText}>Back to Scanning</Text>
          </TouchableOpacity>
        </>
      ) : (
      <>
      <View style={styles.searchRow}>
        <Search size={16} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search distributor or item..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchInput}
          onChangeText={setSearchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')}>
            <X size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accentPrimary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.centered}>
          <Inbox size={40} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>
            {debouncedQuery || activeFilter !== 'all' ? 'No orders match' : 'No orders yet'}
          </Text>
          <Text style={styles.emptyText}>
            {debouncedQuery || activeFilter !== 'all'
              ? 'Try a different search term or time range.'
              : "Orders you send will show up here — even years from now."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={canLoadMore ? handleLoadMore : undefined}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionHeader}>{item.label}</Text>;
            }
            return <OrderRow order={item.order} onPress={() => openOrder(item.order.id)} />;
          }}
          ListFooterComponent={
            canLoadMore ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator color={COLORS.textSecondary} size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      <TouchableOpacity style={styles.backLink} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.backLinkText}>Back to Scanning</Text>
      </TouchableOpacity>
      </>
      )}

      {/* Order Detail Modal */}
      <Modal
        visible={selectedOrderId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrderId(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedOrderId(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {loadingDetail || !orderDetail ? (
              <View style={[styles.centered, { paddingVertical: SPACING['3xl'] }]}>
                <ActivityIndicator color={COLORS.accentPrimary} />
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {new Date(orderDetail.created_at).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {new Date(orderDetail.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit',
                      })}
                      {orderDetail.business_name ? ` · ${orderDetail.business_name}` : ''}
                      {formatCost(orderDetail.estimated_cost) ? ` · ${formatCost(orderDetail.estimated_cost)}` : ''}
                      {orderDetail.staff_name ? ` · Counted by ${orderDetail.staff_name}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedOrderId(null)}>
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={orderDetail.distributors}
                  keyExtractor={(d, i) => d.distributor_id ?? `d-${i}`}
                  style={{ maxHeight: 360 }}
                  contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
                  renderItem={({ item: dist }) => {
                    const distCost = dist.items.reduce(
                      (sum, i) => sum + (i.price ? i.price * i.quantity : 0), 0
                    );
                    return (
                      <View style={styles.distCard}>
                        <View style={styles.distCardHeader}>
                          <Text style={styles.distCardName}>{dist.distributor_name ?? 'Distributor'}</Text>
                          <StatusBadge status={dist.status} />
                        </View>
                        {dist.items.map((it, idx) => (
                          <View key={idx} style={styles.distItemRow}>
                            <Text style={styles.distItemName} numberOfLines={1}>
                              {it.name}{it.size ? ` ${it.size}` : ''}
                            </Text>
                            <Text style={styles.distItemQty}>x{it.quantity}</Text>
                          </View>
                        ))}
                        {distCost > 0 && (
                          <Text style={styles.distCostText}>{formatCost(distCost)}</Text>
                        )}
                      </View>
                    );
                  }}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalActionButton} onPress={handleReorder} activeOpacity={0.7}>
                    <RotateCcw size={18} color={COLORS.accentPrimary} />
                    <Text style={styles.modalActionText}>Reorder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalActionButton} onPress={handleShare} activeOpacity={0.7}>
                    <Share2 size={18} color={COLORS.accentPrimary} />
                    <Text style={styles.modalActionText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={handlePrintDetail}
                    disabled={isPrintingDetail}
                    activeOpacity={0.7}
                  >
                    {isPrintingDetail ? (
                      <ActivityIndicator size="small" color={COLORS.accentPrimary} />
                    ) : (
                      <Printer size={18} color={COLORS.accentPrimary} />
                    )}
                    <Text style={styles.modalActionText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Aggregates real order history into a lightweight usage view — most-ordered
// items and spend by distributor. Deliberately not theft/variance detection:
// this app has no per-scan usage log (the old pen-era scans/usage_history
// tables are never written to), so the only trustworthy signal is what was
// actually ordered.
function TrendsView({ orders, loading }: { orders: Order[] | null; loading: boolean }) {
  if (loading || orders === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accentPrimary} />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.centered}>
        <TrendingUp size={40} color={COLORS.textTertiary} />
        <Text style={styles.emptyTitle}>No data yet</Text>
        <Text style={styles.emptyText}>Send a few orders and trends will show up here.</Text>
      </View>
    );
  }

  const totalSpend = orders.reduce((sum, o) => sum + (o.estimated_cost || 0), 0);
  const avgPerOrder = orders.length > 0 ? totalSpend / orders.length : 0;

  const itemTotals = new Map<string, number>();
  const distTotals = new Map<string, number>();
  orders.forEach(o => {
    o.distributors.forEach(d => {
      const distName = d.distributor_name || 'Unassigned';
      const distSpend = d.items.reduce((s, i) => s + (i.price ? i.price * i.quantity : 0), 0);
      distTotals.set(distName, (distTotals.get(distName) || 0) + distSpend);
      d.items.forEach(i => {
        itemTotals.set(i.name, (itemTotals.get(i.name) || 0) + i.quantity);
      });
    });
  });

  const topItems = Array.from(itemTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topDistributors = Array.from(distTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxItemQty = topItems[0]?.[1] || 1;
  const maxDistSpend = topDistributors[0]?.[1] || 1;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.trendsContent}
      showsVerticalScrollIndicator={false}
    >
      {orders.length >= 100 && (
        <Text style={styles.trendsCapNote}>Based on your most recent 100 orders in this range</Text>
      )}

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>ORDERS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCost(totalSpend) || '$0.00'}</Text>
          <Text style={styles.statLabel}>TOTAL SPEND</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCost(avgPerOrder) || '$0.00'}</Text>
          <Text style={styles.statLabel}>AVG/ORDER</Text>
        </View>
      </View>

      {topItems.length > 0 && (
        <>
          <Text style={styles.trendsSectionTitle}>Most Ordered</Text>
          <View style={styles.barList}>
            {topItems.map(([name, qty]) => (
              <View key={name} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(4, (qty / maxItemQty) * 100)}%` }]} />
                </View>
                <Text style={styles.barValue}>{qty}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {topDistributors.length > 0 && (
        <>
          <Text style={styles.trendsSectionTitle}>Spend by Distributor</Text>
          <View style={styles.barList}>
            {topDistributors.map(([name, spend]) => (
              <View key={name} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, styles.barFillAlt, { width: `${Math.max(4, (spend / maxDistSpend) * 100)}%` }]} />
                </View>
                <Text style={styles.barValue}>{formatCost(spend)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: 'sent' | 'failed' | 'no_email' }) {
  if (status === 'sent') {
    return (
      <View style={[styles.statusBadge, styles.statusBadgeSent]}>
        <CheckCircle2 size={12} color={COLORS.success} />
        <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>Sent</Text>
      </View>
    );
  }
  if (status === 'no_email') {
    return (
      <View style={[styles.statusBadge, styles.statusBadgeWarn]}>
        <MailX size={12} color={COLORS.warning} />
        <Text style={[styles.statusBadgeText, { color: COLORS.warning }]}>No Email</Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusBadge, styles.statusBadgeFailed]}>
      <XCircle size={12} color={COLORS.error} />
      <Text style={[styles.statusBadgeText, { color: COLORS.error }]}>Failed</Text>
    </View>
  );
}

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const sentCount = order.distributors.filter(d => d.status === 'sent').length;
  const names = order.distributors.map(d => d.distributor_name).filter(Boolean).join(', ');
  const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const costStr = formatCost(order.estimated_cost);

  return (
    <TouchableOpacity style={styles.orderRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.orderRowDate}>
        <Text style={styles.orderRowDateText}>{dateStr}</Text>
        <Text style={styles.orderRowTimeText}>{timeStr}</Text>
      </View>
      <View style={styles.orderRowInfo}>
        <Text style={styles.orderRowDistributors} numberOfLines={1}>{names || 'Distributor'}</Text>
        <Text style={styles.orderRowMeta}>
          {order.total_items} item{order.total_items === 1 ? '' : 's'} · {sentCount}/{order.distributors.length} sent
          {costStr ? ` · ${costStr}` : ''}
          {order.staff_name ? ` · ${order.staff_name}` : ''}
        </Text>
      </View>
      <ChevronRight size={18} color={COLORS.textTertiary} />
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
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
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButtonActive: {
    backgroundColor: COLORS.accentPrimary,
    borderColor: COLORS.accentPrimary,
  },
  tabButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  trendsContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  trendsCapNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  trendsSectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  barList: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  barLabel: {
    width: 110,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.accentPrimary,
  },
  barFillAlt: {
    backgroundColor: COLORS.accentSecondary,
  },
  barValue: {
    width: 56,
    textAlign: 'right',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
  },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.accentPrimary,
    borderColor: COLORS.accentPrimary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  orderRowDate: {
    width: 56,
    alignItems: 'center',
  },
  orderRowDateText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  orderRowTimeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  orderRowInfo: {
    flex: 1,
  },
  orderRowDistributors: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  orderRowMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  loadMoreButton: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  backLinkText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: LETTER_SPACING,
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
    maxHeight: '85%',
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
  distCard: {
    backgroundColor: `${COLORS.primaryDark}50`,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
  },
  distCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  distCardName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeSent: {
    backgroundColor: `${COLORS.success}15`,
  },
  statusBadgeWarn: {
    backgroundColor: `${COLORS.warning}15`,
  },
  statusBadgeFailed: {
    backgroundColor: `${COLORS.error}15`,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  distItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.border}50`,
  },
  distItemName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  distItemQty: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    fontFamily: 'monospace',
  },
  distCostText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    backgroundColor: `${COLORS.accentPrimary}12`,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}30`,
  },
  modalActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
});
