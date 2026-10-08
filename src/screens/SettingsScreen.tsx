import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Modal, Animated, Alert, KeyboardAvoidingView, Keyboard, Platform, TouchableWithoutFeedback, Linking, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Plus, X, Trash2, User, Mail, Check, Phone, Store, MapPin, CreditCard, ChevronRight, Hash, BadgeCheck, Reply } from 'lucide-react-native';
import { emailProblemText } from '../utils/emailProblem';
import { WEEKDAYS, WEEKDAY_LABELS, Weekday, parseDays, joinDays } from '../utils/delivery';
import { useDistributors } from '../context/DistributorContext';
import NumericDoneAccessory, { NUMERIC_ACCESSORY_ID } from '../components/NumericDoneAccessory';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { apiService } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import { formatThreshold } from '../utils/orderQuantity';

const REORDER_THRESHOLD_OPTIONS = [0.5, 0.6, 0.7, 0.8];

export default function SettingsScreen() {
  const {
    distributors, initialsFor, addDistributor, updateDistributor, removeDistributor, accountFor, setAccountNumber,
    refresh: refreshDistributors,
  } = useDistributors();
  useEffect(() => { refreshDistributors(); }, [refreshDistributors]);
  const { user, updateProfile, logout } = useAuth();
  const { currentLocation, locations, setCurrentLocation, addLocation, updateReorderThreshold } = useLocation();
  const [savingReorderThreshold, setSavingReorderThreshold] = useState(false);
  const reorderThreshold = currentLocation?.reorder_threshold ?? 0.7;

  const handleSetReorderThreshold = async (value: number) => {
    if (!currentLocation || savingReorderThreshold || value === reorderThreshold) return;
    setSavingReorderThreshold(true);
    try {
      await updateReorderThreshold(value);
    } catch {
      Alert.alert('Save failed', "Couldn't update this setting. Check your connection and try again.");
    } finally {
      setSavingReorderThreshold(false);
    }
  };

  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleManageSubscription = async () => {
    if (isOpeningPortal) return;
    setIsOpeningPortal(true);
    try {
      const { portal_url } = await apiService.createPortalSession();
      await Linking.openURL(portal_url);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      Alert.alert(
        "Couldn't open billing",
        detail?.message ?? 'Check your connection and try again.'
      );
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleAddBar = () => {
    Alert.prompt(
      'Add a Bar',
      'Each bar keeps its own inventory and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (name?: string) => {
            const trimmed = (name ?? '').trim();
            if (!trimmed) return;
            addLocation(trimmed).catch(() =>
              Alert.alert("Couldn't add bar", 'Check your connection and try again.')
            );
          },
        },
      ],
      'plain-text'
    );
  };

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const canChangePassword =
    currentPasswordInput.length > 0 &&
    newPasswordInput.length >= 8 &&
    newPasswordInput === confirmNewPasswordInput &&
    !changingPassword;

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');
  };

  const handleChangePassword = async () => {
    if (!canChangePassword) return;
    setChangingPassword(true);
    try {
      await apiService.changePassword(currentPasswordInput, newPasswordInput);
      closePasswordModal();
      Alert.alert('Password changed', 'Every other signed-in device has been logged out.');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      Alert.alert(
        "Couldn't change password",
        detail?.error === 'invalid_password'
          ? 'Your current password is incorrect.'
          : 'Check your connection and try again.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This permanently deletes your account, inventory, and order history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Password',
              'Enter your password to permanently delete your account.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async (password?: string) => {
                    if (!password) return;
                    try {
                      await apiService.deleteAccount(password);
                      await logout();
                    } catch (error: any) {
                      const detail = error?.response?.data?.detail;
                      Alert.alert(
                        "Couldn't delete account",
                        detail?.error === 'invalid_password'
                          ? 'That password is incorrect.'
                          : 'Check your connection and try again.'
                      );
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ]
    );
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [repName, setRepName] = useState('');
  // Asked once per distributor and kept: the days they deliver (the order
  // screen fills in the next one) and this bar's account number with them.
  const [deliveryDays, setDeliveryDays] = useState<Weekday[]>([]);
  const [accountInput, setAccountInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingDistributor, setSavingDistributor] = useState(false);

  const [businessNameInput, setBusinessNameInput] = useState('');
  const [managerNameInput, setManagerNameInput] = useState('');
  // "Order sent by Dana Reyes, <title> at …" on every order email.
  const [titleInput, setTitleInput] = useState('');
  // Where distributors' replies go; blank = the login email.
  const [replyToInput, setReplyToInput] = useState('');
  const [savingRestaurantInfo, setSavingRestaurantInfo] = useState(false);

  useEffect(() => {
    setBusinessNameInput(user?.business_name || '');
    setManagerNameInput(user?.manager_name || '');
    setTitleInput(user?.title || '');
    setReplyToInput(user?.order_reply_to || '');
  }, [user?.business_name, user?.manager_name, user?.title, user?.order_reply_to]);

  const restaurantInfoDirty =
    businessNameInput.trim() !== (user?.business_name || '') ||
    managerNameInput.trim() !== (user?.manager_name || '') ||
    titleInput.trim() !== (user?.title || '') ||
    replyToInput.trim() !== (user?.order_reply_to || '');
  // An Apple "Hide My Email" relay may refuse a distributor's reply, so those
  // accounts are nudged to give a reply-to.
  const hiddenAppleEmail = /@privaterelay\.appleid\.com$/i.test(user?.email || '');

  const handleSaveRestaurantInfo = async () => {
    if (!businessNameInput.trim() || savingRestaurantInfo) return;

    setSavingRestaurantInfo(true);
    try {
      await updateProfile({
        business_name: businessNameInput.trim(),
        manager_name: managerNameInput.trim() || undefined,
        title: titleInput.trim(),
        order_reply_to: replyToInput.trim(),
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail?.error === 'invalid_email') {
        Alert.alert('Check the reply email', detail.message);
      } else {
        Alert.alert('Save failed', "Couldn't save your restaurant info. Check your connection and try again.");
      }
    } finally {
      setSavingRestaurantInfo(false);
    }
  };

  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isModalOpen) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      modalAnim.setValue(0);
    }
  }, [isModalOpen, modalAnim]);

  const openModal = (dist?: any) => {
    if (dist) {
      setEditingId(dist.id);
      setName(dist.name);
      setEmail(dist.email || '');
      setPhone(dist.phone || '');
      setRepName(dist.repName || '');
      setDeliveryDays(parseDays(dist.deliveryDays));
      setAccountInput(accountFor(dist.id) || '');
    } else {
      setEditingId(null);
      setName('');
      setEmail('');
      setPhone('');
      setRepName('');
      setDeliveryDays([]);
      setAccountInput('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || savingDistributor) return;

    setSavingDistributor(true);
    try {
      const days = joinDays(deliveryDays) || null;
      let distId = editingId;
      if (editingId) {
        await updateDistributor(editingId, {
          name,
          email,
          phone,
          repName,
          deliveryDays: days,
        });
      } else {
        const created = await addDistributor({
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          phone,
          repName,
          deliveryDays: days,
        });
        distId = created.id;
      }
      // The account number is this bar's, saved separately; only when it changed.
      if (distId && accountInput.trim() !== (accountFor(distId) || '')) {
        await setAccountNumber(distId, accountInput);
      }

      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setRepName('');
      setDeliveryDays([]);
      setAccountInput('');
      setEditingId(null);
    } catch {
      Alert.alert('Save failed', "Couldn't save this distributor. Check your connection and try again.");
    } finally {
      setSavingDistributor(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(async () => {
      try {
        await removeDistributor(id);
      } catch {
        Alert.alert('Delete failed', "Couldn't remove this distributor. Check your connection and try again.");
      } finally {
        setDeletingId(null);
      }
    }, 200);
  };

  const modalScale = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const modalOpacity = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your bar's configuration</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Restaurant Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESTAURANT</Text>
          <View style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>RESTAURANT / BAR NAME</Text>
              <View style={styles.inputWithIcon}>
                <Store size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. The Copper Owl"
                  placeholderTextColor={COLORS.textTertiary}
                  value={businessNameInput}
                  onChangeText={setBusinessNameInput}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>BAR MANAGER NAME</Text>
              <View style={styles.inputWithIcon}>
                <User size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor={COLORS.textTertiary}
                  value={managerNameInput}
                  onChangeText={setManagerNameInput}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>YOUR TITLE</Text>
              <View style={styles.inputWithIcon}>
                <BadgeCheck size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Bar Manager"
                  placeholderTextColor={COLORS.textTertiary}
                  value={titleInput}
                  onChangeText={setTitleInput}
                  autoCapitalize="words"
                />
              </View>
              <Text style={styles.fieldHint}>
                Orders say "Order sent by {managerNameInput.trim() || 'you'}, {titleInput.trim() || 'Bar Manager'} at {businessNameInput.trim() || 'your bar'}."
              </Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>DISTRIBUTOR REPLIES GO TO</Text>
              <View style={styles.inputWithIcon}>
                <Reply size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder={hiddenAppleEmail ? 'Add an email you check' : (user?.email || 'Your email')}
                  placeholderTextColor={COLORS.textTertiary}
                  value={replyToInput}
                  onChangeText={setReplyToInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.fieldHint}>
                {hiddenAppleEmail
                  ? 'You signed in with a hidden Apple email, which may not accept replies from distributors. Add an email you check.'
                  : 'Leave blank to use your login email.'}
              </Text>
            </View>
          </View>
          {restaurantInfoDirty && (
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!businessNameInput.trim() || savingRestaurantInfo) && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveRestaurantInfo}
              disabled={!businessNameInput.trim() || savingRestaurantInfo}
              activeOpacity={0.8}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {savingRestaurantInfo ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ordering Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDERING</Text>
          <View style={styles.reorderCard}>
            <Text style={styles.settingLabel}>Reorder Point</Text>
            <Text style={styles.settingSubLabel}>
              Reorders a bottle once it drops below {formatThreshold(reorderThreshold)} of its par
            </Text>
            <View style={styles.reorderChipRow}>
              {REORDER_THRESHOLD_OPTIONS.map(value => {
                const isActive = value === reorderThreshold;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.reorderChip, isActive && styles.reorderChipActive]}
                    onPress={() => handleSetReorderThreshold(value)}
                    disabled={savingReorderThreshold}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.reorderChipText, isActive && styles.reorderChipTextActive]}>
                      {formatThreshold(value)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.reorderHint}>Busier bar? Go higher. Slower bar? Go lower.</Text>
          </View>
        </View>

        {/* Distributors Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>DISTRIBUTORS</Text>
            <TouchableOpacity onPress={() => openModal()} style={styles.addNewButton} activeOpacity={0.7}>
              <Plus size={14} color={COLORS.accentText} />
              <Text style={styles.addNewText}>Add New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.distributorsList}>
            {distributors.map(dist => (
              <TouchableOpacity
                key={dist.id}
                style={[
                  styles.distributorCard,
                  deletingId === dist.id && styles.distributorCardDeleting,
                ]}
                onPress={() => openModal(dist)}
                activeOpacity={0.8}
              >
                <View style={styles.distributorLeft}>
                  <View style={styles.distributorBadge}>
                    <Text style={styles.distributorInitials}>{initialsFor(dist.id)}</Text>
                  </View>
                  <View>
                    <Text style={styles.distributorName}>{dist.name}</Text>
                    <Text style={styles.distributorEmail}>{dist.email || 'No email'}</Text>
                    {dist.repName ? (
                      <Text style={styles.distributorRep}>Rep: {dist.repName}</Text>
                    ) : null}
                    {emailProblemText(dist) ? (
                      <Text style={styles.distributorProblem}>
                        ⚠ {emailProblemText(dist)!.title} — tap to fix
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(dist.id);
                  }}
                  style={styles.deleteButton}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={deletingId === dist.id ? COLORS.error : COLORS.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bars Section — switch between locations, add a new one */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>BARS</Text>
            <TouchableOpacity onPress={handleAddBar} style={styles.addNewButton} activeOpacity={0.7}>
              <Plus size={14} color={COLORS.accentText} />
              <Text style={styles.addNewText}>Add Bar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.distributorsList}>
            {locations.map(loc => {
              const isCurrent = loc.id === currentLocation?.id;
              return (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.settingCard, isCurrent && styles.barCardActive]}
                  onPress={() => setCurrentLocation(loc.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 }}>
                    <MapPin size={16} color={isCurrent ? COLORS.accentText : COLORS.textTertiary} />
                    <Text style={[styles.settingLabel, isCurrent && { color: COLORS.accentText }]}>
                      {loc.name}
                    </Text>
                  </View>
                  {isCurrent && <Check size={16} color={COLORS.accentText} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account Section — App Store guideline 5.1.1 requires in-app deletion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          {user?.subscription_status === 'active' && (
            <TouchableOpacity
              style={[styles.settingCard, { marginBottom: SPACING.md }]}
              onPress={handleManageSubscription}
              disabled={isOpeningPortal}
              activeOpacity={0.8}
            >
              <CreditCard size={16} color={COLORS.textTertiary} />
              <View style={{ flex: 1, marginHorizontal: 16 }}>
                <Text style={styles.settingLabel}>Manage Subscription</Text>
                <Text style={styles.settingSubLabel}>Update payment method, view invoices, or cancel</Text>
              </View>
              {isOpeningPortal ? (
                <ActivityIndicator size="small" color={COLORS.textTertiary} />
              ) : (
                <ChevronRight size={16} color={COLORS.textTertiary} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.settingCard, { marginBottom: SPACING.md }]}
            onPress={() => setIsPasswordModalOpen(true)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingSubLabel}>Signs out every other device — do this when staff leave</Text>
            </View>
            <Check size={16} color={COLORS.textTertiary} style={{ opacity: 0 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteAccountCard} onPress={handleDeleteAccount} activeOpacity={0.8}>
            <Trash2 size={16} color={COLORS.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteAccountLabel}>Delete Account</Text>
              <Text style={styles.settingSubLabel}>Permanently removes your account and all data</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal transparent visible={isPasswordModalOpen} onRequestClose={closePasswordModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={closePasswordModal} activeOpacity={0.7}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textTertiary}
                    value={currentPasswordInput}
                    onChangeText={setCurrentPasswordInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>NEW PASSWORD (8+ CHARACTERS)</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textTertiary}
                    value={newPasswordInput}
                    onChangeText={setNewPasswordInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textTertiary}
                    value={confirmNewPasswordInput}
                    onChangeText={setConfirmNewPasswordInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {confirmNewPasswordInput.length > 0 && newPasswordInput !== confirmNewPasswordInput && (
                  <ErrorMessage message="Passwords do not match" style={styles.passwordMismatch} />
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.saveButton, !canChangePassword && styles.saveButtonDisabled]}
              onPress={handleChangePassword}
              disabled={!canChangePassword}
              activeOpacity={0.8}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{changingPassword ? 'Changing...' : 'Change Password'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal transparent visible={isModalOpen} onRequestClose={() => setIsModalOpen(false)} animationType="none">
        {/* Three separate escapes from the keyboard, because the phone field
            uses a numeric pad with no return key on iOS: the Done bar above
            the keyboard, tapping the dimmed area outside the card, and the
            card lifting so Save is never buried under the keyboard. Before
            this, focusing PHONE left no way out of the form at all.
            The backdrop is a sibling behind the card rather than a wrapper
            around it (same shape as Sidebar's) so it can't intercept taps
            meant for the inputs. */}
        <KeyboardAvoidingView
          style={styles.modalOverlayFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
              <View style={styles.modalBackdropTouch} />
            </TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: modalScale }],
                  opacity: modalOpacity,
                }
              ]}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingId ? 'Edit Distributor' : 'New Distributor'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalOpen(false)} activeOpacity={0.7}>
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  {/* Name */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>NAME</Text>
                    <View style={styles.inputWithIcon}>
                      <User size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Southern Glazer's"
                        placeholderTextColor={COLORS.textTertiary}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  </View>

                  {/* Rep Name. This used to share a row with an INITIALS field;
                      the badge is derived from the name now (see
                      utils/distributorInitials), so there's nothing to ask and
                      the field takes the row on its own. */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>REP NAME</Text>
                    <View style={styles.inputWithIcon}>
                      <User size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="John Smith"
                        placeholderTextColor={COLORS.textTertiary}
                        value={repName}
                        onChangeText={setRepName}
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>EMAIL</Text>
                    <View style={styles.inputWithIcon}>
                      <Mail size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="orders@example.com"
                        placeholderTextColor={COLORS.textTertiary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>PHONE</Text>
                    <View style={styles.inputWithIcon}>
                      <Phone size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="(555) 000-0000"
                        placeholderTextColor={COLORS.textTertiary}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        inputAccessoryViewID={NUMERIC_ACCESSORY_ID}
                      />
                    </View>
                  </View>

                  {/* Account number: this bar's, asked once and kept. */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>YOUR ACCOUNT # WITH THEM</Text>
                    <View style={styles.inputWithIcon}>
                      <Hash size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Optional"
                        placeholderTextColor={COLORS.textTertiary}
                        value={accountInput}
                        onChangeText={setAccountInput}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </View>
                    <Text style={styles.fieldHint}>It's on any invoice from them. Goes on every order.</Text>
                  </View>

                  {/* Delivery days: the order screen fills in the next one. */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>DELIVERY DAYS</Text>
                    <View style={styles.dayChips}>
                      {WEEKDAYS.map(day => {
                        const on = deliveryDays.includes(day);
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[styles.dayChip, on && styles.dayChipOn]}
                            onPress={() =>
                              setDeliveryDays(prev => (on ? prev.filter(d => d !== day) : [...prev, day]))
                            }
                            activeOpacity={0.8}
                            accessibilityState={{ selected: on }}
                          >
                            <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>
                              {WEEKDAY_LABELS[day]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.fieldHint}>Orders fill in their next delivery day for you.</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!name.trim() || !email.trim() || savingDistributor) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!name.trim() || !email.trim() || savingDistributor}
                  activeOpacity={0.8}
                >
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {savingDistributor ? 'Saving...' : editingId ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
        <NumericDoneAccessory />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  header: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingLeft: 70,
    paddingRight: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 2,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addNewText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accentText,
    letterSpacing: LETTER_SPACING,
  },
  distributorsList: {
    gap: SPACING.md,
  },
  distributorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distributorCardDeleting: {
    opacity: 0.5,
  },
  distributorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  distributorBadge: {
    width: 44,
    height: 44,
    backgroundColor: `${COLORS.accentPrimary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}20`,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributorInitials: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentText,
  },
  distributorName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  distributorEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  distributorProblem: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    marginTop: 3,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  distributorRep: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentText,
    marginTop: 1,
    opacity: 0.8,
  },
  deleteButton: {
    padding: SPACING.md,
  },
  passwordMismatch: {
    marginTop: SPACING.xs,
  },
  barCardActive: {
    borderColor: `${COLORS.accentPrimary}60`,
  },
  deleteAccountCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: `${COLORS.error}40`,
    borderRadius: 16,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  deleteAccountLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.error,
    letterSpacing: LETTER_SPACING,
  },
  settingCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  settingSubLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  reorderCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  reorderChipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  reorderChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  reorderChipActive: {
    backgroundColor: COLORS.accentPrimary,
    borderColor: COLORS.accentPrimary,
  },
  reorderChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  reorderChipTextActive: {
    color: '#FFFFFF',
  },
  reorderHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },
  modalOverlayFill: {
    flex: 1,
  },
  modalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  modalForm: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  formGroup: {
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  fieldHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    lineHeight: 15,
  },
  dayChips: {
    flexDirection: 'row',
    gap: 5,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipOn: {
    borderColor: COLORS.accentPrimary,
    backgroundColor: `${COLORS.accentPrimary}22`,
  },
  dayChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  dayChipTextOn: {
    color: COLORS.accentText,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryDark}50`,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  modalInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
  },
  saveButton: {
    height: 52,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.accentPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    letterSpacing: LETTER_SPACING,
  },
});
