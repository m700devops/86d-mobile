import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { api, Product, InventorySession } from './api';

// Level options for bottle scanning
const LEVELS = [
  { label: 'Full', value: 'full', decimal: 1.0 },
  { label: '3/4', value: '3/4', decimal: 0.75 },
  { label: 'Half', value: 'half', decimal: 0.5 },
  { label: '1/4', value: '1/4', decimal: 0.25 },
  { label: 'Empty', value: 'empty', decimal: 0.0 },
];

type Screen = 'home' | 'scan' | 'products' | 'session' | 'order';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [permission, requestPermission] = useCameraPermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [session, setSession] = useState<InventorySession | null>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // Check API health on startup
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    const healthy = await api.healthCheck();
    setApiConnected(healthy);
  };

  // Load products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
    }
    setLoading(false);
  };

  // Search products
  const searchProducts = async () => {
    if (!searchQuery.trim()) {
      loadProducts();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchProducts(searchQuery);
      setProducts(data);
    } catch (error) {
      Alert.alert('Error', 'Search failed');
    }
    setLoading(false);
  };

  // Start inventory session
  const startSession = async () => {
    setLoading(true);
    try {
      // Using location_id = 1 for demo
      const newSession = await api.startInventory(1);
      setSession(newSession);
      setScans([]);
      setScreen('session');
    } catch (error) {
      Alert.alert('Error', 'Failed to start inventory session');
    }
    setLoading(false);
  };

  // Add scan to session
  const addScan = async (level: string) => {
    if (!session || !selectedProduct) return;
    
    setLoading(true);
    try {
      const scan = await api.addScan(session.session_id, {
        product_id: selectedProduct.id,
        level,
        detection_method: 'camera',
      });
      setScans([...scans, { ...scan, product: selectedProduct }]);
      setSelectedProduct(null);
      setScreen('session');
    } catch (error) {
      Alert.alert('Error', 'Failed to add scan');
    }
    setLoading(false);
  };

  // Complete session and generate order
  const completeSession = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      await api.completeInventory(session.session_id);
      const orderData = await api.generateOrder(session.session_id);
      setOrder(orderData);
      setScreen('order');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete session');
    }
    setLoading(false);
  };

  // Render home screen
  const renderHome = () => (
    <View style={styles.container}>
      <Text style={styles.title}>86'd</Text>
      <Text style={styles.subtitle}>Bar Inventory</Text>
      
      {!apiConnected && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>⚠️ API not connected</Text>
          <TouchableOpacity onPress={checkApiHealth}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]} 
        onPress={startSession}
        disabled={!apiConnected}
      >
        <Text style={styles.buttonText}>📸 Start Inventory</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => { loadProducts(); setScreen('products'); }}
        disabled={!apiConnected}
      >
        <Text style={styles.buttonText}>📋 Product Database</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Backend: eight6d-api.onrender.com</Text>
        <Text style={styles.infoText}>Status: {apiConnected ? '🟢 Connected' : '🔴 Offline'}</Text>
      </View>
    </View>
  );

  // Render product selection screen
  const renderProducts = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Select Product</Text>
      
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchProducts}
        />
        <TouchableOpacity onPress={searchProducts} style={styles.searchButton}>
          <Text>🔍</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.productItem}
              onPress={() => {
                setSelectedProduct(item);
                setScreen('scan');
              }}
            >
              <Text style={styles.productName}>{item.brand} {item.name}</Text>
              <Text style={styles.productCategory}>{item.category}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => setScreen('home')}>
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  // Render scan screen with level selection
  const renderScan = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Select Level</Text>
      
      {selectedProduct && (
        <View style={styles.selectedProduct}>
          <Text style={styles.productName}>{selectedProduct.brand} {selectedProduct.name}</Text>
        </View>
      )}

      <View style={styles.levelGrid}>
        {LEVELS.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[styles.levelButton, { backgroundColor: getLevelColor(level.decimal) }]}
            onPress={() => addScan(level.value)}
          >
            <Text style={styles.levelButtonText}>{level.label}</Text>
            <Text style={styles.levelDecimal}>{(level.decimal * 100).toFixed(0)}%</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => setScreen('products')}>
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  // Render active session screen
  const renderSession = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory Session</Text>
      <Text style={styles.sessionId}>ID: {session?.session_id}</Text>
      
      <Text style={styles.scansTitle}>Scans: {scans.length}</Text>
      
      <FlatList
        data={scans}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.scanItem}>
            <Text>{item.product?.brand} {item.product?.name}</Text>
            <Text style={styles.levelText}>Level: {item.level}</Text>
          </View>
        )}
        style={styles.scanList}
      />

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]}
        onPress={() => { loadProducts(); setScreen('products'); }}
      >
        <Text style={styles.buttonText}>+ Add Scan</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.completeButton]}
        onPress={completeSession}
        disabled={scans.length === 0}
      >
        <Text style={styles.buttonText}>✓ Complete & Generate Order</Text>
      </TouchableOpacity>
    </View>
  );

  // Render order screen
  const renderOrder = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Generated Order</Text>
      
      {order?.items?.length === 0 ? (
        <Text style={styles.emptyText}>No items needed! Stock is good.</Text>
      ) : (
        <FlatList
          data={order?.items || []}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.orderItem}>
              <Text style={styles.orderProduct}>{item.brand} {item.product_name}</Text>
              <Text>Need: {item.needed.toFixed(2)} bottles</Text>
              <Text>Current: {(item.current_level * 100).toFixed(0)}% | Par: {item.par_quantity}</Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]}
        onPress={() => {
          setSession(null);
          setOrder(null);
          setScans([]);
          setScreen('home');
        }}
      >
        <Text style={styles.buttonText}>Start New Inventory</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      {screen === 'home' && renderHome()}
      {screen === 'products' && renderProducts()}
      {screen === 'scan' && renderScan()}
      {screen === 'session' && renderSession()}
      {screen === 'order' && renderOrder()}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </SafeAreaView>
  );
}

function getLevelColor(decimal: number): string {
  if (decimal >= 0.75) return '#4CAF50'; // Green
  if (decimal >= 0.5) return '#FFC107'; // Yellow
  if (decimal >= 0.25) return '#FF9800'; // Orange
  return '#F44336'; // Red
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  backButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningText: {
    color: '#856404',
    marginBottom: 5,
  },
  retryText: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  infoBox: {
    marginTop: 'auto',
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
  },
  infoText: {
    color: '#666',
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 10,
    marginLeft: 10,
    justifyContent: 'center',
  },
  productItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productCategory: {
    color: '#666',
    marginTop: 4,
  },
  selectedProduct: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  levelButton: {
    width: '48%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  levelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelDecimal: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  sessionId: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  scansTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scanList: {
    flex: 1,
    marginBottom: 15,
  },
  scanItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  levelText: {
    color: '#666',
    marginTop: 4,
  },
  orderItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  orderProduct: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 50,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
