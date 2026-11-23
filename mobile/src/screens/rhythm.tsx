/**
 * Your Rhythm — weekly goal, streak, pause (Thông's snapshots 007, 035–049).
 * Reads getRhythm(); writes only through setWeeklyGoal / pauseRhythm / resumeRhythm.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { GOAL_OPTIONS, progressMessage, type Rhythm, type RhythmStatus, type WeekResult } from '../modules/rhythm/rhythm-model';
import { getRhythm, pauseRhythm, resumeRhythm, setWeeklyGoal } from '../modules/rhythm/rhythm';
import { checkInPrompt, latestUnreviewed } from '../modules/checkin/checkin';
import { useAppNavigation } from '../navigation';
import { dayLabel, nextMonday, shortDate, weekLabel } from '../shared/dates';
import type { Mood } from '../shared/constants';
import { Button, Chip, Divider, IconButton, ListRow, Mascot, Screen, Sheet, TopBar } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';

const TITLES: Record<RhythmStatus, string> = {
  empty: 'Set your weekly goal',
  scheduled: 'Starting next week',
  active: 'This week',
  complete: 'Weekly goal complete',
  paused: 'Weekly goal paused',
  comeback: 'This week',
};
const MOODS: Record<RhythmStatus, Mood> = {
  empty: 'waiting',
  scheduled: 'calm',
  active: 'content',
  complete: 'happy',
  paused: 'calm',
  comeback: 'energized',
};
const PAGE_SIZE = 4;
const workoutsComingSoon = () => Alert.alert('Workouts', 'The workout library is coming with the Workouts tab.');

type SheetName = null | 'goal' | 'settings' | 'pause' | 'resume' | 'rules' | 'week';

export default function RhythmScreen() {
  useStore();
  const rhythm = getRhythm();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [openWeek, setOpenWeek] = useState<WeekResult | null>(null);
  const close = () => setSheet(null);
  const pauseOpen = rhythm.paused && rhythm.pausedUntil === null;
  const nav = useAppNavigation();
  const unreviewed = latestUnreviewed();

  return (
    <Screen>
      <TopBar
        title="Your rhythm"
        right={
          rhythm.status !== 'empty' ? (
            <IconButton label="Rhythm settings" onPress={() => setSheet('settings')}>
              •••
            </IconButton>
          ) : null
        }
      />

      <WeekCard rhythm={rhythm} />

      {unreviewed ? (
        <ListRow
          label={`How did ${checkInPrompt(unreviewed)} feel?`}
          detail={`Check in · ${dayLabel(unreviewed.date)}`}
          onPress={() => nav.navigate('CheckIn', { history: unreviewed.id })}
        />
      ) : null}

      {rhythm.status === 'empty' ? (
        <View style={{ marginTop: space.lg }}>
          <Text style={type.h2}>Sessions per week</Text>
          <Text style={[type.caption, { marginVertical: space.sm }]}>
            Choose how many sessions you want to complete each week. You can schedule the days later.
          </Text>
          <Button title="Set a weekly goal" onPress={() => setSheet('goal')} />
        </View>
      ) : null}
      {rhythm.status === 'active' || rhythm.status === 'comeback' ? (
        <ListRow label="Choose your next session" onPress={workoutsComingSoon} />
      ) : null}
      {rhythm.status === 'complete' ? <ListRow label="Browse workouts" onPress={workoutsComingSoon} /> : null}
      {pauseOpen ? <ListRow label="Return from a break" onPress={() => setSheet('resume')} /> : null}

      {rhythm.status !== 'empty' && rhythm.status !== 'scheduled' ? (
        <View style={styles.streakRow}>
          <Text style={styles.streakNumber}>{rhythm.streakWeeks}</Text>
          <View>
            <Text style={type.body}>{rhythm.streakWeeks === 1 ? 'week in a row' : 'weeks in a row'}</Text>
            {rhythm.paused ? <Text style={type.caption}>Protected during recovery</Text> : null}
          </View>
        </View>
      ) : null}

      <Divider />
      <CompletedWeeks
        rhythm={rhythm}
        onOpen={(w) => {
          setOpenWeek(w);
          setSheet('week');
        }}
      />
      <Pressable onPress={() => setSheet('rules')} accessibilityRole="button" style={{ marginTop: space.lg, minHeight: 44, justifyContent: 'center' }}>
        <Text style={styles.link}>How weeks are counted</Text>
      </Pressable>

      <GoalSheet
        key={`goal-${sheet === 'goal'}`}
        visible={sheet === 'goal'}
        onClose={close}
        rhythm={rhythm}
        onSave={(n, startNextMonday) => {
          setWeeklyGoal(n, { startNextMonday });
          close();
        }}
      />

      <Sheet visible={sheet === 'settings'} onClose={close} title="Rhythm settings">
        <ListRow label="Change weekly goal" onPress={() => setSheet('goal')} />
        {pauseOpen ? (
          <ListRow label="Resume weekly goal" onPress={() => setSheet('resume')} />
        ) : !rhythm.paused ? (
          <ListRow label="Pause weekly goal" onPress={() => setSheet('pause')} />
        ) : null}
        <ListRow label="How the weeks count" onPress={() => setSheet('rules')} />
      </Sheet>

      <Sheet visible={sheet === 'pause'} onClose={close} title="Pause weekly goal?">
        <Text style={[type.body, styles.sheetText]}>
          Pause your weekly goal while you recover or take a break. Your previous streak stays safe. Paused weeks do
          not add to the count.
        </Text>
        <Button
          title="Pause my weekly goal"
          onPress={() => {
            pauseRhythm();
            close();
          }}
        />
      </Sheet>

      <Sheet visible={sheet === 'resume'} onClose={close} title="Resume weekly goal?">
        <Text style={[type.body, styles.sheetText]}>
          You can move at your own pace. This week stays protected; your weekly goal resumes next Monday,{' '}
          {shortDate(nextMonday(rhythm.date))}.
        </Text>
        <Button
          title="Resume my rhythm"
          onPress={() => {
            resumeRhythm();
            close();
          }}
        />
      </Sheet>

      <Sheet visible={sheet === 'rules'} onClose={close} title="How weeks are counted">
        <Rule title="A week runs Monday to Sunday.">
          Complete the number of sessions you chose. Scheduled rest days do not use a session slot.
        </Rule>
        <Rule title="A completed week adds one.">
          Extra sessions do not add extra streak points. A week still in progress does not end your streak.
        </Rule>
        <Rule title="Recovery keeps your place.">
          A paused week protects the previous streak without adding a completed week. Resume when you are ready; your
          goal starts again the following week.
        </Rule>
        <Rule title="Your history stays yours.">
          If a week ends below your goal, the consecutive count starts again. Your completed weeks and sessions
          remain.
        </Rule>
        <Rule title="No goal set?">
          We use the training days from your profile until you choose a weekly goal here.
        </Rule>
      </Sheet>

      <Sheet visible={sheet === 'week'} onClose={close} title="Completed week">
        {openWeek ? <WeekDetail week={openWeek} /> : null}
      </Sheet>
    </Screen>
  );
}

function WeekCard({ rhythm }: { rhythm: Rhythm }) {
  const { status, upcomingGoal } = rhythm;
  const showProgress = status !== 'empty' && status !== 'scheduled';
  const range = status === 'scheduled' && upcomingGoal ? weekLabel(upcomingGoal.fromWeek) : weekLabel(rhythm.weekStart);
  return (
    <View style={[styles.weekCard, status === 'complete' && styles.weekCardComplete]}>
      <View style={styles.weekHeader}>
        <View style={{ flex: 1 }}>
          <Text style={type.eyebrow}>Weekly progress</Text>
          <Text style={type.title} accessibilityRole="header">
            {TITLES[status]}
          </Text>
          {status !== 'empty' ? <Text style={type.caption}>{range}</Text> : null}
        </View>
        <Mascot mood={MOODS[status]} size={72} />
      </View>

      {showProgress ? (
        <>
          <Text style={styles.bigCount} accessibilityLabel={`${rhythm.thisWeek.length} of ${rhythm.goal} sessions`}>
            {rhythm.thisWeek.length}
            <Text style={styles.bigOf}> of {rhythm.goal}</Text>
          </Text>
          <Text style={type.caption}>{rhythm.paused ? 'sessions before pausing' : 'sessions completed'}</Text>
          <SessionSlots rhythm={rhythm} />
        </>
      ) : null}
      {status === 'scheduled' ? <Text style={[type.h2, { marginVertical: space.lg }]}>{rhythm.goal} sessions, starting Monday.</Text> : null}

      <View style={styles.messageRow}>
        {rhythm.paused ? <Text style={styles.leaf}>❧</Text> : null}
        <Text style={[type.caption, { flex: 1 }]}>{progressMessage(rhythm)}</Text>
      </View>
      {rhythm.goalSource === 'profile' && showProgress ? (
        <Text style={[type.caption, { marginTop: space.xs }]}>Goal from your profile’s training days.</Text>
      ) : null}
      {upcomingGoal && status !== 'scheduled' ? (
        <Text style={[type.caption, { marginTop: space.xs }]}>
          From {shortDate(upcomingGoal.fromWeek)}: {upcomingGoal.weeklyGoal} sessions a week.
        </Text>
      ) : null}
    </View>
  );
}

function SessionSlots({ rhythm }: { rhythm: Rhythm }) {
  const slots = Math.max(rhythm.goal, rhythm.thisWeek.length);
  return (
    <View style={styles.slots}>
      {Array.from({ length: slots }, (_, i) => {
        const s = rhythm.thisWeek[i];
        return (
          <View key={i} style={styles.slot} accessible accessibilityLabel={s ? `${s.title}, ${shortDate(s.date)}` : `Session ${i + 1}, not done`}>
            <View style={[styles.dot, s ? styles.dotDone : styles.dotEmpty]}>{s ? <Text style={styles.dotCheck}>✓</Text> : null}</View>
            <Text style={styles.slotLabel} numberOfLines={1}>
              {s ? 'Workout' : `Session ${i + 1}`}
            </Text>
            <Text style={styles.slotSub}>{s ? shortDate(s.date) : 'Not done'}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CompletedWeeks({ rhythm, onOpen }: { rhythm: Rhythm; onOpen: (w: WeekResult) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rhythm.completedWeeks.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rhythm.completedWeeks.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  return (
    <View>
      <Text style={type.h2}>Completed weeks</Text>
      <Text style={[type.caption, { marginBottom: space.md }]}>Your completed weeks and sessions remain in your history.</Text>
      {visible.length === 0 ? (
        <View style={styles.emptyWeeks}>
          <View style={[styles.dot, styles.dotEmpty]}>
            <Text style={[styles.dotCheck, { color: colors.sage }]}>✓</Text>
          </View>
          <Text style={[type.caption, { flex: 1 }]}>Complete your weekly goal to see it here.</Text>
        </View>
      ) : (
        <View style={styles.weekGrid}>
          {visible.map((w) => (
            <Pressable key={w.weekStart} accessibilityRole="button" onPress={() => onOpen(w)} style={({ pressed }) => [styles.weekTile, pressed && { opacity: 0.7 }]}>
              <Text style={styles.tileCheck}>✓</Text>
              <View>
                <Text style={type.h3}>{weekLabel(w.weekStart)}</Text>
                <Text style={type.caption}>{w.sessions.length} sessions</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {pages > 1 ? (
        <View style={styles.pager}>
          <IconButton label="Previous page" onPress={() => setPage(Math.max(0, current - 1))}>
            ‹
          </IconButton>
          <Text style={type.caption}>
            Page {current + 1} of {pages}
          </Text>
          <IconButton label="Next page" onPress={() => setPage(Math.min(pages - 1, current + 1))}>
            ›
          </IconButton>
        </View>
      ) : null}
      <View style={styles.stats}>
        <Stat value={rhythm.completedWeeks.length} label="weeks completed" />
        <Stat value={rhythm.longestStreak} label="longest rhythm" />
        <Stat value={rhythm.sessionsRecorded} label="sessions recorded" />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={type.h2}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

function WeekDetail({ week }: { week: WeekResult }) {
  return (
    <View>
      <Text style={type.caption}>{weekLabel(week.weekStart)}</Text>
      <View style={styles.bigCheck}>
        <Text style={{ fontSize: 44, color: colors.accent }}>✓</Text>
      </View>
      <Text style={[type.h3, { textAlign: 'center', marginBottom: space.lg }]}>
        {week.sessions.length} sessions · goal of {week.goal}
      </Text>
      {week.sessions.map((s) => (
        <View key={s.id} style={styles.detailRow}>
          <Text style={[type.caption, { width: 56 }]}>{shortDate(s.date)}</Text>
          <Text style={type.body}>{s.title}</Text>
        </View>
      ))}
      <Text style={[type.caption, { marginTop: space.lg }]}>Your completed sessions stay in history if your consecutive count starts again.</Text>
    </View>
  );
}

function GoalSheet({
  visible,
  onClose,
  rhythm,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  rhythm: Rhythm;
  onSave: (n: number, startNextMonday: boolean) => void;
}) {
  const isChange = rhythm.status !== 'empty' && rhythm.status !== 'scheduled';
  const [goal, setGoal] = useState(rhythm.upcomingGoal?.weeklyGoal ?? rhythm.goal);
  const [startNext, setStartNext] = useState(false);

  return (
    <Sheet visible={visible} onClose={onClose} title={isChange ? 'Change weekly goal' : 'Set your weekly goal'}>
      <Text style={[type.body, styles.sheetText]}>
        How many sessions would you like to make time for? You can do them on the days that suit you.
      </Text>
      <Text style={[type.eyebrow, { marginBottom: space.sm }]}>Sessions per week</Text>
      <View style={styles.goalRow}>
        {GOAL_OPTIONS.map((n) => (
          <Chip key={n} label={String(n)} selected={goal === n} onPress={() => setGoal(n)} style={{ flex: 1 }} />
        ))}
      </View>
      {isChange ? (
        <Text style={[type.caption, { marginTop: space.md }]}>Your updated goal starts next Monday, {shortDate(nextMonday(rhythm.date))}.</Text>
      ) : (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: startNext }} onPress={() => setStartNext((v) => !v)} style={styles.checkRow}>
          <View style={[styles.checkbox, startNext && styles.checkboxOn]}>{startNext ? <Text style={styles.checkMark}>✓</Text> : null}</View>
          <Text style={type.body}>Start next Monday</Text>
        </Pressable>
      )}
      <Text style={[type.caption, { marginVertical: space.md }]}>Rest days are part of your week. A weekly schedule is optional.</Text>
      <Button title={isChange ? 'Save weekly goal' : 'Set my goal'} onPress={() => onSave(goal, startNext)} />
    </Sheet>
  );
}

function Rule({ title, children }: { title: string; children: string }) {
  return (
    <Text style={[type.body, { marginBottom: space.md }]}>
      <Text style={{ fontWeight: '700' }}>{title} </Text>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  weekCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, marginTop: space.sm },
  weekCardComplete: { backgroundColor: '#FBF4DF' },
  weekHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  bigCount: { ...type.big, marginTop: space.lg },
  bigOf: { fontSize: 28, fontWeight: '700', color: colors.ink },
  slots: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: space.xl },
  slot: { alignItems: 'center', flex: 1 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  dotDone: { backgroundColor: colors.accent },
  dotEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.faint },
  dotCheck: { color: colors.white, fontSize: 18, fontWeight: '800' },
  slotLabel: { fontSize: 12, fontWeight: '600', color: colors.ink },
  slotSub: { fontSize: 11, color: colors.muted },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  leaf: { fontSize: 20, color: colors.muted },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  streakNumber: { fontSize: 32, fontWeight: '800', color: colors.ink },
  link: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  emptyWeeks: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  weekTile: { width: '47%', flexDirection: 'row', gap: space.sm, padding: space.md, backgroundColor: colors.surface, borderRadius: radius.md },
  tileCheck: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg, marginTop: space.md },
  stats: { flexDirection: 'row', marginTop: space.xl },
  bigCheck: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginVertical: space.lg },
  detailRow: { flexDirection: 'row', paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  sheetText: { marginBottom: space.lg },
  goalRow: { flexDirection: 'row', gap: space.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, minHeight: 44 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: '800' },
});
