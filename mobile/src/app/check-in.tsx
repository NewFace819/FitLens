/**
 * Post-workout check-in (Thông's snapshots 120–126, 133–134, 259–268).
 * Params: sessionId (required), stopped=pain when the session ended because of pain.
 * Saves through appendReview() from training history.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BACK_AREAS,
  BODY_AREAS,
  buildReview,
  DEFAULT_RPE,
  effortLevel,
  EXERCISE_VERDICTS,
  FRONT_AREAS,
  hasPain,
  moodAfterReview,
  NOTE_MAX,
  SENSATIONS,
  type BodyArea,
  type DiscomfortNote,
  type ExerciseVerdict,
  type Sensation,
} from '../domain/checkin.ts';
import { appendReview, getSession, type TrainingSession } from '../data/training-history';
import { KEYS, writeJson } from '../data/storage';
import { Button, Chip, Divider, IconButton, Mascot, Screen, Sheet } from '../ui/components';
import { colors, effortColors, radius, space, type } from '../ui/theme';

type SheetName = null | 'body' | 'help' | 'skip' | 'saved';

export default function CheckInScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; stopped?: string }>();
  const stoppedForPain = params.stopped === 'pain';
  const [session, setSession] = useState<TrainingSession | null | undefined>(undefined);

  const [rpe, setRpe] = useState(DEFAULT_RPE);
  const [discomfort, setDiscomfort] = useState<DiscomfortNote[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, ExerciseVerdict>>({});
  const [showExercises, setShowExercises] = useState(false);
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState<SheetName>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params.sessionId) setSession(null);
    else getSession(params.sessionId).then(setSession);
  }, [params.sessionId]);

  const draft = useMemo(
    () => ({
      sessionId: session?.id ?? '',
      rpe,
      stoppedForPain,
      discomfort,
      exerciseFeedback: Object.entries(verdicts).map(([exerciseId, verdict]) => ({ exerciseId, verdict })),
      note,
    }),
    [session, rpe, stoppedForPain, discomfort, verdicts, note],
  );

  if (session === undefined) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: 120 }} color={colors.accent} />
      </Screen>
    );
  }
  if (session === null) {
    return (
      <Screen>
        <Text style={[type.h2, { marginTop: 120 }]}>We couldn’t find this session.</Text>
        <Button title="Back" variant="secondary" style={{ marginTop: space.lg }} onPress={() => router.back()} />
      </Screen>
    );
  }

  const level = effortLevel(rpe);
  const pain = hasPain(draft);
  const mood = moodAfterReview(draft);
  const sets = session.exercises.reduce((n, e) => n + e.sets.length, 0);

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      await appendReview(buildReview(draft));
      // Home (Đỗ Huy) can read this to set the mascot mood.
      await writeJson(KEYS.lastCheckIn, { kind: 'workout', sessionId: session.id, mood, at: Date.now() });
      setSheet('saved');
    } catch {
      setError('Couldn’t save your check-in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Text style={[type.caption, { textAlign: 'center', marginBottom: space.sm }]}>
            {level.name} effort · {discomfort.length ? 'Body notes added' : 'Your moment to reflect'}
          </Text>
          {error ? <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{error}</Text> : null}
          <Button title={saving ? 'Saving…' : 'Finish check-in'} trailing="✓" onPress={finish} disabled={saving} />
        </>
      }
    >
      <View style={styles.nav}>
        <IconButton label="Back" onPress={() => router.back()}>
          ‹
        </IconButton>
        <Pressable accessibilityRole="button" onPress={() => setSheet('skip')} hitSlop={8}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={[styles.face, { backgroundColor: effortColors[rpe - 1] + '55' }]}>
        <Mascot mood={mood} size={160} />
      </View>

      <Text style={[type.title, { marginTop: space.lg }]} accessibilityRole="header">
        {stoppedForPain ? 'Let’s give your body a little care.' : 'A little stronger.'}
      </Text>
      <Text style={type.caption}>
        {stoppedForPain ? 'Stopping was the right call. A few notes help next time.' : 'Take a breath. Let’s check in.'}
      </Text>

      <View style={styles.recap}>
        <Text style={type.eyebrow}>Today’s little big things</Text>
        <Text style={type.h2}>{session.name}.</Text>
        <View style={styles.stats}>
          <Stat value={`${session.durationMinutes}`} unit="min" label="Time for you" />
          <Stat value={`${sets}`} unit="sets" label="Showing up" />
          <Stat value={`${session.exercises.length}`} unit="" label="Exercises" />
        </View>
      </View>

      {/* Effort */}
      <View style={styles.sectionHead}>
        <Text style={type.h2}>How did it feel?</Text>
        <IconButton label="How to rate your effort" onPress={() => setSheet('help')}>
          i
        </IconButton>
      </View>
      <Text style={type.caption}>Think about the whole session.</Text>
      <View style={styles.effortBox}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={type.h3}>{level.name}</Text>
          <Text style={type.h2}>
            {rpe}
            <Text style={type.caption}> / 10</Text>
          </Text>
        </View>
        <Text style={[type.caption, { marginTop: space.xs }]}>{level.description}</Text>
      </View>
      <View style={styles.effortTrack} accessibilityRole="adjustable" accessibilityLabel="Effort" accessibilityValue={{ min: 1, max: 10, now: rpe, text: `${rpe} out of 10, ${level.name}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => setRpe((v) => Math.min(10, Math.max(1, v + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      >
        {effortColors.map((c, i) => (
          <Pressable
            key={i}
            onPress={() => setRpe(i + 1)}
            hitSlop={{ top: 12, bottom: 12 }}
            style={[styles.effortStep, { backgroundColor: c }, i + 1 === rpe && styles.effortStepOn]}
          >
            <Text style={[styles.effortNum, i + 1 === rpe && { color: colors.ink }]}>{i + 1}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.rangeLabels}>
        <Text style={type.caption}>Very light</Text>
        <Text style={type.caption}>All-out</Text>
      </View>

      <Divider />

      {/* Body */}
      <Text style={type.h2}>How does your body feel?</Text>
      <Pressable accessibilityRole="button" onPress={() => setSheet('body')} style={styles.bodyPrompt}>
        <Text style={styles.bandage}>🩹</Text>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Anything feeling uncomfortable?</Text>
          <Text style={styles.bodyAction}>
            {discomfort.length ? `${discomfort.length} ${discomfort.length === 1 ? 'area' : 'areas'} noted · Edit` : 'Add an area'}
          </Text>
        </View>
      </Pressable>

      {discomfort.map((d) => (
        <AreaCard
          key={d.area}
          note={d}
          exercises={session.exercises}
          onChange={(next) => setDiscomfort((list) => list.map((x) => (x.area === d.area ? next : x)))}
        />
      ))}
      {discomfort.length ? (
        <Button title="Clear body notes" variant="text" onPress={() => setDiscomfort([])} />
      ) : null}

      {pain ? (
        <View style={styles.safety} accessibilityLiveRegion="polite">
          <Text style={type.h3}>Listen to your body.</Text>
          <Text style={[type.caption, { color: colors.ink }]}>
            Don’t train through pain. If it’s sharp, getting worse, or doesn’t ease with rest, give that area a break
            and talk to a doctor or physiotherapist. FitLens can’t assess injuries — this isn’t medical advice.
          </Text>
        </View>
      ) : null}

      <Divider />

      {/* Exercises */}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showExercises }} onPress={() => setShowExercises((v) => !v)} style={styles.collapse}>
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>Anything you’d change?</Text>
          <Text style={type.caption}>Reflect on individual exercises</Text>
        </View>
        <Text style={type.h2}>{showExercises ? '×' : '＋'}</Text>
      </Pressable>
      {showExercises
        ? session.exercises.map((e) => (
            <View key={e.id} style={{ marginTop: space.lg }}>
              <Text style={type.h3}>{e.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {(Object.keys(EXERCISE_VERDICTS) as ExerciseVerdict[]).map((v) => (
                  <Chip
                    key={v}
                    label={EXERCISE_VERDICTS[v]}
                    selected={(verdicts[e.id] ?? 'none') === v}
                    onPress={() => setVerdicts((all) => ({ ...all, [e.id]: v }))}
                  />
                ))}
              </ScrollView>
            </View>
          ))
        : null}

      <Divider />

      {/* Note */}
      <Text style={type.h2}>Anything worth remembering?</Text>
      <Text style={[type.caption, { marginBottom: space.sm }]}>A thought for your next session · optional</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={NOTE_MAX}
        multiline
        placeholder="What felt good? What would you change?"
        placeholderTextColor={colors.faint}
        style={styles.note}
        accessibilityLabel="Your session, in your words"
      />
      <Text style={[type.caption, { textAlign: 'center', marginTop: space.xl }]}>
        Every session tells a story. This one is yours.
      </Text>

      <BodySheet
        visible={sheet === 'body'}
        selected={discomfort.map((d) => d.area)}
        onClose={() => setSheet(null)}
        onDone={(areas) => {
          setDiscomfort((list) =>
            areas.map((area) => list.find((d) => d.area === area) ?? { area, sensation: null, exerciseId: null }),
          );
          setSheet(null);
        }}
      />

      <Sheet visible={sheet === 'help'} onClose={() => setSheet(null)} title="Your effort, your scale.">
        <Text style={[type.body, { marginBottom: space.lg }]}>
          How demanding did the whole session feel? Think about your breathing and the effort in your muscles.
        </Text>
        <Guide range="1–3 · Light" text="Comfortable movement with plenty left." color={effortColors[1]} />
        <Guide range="4–6 · Moderate to hard" text="Noticeable effort, still feeling in control." color={effortColors[4]} />
        <Guide range="7–9 · Very hard" text="Demanding work with little left to give." color={effortColors[7]} />
        <Guide range="10 · All-out" text="Your highest effort for this session." color={effortColors[9]} />
        <Text style={[type.caption, { marginTop: space.md }]}>
          Pain is a separate check-in. You can tell us about it under “How does your body feel?”
        </Text>
      </Sheet>

      <Sheet visible={sheet === 'skip'} onClose={() => setSheet(null)} title="Skip the check-in?">
        <Text style={[type.body, { marginBottom: space.lg }]}>
          Your session is already saved. Without a check-in, next week’s plan can’t adjust to how this one felt.
        </Text>
        <Button title="Skip for now" variant="secondary" onPress={() => router.replace('/')} />
        <Button title="Keep checking in" variant="text" onPress={() => setSheet(null)} style={{ marginTop: space.sm }} />
      </Sheet>

      <Sheet visible={sheet === 'saved'} onClose={() => setSheet(null)} title="A moment well spent.">
        <View style={{ alignItems: 'center', marginBottom: space.lg }}>
          <Mascot mood={mood} size={120} />
        </View>
        <Text style={[type.body, { marginBottom: space.lg }]}>
          {session.name} · {level.name} effort.{' '}
          {discomfort.length ? `Body notes: ${discomfort.map((d) => BODY_AREAS[d.area]).join(', ')}.` : 'No discomfort reported.'}
          {draft.exerciseFeedback.filter((f) => f.verdict !== 'none').length
            ? ` Feedback added for ${draft.exerciseFeedback.filter((f) => f.verdict !== 'none').length} exercises.`
            : ''}
          {note.trim() ? ' Your note is included.' : ''}
        </Text>
        <Button title="Back to Today" trailing="↗" onPress={() => router.replace('/')} />
        <Button title="Keep editing" variant="text" onPress={() => setSheet(null)} style={{ marginTop: space.sm }} />
      </Sheet>
    </Screen>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={type.eyebrow}>{label}</Text>
      <Text style={type.h2}>
        {value}
        <Text style={type.caption}> {unit}</Text>
      </Text>
    </View>
  );
}

function Guide({ range, text, color }: { range: string; text: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.md }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color, marginTop: 3 }} />
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{range}</Text>
        <Text style={type.caption}>{text}</Text>
      </View>
    </View>
  );
}

function AreaCard({
  note,
  exercises,
  onChange,
}: {
  note: DiscomfortNote;
  exercises: TrainingSession['exercises'];
  onChange: (n: DiscomfortNote) => void;
}) {
  return (
    <View style={styles.areaCard}>
      <Text style={type.h3}>{BODY_AREAS[note.area]}</Text>
      <View style={styles.wrap}>
        {(Object.keys(SENSATIONS) as Sensation[]).map((s) => (
          <Chip
            key={s}
            tone="blush"
            label={SENSATIONS[s]}
            selected={note.sensation === s}
            onPress={() => onChange({ ...note, sensation: note.sensation === s ? null : s })}
          />
        ))}
      </View>
      <Text style={[type.caption, { marginTop: space.md }]}>Related exercise · optional</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {exercises.map((e) => (
          <Chip
            key={e.id}
            tone="blush"
            label={e.name}
            selected={note.exerciseId === e.id}
            onPress={() => onChange({ ...note, exerciseId: note.exerciseId === e.id ? null : e.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function BodySheet({
  visible,
  selected,
  onClose,
  onDone,
}: {
  visible: boolean;
  selected: BodyArea[];
  onClose: () => void;
  onDone: (areas: BodyArea[]) => void;
}) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [draft, setDraft] = useState<BodyArea[]>(selected);
  useEffect(() => {
    if (visible) setDraft(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const toggle = (a: BodyArea) => setDraft((d) => (d.includes(a) ? d.filter((x) => x !== a) : [...d, a]));
  const areas = view === 'front' ? FRONT_AREAS : BACK_AREAS;

  return (
    <Sheet visible={visible} onClose={onClose} title="Listen to your body.">
      <Text style={[type.caption, { marginBottom: space.md }]}>Tap an area. You can choose more than one.</Text>
      <View style={styles.segmented}>
        {(['front', 'back'] as const).map((v) => (
          <Chip key={v} label={v === 'front' ? 'Front' : 'Back'} selected={view === v} onPress={() => setView(v)} style={{ flex: 1 }} />
        ))}
      </View>
      <View style={[styles.wrap, { marginVertical: space.lg }]}>
        {areas.map((a) => (
          <Chip key={a} tone="blush" label={BODY_AREAS[a]} selected={draft.includes(a)} onPress={() => toggle(a)} />
        ))}
      </View>
      <Text style={[type.caption, { marginBottom: space.md }]} accessibilityLiveRegion="polite">
        {draft.length ? `${draft.length} selected` : 'No areas selected'}
      </Text>
      <Button title="Done" onPress={() => onDone(draft)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md },
  skip: { fontSize: 16, fontWeight: '700', color: colors.ink, padding: space.sm },
  face: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, paddingVertical: space.xl },
  recap: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, marginVertical: space.xl },
  stats: { flexDirection: 'row', marginTop: space.md },
  stat: { flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  effortBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, marginTop: space.md },
  effortTrack: { flexDirection: 'row', gap: 4, marginTop: space.lg },
  effortStep: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: 0.55 },
  effortStepOn: { opacity: 1, transform: [{ scaleY: 1.25 }], borderWidth: 2, borderColor: colors.ink },
  effortNum: { fontSize: 12, fontWeight: '700', color: colors.white },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  bodyPrompt: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.md, paddingVertical: space.sm },
  bandage: { fontSize: 40, backgroundColor: colors.blushSoft, borderRadius: 32, padding: space.sm, overflow: 'hidden' },
  bodyAction: { color: colors.blush, fontWeight: '700', marginTop: space.xs },
  areaCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, marginTop: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  chipRow: { gap: space.sm, paddingTop: space.sm },
  safety: { backgroundColor: colors.blushSoft, borderRadius: radius.md, padding: space.lg, marginTop: space.lg, gap: space.xs },
  collapse: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  note: {
    minHeight: 110,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  segmented: { flexDirection: 'row', gap: space.sm },
});
