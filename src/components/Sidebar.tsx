import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { X, Camera, LayoutGrid, Settings, LogOut } from 'lucide-react-native';
import SidebarItem from './SidebarItem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onSignOut: () => void;
}

export default function Sidebar({ isOpen, onClose, currentScreen, onNavigate, onSignOut }: Props) {
  const handleNavigate = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={isOpen} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />

        <SafeAreaView style={styles.sidebarContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoText}>86</Text>
              </View>
              <Text style={styles.logoTitle}>86'd</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Navigation */}
          <View style={styles.navContainer}>
            <Text style={styles.sectionTitle}>Inventory</Text>
            <SidebarItem
              icon={<Camera size={18} color={COLORS.accentPrimary} />}
              label="New Scan"
              active={currentScreen === 'camera'}
              onPress={() => handleNavigate('camera')}
            />
            <SidebarItem
              icon={<LayoutGrid size={18} color={COLORS.accentPrimary} />}
              label="Review & Par"
              active={currentScreen === 'review'}
              onPress={() => handleNavigate('review')}
            />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Management</Text>
            <SidebarItem
              icon={<Settings size={18} color={COLORS.accentPrimary} />}
              label="Settings"
              active={currentScreen === 'settings'}
              onPress={() => handleNavigate('settings')}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitials}>MB</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Main Bar</Text>
                <Text style={styles.userEmail}>m700devops@gmail.com</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
              <LogOut size={16} color={COLORS.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayTouch: {
    flex: 1,
  },
  sidebarContainer: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
  logoTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: SPACING.md,
    marginRight: -SPACING.md,
  },
  navContainer: {
    flex: 1,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  footer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  userAvatar: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.border,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  signOutText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.error,
  },
});
