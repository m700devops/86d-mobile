import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PartyPopper } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

interface Props {
  visible: boolean;
  /** "48 seconds" — how long their three bottles took, if it's worth saying. */
  took: string | null;
  /** "Sunday after close" — when they said they count, if they did. */
  countsOn: string | null;
  onKeepGoing: () => void;
  onClear: () => void;
}

/**
 * Shown once, after the third bottle of someone's very first try.
 *
 * The first count is the whole bar, and nobody trusts new software with the
 * real count on the first go — so the first run asks for three bottles, and
 * this card says what just happened: that WAS a count, the rest is more of the
 * same, and it ends in an order. The three rows are real counts, so they can
 * stay (keep going now) or be cleared (it was practice; the real count is on
 * count day).
 */
export default function FirstTryCard({ visible, took, countsOn, onKeepGoing, onClear }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepGoing}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <PartyPopper size={28} color={COLORS.onAccentSecondary} />
          </View>
          <Text style={styles.title}>That's a count.</Text>
          <Text style={styles.body}>
            {took ? `3 bottles in ${took}. ` : '3 bottles done. '}
            Your whole bar works exactly the same way, and when you're done, 86'd writes the order
            for each distributor.
          </Text>
          {countsOn && countsOn !== 'No set day' && (
            <Text style={styles.when}>We'll remind you {countsOn}.</Text>
          )}

          <TouchableOpacity style={styles.primary} onPress={onKeepGoing} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Keep counting</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={onClear} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>That was practice, clear these 3</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accentSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  body: { fontSize: 15, color: '#D9D9D9', textAlign: 'center', lineHeight: 22 },
  when: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10 },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.accentPrimary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondary: { paddingVertical: 12, marginTop: 6 },
  secondaryText: { fontSize: 14, color: COLORS.textSecondary },
});
