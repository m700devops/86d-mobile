import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal, Animated, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACING } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { X, Camera, LayoutGrid, Settings, LogOut } from 'lucide-react-native';
import SidebarItem from './SidebarItem';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 288;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onSignOut: () => void;
}

export default function Sidebar({ isOpen, onClose, currentScreen, onNavigate, onSignOut }: Props) {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  const handleNavigate = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  return (
    <Modal transparent visible={isOpen} onRequestClose={onClose} animationType="none">
      <View style={styles.container}>
        {/* Backdrop with blur effect */}
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Sidebar */}
        <Animated.View 
          style={[
            styles.sidebar,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <SafeAreaView style={styles.sidebarContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logo}>
                <View style={styles.logoIcon}>
                  <Text style={styles.logoText}>86</Text>
                </View>
                <Text style={styles.logoTitle}>86'd</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                <X size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Navigation */}
            <View style={styles.navContainer}>
              <Text style={styles.sectionTitle}>INVENTORY</Text>
              <SidebarItem
                icon={<Camera size={18} color={currentScreen === 'camera' ? '#FFFFFF' : COLORS.accentPrimary} />}
                label="New Scan"
                active={currentScreen === 'camera'}
                onPress={() => handleNavigate('camera')}
              />
              <SidebarItem
                icon={<LayoutGrid size={18} color={currentScreen === 'review' ? '#FFFFFF' : COLORS.accentPrimary} />}
                label="Review & Par"
                active={currentScreen === 'review'}
                onPress={() => handleNavigate('review')}
              />

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>MANAGEMENT</Text>
              <SidebarItem
                icon={<Settings size={18} color={currentScreen === 'settings' ? '#FFFFFF' : COLORS.accentPrimary} />}
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

              <TouchableOpacity style={styles.signOutButton} onPress={onSignOut} activeOpacity={0.7}>
                <LogOut size={16} color={COLORS.error} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdropTouch: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  sidebarContent: {
    flex: 1,
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
    width: 36,
    height: 36,
    backgroundColor: COLORS.accentPrimary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    letterSpacing: LETTER_SPACING,
  },
  closeButton: {
    padding: SPACING.md,
    marginRight: -SPACING.md,
  },
  navContainer: {
    flex: 1,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textTertiary,
    letterSpacing: 2,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
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
    padding: SPACING.md,
    backgroundColor: `${COLORS.primaryDark}50`,
    borderRadius: 10,
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
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    letterSpacing: LETTER_SPACING,
  },
  userEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
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
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.error,
    letterSpacing: LETTER_SPACING,
  },
});
