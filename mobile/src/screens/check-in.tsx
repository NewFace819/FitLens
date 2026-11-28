/**
 * Post-workout check-in (Thông's snapshots 120–126, 133–134, 259–268).
 * Route param: `history` = HistoryEntry.id (DATA_CONTRACT §12).
 * Saves only through submitCheckIn → appendReview (Đức Huy) + setMascotMood (Đỗ Huy).
 */
import { useEffect, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCheckInContext, notePainStop, submitCheckInDurable } from '../modules/checkin/checkin';
import {
  DEFAULT_RPE, FEEDBACK_LABELS, NOTE_MAX, SENSATIONS, SENSATION_LABELS,
  effortLevel, hasPainSignal, moodAfterReview, scoreToFeedback,
  type DiscomfortDetail, type Review, type Sensation,
} from '../modules/checkin/review-model';
import { REGIONS, REGION_LABELS, type ExerciseFeedback, type Region } from '../shared/constants';
import { shortDate } from '../shared/dates';
import { PAIN_ADVICE } from '../shared/safety';
import { goBackOrHome, goHome, useAppNavigation, useAppRoute } from '../navigation';
import { Button, Chip, Divider, IconButton, Mascot, Screen, Sheet } from '../ui/components';
import SafetyNotice from '../ui/safety-notice';
import { colors, effortColors, radius, space, type } from '../ui/theme';

type SheetName = null | 'help' | 'skip' | 'saved';
const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const FEEDBACK_COLORS: Record<ExerciseFeedback, string> = {
  tooEasy: '#A4C9CC',
  justRight: '#B7CBAA',
  tooHard: '#E8A173',
  painful: colors.danger,
};

export default function CheckInScreen() {
  const nav = useAppNavigation();
  const { history, fromWorkout } = useAppRoute<'CheckIn'>().params ?? {};
  const ctx = history ? getCheckInContext(history) : null;

  if (!ctx) {
    return (
      <Screen>
        <Text style={[type.h2, { marginTop: 120 }]}>We couldn’t find this session.</Text>
        <Button title="Back" variant="secondary" style={{ marginTop: space.lg }} onPress={() => goBackOrHome(nav)} />
      </Screen>
    );
  }
  return <CheckInForm key={ctx.entry.id} ctx={ctx} fromWorkout={fromWorkout} />;
}

function CheckInForm({ ctx, fromWorkout }: {
  ctx: NonNullable<ReturnType<typeof getCheckInContext>>;
  fromWorkout?: boolean;
}) {
  const nav = useAppNavigation();
  const { entry, existing } = ctx;
  const stoppedByPain = entry.stoppedByPain;
  const [rpe, setRpe] = useState<number>(existing?.rpe ?? DEFAULT_RPE);
  const [discomfort, setDiscomfort] = useState<DiscomfortDetail[]>(existing?.discomfort ?? []);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries((existing?.exerciseFeedback ?? []).map((f) => [f.exerciseId, f.score])),
  );
  const [showBody, setShowBody] = useState(discomfort.length > 0);
  const [showExercises, setShowExercises] = useState(Object.keys(scores).length > 0);
  const [note, setNote] = useState(existing?.note ?? '');
  const [sheet, setSheet] = useState<SheetName>(null);
  const [saved, setSaved] = useState<Review | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  usePreventRemove(saving, () => setError('Please wait while your check-in is being saved.'));
  // A pain stop shows on the mascot even if this check-in is skipped.
  useEffect(() => notePainStop(entry.id), [entry.id]);

  const draft = { historyId: entry.id, rpe, discomfort, scores, note };
  const level = effortLevel(rpe);
  const pain = hasPainSignal(draft, stoppedByPain);
  const mood = moodAfterReview(draft, stoppedByPain);

  const toggleRegion = (region: Region) =>
    setDiscomfort((list) =>
      list.some((d) => d.region === region) ? list.filter((d) => d.region !== region) : [...list, { region, sensation: null, exerciseId: null }],
    );
  const updateRegion = (next: DiscomfortDetail) => setDiscomfort((list) => list.map((d) => (d.region === next.region ? next : d)));

  const finish = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      setSaved(await submitCheckInDurable(draft, stoppedByPain));
      setSheet('saved');
    } catch {
      setError('Couldn’t save your check-in. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const rated = Object.keys(scores).length;
  const leaveCheckIn = () => {
    if (fromWorkout) nav.replace('Recap', { history: entry.id });
    else goHome(nav);
  };

  return (
    <Screen
      footer={
        <>
          <Text style={[type.caption, { textAlign: 'center', marginBottom: space.sm }]}>
            {level.name} effort · {discomfort.length ? 'Body notes added' : 'Your moment to reflect'}
          </Text>
          {error ? <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{error}</Text> : null}
          <Button title={saving ? 'Saving…' : existing ? 'Update check-in' : 'Finish check-in'} disabled={saving} trailing="✓" onPress={finish} />
        </>
      }
    >
      <View pointerEvents={saving ? 'none' : 'auto'}>
      <View style={styles.nav}>
        <IconButton label="Back" onPress={() => goBackOrHome(nav)}>
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
        {stoppedByPain ? 'Let’s give your body a little care.' : 'A little stronger.'}
      </Text>
      <Text style={type.caption}>
        {stoppedByPain ? 'Stopping was the right call. A few notes help next time.' : 'Take a breath. Let’s check in.'}
      </Text>

      <View style={styles.recap}>
        <Text style={type.eyebrow}>Today’s little big things · {shortDate(entry.date)}</Text>
        <Text style={type.h2}>{ctx.title}.</Text>
        <View style={styles.stats}>
          <Stat value={Math.round(entry.durationSec / 60)} unit="min" label="Time for you" />
          <Stat value={ctx.setCount} unit="sets" label="Showing up" />
          <Stat value={ctx.exercises.length} unit="" label="Exercises" />
        </View>
      </View>

      {/* Effort (RPE 1–10, once for the whole session) */}
      <View style={styles.sectionHead}>
        <Text style={type.h2}>How did it feel?</Text>
        <IconButton label="How to rate your effort" onPress={() => setSheet('help')}>
          i
        </IconButton>
      </View>
      <Text style={type.caption}>Think about the whole session.</Text>
      <View style={styles.effortBox}>
        <View style={styles.effortHead}>
          <Text style={type.h3}>{level.name}</Text>
          <Text style={type.h2}>
            {rpe}
            <Text style={type.caption}> / 10</Text>
          </Text>
        </View>
        <Text style={[type.caption, { marginTop: space.xs }]}>{level.description}</Text>
      </View>
      <ScaleRow
        value={rpe}
        onChange={setRpe}
        colorFor={(n) => effortColors[n - 1]}
        label="Effort"
        valueText={`${rpe} out of 10, ${level.name}`}
      />
      <View style={styles.rangeLabels}>
        <Text style={type.caption}>Very light</Text>
        <Text style={type.caption}>All-out</Text>
      </View>

      <Divider />

      {/* Body */}
      <Text style={type.h2}>How does your body feel?</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showBody }} onPress={() => setShowBody((v) => !v)} style={styles.bodyPrompt}>
        <Text style={styles.bandage}>🩹</Text>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Anything feeling uncomfortable?</Text>
          <Text style={styles.bodyAction}>
            {discomfort.length ? `${discomfort.length} ${discomfort.length === 1 ? 'area' : 'areas'} noted · Edit` : 'Add an area'}
          </Text>
        </View>
      </Pressable>
      {showBody ? (
        <View style={styles.wrap}>
          {REGIONS.map((r) => (
            <Chip key={r} tone="blush" label={REGION_LABELS[r]} selected={discomfort.some((d) => d.region === r)} onPress={() => toggleRegion(r)} />
          ))}
        </View>
      ) : null}
      {discomfort.map((d) => (
        <View key={d.region} style={styles.areaCard}>
          <Text style={type.h3}>{REGION_LABELS[d.region]}</Text>
          <View style={styles.wrap}>
            {SENSATIONS.map((s: Sensation) => (
              <Chip key={s} tone="blush" label={SENSATION_LABELS[s]} selected={d.sensation === s} onPress={() => updateRegion({ ...d, sensation: d.sensation === s ? null : s })} />
            ))}
          </View>
          <Text style={[type.caption, { marginTop: space.md }]}>Related exercise · optional</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ctx.discomfortExercises.map((e) => (
              <Chip key={e.id} tone="blush" label={e.name} selected={d.exerciseId === e.id} onPress={() => updateRegion({ ...d, exerciseId: d.exerciseId === e.id ? null : e.id })} />
            ))}
          </ScrollView>
        </View>
      ))}

      {pain ? (
        <View style={styles.safety} accessibilityLiveRegion="polite">
          <Text style={type.h3}>Listen to your body.</Text>
          <Text style={[type.caption, { color: colors.ink }]}>{PAIN_ADVICE}</Text>
          <SafetyNotice style={{ color: colors.ink }} />
        </View>
      ) : null}

      <Divider />

      {/* Per-exercise feedback: 1 too easy · 5 just right · 10 painful */}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showExercises }} onPress={() => setShowExercises((v) => !v)} style={styles.collapse}>
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>Anything you’d change?</Text>
          <Text style={type.caption}>{rated ? `${rated} ${rated === 1 ? 'exercise' : 'exercises'} rated` : 'Rate individual exercises · optional'}</Text>
        </View>
        <Text style={type.h2}>{showExercises ? '×' : '＋'}</Text>
      </Pressable>
      {showExercises ? (
        <>
          <Text style={[type.caption, { marginTop: space.sm }]}>1 = too easy · 5 = just right · 10 = painful</Text>
          {ctx.exercises.map((e) => {
            const score = scores[e.id];
            const fb = score ? scoreToFeedback(score) : null;
            return (
              <View key={e.id} style={{ marginTop: space.lg }}>
                <View style={styles.effortHead}>
                  <Text style={type.h3}>{e.name}</Text>
                  {fb ? (
                    <Pressable onPress={() => setScores(({ [e.id]: _removed, ...rest }) => rest)} accessibilityRole="button" accessibilityLabel={`Clear rating for ${e.name}`}>
                      <Text style={[type.caption, { color: FEEDBACK_COLORS[fb], fontWeight: '700' }]}>
                        {score} · {FEEDBACK_LABELS[fb]} ×
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={type.caption}>Not rated</Text>
                  )}
                </View>
                <ScaleRow
                  value={score ?? null}
                  onChange={(n) => setScores((all) => ({ ...all, [e.id]: n }))}
                  colorFor={(n) => FEEDBACK_COLORS[scoreToFeedback(n)]}
                  label={`${e.name} feedback`}
                  valueText={fb ? `${score} out of 10, ${FEEDBACK_LABELS[fb]}` : 'Not rated'}
                  compact
                />
              </View>
            );
          })}
        </>
      ) : null}

      <Divider />

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
      <Text style={[type.caption, { textAlign: 'center', marginTop: space.xl }]}>Every session tells a story. This one is yours.</Text>

      <Sheet visible={sheet === 'help'} onClose={() => setSheet(null)} title="Your effort, your scale.">
        <Text style={[type.body, { marginBottom: space.lg }]}>
          How demanding did the whole session feel? Think about your breathing and the effort in your muscles.
        </Text>
        <Guide range="1–3 · Light" text="Comfortable movement with plenty left." color={effortColors[1]} />
        <Guide range="4–6 · Moderate to hard" text="Noticeable effort, still feeling in control." color={effortColors[4]} />
        <Guide range="7–9 · Very hard" text="Demanding work with little left to give." color={effortColors[7]} />
        <Guide range="10 · All-out" text="Your highest effort for this session." color={effortColors[9]} />
        <Text style={[type.caption, { marginTop: space.md }]}>Pain is a separate check-in. Tell us about it under “How does your body feel?”</Text>
      </Sheet>

      <Sheet visible={sheet === 'skip'} onClose={() => setSheet(null)} title="Skip the check-in?">
        <Text style={[type.body, { marginBottom: space.lg }]}>
          Your session is already saved. Without a check-in, next week’s plan can’t adjust to how this one felt.
        </Text>
        <Button title="Skip for now" variant="secondary" onPress={leaveCheckIn} />
        <Button title="Keep checking in" variant="text" onPress={() => setSheet(null)} style={{ marginTop: space.sm }} />
      </Sheet>

      <Sheet visible={sheet === 'saved'} onClose={() => setSheet(null)} title="A moment well spent.">
        <View style={{ alignItems: 'center', marginBottom: space.lg }}>
          <Mascot mood={mood} size={120} />
        </View>
        <Text style={[type.body, { marginBottom: space.lg }]}>
          {ctx.title} · {level.name} effort.{' '}
          {saved?.discomfortRegions.length ? `Body notes: ${saved.discomfortRegions.map((r) => REGION_LABELS[r]).join(', ')}.` : 'No discomfort reported.'}
          {saved?.exerciseFeedback.length ? ` ${saved.exerciseFeedback.length} exercises rated.` : ''}
          {saved?.note ? ' Your note is included.' : ''}
        </Text>
        <Button title={fromWorkout ? 'View recap' : 'Back to Today'} trailing="↗" onPress={leaveCheckIn} />
        <Button title="Keep editing" variant="text" onPress={() => setSheet(null)} style={{ marginTop: space.sm }} />
      </Sheet>
      </View>
    </Screen>
  );
}

/** Ten tappable steps; adjustable for screen readers. */
function ScaleRow({
  value,
  onChange,
  colorFor,
  label,
  valueText,
  compact,
}: {
  value: number | null;
  onChange: (n: number) => void;
  colorFor: (n: number) => string;
  label: string;
  valueText: string;
  compact?: boolean;
}) {
  return (
    <View
      style={[styles.scale, compact && { marginTop: space.sm }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(10, Math.max(1, (value ?? 5) + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
    >
      {SCORES.map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          hitSlop={{ top: 10, bottom: 10 }}
          style={[styles.step, { backgroundColor: colorFor(n), height: compact ? 30 : 36 }, n === value ? styles.stepOn : value !== null && styles.stepOff]}
        >
          <Text style={[styles.stepNum, n === value && { color: colors.ink }]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stat({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
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

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md },
  skip: { fontSize: 16, fontWeight: '700', color: colors.ink, padding: space.sm },
  face: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, paddingVertical: space.xl },
  recap: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, marginVertical: space.xl },
  stats: { flexDirection: 'row', marginTop: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  effortBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, marginTop: space.md },
  effortHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  scale: { flexDirection: 'row', gap: 4, marginTop: space.lg },
  step: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepOn: { transform: [{ scaleY: 1.2 }], borderWidth: 2, borderColor: colors.ink },
  stepOff: { opacity: 0.45 },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.white },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  bodyPrompt: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.md, paddingVertical: space.sm },
  bandage: { fontSize: 40, backgroundColor: colors.blushSoft, borderRadius: 32, padding: space.sm, overflow: 'hidden' },
  bodyAction: { color: colors.blush, fontWeight: '700', marginTop: space.xs },
  areaCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, marginTop: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  chipRow: { gap: space.sm, paddingTop: space.sm },
  safety: { backgroundColor: colors.blushSoft, borderRadius: radius.md, padding: space.lg, marginTop: space.lg, gap: space.xs },
  collapse: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  note: { minHeight: 110, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, fontSize: 15, color: colors.ink, textAlignVertical: 'top' },
});
