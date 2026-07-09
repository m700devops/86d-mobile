import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Modal, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Plus, X, Trash2, User, Mail, Hash, Check, Phone } from 'lucide-react-native';
import { useDistributors } from '../context/DistributorContext';

interface Props {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function SettingsScreen({ isDarkMode, onToggleDarkMode }: Props) {
  const { distributors, addDistributor, updateDistributor, removeDistributor } = useDistributors();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [initials, setInitials] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [repName, setRepName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLeftHanded, setIsLeftHanded] = useState(false);

  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('@leftHanded').then(val => {
      if (val === 'true') setIsLeftHanded(true);
    });
  }, []);

  const handleToggleLeftHanded = () => {
    const next = !isLeftHanded;
    setIsLeftHanded(next);
    AsyncStorage.setItem('@leftHanded', next ? 'true' : 'false');
  };

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
      setInitials(dist.initials || '');
      setEmail(dist.email || '');
      setPhone(dist.phone || '');
      setRepName(dist.repName || '');
    } else {
      setEditingId(null);
      setName('');
      setInitials('');
      setEmail('');
      setPhone('');
      setRepName('');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !initials.trim() || !email.trim()) return;

    if (editingId) {
      updateDistributor(editingId, {
        name,
        initials: initials.toUpperCase(),
        email,
        phone,
        repName,
      });
    } else {
      addDistributor({
        id: Math.random().toString(36).substr(2, 9),
        name,
        initials: initials.toUpperCase(),
        email,
        phone,
        repName,
      });
    }

    setIsModalOpen(false);
    setName('');
    setInitials('');
    setEmail('');
    setPhone('');
    setRepName('');
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      removeDistributor(id);
      setDeletingId(null);
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
        {/* Distributors Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>DISTRIBUTORS</Text>
            <TouchableOpacity onPress={() => openModal()} style={styles.addNewButton} activeOpacity={0.7}>
              <Plus size={14} color={COLORS.accentPrimary} />
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
                    <Text style={styles.distributorInitials}>{dist.initials || 'D'}</Text>
                  </View>
                  <View>
                    <Text style={styles.distributorName}>{dist.name}</Text>
                    <Text style={styles.distributorEmail}>{dist.email || 'No email'}</Text>
                    {dist.repName ? (
                      <Text style={styles.distributorRep}>Rep: {dist.repName}</Text>
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

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <TouchableOpacity
              style={[styles.toggle, isDarkMode && styles.toggleActive]}
              onPress={onToggleDarkMode}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleKnob, isDarkMode && styles.toggleKnobActive]} />
            </TouchableOpacity>
          </View>
          <View style={[styles.settingCard, { marginTop: 12 }]}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.settingLabel}>Left-Handed Mode</Text>
              <Text style={styles.settingSubLabel}>Moves the level bar to the left side of the screen</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, isLeftHanded && styles.toggleActive]}
              onPress={handleToggleLeftHanded}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleKnob, isLeftHanded && styles.toggleKnobActive]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal transparent visible={isModalOpen} onRequestClose={() => setIsModalOpen(false)} animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              }
            ]}
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

              {/* Initials & Rep Name */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>INITIALS</Text>
                  <View style={styles.inputWithIcon}>
                    <Hash size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="SG"
                      placeholderTextColor={COLORS.textTertiary}
                      value={initials}
                      onChangeText={(text) => setInitials(text.toUpperCase())}
                      maxLength={3}
                    />
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 2 }]}>
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
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!name.trim() || !initials.trim() || !email.trim()) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!name.trim() || !initials.trim() || !email.trim()}
              activeOpacity={0.8}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {editingId ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
    color: COLORS.accentPrimary,
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
    color: COLORS.accentPrimary,
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
  distributorRep: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentPrimary,
    marginTop: 1,
    opacity: 0.8,
  },
  deleteButton: {
    padding: SPACING.md,
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
  toggle: {
    width: 48,
    height: 24,
    backgroundColor: COLORS.border,
    borderRadius: 12,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.accentPrimary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 24 }],
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  saveButton: {
    height: 52,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#FF6B35',
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
