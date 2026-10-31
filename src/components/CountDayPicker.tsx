import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { COUNT_TIMES, CountDay, CountTime, WEEKDAYS } from '../utils/countDay';

interface Props {
  day: CountDay | null;
  time: CountTime | null;
  onChange: (day: CountDay | null, time: CountTime | null) => void;
  /** Just the seven days: the sign-up step asks for nothing more (the
   *  owner's call — a first screen with three rows of chips was too much).
   *  Settings shows "It varies" and the time of day as well. */
  daysOnly?: boolean;
}

/**
 * Two taps: the day, then the part of the day. Chips, not a date picker —
 * a count day is a habit ("Sundays after close"), not a date, and a chip is
 * one tap with a thumb behind the bar. Shared by the sign-up step and
 * Settings so the two can't drift.
 */
export default function CountDayPicker({ day, time, onChange, daysOnly }: Props) {
  const weekday = day && day !== 'varies';
  return (
    <View>
      <View style={styles.days}>
        {WEEKDAYS.map(d => {
          const on = day === d.key;
          return (
            <TouchableOpacity
              key={d.key}
              style={[styles.day, on && styles.chipOn]}
              onPress={() => onChange(d.key, time)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={d.long}
            >
              <Text style={[styles.dayText, on && styles.chipTextOn]}>{d.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!daysOnly && (
      <TouchableOpacity
        style={[styles.varies, day === 'varies' && styles.chipOn]}
        onPress={() => onChange('varies', null)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: day === 'varies' }}
      >
        <Text style={[styles.variesText, day === 'varies' && styles.chipTextOn]}>It varies</Text>
      </TouchableOpacity>
      )}

      {weekday && !daysOnly && (
        <View style={styles.times}>
          {COUNT_TIMES.map(t => {
            const on = time === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.time, on && styles.chipOn]}
                onPress={() => onChange(day, t.key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.timeText, on && styles.chipTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { color: '#D9D9D9', fontSize: 14, fontWeight: '600' },
  varies: {
    marginTop: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variesText: { color: '#9A9A9A', fontSize: 14, fontWeight: '500' },
  times: { flexDirection: 'row', gap: 8, marginTop: 16 },
  time: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  timeText: { color: '#D9D9D9', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  chipOn: { borderColor: COLORS.accentPrimary, backgroundColor: COLORS.accentTintSurface },
  chipTextOn: { color: COLORS.textPrimary },
});
