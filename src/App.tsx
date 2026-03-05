import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { COLORS } from './constants/colors';
import { LocationProvider } from './context/LocationContext';
import { InventoryProvider } from './context/InventoryContext';
import { DistributorProvider } from './context/DistributorContext';
import { AppScreen } from './types';
import Onboarding from './screens/Onboarding';
import CameraScan from './screens/CameraScan';
import PenDetection from './screens/PenDetection';
import ReviewGrid from './screens/ReviewGrid';
import OrderSummary from './screens/OrderSummary';
import SettingsScreen from './screens/SettingsScreen';
import ManualAdd from './components/ManualAdd';
import Sidebar from './components/Sidebar';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('onboarding');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const navigate = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'onboarding':
        return <Onboarding onComplete={() => navigate('camera')} />;
      case 'camera':
        return (
          <CameraScan
            onReview={() => navigate('review')}
            onPenDetect={() => navigate('pen-detection')}
          />
        );
      case 'pen-detection':
        return (
          <PenDetection
            onBack={() => navigate('camera')}
            onComplete={() => navigate('review')}
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

            {/* Sidebar Navigation */}
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              currentScreen={currentScreen}
              onNavigate={(screen) => navigate(screen as AppScreen)}
              onSignOut={() => {
                setCurrentScreen('onboarding');
                setIsSidebarOpen(false);
              }}
            />

            {/* Manual Add Modal */}
            {isManualAddOpen && (
              <ManualAdd
                onClose={() => setIsManualAddOpen(false)}
                onAdd={(bottle) => {
                  // Handle adding bottle
                  setIsManualAddOpen(false);
                }}
              />
            )}

            {/* Hamburger Menu Button (visible on all screens except onboarding) */}
            {currentScreen !== 'onboarding' && currentScreen !== 'camera' && (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
