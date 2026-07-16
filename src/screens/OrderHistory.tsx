import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { CheckCircle2, XCircle, MailX, ChevronRight, X, Inbox } from 'lucide-react-native';
import { useLocation } from '../context/LocationContext';
import { apiService } from '../services/api';
import { Order } from '../types';

const PAGE_SIZE = 20;

type Tab = 'current' | 'previous';

type Row =
  | { type: 'header'; key: string; label: string }
  | { type: 'order'; key: string; order: Order };

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthYearLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface Props {
  onBack: () => void;
}

export default function OrderHistory({ onBack }: Props) {
  const { currentLocation } = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('current');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadPage = useCallback(async (offset: number) => {
    if (!currentLocation) return { orders: [] as Order[], total: 0 };
    return apiService.getOrders(currentLocation.id, PAGE_SIZE, offset);
  }, [currentLocation]);

  useEffect(() => {
    if (!currentLocation) return;
    setLoading(true);
    loadPage(0)
      .then(res => {
        setOrders(res.orders);
        setTotal(res.total);
      })
      .catch(() => {
        setOrders([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [currentLocation, loadPage]);

  const handleLoadMore = async () => {
    if (loadingMore || orders.length >= total) return;
    setLoadingMore(true);
    try {
      const res = await loadPage(orders.length);
      setOrders(prev => [...prev, ...res.orders]);
      setTotal(res.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const now = new Date();
  const currentOrders = orders.filter(o => isSameDay(new Date(o.created_at), now));
  const previousOrders = orders.filter(o => !isSameDay(new Date(o.created_at), now));

  // Build a flat row list with month/year section headers for the "Previous" tab
  const rows: Row[] = (() => {
    if (activeTab === 'current') {
      return currentOrders.map(o => ({ type: 'order' as const, key: o.id, order: o }));
    }
    const out: Row[] = [];
    let lastLabel = '';
    for (const o of previousOrders) {
      const label = monthYearLabel(new Date(o.created_at));
      if (label !== lastLabel) {
        out.push({ type: 'header', key: `h-${label}`, label });
        lastLabel = label;
      }
      out.push({ type: 'order', key: o.id, order: o });
    }
    return out;
  })();

  const canLoadMore = activeTab === 'previous' && orders.length < total;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>What you've ordered, and when</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'current' && styles.tabButtonActive]}
          onPress={() => setActiveTab('current')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, activeTab === 'current' && styles.tabButtonTextActive]}>
            Current Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'previous' && styles.tabButtonActive]}
          onPress={() => setActiveTab('previous')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, activeTab === 'previous' && styles.tabButtonTextActive]}>
            Previous Orders
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accentPrimary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.centered}>
          <Inbox size={40} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'current' ? 'No orders sent today' : 'No previous orders yet'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'current'
              ? 'Orders you send today will show up here.'
              : "Orders you've sent will show up here once they age off Current."}
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
            return <OrderRow order={item.order} onPress={() => setSelectedOrder(item.order)} />;
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

      {/* Order Detail Modal */}
      <Modal
        visible={selectedOrder !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedOrder(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {new Date(selectedOrder.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit',
                      })}
                      {selectedOrder.business_name ? ` · ${selectedOrder.business_name}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={selectedOrder.distributors}
                  keyExtractor={(d, i) => d.distributor_id ?? `d-${i}`}
                  style={{ maxHeight: 420 }}
                  contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
                  renderItem={({ item: dist }) => (
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
                    </View>
                  )}
                />
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.accentPrimary,
  },
  tabButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
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
    maxHeight: '80%',
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
});
