import { Text, View } from 'react-native';
import { getCheckInContext } from '../modules/checkin/checkin';
import type { SetRecord } from '../modules/history/history';
import { useAppNavigation, useAppRoute } from '../navigation';
import { shortDate } from '../shared/dates';
import { Button, Divider, Screen, TopBar } from '../ui/components';
import { space, type } from '../ui/theme';
import { useStore } from '../ui/use-store';

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
        <Text style={type.body}>We couldn’t find this session.</Text>
      </Screen>
    );
  }

  const { entry, existing } = recap;
  const setsByExercise = new Map<string, SetRecord[]>();
  for (const set of entry.sets) {
    const sets = setsByExercise.get(set.exerciseId);
    if (sets) sets.push(set);
    else setsByExercise.set(set.exerciseId, [set]);
  }

  return (
    <Screen>
      <TopBar title="Workout recap" />
      <View style={{ gap: space.sm }}>
        <Text style={type.eyebrow}>{shortDate(entry.date)}</Text>
        <Text style={type.title} accessibilityRole="header">{recap.title}</Text>
        <Text style={type.body}>
          {`${timeLabel(entry.durationSec)} · ${recap.setCount} sets · ${recap.exercises.length} exercises`}
        </Text>
        {entry.stoppedByPain ? <Text style={type.body}>Stopped for pain</Text> : null}
      </View>

      {recap.exercises.map(exercise => (
        <View key={exercise.id} style={{ gap: space.sm, marginTop: space.lg }}>
          <Text style={type.h3}>{exercise.name}</Text>
          {setsByExercise.get(exercise.id)?.map((set, index) => (
            <Text key={index} style={type.body}>
              {`Set ${index + 1} · ${setLabel(set)}`}
            </Text>
          ))}
        </View>
      ))}

      <Divider />
      {existing ? <Text style={type.body}>Effort {existing.rpe}/10</Text> : null}
      <Button
        title={existing ? 'Edit check-in' : 'Add check-in'}
        variant="secondary"
        style={{ marginTop: space.sm }}
        onPress={() => nav.navigate('CheckIn', { history: entry.id })}
      />
    </Screen>
  );
}
