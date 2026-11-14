/**
 * Workout reminders (Thông's snapshots 020, 084, 087).
 * Contract: reminders are per session (sessionId) with a default for the whole
 * schedule (sessionId = null). Session times belong to Hải → updateSession().
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { syncReminderNotifications } from '../modules/reminders/notifications';
import { MINUTES_BEFORE, leadLabel, type MinutesBefore, type PlannedSession } from '../modules/reminders/reminder-model.ts';
import { clearSessionReminder, getReminder, hasOwnReminder, setReminder, upcomingSessions } from '../modules/reminders/reminders.ts';
import { updateSession } from '../modules/workouts/schedule.ts';
import { addDays, dayLabel, fromMinutes, toDateKey, toMinutes, weekStartOf } from '../shared/dates.ts';
import { Button, Chip, IconButton, Mascot, Screen, Sheet, TopBar } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';

const PRESETS = [
  ['Morning', '07:00'],
  ['Midday', '12:00'],
  ['Evening', '18:00'],
] as const;

export default function RemindersScreen() {
  useStore();
  const [editing, setEditing] = useState<PlannedSession | null>(null);
  const [status, setStatus] = useState('');
  const fallback = getReminder(null)!;
  const sessions = upcomingSessions().filter((s) => s.status === 'planned' && s.date >= toDateKey(new Date()));
  const nextWeek = addDays(weekStartOf(toDateKey(new Date())), 7);

  /** Persisting is synchronous; this mirrors the result onto the phone's notifications. */
  const sync = async (ask: boolean) => {
    try {
      const n = await syncReminderNotifications({ ask });
      setStatus(
        n === null
          ? 'Saved. Notifications are off for FitLens — turn them on in Android settings to get reminders.'
          : n === 0
            ? 'Saved. No reminders scheduled.'
            : `Saved. ${n} ${n === 1 ? 'reminder' : 'reminders'} scheduled for the next two weeks.`,
      );
    } catch {
      setStatus('Saved, but reminders couldn’t be scheduled on this phone.');
    }
  };

  const setDefault = (patch: Partial<{ enabled: boolean; minutesBefore: MinutesBefore }>) => {
    setReminder(null, { enabled: patch.enabled ?? fallback.enabled, minutesBefore: patch.minutesBefore ?? fallback.minutesBefore });
    sync(patch.enabled === true);
  };

  return (
    <Screen>
      <TopBar title="Reminders" />
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>A time for you.</Text>
          <Text style={[type.caption, { marginTop: space.xs }]}>
            A gentle nudge before each planned session. You choose how early.
          </Text>
        </View>
        <Mascot mood={fallback.enabled ? 'content' : 'waiting'} size={72} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>For every session</Text>
            <Text style={type.caption}>{fallback.enabled ? leadLabel(fallback.minutesBefore) : 'Off'}</Text>
          </View>
          <Switch
            value={fallback.enabled}
            onValueChange={(enabled) => setDefault({ enabled })}
            trackColor={{ true: colors.accent, false: colors.line }}
            thumbColor={colors.white}
            accessibilityLabel="Reminders for every session"
          />
        </View>
        {fallback.enabled ? (
          <View style={[styles.chips, { marginTop: space.md }]}>
            {MINUTES_BEFORE.map((m) => (
              <Chip key={m} label={m === 0 ? 'At start' : `${m} min`} selected={fallback.minutesBefore === m} onPress={() => setDefault({ minutesBefore: m })} style={{ flex: 1 }} />
            ))}
          </View>
        ) : null}
      </View>

      {status ? (
        <Text style={[type.caption, { marginTop: space.md }]} accessibilityLiveRegion="polite">
          {status}
        </Text>
      ) : null}

      <Text style={[type.h2, { marginTop: space.xl, marginBottom: space.sm }]}>Your planned sessions</Text>
      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Mascot mood="waiting" size={64} />
          <Text style={[type.caption, { flex: 1 }]}>No planned sessions yet. Plan your week, then choose reminders here.</Text>
        </View>
      ) : (
        sessions.map((s, i) => {
          const r = getReminder(s.id)!;
          const own = hasOwnReminder(s.id);
          const showHeader = i === 0 || (s.date >= nextWeek && sessions[i - 1].date < nextWeek);
          return (
            <View key={s.id}>
              {showHeader ? <Text style={[type.eyebrow, { marginTop: space.md, marginBottom: space.sm }]}>{s.date >= nextWeek ? 'Next week' : 'This week'}</Text> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${s.title}, ${dayLabel(s.date)}, ${s.time ?? 'no time yet'}`}
                onPress={() => setEditing(s)}
                style={({ pressed }) => [styles.sessionRow, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>{s.title}</Text>
                  <Text style={type.caption}>
                    {dayLabel(s.date)} · {s.time ?? 'No time yet'}
                  </Text>
                </View>
                <Text style={[type.caption, styles.badge]}>
                  {!s.time ? 'Add time' : r.enabled ? `${leadLabel(r.minutesBefore)}${own ? '' : ' · default'}` : 'Off'}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}

      <SessionSheet
        key={editing?.id ?? 'none'}
        session={editing}
        onClose={() => setEditing(null)}
        onSaved={(message, ask) => {
          setEditing(null);
          setStatus(message);
          sync(ask);
        }}
      />
    </Screen>
  );
}

type Lead = MinutesBefore | 'off' | 'default';

function SessionSheet({ session, onClose, onSaved }: { session: PlannedSession | null; onClose: () => void; onSaved: (message: string, ask: boolean) => void }) {
  const own = session ? hasOwnReminder(session.id) : false;
  const current = session ? getReminder(session.id)! : null;
  const [time, setTime] = useState(session?.time ?? '18:00');
  const [lead, setLead] = useState<Lead>(!own ? 'default' : current?.enabled ? current.minutesBefore : 'off');
  const [error, setError] = useState('');
  if (!session) return null;

  const save = (newTime: string | null) => {
    if (newTime !== session.time && !updateSession(session.id, { time: newTime })) {
      setError('Another session already uses this time that day.');
      return;
    }
    if (lead === 'default') clearSessionReminder(session.id);
    else setReminder(session.id, { enabled: lead !== 'off', minutesBefore: lead === 'off' ? (current?.minutesBefore ?? 15) : lead });
    onSaved('', lead !== 'off' && newTime !== null);
  };

  return (
    <Sheet visible onClose={onClose} title={session.title}>
      <Text style={type.eyebrow}>{dayLabel(session.date)}</Text>
      <View style={styles.timeRow}>
        <IconButton label="15 minutes earlier" onPress={() => setTime((t) => fromMinutes(toMinutes(t) - 15))}>
          −
        </IconButton>
        <Text style={styles.time} accessibilityLabel={`Workout time ${time}`}>
          {time}
        </Text>
        <IconButton label="15 minutes later" onPress={() => setTime((t) => fromMinutes(toMinutes(t) + 15))}>
          +
        </IconButton>
      </View>
      <View style={styles.chips}>
        {PRESETS.map(([label, value]) => (
          <Chip key={value} label={label} selected={time === value} onPress={() => setTime(value)} style={{ flex: 1 }} />
        ))}
      </View>

      <Text style={[type.h3, { marginTop: space.xl, marginBottom: space.sm }]}>Reminder</Text>
      <View style={[styles.chips, { flexWrap: 'wrap' }]}>
        <Chip label="Default" selected={lead === 'default'} onPress={() => setLead('default')} />
        <Chip label="Off" selected={lead === 'off'} onPress={() => setLead('off')} />
        {MINUTES_BEFORE.map((m) => (
          <Chip key={m} label={m === 0 ? 'At start' : `${m} min`} selected={lead === m} onPress={() => setLead(m)} />
        ))}
      </View>
      {error ? <Text style={[type.caption, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}

      <View style={styles.actions}>
        {session.time ? <Button title="Remove time" variant="text" onPress={() => save(null)} style={{ flex: 1 }} /> : null}
        <Button title="Save time" style={{ flex: 2, justifyContent: 'center' }} onPress={() => save(time)} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginVertical: space.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', gap: space.sm },
  empty: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  sessionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: space.lg, marginBottom: space.sm, backgroundColor: colors.surface, borderRadius: radius.md },
  badge: { color: colors.accent, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: space.lg },
  time: { fontSize: 56, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
});
