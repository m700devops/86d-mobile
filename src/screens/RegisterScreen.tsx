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
  Alert,
  ScrollView,
} from 'react-native';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { BrandMark, GlowBackground } from '../components/Brand';

// Render free tier cold-starts in ~30-60s. Each attempt gets 12s and timeouts
// auto-retry, so a cold start rides through instead of failing at the first cap.
const REGISTER_TIMEOUT_MS = 12000;
const REGISTER_MAX_ATTEMPTS = 4;

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

type Field = 'name' | 'email' | 'password' | 'confirmPassword';

export function RegisterScreen({ onNavigateToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<Field | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const { register } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms of service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setFormError(null);
    setIsLoading(true);
    try {
      for (let attempt = 1; attempt <= REGISTER_MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REGISTER_TIMEOUT_MS);
        try {
          await register(
            {
              email: email.trim(),
              password,
              name: name.trim(),
              terms_accepted: termsAccepted,
            },
            controller.signal
          );
          onRegisterSuccess();
          return;
        } catch (error: any) {
          const detail = error.response?.data?.detail;
          const errorCode = detail?.error || error.response?.data?.error;
          if (errorCode === 'email_exists') {
            const message = detail?.message || error.response?.data?.message || 'An account with this email already exists.';
            Alert.alert('Account Exists', message + '\n\nPlease sign in instead.', [
              { text: 'Sign In', onPress: onNavigateToLogin },
              { text: 'OK', style: 'cancel' },
            ]);
            return;
          }
          if (controller.signal.aborted) {
            if (attempt < REGISTER_MAX_ATTEMPTS) {
              setFormError('Server is waking up — retrying...');
              continue;
            }
            setFormError('Server is still waking up. Give it a minute, then try again.');
            return;
          }
          if (error?.response) {
            setFormError(detail?.message || error.response?.data?.message || "Couldn't reach server. Check your connection.");
          } else {
            setFormError("Couldn't reach server. Check your connection.");
          }
          return;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    field: Field,
    label: string,
    icon: React.ReactNode,
    props: {
      value: string;
      onChangeText: (t: string) => void;
      placeholder: string;
      secure?: boolean;
      keyboardType?: 'email-address' | 'default';
      autoCapitalize?: 'none' | 'words';
      showEye?: boolean;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focusedField === field && styles.inputWrapperFocused,
          errors[field] && styles.inputWrapperError,
        ]}
      >
        {icon}
        <TextInput
          style={styles.input}
          placeholder={props.placeholder}
          placeholderTextColor="#5C5C5C"
          value={props.value}
          onChangeText={(text) => {
            props.onChangeText(text);
            if (errors[field]) setErrors({ ...errors, [field]: undefined });
          }}
          onFocus={() => setFocusedField(field)}
          onBlur={() => setFocusedField(null)}
          secureTextEntry={props.secure && !showPassword}
          keyboardType={props.keyboardType ?? 'default'}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          autoCorrect={false}
          editable={!isLoading}
        />
        {props.showEye && (
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword
              ? <EyeOff size={18} color="#6B6B6B" />
              : <Eye size={18} color="#6B6B6B" />}
          </TouchableOpacity>
        )}
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const iconColor = (field: Field) => (focusedField === field ? '#FF6B35' : '#6B6B6B');

  return (
    <SafeAreaView style={styles.container}>
      <GlowBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Brand hero */}
            <View style={styles.hero}>
              <BrandMark size={64} />
              <Text style={styles.slogan}>Scan it. Count it. Order it.</Text>
            </View>

            {/* Sign-up card */}
            <View style={styles.card}>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Start your free 14-day trial</Text>

              {renderInput('name', 'Full Name', <User size={18} color={iconColor('name')} />, {
                value: name,
                onChangeText: setName,
                placeholder: 'John Doe',
                autoCapitalize: 'words',
              })}

              {renderInput('email', 'Email', <Mail size={18} color={iconColor('email')} />, {
                value: email,
                onChangeText: setEmail,
                placeholder: 'you@bar.com',
                keyboardType: 'email-address',
              })}

              {renderInput('password', 'Password', <Lock size={18} color={iconColor('password')} />, {
                value: password,
                onChangeText: setPassword,
                placeholder: '••••••••',
                secure: true,
                showEye: true,
              })}

              {renderInput('confirmPassword', 'Confirm Password', <Lock size={18} color={iconColor('confirmPassword')} />, {
                value: confirmPassword,
                onChangeText: setConfirmPassword,
                placeholder: '••••••••',
                secure: true,
              })}

              {/* Terms */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => {
                    setTermsAccepted(!termsAccepted);
                    if (errors.terms) setErrors({ ...errors, terms: undefined });
                  }}
                  disabled={isLoading}
                >
                  <View style={[styles.checkboxBox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
                {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
              </View>

              {/* Form-level error (timeout / network / server) */}
              {formError && (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              {/* Create account */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign in link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  slogan: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9A9A9A',
    marginBottom: 22,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D9D9D9',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#FF6B35',
    backgroundColor: '#1A1512',
  },
  inputWrapperError: {
    borderColor: '#FF6B35',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 6,
  },
  termsContainer: {
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161616',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#9A9A9A',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FFD700',
  },
  formErrorBox: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  formErrorText: {
    fontSize: 14,
    color: '#FF6B35',
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#FF6B35',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#9A9A9A',
  },
  footerLink: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '700',
  },
});
