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
  ScrollView,
} from 'react-native';
import { Mail, Lock, KeyRound, Eye, EyeOff, ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { apiService } from '../services/api';
import { BrandMark, GlowBackground } from '../components/Brand';

interface Props {
  onBackToLogin: () => void;
}

type Step = 'request' | 'reset' | 'done';

export function ForgotPasswordScreen({ onBackToLogin }: Props) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await apiService.forgotPassword(email.trim());
      setStep('reset');
    } catch {
      // Same generic outcome either way — the backend never reveals whether
      // an account exists, so don't let a network hiccup imply otherwise.
      setStep('reset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await apiService.forgotPassword(email.trim());
    } catch {
      // ignore — same reasoning as handleSendCode
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await apiService.resetPassword(email.trim(), code.trim(), newPassword);
      setStep('done');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail?.message ?? 'Invalid or expired code — check your email and try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <GlowBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.hero}>
              <BrandMark size={99} />
            </View>

            <View style={styles.card}>
              <TouchableOpacity style={styles.backRow} onPress={onBackToLogin} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronLeft size={18} color="#9A9A9A" />
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>

              {step === 'request' && (
                <>
                  <Text style={styles.title}>Reset your password</Text>
                  <Text style={styles.subtitle}>We'll email you a 6-digit code</Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
                      <Mail size={18} color={focusedField === 'email' ? '#FF6B35' : '#6B6B6B'} />
                      <TextInput
                        style={styles.input}
                        placeholder="you@bar.com"
                        placeholderTextColor="#5C5C5C"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleSendCode}
                        editable={!isLoading}
                        autoFocus
                      />
                    </View>
                  </View>

                  {error && (
                    <View style={styles.formErrorBox}>
                      <Text style={styles.formErrorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleSendCode}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
                  </TouchableOpacity>
                </>
              )}

              {step === 'reset' && (
                <>
                  <Text style={styles.title}>Check your email</Text>
                  <Text style={styles.subtitle}>Enter the code we sent to {email.trim()}</Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Reset Code</Text>
                    <View style={[styles.inputWrapper, focusedField === 'code' && styles.inputWrapperFocused]}>
                      <KeyRound size={18} color={focusedField === 'code' ? '#FF6B35' : '#6B6B6B'} />
                      <TextInput
                        style={styles.input}
                        placeholder="123456"
                        placeholderTextColor="#5C5C5C"
                        value={code}
                        onChangeText={t => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                        onFocus={() => setFocusedField('code')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!isLoading}
                        autoFocus
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused]}>
                      <Lock size={18} color={focusedField === 'password' ? '#FF6B35' : '#6B6B6B'} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#5C5C5C"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleResetPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        {showPassword ? <EyeOff size={18} color="#6B6B6B" /> : <Eye size={18} color="#6B6B6B" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {error && (
                    <View style={styles.formErrorBox}>
                      <Text style={styles.formErrorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.resendLink} onPress={handleResend} disabled={isLoading}>
                    <Text style={styles.resendText}>Didn't get a code? Resend</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'done' && (
                <>
                  <View style={styles.successIconWrap}>
                    <CheckCircle2 size={40} color="#4ADE80" />
                  </View>
                  <Text style={[styles.title, { textAlign: 'center' }]}>Password reset</Text>
                  <Text style={[styles.subtitle, { textAlign: 'center' }]}>Sign in with your new password</Text>

                  <TouchableOpacity style={styles.button} onPress={onBackToLogin} activeOpacity={0.85}>
                    <Text style={styles.buttonText}>Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              )}
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
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 22,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    fontSize: 14,
    color: '#9A9A9A',
    marginLeft: 2,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    height: '100%',
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
  resendLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendText: {
    fontSize: 13,
    color: '#FFD700',
  },
  successIconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
});
