import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CalendarCheck } from 'lucide-react-native';
import CountDayPicker from '../components/CountDayPicker';
import { COLORS } from '../constants/colors';
import { CountDay, CountTime, dayPlural } from '../utils/countDay';
import { enableReminder, saveSchedule } from '../services/countReminder';
import { track } from '../services/analytics';

interface Props {
  onDone: () => void;
}

/**
 * Asked once, right after the bar name: when does this bar count?
 *
 * Most accounts are made on a sales call, away from the bar and days before
 * the next count, and then nothing connects the two — five bars signed up in
 * October 2026 and none of them counted. Saying WHEN you'll do something
 * makes doing it far more likely (implementation intentions), and the answer
 * gives the app something worth a notification: one reminder, on count day.
 *
 * The iOS notification dialog appears only after they've picked a day and
 * tapped "Remind me Sundays", so they know exactly what they're allowing —
 * iOS asks once. Skipping is always one tap; nothing here can block the app.
 */
export default function CountDayScreen({ onDone }: Props) {
  const [day, setDay] = useState<CountDay | null>(null);
  const [time, setTime] = useState<CountTime | null>(null);
  const [saving, setSaving] = useState(false);

  const plural = day ? dayPlural(day) : null;

  const save = async () => {
    if (!day || saving) return;
    setSaving(true);
    try {
      const schedule = { day, time: day === 'varies' ? null : time };
      await saveSchedule(schedule);
      track('count_day_set');
      if (day !== 'varies') {
        const result = await enableReminder(schedule);
        if (result === 'on') track('reminder_on');
        else if (result === 'declined') track('reminder_declined');
      }
    } finally {
      setSaving(false);
      onDone();
    }
  };

  const skip = () => {
    track('count_day_skipped');
    onDone();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconBox}>
          <CalendarCheck size={30} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>When do you usually count?</Text>
        <Text style={styles.hint}>
          We'll remind you that day. Your first count starts with just 3 bottles.
        </Text>

        <CountDayPicker
          day={day}
          time={time}
          onChange={(d, t) => { setDay(d); setTime(t); }}
        />

        <TouchableOpacity
          style={[styles.button, (!day || saving) && styles.buttonDisabled]}
          onPress={save}
          disabled={!day || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{plural ? `Remind me ${plural}` : 'Continue'}</Text>}
        </TouchableOpacity>
        {plural && (
          <Text style={styles.note}>One reminder on count day, nothing else. Change it any time in Settings.</Text>
        )}

        <TouchableOpacity style={styles.skip} onPress={skip} disabled={saving}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0C0C' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  iconBox: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#9A9A9A',
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 20,
  },
  button: {
    backgroundColor: COLORS.accentPrimary,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  note: { fontSize: 12, color: '#7A7A7A', textAlign: 'center', marginTop: 10, lineHeight: 17 },
  skip: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  skipText: { fontSize: 14, color: '#9A9A9A' },
});
