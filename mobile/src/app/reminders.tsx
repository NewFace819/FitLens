/**
 * Workout reminders — one time per weekday, optional heads-up
 * (Thông's snapshots 020, 084, 087). Schedules real weekly local notifications.
 */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WEEKDAY_LONG } from '../domain/dates.ts';
import {
  LEAD_OPTIONS,
  leadLabel,
  normalizeReminders,
  stepTime,
  type DayReminder,
  type LeadMinutes,
  type WeekReminders,
} from '../domain/reminders.ts';
import { loadReminders, saveReminders } from '../data/reminder-store';
import { Button, Chip, IconButton, Mascot, Screen, Sheet, TopBar } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';

const PRESETS = [
  ['Morning', '07:00'],
  ['Midday', '12:00'],
  ['Evening', '18:00'],
] as const;

export default function RemindersScreen() {
  const [items, setItems] = useState<WeekReminders>(normalizeReminders(null));
  const [editing, setEditing] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReminders().then((r) => {
        setItems(r);
        setDirty(false);
      });
    }, []),
  );

  const change = (day: number, value: DayReminder | null) => {
    setItems((prev) => prev.map((item, i) => (i === day ? value : item)));
    setDirty(true);
    setStatus('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const count = await saveReminders(items);
      setDirty(false);
      setStatus(
        count === null
          ? 'Times saved. Notifications are off for FitLens — turn them on in Android settings to get reminders.'
          : count === 0
            ? 'Times saved. No reminders are switched on.'
            : `Saved. ${count} weekly ${count === 1 ? 'reminder' : 'reminders'} scheduled.`,
      );
    } catch {
      setStatus('Couldn’t save here. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasAny = items.some(Boolean);

  return (
    <Screen
      footer={
        <>
          {status ? (
            <Text style={[type.caption, { marginBottom: space.sm }]} accessibilityLiveRegion="polite">
              {status}
            </Text>
          ) : null}
          <Button title={saving ? 'Saving…' : 'Save reminders'} onPress={save} disabled={!dirty || saving} trailing="✓" />
        </>
      }
    >
      <TopBar title="Reminders" />
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>A time for you.</Text>
          <Text style={[type.caption, { marginTop: space.xs }]}>
            Pick the days and times you’d like to train. We’ll nudge you gently — never more than once a day.
          </Text>
        </View>
        <Mascot mood={hasAny ? 'content' : 'waiting'} size={72} />
      </View>

      {items.map((item, day) => (
        <Pressable
          key={day}
          accessibilityRole="button"
          accessibilityLabel={`${WEEKDAY_LONG[day]}, ${item ? item.time : 'no workout time'}`}
          onPress={() => setEditing(day)}
          style={({ pressed }) => [styles.dayRow, pressed && { opacity: 0.7 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>{WEEKDAY_LONG[day]}</Text>
            <Text style={type.caption}>
              {item ? `${item.time} · ${item.enabled ? leadLabel(item.before) : 'Reminder off'}` : 'Rest day · tap to add a time'}
            </Text>
          </View>
          {item ? (
            <Switch
              value={item.enabled}
              onValueChange={(enabled) => change(day, { ...item, enabled })}
              trackColor={{ true: colors.accent, false: colors.line }}
              thumbColor={colors.white}
              accessibilityLabel={`${WEEKDAY_LONG[day]} reminder`}
            />
          ) : (
            <Text style={styles.add}>＋</Text>
          )}
        </Pressable>
      ))}

      <TimeSheet
        key={editing ?? 'none'}
        day={editing}
        item={editing === null ? null : items[editing]}
        onClose={() => setEditing(null)}
        onSave={(value) => {
          if (editing !== null) change(editing, value);
          setEditing(null);
        }}
      />
    </Screen>
  );
}

function TimeSheet({
  day,
  item,
  onClose,
  onSave,
}: {
  day: number | null;
  item: DayReminder | null;
  onClose: () => void;
  onSave: (value: DayReminder | null) => void;
}) {
  const [time, setTime] = useState(item?.time ?? '18:00');
  const [lead, setLead] = useState<LeadMinutes | 'off'>(item ? (item.enabled ? item.before : 'off') : 15);

  return (
    <Sheet visible={day !== null} onClose={onClose} title={day === null ? '' : WEEKDAY_LONG[day]}>
      <View style={styles.timeRow}>
        <IconButton label="15 minutes earlier" onPress={() => setTime((t) => stepTime(t, -15))}>
          −
        </IconButton>
        <Text style={styles.time} accessibilityLabel={`Workout time ${time}`}>
          {time}
        </Text>
        <IconButton label="15 minutes later" onPress={() => setTime((t) => stepTime(t, 15))}>
          +
        </IconButton>
      </View>
      <View style={styles.presets}>
        {PRESETS.map(([label, value]) => (
          <Chip key={value} label={label} selected={time === value} onPress={() => setTime(value)} style={{ flex: 1 }} />
        ))}
      </View>

      <Text style={[type.h3, { marginTop: space.xl, marginBottom: space.sm }]}>Reminder</Text>
      <View style={styles.presets}>
        <Chip label="Off" selected={lead === 'off'} onPress={() => setLead('off')} style={{ flex: 1 }} />
        {LEAD_OPTIONS.map((m) => (
          <Chip key={m} label={m === 0 ? 'At start' : `${m} min`} selected={lead === m} onPress={() => setLead(m)} style={{ flex: 1 }} />
        ))}
      </View>

      <View style={styles.sheetActions}>
        {item ? (
          <Button title="Remove time" variant="text" onPress={() => onSave(null)} style={{ flex: 1 }} />
        ) : null}
        <Button
          title="Save time"
          style={{ flex: 2, justifyContent: 'center' }}
          onPress={() => onSave({ time, enabled: lead !== 'off', before: lead === 'off' ? (item?.before ?? 0) : lead })}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginVertical: space.lg },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  add: { fontSize: 22, color: colors.accent },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: space.lg },
  time: { fontSize: 56, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  presets: { flexDirection: 'row', gap: space.sm },
  sheetActions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
});
