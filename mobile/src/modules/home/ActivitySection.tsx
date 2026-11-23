/** Public native replacement for renderActivitySection(el): returns a React section for Workouts. */
import React from 'react';
import { View, Text } from 'react-native';
import { getActivities } from '../activity/activity';
import { styles as s, Button } from './primitives';
import { useStore } from '../../ui/use-store';
export function ActivitySection({ onLog }: { onLog?: () => void }) {
  useStore();
  const entries = getActivities();
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.heading}>Other activities</Text>
      {entries.slice(0, 5).map(e => (
        <View key={e.id}>
          <Text style={s.body}>
            {e.name} · {Math.round(e.durationSec / 60)} min
          </Text>
          <Text style={s.body}>{e.date}</Text>
        </View>
      ))}
      {!entries.length && (
        <Text style={s.body}>No activities recorded yet.</Text>
      )}
      {onLog && <Button label="Log activity" onPress={onLog} />}
    </View>
  );
}
export function renderActivitySection(
  props: React.ComponentProps<typeof ActivitySection> = {},
) {
  return <ActivitySection {...props} />;
}
