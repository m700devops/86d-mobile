import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from './constants/colors';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { DistributorProvider } from './context/DistributorContext';
import { ProductBookProvider } from './context/ProductBookContext';
import { AppScreen, OrderDistributorSummary, User } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import CameraScan from './screens/CameraScan';
import ReviewGrid from './screens/ReviewGrid';
import OrderSummary from './screens/OrderSummary';
import OrderHistory from './screens/OrderHistory';
import PricingScreen from './screens/PricingScreen';
import SettingsScreen from './screens/SettingsScreen';
import PaywallScreen from './screens/PaywallScreen';
import BarNameScreen from './screens/BarNameScreen';
import ManualAdd from './components/ManualAdd';
import Sidebar from './components/Sidebar';
import TrialBanner from './components/TrialBanner';
import { isEntitled, trialDaysLeft } from './utils/entitlements';
import { track } from './services/analytics';

type ReorderSource = { distributors: OrderDistributorSummary[] };

// A killed app (call comes in, phone gets put away, iOS reclaims memory)
// shouldn't dump someone back at the start mid-order — resume whichever main
// screen they were actually on. Login/register/bar-name aren't meaningful
// "resume points", so they're deliberately excluded.
const LAST_SCREEN_KEY = '@86d_last_screen';
const RESUMABLE_SCREENS: AppScreen[] = ['camera', 'review', 'order', 'orders', 'pricing', 'settings'];

// Auth-aware app content
function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { addBottle } = useInventory();
  const [currentScreen, setCurrentScreen] = useState<AppScreen | 'login' | 'register' | 'forgot-password' | 'bar-name'>('camera');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [reorderOrder, setReorderOrder] = useState<ReorderSource | null>(null);
  const [isRestoringScreen, setIsRestoringScreen] = useState(true);
  const trialDays = trialDaysLeft(user);

  const navigate = (screen: AppScreen | 'login' | 'register' | 'forgot-password' | 'bar-name') => {
    setReorderOrder(null);
    setCurrentScreen(screen);
  };

  const navigateToReorder = (order: ReorderSource) => {
    setReorderOrder(order);
    setCurrentScreen('order');
  };

  // One per launch, before auth resolves: this is the denominator for
  // everything else — how many people opened the app at all.
  useEffect(() => {
    track('app_opened');
  }, []);

  // Once auth has settled, resume the last main screen for an authenticated
  // user — nothing to resume for a signed-out session.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setIsRestoringScreen(false);
      return;
    }
    AsyncStorage.getItem(LAST_SCREEN_KEY)
      .then(saved => {
        if (saved && (RESUMABLE_SCREENS as string[]).includes(saved)) {
          setCurrentScreen(saved as AppScreen);
        }
      })
      .finally(() => setIsRestoringScreen(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  // Keep the last resumable screen written to disk as it changes.
  useEffect(() => {
    if ((RESUMABLE_SCREENS as string[]).includes(currentScreen)) {
      AsyncStorage.setItem(LAST_SCREEN_KEY, currentScreen).catch(() => {});
    }
  }, [currentScreen]);

  // A social sign-in skips the whole form, which means it also skips the one
  // useful thing the form collected. Ask for the bar's name once, here, if the
  // account hasn't got one — it heads every order email, and it is the only
  // handle sales attribution has left when Apple hides the address.
  const handleAppleSignIn = (signedIn: User) => {
    navigate(signedIn.business_name ? 'camera' : 'bar-name');
  };

  // Show loading state while checking auth
  if (isLoading || isRestoringScreen) {
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
              onRegisterSuccess={() => navigate('camera')}
              onAppleSignIn={handleAppleSignIn}
            />
          );
        case 'forgot-password':
          return <ForgotPasswordScreen onBackToLogin={() => navigate('login')} />;
        case 'login':
        default:
          return (
            <LoginScreen
              onNavigateToRegister={() => navigate('register')}
              onLoginSuccess={() => navigate('camera')}
              onForgotPassword={() => navigate('forgot-password')}
              onAppleSignIn={handleAppleSignIn}
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

    // Just signed in and the screen state hasn't caught up yet — the camera
    // is where they were going anyway.
    if (currentScreen === 'login' || currentScreen === 'register') {
      return (
        <CameraScan
          onReview={() => navigate('review')}
          onOpenMenu={() => setIsSidebarOpen(true)}
        />
      );
    }

    switch (currentScreen) {
      case 'bar-name':
        return <BarNameScreen onDone={() => navigate('camera')} />;
      case 'camera':
        return (
          <CameraScan
            onReview={() => navigate('review')}
            onOpenMenu={() => setIsSidebarOpen(true)}
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
      case 'pricing':
        return <PricingScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return (
          <CameraScan
            onReview={() => navigate('review')}
            onOpenMenu={() => setIsSidebarOpen(true)}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.primaryDark }]}>
      {/* Trial-ending heads-up — everywhere except the live camera view */}
      {isAuthenticated && currentScreen !== 'camera' && trialDays !== null && trialDays <= 5 && (
        <SafeAreaView style={{ backgroundColor: COLORS.accentSecondary }}>
          <TrialBanner daysLeft={trialDays} />
        </SafeAreaView>
      )}

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
            await AsyncStorage.removeItem(LAST_SCREEN_KEY);
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

      {/* Hamburger Menu Button - only when authenticated and not on camera (which has its own header) */}
      {isAuthenticated && currentScreen !== 'camera' && (
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
            <ProductBookProvider>
              <AppContent />
            </ProductBookProvider>
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
