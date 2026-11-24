import { Text } from 'react-native';
import { getHistory } from '../modules/history/history';
import { getWorkout } from '../modules/workouts/schedule';
import { useAppNavigation } from '../navigation';
import { shortDate } from '../shared/dates';
import { ListRow, Screen, TopBar } from '../ui/components';
import { type } from '../ui/theme';
import { useStore } from '../ui/use-store';

export default function HistoryScreen() {
  const nav = useAppNavigation();
  useStore();
  const entries = getHistory();

  return (
    <Screen>
      <TopBar title="Workout history" />
      {entries.length === 0 ? (
        <Text style={type.body}>Your completed workouts will appear here.</Text>
      ) : (
        entries.map(entry => (
          <ListRow
            key={entry.id}
            label={getWorkout(entry.workoutId)?.title ?? 'Workout'}
            detail={[
              shortDate(entry.date),
              `${entry.sets.length} sets`,
              entry.stoppedByPain ? 'Stopped for pain' : null,
            ].filter(Boolean).join(' · ')}
            onPress={() => nav.navigate('Recap', { history: entry.id })}
          />
        ))
      )}
    </Screen>
  );
}
