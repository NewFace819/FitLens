import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import type { AppStore, Workout } from '../core/types';
import { Button, Heading } from '../ui/parts';
import { colors } from '../ui/theme';

export default function WorkoutsScreen({ store }: { store: AppStore }) {
  const [workouts, setWorkouts] = useState<Workout[]>(() => store.listWorkouts());
  const [open, setOpen] = useState<string | null>(null);
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
    setMessage(`Created “${w.title}”.`);
    setOpen(w.id);
    refresh();
  };

  const remove = (w: Workout) => {
    const r = store.deleteWorkout(w.id);
    if (!r.ok) {
      setMessage(
        r.reason === 'scheduled'
          ? `“${w.title}” is on your plan. Remove those sessions first.`
          : 'Couldn’t delete this workout.',
      );
      return;
    }
    setMessage(`Deleted “${w.title}”.`);
    refresh();
  };

  const mine = workouts.filter(w => w.source === 'custom');
  const templates = workouts.filter(w => w.source === 'template');
  const row = (w: Workout) => (
    <View key={w.id} style={styles.card}>
      <Pressable
        testID={`workout-${w.id}`}
        accessibilityRole="button"
        onPress={() => setOpen(open === w.id ? null : w.id)}>
        <Text style={styles.title}>{w.title}</Text>
        <Text style={styles.meta}>
          {w.items.length} {w.items.length === 1 ? 'exercise' : 'exercises'} · about {store.estimateMinutes(w)} min
        </Text>
      </Pressable>
      {open === w.id && (
        <View style={styles.details}>
          {w.items.length === 0 && <Text style={styles.meta}>No exercises yet.</Text>}
          {w.items.map((i, n) => (
            <Text key={n} style={styles.exercise}>
              {n + 1}. {store.exerciseName(i.exerciseId)} · {i.sets} × {i.reps}
            </Text>
          ))}
          {w.source === 'custom' && (
            <Button kind="danger" label="Delete workout" onPress={() => remove(w)} testID={`delete-${w.id}`} />
          )}
        </View>
      )}
    </View>
  );

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
    color: colors.text,
  },
  status: { minHeight: 20, fontSize: 13, fontWeight: '700', color: '#51705f' },
  section: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, color: colors.muted, marginTop: 8 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: '#e0e6d6', borderRadius: 20, padding: 14 },
  title: { fontSize: 16, fontWeight: '900', color: colors.text },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 2 },
  details: { marginTop: 10, gap: 6 },
  exercise: { fontSize: 14, fontWeight: '700', color: colors.text },
});
