/** Owner: npdwuy. One workout's recap in the prototype's review style, plus its month (#43). */
import { StyleSheet, Text, View } from 'react-native';
import { getCheckInContext } from '../modules/checkin/checkin';
import { effortLevel } from '../modules/checkin/review-model';
import { getHistory, type SetRecord } from '../modules/history/history';
import {
  formatDuration,
  formatKg,
  monthTotals,
  plural,
  totals,
} from '../modules/history/history-summary';
import { getRhythm } from '../modules/rhythm/rhythm';
import { useAppNavigation, useAppRoute } from '../navigation';
import { dayLabel } from '../shared/dates';
import { Button, Divider, Screen, TopBar } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';
import StatTile from './history-stat';

function timeLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function setLabel(set: SetRecord): string {
  if (set.durationSec !== undefined) return timeLabel(set.durationSec);
  if (set.kg === null) return `${set.reps} reps`;
  return `${set.kg} kg · ${set.reps} reps`;
}

export default function RecapScreen() {
  const nav = useAppNavigation();
  const historyId = useAppRoute<'Recap'>().params?.history;
  useStore();
  const recap = historyId ? getCheckInContext(historyId) : null;
  if (!recap) {
    return (
      <Screen>
        <TopBar title="Workout recap" />
        <View style={styles.stack}>
          <Text style={type.body}>We couldn’t find this session. It may have been removed.</Text>
          <Button title="See all workouts" variant="secondary" onPress={() => nav.navigate('History')} />
        </View>
      </Screen>
    );
  }

  const { entry, existing } = recap;
  const session = totals([entry]);
  const month = monthTotals(getHistory(), entry.date);
  const streak = getRhythm().streakWeeks;
  const setsByExercise = new Map<string, SetRecord[]>();
  for (const set of entry.sets) {
    const sets = setsByExercise.get(set.exerciseId);
    if (sets) sets.push(set);
    else setsByExercise.set(set.exerciseId, [set]);
  }

  return (
    <Screen>
      <TopBar title="Workout recap" />
      <View style={styles.stack}>
        <Text style={type.eyebrow}>{dayLabel(entry.date)}</Text>
        <Text style={type.title} accessibilityRole="header">{recap.title}</Text>
        {entry.stoppedByPain ? (
          <Text style={[styles.status, styles.pain]}>
            Stopped for pain. Rest, and tell us where it hurt in the check-in.
          </Text>
        ) : (
          <Text style={[styles.status, styles.done]}>✓ Complete</Text>
        )}
      </View>

      <View style={styles.tiles}>
        <StatTile
          label="Total volume"
          value={formatKg(session.volumeKg)}
          note={session.volumeKg > 0
            ? 'Weight × reps, added up across every set'
            : 'Bodyweight and timed sets add no volume'}
        />
        <StatTile label="Time for you" value={formatDuration(entry.durationSec)} />
        <StatTile label="Showing up" value={plural(recap.setCount, 'set')} note={plural(recap.exercises.length, 'exercise')} />
        <StatTile
          label="Effort"
          value={existing ? `${existing.rpe}/10` : '—'}
          note={existing ? effortLevel(existing.rpe).name : 'Not checked in yet'}
        />
      </View>

      {recap.exercises.length ? <Text style={[type.h2, styles.section]}>Your sets</Text> : null}
      {recap.exercises.map(exercise => (
        <View key={exercise.id} style={styles.exercise}>
          <Text style={type.h3}>{exercise.name}</Text>
          {setsByExercise.get(exercise.id)?.map((set, index) => (
            <Text key={index} style={type.body}>
              {`Set ${index + 1} · ${setLabel(set)}`}
            </Text>
          ))}
        </View>
      ))}

      <View style={[styles.month, styles.section]}>
        <Text style={type.eyebrow}>{`Your month in motion · ${month.month}`}</Text>
        <Text style={type.h2}>{plural(month.sessions, 'workout')}</Text>
        <Text style={type.body}>
          {`${formatDuration(month.durationSec)} well spent · ${formatKg(month.volumeKg)} lifted`}
        </Text>
        <Text style={type.caption}>{`Current rhythm streak: ${plural(streak, 'week')}`}</Text>
      </View>

      <Divider />
      <Button
        title={existing ? 'Edit check-in' : 'Add check-in'}
        variant="secondary"
        style={{ marginTop: space.sm }}
        onPress={() => nav.navigate('CheckIn', { history: entry.id })}
      />
      <Button title="All workouts" variant="text" onPress={() => nav.navigate('History')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  status: { ...type.body, fontWeight: '700' },
  done: { color: colors.accent },
  pain: { color: colors.danger },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  section: { marginTop: space.xl },
  exercise: { gap: space.xs, marginTop: space.md },
  month: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
});
