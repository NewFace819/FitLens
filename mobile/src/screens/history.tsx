/** Owner: npdwuy. Workout history grouped by week, with this month's numbers on top (#43). */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getHistory, getReview, type HistoryEntry } from '../modules/history/history';
import {
  formatDuration,
  formatKg,
  groupByWeek,
  monthTotals,
  plural,
  totals,
  weekHeading,
} from '../modules/history/history-summary';
import { getRhythm } from '../modules/rhythm/rhythm';
import { getWorkout } from '../modules/workouts/schedule';
import { useAppNavigation } from '../navigation';
import { dayLabel, toDateKey } from '../shared/dates';
import { Button, Screen, TopBar } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';
import StatTile from './history-stat';

export const entryTitle = (entry: HistoryEntry) =>
  entry.workoutTitle ?? getWorkout(entry.workoutId)?.title ?? 'Workout';

function entryDetail(entry: HistoryEntry): string {
  const { volumeKg, sets } = totals([entry]);
  const review = getReview(entry.id);
  return [
    dayLabel(entry.date),
    formatDuration(entry.durationSec),
    volumeKg > 0 ? formatKg(volumeKg) : plural(sets, 'set'),
    review ? `Effort ${review.rpe}/10` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function HistoryScreen() {
  const nav = useAppNavigation();
  useStore();
  const entries = getHistory();
  const today = toDateKey(new Date());

  if (entries.length === 0) {
    return (
      <Screen>
        <TopBar title="Workout history" />
        <View style={styles.empty}>
          <Text style={type.h2}>No workouts yet</Text>
          <Text style={type.body}>
            Finish your first workout and it shows up here, with its time, volume and effort.
          </Text>
          <Button title="Start a workout" onPress={() => nav.navigate('Workout')} />
        </View>
      </Screen>
    );
  }

  const month = monthTotals(entries, today);
  const streak = getRhythm(today).streakWeeks;
  return (
    <Screen>
      <TopBar title="Workout history" />
      <View style={styles.card}>
        <Text style={type.eyebrow}>{`Your month in motion · ${month.month}`}</Text>
        <Text style={type.title} accessibilityRole="header">
          {month.sessions ? plural(month.sessions, 'workout') : 'A fresh month'}
        </Text>
        {month.sessions ? null : (
          <Text style={type.caption}>Your next workout starts this month’s count.</Text>
        )}
        <View style={styles.tiles}>
          <StatTile label="Time well spent" value={formatDuration(month.durationSec)} />
          <StatTile label="Volume" value={formatKg(month.volumeKg)} />
          <StatTile label="Rhythm streak" value={plural(streak, 'week')} />
        </View>
      </View>

      {groupByWeek(entries).map(week => (
        <View key={week.weekStart} style={styles.week}>
          <Text style={type.eyebrow}>
            {[
              weekHeading(week.weekStart, today),
              plural(week.totals.sessions, 'workout'),
              formatDuration(week.totals.durationSec),
            ].join(' · ')}
          </Text>
          {week.entries.map(entry => {
            const title = entryTitle(entry);
            const detail = entryDetail(entry);
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${detail}${entry.stoppedByPain ? ', stopped for pain' : ''}`}
                onPress={() => nav.navigate('Recap', { history: entry.id })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowText}>
                  <Text style={type.h3}>{title}</Text>
                  <Text style={type.caption}>{detail}</Text>
                  {entry.stoppedByPain ? <Text style={styles.pain}>Stopped for pain</Text> : null}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { gap: space.md, marginTop: space.xl },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  week: { gap: space.xs, marginTop: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowText: { flex: 1, gap: 2 },
  pain: { ...type.caption, color: colors.danger },
  chevron: { ...type.h3, color: colors.muted, marginLeft: space.sm },
  pressed: { opacity: 0.7 },
});
