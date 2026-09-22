import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Store } from 'lucide-react-native';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from '../components/Brand';

interface Props {
  onDone: () => void;
}

/**
 * One field, asked once, right after a social sign-up.
 *
 * It is not busywork: this name goes on every order email the bar sends, so
 * it used to be demanded by a modal in OrderSummary at first send — which is
 * the worst possible moment, with an order ready to go out. Asking here costs
 * a tap while nothing is in flight.
 *
 * It also happens to be the only thing that keeps sales attribution honest
 * when someone signs in through Apple with Hide My Email: the CRM matches a
 * lead to a customer by email first, and falls back to the business name when
 * the address it has was never the one the venue published.
 */
export default function BarNameScreen({ onDone }: Props) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter the name, or skip for now');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiService.updateProfile({ business_name: trimmed });
      await refreshUser();
      onDone();
    } catch {
      // Never a dead end: the name can be set later in Settings, and blocking
      // someone out of the app over it would be a worse trade than losing it.
      setError("Couldn't save that — you can add it later in Settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <BrandMark size={110} />
          </View>

          <Text style={styles.title}>
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Welcome'}
          </Text>
          <Text style={styles.subtitle}>What's your bar called?</Text>
          <Text style={styles.hint}>
            It goes at the top of the order emails you send to distributors.
          </Text>

          <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
            <Store size={18} color={focused ? '#FF6B35' : '#6B6B6B'} />
            <TextInput
              style={styles.input}
              placeholder="The Corner Tavern"
              placeholderTextColor="#5C5C5C"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={save}
              editable={!saving}
              autoFocus
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skip} onPress={onDone} disabled={saving}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0C0C' },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  hero: { alignItems: 'center', marginBottom: 28 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 17,
    color: '#D9D9D9',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputWrapperFocused: {
    borderColor: '#FF6B35',
    backgroundColor: '#1A1512',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
  },
  error: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FF6B35',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  skip: { alignItems: 'center', marginTop: 18, paddingVertical: 8 },
  skipText: { fontSize: 14, color: '#9A9A9A' },
});
