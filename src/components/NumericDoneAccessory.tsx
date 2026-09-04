import React from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/spacing';

// iOS numeric keyboards — phone-pad, number-pad, decimal-pad — have no return
// key. Nothing on them dismisses the keyboard, so any numeric field without
// another way out is a trap: the field takes focus, the keyboard covers the
// bottom of the screen (Save buttons included), and there is no gesture that
// closes it. That's the distributor phone-number dead end.
//
// This is the standard fix: a bar pinned above the keyboard carrying a Done
// button. Attach it by giving the TextInput
// `inputAccessoryViewID={NUMERIC_ACCESSORY_ID}` and rendering
// <NumericDoneAccessory /> once in the same view hierarchy (inside the same
// Modal, when the input lives in one).
//
// iOS only. InputAccessoryView isn't implemented on Android, which doesn't
// need it — its numeric keyboards keep the system back gesture for dismissal.

export const NUMERIC_ACCESSORY_ID = 'numericDoneAccessory';

export default function NumericDoneAccessory() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={NUMERIC_ACCESSORY_ID}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          style={styles.button}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={styles.text}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  button: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  text: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accentPrimary,
  },
});
