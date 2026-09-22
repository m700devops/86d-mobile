import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { User } from '../types';

interface Props {
  /** Called with the signed-in user. business_name being empty is the caller's cue
   *  to ask which bar this is before dropping them on the camera. */
  onSignedIn: (user: User) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * Sign in with Apple — one Face ID tap in place of five fields and a password.
 *
 * Renders nothing at all where it can't work (Android, an iOS old enough to
 * lack it), so the email form below stays the whole story rather than sitting
 * under a button that does nothing.
 */
export function AppleSignInButton({ onSignedIn, onError, disabled }: Props) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const { signInWithApple } = useAuth();

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(ok => { if (!cancelled) setAvailable(ok); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  const handlePress = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        onError("Apple didn't return a sign-in token. Please try again.");
        return;
      }

      // Apple gives the name on the FIRST authorization only. Send whatever
      // came back; the server keeps the first non-empty value and never
      // overwrites a name the user has since edited.
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();

      const user = await signInWithApple({
        identity_token: credential.identityToken,
        name: fullName || null,
        // The button itself is the consent surface — Apple's own sheet never
        // shows our terms, so the line under it has to, and pressing through
        // it is the acceptance.
        terms_accepted: true,
      });
      onSignedIn(user);
    } catch (e: any) {
      // Backing out of Apple's sheet is not an error worth a red box.
      if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') return;
      const detail = e?.response?.data?.detail;
      onError(detail?.message || "Couldn't finish signing in with Apple. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const legal = API_URL.replace('/v1', '');

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14}
        style={styles.button}
        onPress={handlePress}
      />
      <Text style={styles.legal}>
        By continuing you agree to our{' '}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${legal}/legal/terms`)}>
          Terms of Service
        </Text>
        {' '}and{' '}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${legal}/legal/privacy`)}>
          Privacy Policy
        </Text>
      </Text>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: 18,
  },
  button: {
    width: '100%',
    height: 52,
  },
  legal: {
    fontSize: 11,
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  legalLink: {
    color: '#B0B0B0',
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dividerText: {
    fontSize: 12,
    color: '#7A7A7A',
  },
});
