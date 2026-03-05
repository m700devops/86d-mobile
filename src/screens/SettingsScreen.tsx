import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Modal, Switch } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Plus, X, Trash2, User, Mail, Hash } from 'lucide-react-native';
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

  const openModal = (dist?: any) => {
    if (dist) {
      setEditingId(dist.id);
      setName(dist.name);
      setInitials(dist.initials || '');
      setEmail(dist.email || '');
    } else {
      setEditingId(null);
      setName('');
      setInitials('');
      setEmail('');
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
      });
    } else {
      addDistributor({
        id: Math.random().toString(36).substr(2, 9),
        name,
        initials: initials.toUpperCase(),
        email,
      });
    }

    setIsModalOpen(false);
    setName('');
    setInitials('');
    setEmail('');
    setEditingId(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your bar's configuration</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Distributors Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Distributors</Text>
            <TouchableOpacity onPress={() => openModal()} style={styles.addNewButton}>
              <Plus size={12} color={COLORS.accentPrimary} />
              <Text style={styles.addNewText}>Add New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.distributorsList}>
            {distributors.map(dist => (
              <TouchableOpacity
                key={dist.id}
                style={styles.distributorCard}
                onPress={() => openModal(dist)}
                activeOpacity={0.7}
              >
                <View style={styles.distributorLeft}>
                  <View style={styles.distributorBadge}>
                    <Text style={styles.distributorInitials}>{dist.initials || 'D'}</Text>
                  </View>
                  <View>
                    <Text style={styles.distributorName}>{dist.name}</Text>
                    <Text style={styles.distributorEmail}>{dist.email || 'No email'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    removeDistributor(dist.id);
                  }}
                  style={styles.deleteButton}
                >
                  <Trash2 size={16} color={COLORS.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={onToggleDarkMode}
              trackColor={{ false: COLORS.border, true: COLORS.accentPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal transparent animationType="fade" visible={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Distributor' : 'New Distributor'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
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

              {/* Initials & Email */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Initials</Text>
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
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={styles.inputWithIcon}>
                    <Mail size={16} color={COLORS.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="orders@example.com"
                      placeholderTextColor={COLORS.textTertiary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                    />
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: COLORS.accentPrimary },
                (!name.trim() || !initials.trim() || !email.trim()) && { opacity: 0.5 },
              ]}
              onPress={handleSave}
              disabled={!name.trim() || !initials.trim() || !email.trim()}
            >
              <Text style={styles.buttonText}>
                {editingId ? 'Update Distributor' : 'Save Distributor'}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  section: {
    marginBottom: SPACING['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  addNewText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
    letterSpacing: 0.5,
  },
  distributorsList: {
    gap: SPACING.md,
  },
  distributorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: `${COLORS.border}80`,
    borderRadius: 12,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distributorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  distributorBadge: {
    width: 40,
    height: 40,
    backgroundColor: `${COLORS.accentPrimary}1A`,
    borderWidth: 1,
    borderColor: `${COLORS.accentPrimary}33`,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributorInitials: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accentPrimary,
  },
  distributorName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  distributorEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  deleteButton: {
    padding: SPACING.md,
  },
  settingCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: `${COLORS.border}80`,
    borderRadius: 12,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
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
  },
  modalForm: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  formGroup: {
    gap: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    paddingLeft: SPACING.md,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryDark}33`,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  modalInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  button: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
  },
});
