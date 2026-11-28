import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { AppStore, Draft, Equipment, GOALS, Goal, HOME_EQUIPMENT, REGIONS, Region, Session } from '../modules/workouts/types';
import { Button, Chip, Heading, Sheet } from '../ui/parts';
import { colors } from '../ui/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LABEL: Record<string, string> = {
  habit: 'Build a habit',
  strength: 'Get stronger',
  muscle: 'Build muscle',
  endurance: 'Improve stamina',
  knees: 'Knees',
  back: 'Lower back',
  wrists: 'Wrists',
  shoulders: 'Shoulders',
  ankles: 'Ankles',
  hips: 'Hips',
  dumbbells: 'Dumbbells',
  bands: 'Bands',
  mat: 'Mat',
  bench: 'Bench',
};
// Plain string formatting: no dependence on the device's Intl support or language.
const fmt = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
// Quick picks for the usual training times; any other time comes from Android's own clock dialog.
const PRESETS = [
  { label: 'Morning', time: '07:00' },
  { label: 'Noon', time: '12:00' },
  { label: 'Afternoon', time: '17:00' },
  { label: 'Evening', time: '19:00' },
] as const;
const pad = (n: number) => String(n).padStart(2, '0');
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

export default function PlanScreen({ store, today, onStart }: { store: AppStore; today?: string; onStart?: (sessionId: string) => void }) {
  const todayStr = today ?? store.todayStr();
  const thisWeek = store.weekStartOf(todayStr) as string;
  const [week, setWeek] = useState(thisWeek);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState('');
  const [addDate, setAddDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState<string | null>(null);
  // "Build your own": exercises in the order they were ticked, plus an optional name.
  const [addTab, setAddTab] = useState<'saved' | 'build'>('saved');
  const [picked, setPicked] = useState<string[]>([]);
  const [comboName, setComboName] = useState('');
  const [editError, setEditError] = useState('');
  const [build, setBuild] = useState(false);
  const [goal, setGoal] = useState<Goal>('habit');
  const [days, setDays] = useState<2 | 3 | 4 | 5>(3);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [avoid, setAvoid] = useState<Region[]>([]);
  // undefined = still answering questions, null = no safe plan, Draft = preview
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);

  const dates = useMemo(() => store.weekDates(week), [store, week]);
  // `version` changes after every edit so the list is read again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sessions = useMemo(() => store.getWeekSchedule(week), [store, week, version]);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const titleOf = (id: string) => store.getWorkout(id)?.title ?? 'Workout no longer available';
  const label =
    week === thisWeek ? 'This week' : week === store.addDays(thisWeek, 7) ? 'Next week' : `Week of ${fmt(week)}`;

  const add = (workoutId: string) => {
    if (!addDate) {
      return;
    }
    const r = store.addSession({ workoutId, date: addDate, time: null });
    closeAdd();
    setMessage(r.ok ? `Added ${titleOf(workoutId)}.` : 'Couldn’t add this workout.');
    bump();
  };

  const openSession = (s: Session) => {
    setSelected(s);
    setEditDate(s.date);
    setEditTime(s.time);
    setEditError('');
  };
  // Android clock dialog in 24-hour mode, so the result never depends on the phone's 12/24-hour setting.
  const pickOtherTime = () => {
    const base = new Date();
    if (editTime) base.setHours(Number(editTime.slice(0, 2)), Number(editTime.slice(3)), 0, 0);
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) setEditTime(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
      },
    });
  };
  const closeAdd = () => {
    setAddDate(null);
    setAddTab('saved');
    setPicked([]);
    setComboName('');
  };
  // Saves the ticked exercises as your own workout (so it can be picked again later) and plans it.
  const addCombo = () => {
    const w = store.createWorkout({
      title: comboName.trim() || 'My combo',
      items: picked.map(exerciseId => ({ exerciseId })),
    });
    if (!w) {
      setMessage('Couldn’t save this combination.');
      closeAdd();
      return;
    }
    add(w.id);
  };
  const saveEdits = () => {
    if (!selected) {
      return;
    }
    const r = store.updateSession(selected.id, { date: editDate, time: editTime });
    if (!r.ok) {
      setEditError(
        r.reason === 'conflict' ? 'You already have a workout at that time on that day.' : 'Couldn’t save these changes.',
      );
      return;
    }
    setSelected(null);
    setMessage('Saved.');
    bump();
  };

  const copy = () => {
    const r = store.copyWeek(week, store.addDays(week, 7) as string);
    setMessage(
      !r.ok
        ? 'Couldn’t copy this week.'
        : r.created.length
        ? `Copied ${r.created.length} ${r.created.length === 1 ? 'session' : 'sessions'} to next week.`
        : 'Nothing new to copy.',
    );
  };

  const preview = () =>
    setDraft(store.generateDraft({ goal, daysPerWeek: days, minutes: 30, equipment, avoidRegions: avoid }, week));
  const apply = () => {
    if (!draft) {
      return;
    }
    const r = store.applyDraft(draft);
    setBuild(false);
    setMessage(
      !r.ok
        ? 'Couldn’t apply this plan.'
        : r.added
        ? `Added ${r.added} ${r.added === 1 ? 'session' : 'sessions'} to your week.`
        : 'Those sessions are already in your plan.',
    );
    bump();
  };

  const workouts = store.listWorkouts();
  const ordered = [...workouts.filter(w => w.source === 'custom'), ...workouts.filter(w => w.source === 'template')];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Heading eyebrow="FITLENS / PLAN" title="Your week" />
      <View style={styles.weekNav}>
        <Pressable
          testID="prev-week"
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          style={styles.arrow}
          onPress={() => setWeek(store.addDays(week, -7) as string)}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <View style={styles.weekMid}>
          <Text style={styles.weekLabel} testID="week-label">
            {label}
          </Text>
          <Text style={styles.weekRange}>
            {fmt(dates[0])} – {fmt(dates[6])}
          </Text>
        </View>
        <Pressable
          testID="next-week"
          accessibilityRole="button"
          accessibilityLabel="Next week"
          style={styles.arrow}
          onPress={() => setWeek(store.addDays(week, 7) as string)}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            label="Build my week"
            onPress={() => {
              setDraft(undefined);
              setBuild(true);
            }}
            testID="build-week"
          />
        </View>
        <View style={styles.flex}>
          <Button
            kind="secondary"
            label="Copy to next week"
            onPress={copy}
            disabled={sessions.length === 0}
            testID="copy-week"
          />
        </View>
      </View>
      <Text style={styles.status} accessibilityLiveRegion="polite" testID="plan-status">
        {message}
      </Text>

      {dates.map((date, i) => {
        const mine = sessions.filter(s => s.date === date);
        return (
          <View key={date} style={[styles.day, date === todayStr && styles.dayToday]} testID={`day-${date}`}>
            <View style={styles.dayHead}>
              <Text style={styles.dayTitle}>
                {DAYS[i]} <Text style={styles.dayDate}>{fmt(date)}</Text>
              </Text>
              <Pressable
                testID={`add-${date}`}
                accessibilityRole="button"
                accessibilityLabel={`Add a workout on ${DAYS[i]} ${fmt(date)}`}
                style={styles.add}
                onPress={() => setAddDate(date)}>
                <Text style={styles.addText}>+</Text>
              </Pressable>
            </View>
            {mine.length === 0 && <Text style={styles.empty}>Rest day. Add something if you feel like it.</Text>}
            {mine.map(s => (
              <Pressable
                key={s.id}
                testID={`session-${s.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${titleOf(s.workoutId)} on ${DAYS[i]}`}
                style={[styles.session, s.status === 'done' && styles.done]}
                onPress={() => openSession(s)}>
                <View>
                  <Text style={styles.sessionTitle}>{titleOf(s.workoutId)}</Text>
                  <Text style={styles.sessionMeta}>
                    {s.time ? `${s.time} · ` : 'No time set · '}
                    {s.status === 'done' ? 'Done' : 'Planned'}
                  </Text>
                </View>
                <Text style={styles.sessionMeta}>›</Text>
              </Pressable>
            ))}
          </View>
        );
      })}

      <Sheet visible={addDate !== null} title="Add a workout" onClose={closeAdd}>
        <View style={[styles.chips, styles.tabs]}>
          <Chip testID="add-tab-saved" label="Saved workouts" selected={addTab === 'saved'} onPress={() => setAddTab('saved')} />
          <Chip testID="add-tab-build" label="Build your own" selected={addTab === 'build'} onPress={() => setAddTab('build')} />
        </View>
        {addTab === 'saved' ? (
          <ScrollView>
            {ordered.map(w => (
              <Pressable
                key={w.id}
                testID={`pick-${w.id}`}
                accessibilityRole="button"
                style={styles.pick}
                onPress={() => add(w.id)}>
                <Text style={styles.sessionTitle}>
                  {w.title}
                  {w.source === 'custom' ? ' (yours)' : ''}
                </Text>
                <Text style={styles.sessionMeta}>
                  {w.items.length} exercises · about {store.estimateMinutes(w)} min
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.stack} keyboardShouldPersistTaps="handled">
            <Text style={styles.sessionMeta}>
              Tick exercises in the order you want to do them. They are saved as your own workout.
            </Text>
            <View style={styles.chips}>
              {store.listExercises().map(e => {
                const at = picked.indexOf(e.id);
                return (
                  <Chip
                    key={e.id}
                    testID={`combo-${e.id}`}
                    label={at >= 0 ? `${at + 1}. ${e.name}` : e.name}
                    selected={at >= 0}
                    onPress={() => setPicked(toggle(picked, e.id))}
                  />
                );
              })}
            </View>
            <Text style={styles.group}>Name (optional)</Text>
            <TextInput
              testID="combo-name"
              accessibilityLabel="Name for this combination"
              style={styles.input}
              value={comboName}
              onChangeText={setComboName}
              placeholder="My combo"
              placeholderTextColor={colors.muted}
              maxLength={40}
            />
            <Button
              testID="combo-add"
              label={picked.length ? `Add ${picked.length} ${picked.length === 1 ? 'exercise' : 'exercises'}` : 'Pick at least one exercise'}
              disabled={picked.length === 0}
              onPress={addCombo}
            />
          </ScrollView>
        )}
      </Sheet>

      <Sheet
        visible={selected !== null}
        title={selected ? titleOf(selected.workoutId) : ''}
        onClose={() => setSelected(null)}>
        <ScrollView contentContainerStyle={styles.stack}>
          <Text style={styles.group}>Day</Text>
          <View style={styles.chips}>
            {dates.map((d, i) => (
              <Chip key={d} testID={`day-chip-${d}`} label={`${DAYS[i]} ${fmt(d)}`} selected={editDate === d} onPress={() => setEditDate(d)} />
            ))}
          </View>
          <Text style={styles.group}>Time (optional)</Text>
          <View style={styles.chips}>
            <Chip testID="time-none" label="No time" selected={editTime === null} onPress={() => setEditTime(null)} />
            {PRESETS.map(p => (
              <Chip
                key={p.time}
                testID={`time-${p.time}`}
                label={`${p.label} ${p.time}`}
                selected={editTime === p.time}
                onPress={() => setEditTime(p.time)}
              />
            ))}
            <Chip
              testID="time-other"
              label={editTime !== null && !PRESETS.some(p => p.time === editTime) ? `${editTime} · Change` : 'Other time…'}
              selected={editTime !== null && !PRESETS.some(p => p.time === editTime)}
              onPress={pickOtherTime}
            />
          </View>
          {editError !== '' && (
            <Text style={styles.error} testID="edit-error">
              {editError}
            </Text>
          )}
          {selected && onStart && selected.status === 'planned' && <Button label="Start workout" testID="start-session" onPress={() => { const id = selected.id; setSelected(null); onStart(id); }} />}
          <Button label="Save changes" testID="save-session" onPress={saveEdits} />
          {selected && selected.status !== 'done' && (
            <Button
              kind="secondary"
              label="Mark as done"
              testID="mark-done"
              onPress={() => {
                store.markSessionDone(selected.id);
                setSelected(null);
                setMessage('Marked as done.');
                bump();
              }}
            />
          )}
          {selected && (
            <Button
              kind="danger"
              label="Remove from plan"
              testID="remove-session"
              onPress={() => {
                store.removeSession(selected.id);
                setSelected(null);
                setMessage('Removed from your plan.');
                bump();
              }}
            />
          )}
        </ScrollView>
      </Sheet>

      <Sheet visible={build} title="Build my week" onClose={() => setBuild(false)}>
        <ScrollView>
          {draft === undefined ? (
            <View style={styles.stack}>
              <Text style={styles.group}>Goal</Text>
              <View style={styles.chips}>
                {GOALS.map(g => (
                  <Chip key={g} testID={`goal-${g}`} label={LABEL[g]} selected={goal === g} onPress={() => setGoal(g)} />
                ))}
              </View>
              <Text style={styles.group}>Days per week</Text>
              <View style={styles.chips}>
                {([2, 3, 4, 5] as const).map(n => (
                  <Chip key={n} testID={`days-${n}`} label={String(n)} selected={days === n} onPress={() => setDays(n)} />
                ))}
              </View>
              <Text style={styles.group}>Equipment you have</Text>
              <View style={styles.chips}>
                {HOME_EQUIPMENT.map(e => (
                  <Chip
                    key={e}
                    testID={`equip-${e}`}
                    label={LABEL[e]}
                    selected={equipment.includes(e)}
                    onPress={() => setEquipment(toggle(equipment, e))}
                  />
                ))}
              </View>
              <Text style={styles.group}>Areas to go easy on</Text>
              <View style={styles.chips}>
                {REGIONS.map(r => (
                  <Chip
                    key={r}
                    testID={`avoid-${r}`}
                    label={LABEL[r]}
                    selected={avoid.includes(r)}
                    onPress={() => setAvoid(toggle(avoid, r))}
                  />
                ))}
              </View>
              <Button label="Preview" onPress={preview} testID="preview-draft" />
            </View>
          ) : (
            <View style={styles.stack}>
              <Text style={styles.group}>Your suggested week</Text>
              {draft === null ? (
                <Text style={styles.sessionMeta} testID="draft-empty">
                  We couldn’t find a safe set of workouts for those answers. Try fewer areas to avoid, or add equipment.
                </Text>
              ) : (
                draft.sessions.map(s => (
                  <View key={s.date} style={styles.pick}>
                    <Text style={styles.sessionTitle}>
                      {DAYS[dates.indexOf(s.date)]} · {fmt(s.date)}
                    </Text>
                    <Text style={styles.sessionMeta} testID="draft-row">
                      {titleOf(s.workoutId)}
                    </Text>
                  </View>
                ))
              )}
              {draft !== null && <Button label="Use this plan" onPress={apply} testID="apply-draft" />}
              <Button kind="secondary" label="Change answers" onPress={() => setDraft(undefined)} />
            </View>
          )}
        </ScrollView>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, gap: 10 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekMid: { alignItems: 'center' },
  weekLabel: { fontSize: 17, fontWeight: '900', color: colors.ink },
  weekRange: { fontSize: 12, fontWeight: '700', color: colors.muted },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { fontSize: 22, fontWeight: '900', color: colors.ink },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  status: { minHeight: 20, fontSize: 13, fontWeight: '700', color: '#51705f' },
  day: { backgroundColor: colors.card, borderWidth: 1, borderColor: '#e0e6d6', borderRadius: 20, padding: 12, gap: 6 },
  dayToday: { borderColor: colors.accent },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  dayDate: { fontSize: 12, fontWeight: '700', color: colors.muted },
  add: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9db7a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 18, fontWeight: '900', color: colors.ink },
  empty: { fontSize: 13, fontWeight: '700', color: '#8a9d92' },
  session: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: 10,
  },
  done: { opacity: 0.6 },
  sessionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  sessionMeta: { fontSize: 12, fontWeight: '700', color: colors.muted },
  pick: { backgroundColor: colors.accentSoft, borderRadius: 14, padding: 12, marginBottom: 6 },
  stack: { gap: 10 },
  error: { fontSize: 13, fontWeight: '700', color: colors.danger },
  group: { fontSize: 13, fontWeight: '800', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabs: { marginBottom: 10 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.ink,
    backgroundColor: colors.card,
  },
});
