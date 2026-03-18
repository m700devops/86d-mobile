import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { COLORS } from './constants/colors';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { InventoryProvider } from './context/InventoryContext';
import { DistributorProvider } from './context/DistributorContext';
import { AppScreen } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import Onboarding from './screens/Onboarding';
import CameraScan from './screens/CameraScan';
import ReviewGrid from './screens/ReviewGrid';
import OrderSummary from './screens/OrderSummary';
import SettingsScreen from './screens/SettingsScreen';
import ManualAdd from './components/ManualAdd';
import Sidebar from './components/Sidebar';

// Auth-aware app content
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AppScreen | 'login' | 'register'>('onboarding');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const navigate = (screen: AppScreen | 'login' | 'register') => {
    setCurrentScreen(screen);
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
        case 'login':
        default:
          return (
            <LoginScreen
              onNavigateToRegister={() => navigate('register')}
              onLoginSuccess={() => navigate('onboarding')}
            />
          );
      }
    }

    // Authenticated - show normal app flow
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
          />
        );
      case 'order':
        return <OrderSummary onRestart={() => navigate('camera')} />;
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
    <LocationProvider>
      <InventoryProvider>
        <DistributorProvider>
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
                onSignOut={() => {
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
        </DistributorProvider>
      </InventoryProvider>
    </LocationProvider>
  );
}

// Main App with AuthProvider wrapper
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
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
