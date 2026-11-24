import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import type { AppStore, Workout } from '../modules/workouts/types';
import { Button, Heading } from '../ui/parts';
import WorkoutDetailScreen from './WorkoutDetailScreen';
import { colors } from '../ui/theme';

export default function WorkoutsScreen({ store, onStart }: { store: AppStore; onStart?: (workoutId: string) => void }) {
  const [workouts, setWorkouts] = useState<Workout[]>(() => store.listWorkouts());
  const [detail, setDetail] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const refresh = useCallback(() => setWorkouts(store.listWorkouts()), [store]);

  const create = () => {
    const title = name.trim();
    if (!title) {
      setMessage('Give your workout a name first.');
      return;
    }
    const w = store.createWorkout({ title });
    if (!w) {
      setMessage('Couldn’t keep this workout. Please try again.');
      return;
    }
    setName('');
    setMessage('');
    refresh();
    setDetail(w.id); // open it straight away so exercises can be added
  };

  const mine = workouts.filter(w => w.source === 'custom');
  const templates = workouts.filter(w => w.source === 'template');
  const row = (w: Workout) => (
    <View key={w.id} style={styles.card}>
      <Pressable testID={`workout-${w.id}`} accessibilityRole="button" onPress={() => setDetail(w.id)}>
        <Text style={styles.title}>{w.title}</Text>
        <Text style={styles.meta}>
          {w.items.length} {w.items.length === 1 ? 'exercise' : 'exercises'} · about {store.estimateMinutes(w)} min
        </Text>
      </Pressable>
    </View>
  );

  if (detail !== null) {
    return (
      <WorkoutDetailScreen
        store={store}
        workoutId={detail}
        onStart={onStart}
        onBack={() => {
          setDetail(null);
          refresh();
        }}
        onDeleted={() => {
          setDetail(null);
          setMessage('Workout deleted.');
          refresh();
        }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Heading eyebrow="FITLENS / WORKOUTS" title="Find your next move" />
      <View style={styles.create}>
        <TextInput
          testID="workout-name"
          style={styles.input}
          placeholder="e.g. My Sunday session"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          maxLength={40}
          accessibilityLabel="Workout name"
        />
        <Button label="Create workout" onPress={create} testID="create-workout" />
      </View>
      <Text style={styles.status} accessibilityLiveRegion="polite" testID="workouts-status">
        {message}
      </Text>
      {mine.length > 0 && <Text style={styles.section}>Your workouts</Text>}
      {mine.map(row)}
      <Text style={styles.section}>Routines</Text>
      {templates.map(row)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, gap: 10 },
  create: { gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
  },
  status: { minHeight: 20, fontSize: 13, fontWeight: '700', color: '#51705f' },
  section: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, color: colors.muted, marginTop: 8 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: '#e0e6d6', borderRadius: 20, padding: 14 },
  title: { fontSize: 16, fontWeight: '900', color: colors.ink },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 2 },
});
