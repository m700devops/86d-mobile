import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { COLORS } from './constants/colors';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { DistributorProvider } from './context/DistributorContext';
import { StaffProvider } from './context/StaffContext';
import { AppScreen, OrderDistributorSummary } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import Onboarding from './screens/Onboarding';
import CameraScan from './screens/CameraScan';
import ReviewGrid from './screens/ReviewGrid';
import OrderSummary from './screens/OrderSummary';
import OrderHistory from './screens/OrderHistory';
import SettingsScreen from './screens/SettingsScreen';
import PaywallScreen from './screens/PaywallScreen';
import ManualAdd from './components/ManualAdd';
import Sidebar from './components/Sidebar';
import { isEntitled } from './utils/entitlements';

type ReorderSource = { distributors: OrderDistributorSummary[] };

// Auth-aware app content
function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { addBottle } = useInventory();
  const [currentScreen, setCurrentScreen] = useState<AppScreen | 'login' | 'register' | 'forgot-password'>('onboarding');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [reorderOrder, setReorderOrder] = useState<ReorderSource | null>(null);

  const navigate = (screen: AppScreen | 'login' | 'register' | 'forgot-password') => {
    setReorderOrder(null);
    setCurrentScreen(screen);
  };

  const navigateToReorder = (order: ReorderSource) => {
    setReorderOrder(order);
    setCurrentScreen('order');
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: COLORS.primaryDark }]}>
        <View style={styles.loadingBox}>
          <View style={styles.loadingDot} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const renderScreen = () => {
    // If not authenticated, show login/register
    if (!isAuthenticated) {
      switch (currentScreen) {
        case 'register':
          return (
            <RegisterScreen
              onNavigateToLogin={() => navigate('login')}
              onRegisterSuccess={() => navigate('onboarding')}
            />
          );
        case 'forgot-password':
          return <ForgotPasswordScreen onBackToLogin={() => navigate('login')} />;
        case 'login':
        default:
          return (
            <LoginScreen
              onNavigateToRegister={() => navigate('register')}
              onLoginSuccess={() => navigate('onboarding')}
              onForgotPassword={() => navigate('forgot-password')}
            />
          );
      }
    }

    // Authenticated - show normal app flow
    // Trial expired / no active subscription — block everything except the
    // paywall itself (which has its own sign-out). A brand-new account is
    // always entitled (trial just started), so this never blocks onboarding.
    if (!isEntitled(user)) {
      return <PaywallScreen />;
    }

    // If coming from login/register, redirect to onboarding
    if (currentScreen === 'login' || currentScreen === 'register') {
      return <Onboarding onComplete={() => navigate('camera')} />;
    }

    switch (currentScreen) {
      case 'onboarding':
        return <Onboarding onComplete={() => navigate('camera')} />;
      case 'camera':
        return (
          <CameraScan
            onReview={() => navigate('review')}
          />
        );
      case 'review':
        return (
          <ReviewGrid
            onGenerateOrder={() => navigate('order')}
            onAddManual={() => setIsManualAddOpen(true)}
            onNavigateToSettings={() => navigate('settings')}
          />
        );
      case 'order':
        return (
          <OrderSummary
            onRestart={() => navigate('camera')}
            onViewOrders={() => navigate('orders')}
            presetOrder={reorderOrder}
          />
        );
      case 'orders':
        return (
          <OrderHistory
            onBack={() => navigate('camera')}
            onReorder={navigateToReorder}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          />
        );
      default:
        return <Onboarding onComplete={() => navigate('camera')} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      {/* Main Screen */}
      {renderScreen()}

      {/* Sidebar Navigation - only show when authenticated */}
      {isAuthenticated && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentScreen={currentScreen as AppScreen}
          onNavigate={(screen) => navigate(screen as AppScreen)}
          onSignOut={async () => {
            await logout();
            setCurrentScreen('login');
            setIsSidebarOpen(false);
          }}
        />
      )}

      {/* Manual Add Modal */}
      {isManualAddOpen && (
        <ManualAdd
          onClose={() => setIsManualAddOpen(false)}
          onAdd={(bottle) => {
            addBottle(bottle);
            setIsManualAddOpen(false);
          }}
        />
      )}

      {/* Hamburger Menu Button - only when authenticated and not on onboarding/camera */}
      {isAuthenticated && currentScreen !== 'onboarding' && currentScreen !== 'camera' && (
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => setIsSidebarOpen(true)}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Main App with AuthProvider wrapper
export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <InventoryProvider>
          <DistributorProvider>
            <StaffProvider>
              <AppContent />
            </StaffProvider>
          </DistributorProvider>
        </InventoryProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 16,
  },
  loadingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accentPrimary,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  hamburgerButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.textSecondary,
    marginVertical: 4,
  },
});
