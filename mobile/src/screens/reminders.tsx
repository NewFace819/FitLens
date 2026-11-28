/**
 * Workout reminders (Thông's snapshots 020, 084, 087).
 * Contract: reminders are per session (sessionId) with a default for the whole
 * schedule (sessionId = null). Session times belong to Hải → updateSession().
 */
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackOrHome, useAppNavigation } from '../navigation';
import { describeSync, notificationsAllowed, sendTestReminder, syncReminderNotifications } from '../modules/reminders/notifications';
import { MINUTES_BEFORE, leadLabel, type MinutesBefore, type PlannedSession } from '../modules/reminders/reminder-model';
import { clearSessionReminder, getReminder, hasOwnReminder, setReminder, upcomingSessions } from '../modules/reminders/reminders';
import { updateSession } from '../modules/workouts/schedule';
import { addDays, dayLabel, fromMinutes, toDateKey, toMinutes, weekStartOf } from '../shared/dates';
import { Button, Chip, IconButton, Sheet } from '../ui/components';
import { ContinuousSurface, SETTINGS_COLORS } from '../ui/settings-surface';
import { colors, space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';

const PRESETS = [
  ['Morning', '07:00'],
  ['Midday', '12:00'],
  ['Evening', '18:00'],
] as const;

export default function RemindersScreen() {
  useStore();
  const nav = useAppNavigation();
  const [showDefaultLead, setShowDefaultLead] = useState(false);
  const [editing, setEditing] = useState<PlannedSession | null>(null);
  const [status, setStatus] = useState('');
  // false = Android has notifications off for FitLens (refused at onboarding or later in settings).
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const fallback = getReminder(null)!;
  const sessions = upcomingSessions().filter((s) => s.status === 'planned' && s.date >= toDateKey(new Date()));
  const nextWeek = addDays(weekStartOf(toDateKey(new Date())), 7);

  // Check on open and whenever the user comes back (e.g. from Android settings), without prompting.
  useEffect(() => {
    let active = true;
    const check = () => notificationsAllowed().then((ok) => { if (active) setAllowed(ok); });
    check();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => { active = false; sub.remove(); };
  }, []);

  /** Persisting is synchronous; this mirrors the result onto the phone's notifications. */
  const sync = async (ask: boolean) => {
    try {
      const result = await syncReminderNotifications({ ask });
      if (result.mode === 'denied') setAllowed(false);
      else if (result.mode === 'device') setAllowed(await notificationsAllowed());
      setStatus(describeSync(result));
    } catch {
      setStatus('Saved, but reminders couldn’t be scheduled on this phone.');
    }
  };

  const setDefault = (patch: Partial<{ enabled: boolean; minutesBefore: MinutesBefore }>) => {
    setReminder(null, { enabled: patch.enabled ?? fallback.enabled, minutesBefore: patch.minutesBefore ?? fallback.minutesBefore });
    sync(patch.enabled === true);
  };

  const sessionGroups = [
    { title: 'This week', entries: sessions.filter((session) => session.date < nextWeek) },
    { title: 'Next week', entries: sessions.filter((session) => session.date >= nextWeek) },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => goBackOrHome(nav)}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backGlyph} allowFontScaling={false}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Reminders</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.settingsContent}>
        <ContinuousSurface radius={22}>
          <View style={styles.settingsRow}>
            <Text style={styles.rowLabel}>For every session</Text>
            <Switch
              value={fallback.enabled}
              onValueChange={(enabled) => setDefault({ enabled })}
              trackColor={{ true: SETTINGS_COLORS.accentBlue, false: SETTINGS_COLORS.separator }}
              thumbColor={SETTINGS_COLORS.card}
              accessibilityLabel="Reminders for every session"
            />
          </View>
          {fallback.enabled ? (
            <>
              <View style={styles.divider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remind me, ${leadLabel(fallback.minutesBefore)}`}
                onPress={() => setShowDefaultLead(true)}
                style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
              >
                <Text style={styles.rowLabel}>Remind me</Text>
                <Text style={styles.rowDetail}>{leadLabel(fallback.minutesBefore)}</Text>
                <Text style={styles.disclosure} allowFontScaling={false} aria-hidden>›</Text>
              </Pressable>
            </>
          ) : null}
        </ContinuousSurface>
        <Text style={styles.footer}>A gentle nudge before each planned session. You choose how early.</Text>
        {fallback.enabled && allowed === false ? (
          <View testID="notifications-off" style={styles.permissionNotice} accessibilityLiveRegion="polite">
            <Text style={styles.permissionTitle}>Notifications are off for FitLens</Text>
            <Text style={styles.permissionBody}>
              Your reminders are saved, but the phone won’t show them until you allow notifications.
            </Text>
            <Button
              title="Open Android settings"
              variant="secondary"
              onPress={() => { Linking.openSettings().catch(() => setStatus('Couldn’t open settings. Find FitLens in Android settings → Apps.')); }}
            />
          </View>
        ) : null}
        {__DEV__ ? (
          <Button
            title="Send a test reminder in 1 minute"
            variant="secondary"
            style={styles.testReminderAction}
            onPress={() => sendTestReminder(60).then(setStatus, () => setStatus('Couldn’t schedule the test reminder.'))}
          />
        ) : null}
        {status ? <Text style={styles.footer} accessibilityLiveRegion="polite">{status}</Text> : null}

        {sessions.length === 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your planned sessions</Text>
            <ContinuousSurface radius={22}>
              <View style={styles.settingsRow}>
                <Text style={styles.rowDetail}>No planned sessions yet. Plan your week, then choose reminders here.</Text>
              </View>
            </ContinuousSurface>
          </View>
        ) : sessionGroups.map(({ title, entries }) => entries.length > 0 ? (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <ContinuousSurface radius={22}>
              {entries.map((session, index) => {
                const reminder = getReminder(session.id)!;
                const details = `${dayLabel(session.date)} · ${session.time ?? 'No time yet'}`;
                const result = !session.time ? 'Add time' : reminder.enabled
                  ? `${leadLabel(reminder.minutesBefore)}${hasOwnReminder(session.id) ? '' : ' · default'}`
                  : 'Off';
                return (
                  <View key={session.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${session.title}, ${details}, ${result}`}
                      onPress={() => setEditing(session)}
                      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
                    >
                      <View style={styles.rowLabel}>
                        <Text style={styles.sessionTitle}>{session.title}</Text>
                        <Text style={styles.sessionDetail}>{details}</Text>
                      </View>
                      <Text style={styles.sessionValue}>{result}</Text>
                      <Text style={styles.disclosure} allowFontScaling={false} aria-hidden>›</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ContinuousSurface>
          </View>
        ) : null)}
      </ScrollView>

      <Sheet visible={showDefaultLead} onClose={() => setShowDefaultLead(false)} title="Remind me">
        <ContinuousSurface radius={22}>
          {MINUTES_BEFORE.map((minutes, index) => {
            const selected = minutes === fallback.minutesBefore;
            return (
              <View key={minutes}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    setDefault({ minutesBefore: minutes });
                    setShowDefaultLead(false);
                  }}
                  style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
                >
                  <Text style={styles.rowLabel}>{leadLabel(minutes)}</Text>
                  {selected ? <Text style={styles.selection} aria-hidden>✓</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </ContinuousSurface>
      </Sheet>

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
    </SafeAreaView>
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
    if (newTime !== session.time && !updateSession(session.id, { time: newTime }).ok) {
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
          <Chip key={value} label={label} selected={time === value} onPress={() => setTime(value)} style={styles.flexItem} />
        ))}
      </View>

      <Text style={[type.h3, { marginTop: space.xl, marginBottom: space.sm }]}>Reminder</Text>
      <View style={[styles.chips, styles.wrap]}>
        <Chip label="Default" selected={lead === 'default'} onPress={() => setLead('default')} />
        <Chip label="Off" selected={lead === 'off'} onPress={() => setLead('off')} />
        {MINUTES_BEFORE.map((m) => (
          <Chip key={m} label={m === 0 ? 'At start' : `${m} min`} selected={lead === m} onPress={() => setLead(m)} />
        ))}
      </View>
      {error ? <Text style={[type.caption, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}

      <View style={styles.actions}>
        {session.time ? <Button title="Remove time" variant="text" onPress={() => save(null)} style={styles.flexItem} /> : null}
        <Button title="Save time" style={styles.saveAction} onPress={() => save(time)} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SETTINGS_COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: SETTINGS_COLORS.card, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 27, lineHeight: 30, color: SETTINGS_COLORS.textPrimary },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: SETTINGS_COLORS.textPrimary },
  headerSpacer: { width: 44 },
  settingsContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },
  settingsRow: { minHeight: 50, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { flex: 1, fontSize: 16, color: SETTINGS_COLORS.textPrimary },
  rowDetail: { flexShrink: 1, fontSize: 15, color: SETTINGS_COLORS.textSecondary },
  sessionTitle: { fontSize: 16, color: SETTINGS_COLORS.textPrimary },
  sessionDetail: { marginTop: 3, fontSize: 13, color: SETTINGS_COLORS.textSecondary },
  sessionValue: { maxWidth: '42%', flexShrink: 1, textAlign: 'right', fontSize: 14, color: SETTINGS_COLORS.textSecondary },
  disclosure: { fontSize: 21, color: SETTINGS_COLORS.textSecondary },
  divider: { marginHorizontal: 18, height: StyleSheet.hairlineWidth, backgroundColor: SETTINGS_COLORS.separator },
  section: { marginTop: 24 },
  sectionTitle: { marginHorizontal: 18, marginBottom: 8, fontSize: 13, fontWeight: '500', color: SETTINGS_COLORS.textSecondary },
  footer: { marginHorizontal: 18, marginTop: 8, fontSize: 13, lineHeight: 18, color: SETTINGS_COLORS.textSecondary },
  permissionNotice: { marginHorizontal: 18, marginTop: space.md, padding: space.lg, gap: space.sm, borderRadius: 16, backgroundColor: colors.blushSoft },
  permissionTitle: { ...type.h3 },
  permissionBody: { ...type.caption, color: colors.ink },
  selection: { color: SETTINGS_COLORS.accentBlue, fontSize: 18 },
  testReminderAction: { marginTop: space.md },
  pressed: { opacity: 0.72 },
  chips: { flexDirection: 'row', gap: space.sm },
  flexItem: { flex: 1 },
  wrap: { flexWrap: 'wrap' },
  saveAction: { flex: 2, justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: space.lg },
  time: { fontSize: 56, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
});
