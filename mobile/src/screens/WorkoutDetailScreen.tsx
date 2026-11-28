import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppStore, Workout, WorkoutItem } from '../modules/workouts/types';
import { Button, Heading, Sheet } from '../ui/parts';
import { colors } from '../ui/theme';

type Props = {
  store: AppStore;
  workoutId: string;
  onBack: () => void;
  onDeleted: () => void;
  /** Opens the workout screen for this workout (route 'Workout', param `workout`). Hidden when absent. */
  onStart?: (workoutId: string) => void;
};

/**
 * Look at a workout and change it: rename, sets and reps, order, add or remove exercises.
 * Routines (templates) are never changed: the first edit makes your own copy (the store does this).
 */
export default function WorkoutDetailScreen({ store, workoutId, onBack, onDeleted, onStart }: Props) {
  const [workout, setWorkout] = useState<Workout | null>(() => store.getWorkout(workoutId));
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);

  if (!workout) {
    return (
      <View style={styles.page}>
        <Button kind="secondary" label="Back" onPress={onBack} testID="back" />
        <Text style={styles.status}>This workout no longer exists.</Text>
      </View>
    );
  }
  const isTemplate = workout.source === 'template';

  // Save a change. Editing a routine returns a new copy of it, which we then show instead.
  const save = (patch: { title?: string; items?: Partial<WorkoutItem>[] }, done?: string) => {
    const copied = isTemplate;
    const next = store.updateWorkout(workout.id, patch);
    if (!next) {
      setMessage('Couldn’t keep this change. Please try again.');
      return;
    }
    setWorkout(next);
    setMessage(copied ? 'Saved as your own copy. The original routine is unchanged.' : done ?? '');
  };

  const items = workout.items;
  const setItem = (index: number, change: Partial<WorkoutItem>) =>
    save({ items: items.map((it, i) => (i === index ? { ...it, ...change } : it)) });
  const move = (index: number, by: -1 | 1) => {
    const j = index + by;
    if (j < 0 || j >= items.length) {
      return;
    }
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    save({ items: next });
  };
  const remove = (index: number) => save({ items: items.filter((_, i) => i !== index) }, 'Exercise removed.');
  const addExercise = (id: string) => {
    const e = store.listExercises().find(x => x.id === id);
    if (!e) {
      return;
    }
    setAdding(false);
    save({ items: [...items, { exerciseId: e.id, ...e.defaults }] }, `${e.name} added.`);
  };
  const rename = (title: string) => {
    if (title.trim() && title.trim() !== workout.title) {
      save({ title }, 'Renamed.');
    }
  };
  const del = () => {
    const r = store.deleteWorkout(workout.id);
    if (r.ok) {
      onDeleted();
      return;
    }
    setMessage(
      r.reason === 'scheduled'
        ? 'This workout is on your plan. Remove it from your plan first.'
        : 'Couldn’t delete this workout.',
    );
  };

  const used = new Set(items.map(i => i.exerciseId));
  const catalog = store.listExercises();

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Button kind="secondary" label="‹ Back" onPress={onBack} testID="back" />
      <Heading eyebrow={isTemplate ? 'ROUTINE' : 'YOUR WORKOUT'} title={workout.title} />
      <Text style={styles.meta}>
        {items.length} {items.length === 1 ? 'exercise' : 'exercises'} · about {store.estimateMinutes(workout)} min
      </Text>
      {onStart && items.length > 0 && <Button label="Start workout" testID="start-workout" onPress={() => onStart(workout.id)} />}
      {isTemplate && <Text style={styles.note}>Changing a routine makes your own copy. The original stays as it is.</Text>}

      {!isTemplate && (
        <TextInput
          testID="title-input"
          style={styles.input}
          defaultValue={workout.title}
          maxLength={80}
          accessibilityLabel="Workout name"
          onEndEditing={e => rename(e.nativeEvent.text)}
        />
      )}
      <Text style={styles.status} accessibilityLiveRegion="polite" testID="detail-status">
        {message}
      </Text>

      {items.length === 0 && <Text style={styles.meta}>No exercises yet. Add your first one.</Text>}
      {items.map((it, i) => (
        <View key={`${it.exerciseId}-${i}`} style={styles.card} testID={`item-${i}`}>
          <Text style={styles.title}>
            {String(i + 1).padStart(2, '0')}  {store.exerciseName(it.exerciseId)}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Sets</Text>
            <Pressable testID={`sets-minus-${i}`} accessibilityRole="button" accessibilityLabel="Fewer sets" style={styles.step} onPress={() => it.sets > 1 && setItem(i, { sets: it.sets - 1 })}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.value} testID={`sets-${i}`}>{it.sets}</Text>
            <Pressable testID={`sets-plus-${i}`} accessibilityRole="button" accessibilityLabel="More sets" style={styles.step} onPress={() => it.sets < 20 && setItem(i, { sets: it.sets + 1 })}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
            <Text style={[styles.label, styles.gap]}>Reps</Text>
            <TextInput
              testID={`reps-${i}`}
              style={styles.reps}
              defaultValue={it.reps}
              maxLength={12}
              accessibilityLabel={`Reps for ${store.exerciseName(it.exerciseId)}`}
              onEndEditing={e => e.nativeEvent.text.trim() && e.nativeEvent.text.trim() !== it.reps && setItem(i, { reps: e.nativeEvent.text.trim() })}
            />
          </View>
          <View style={styles.row}>
            <Button kind="secondary" label="↑" onPress={() => move(i, -1)} disabled={i === 0} testID={`up-${i}`} />
            <Button kind="secondary" label="↓" onPress={() => move(i, 1)} disabled={i === items.length - 1} testID={`down-${i}`} />
            <Button kind="danger" label="Remove" onPress={() => remove(i)} testID={`remove-${i}`} />
          </View>
        </View>
      ))}

      <Button label="Add exercise" onPress={() => setAdding(true)} testID="add-exercise" />
      {!isTemplate && <Button kind="danger" label="Delete this workout" onPress={del} testID="delete-workout" />}

      <Sheet visible={adding} title="Add an exercise" onClose={() => setAdding(false)}>
        <ScrollView>
          {catalog.filter(e => !used.has(e.id)).map(e => (
            <Pressable key={e.id} testID={`exercise-${e.id}`} accessibilityRole="button" style={styles.pick} onPress={() => addExercise(e.id)}>
              <Text style={styles.title}>{e.name}</Text>
              <Text style={styles.meta}>
                {e.defaults.sets} sets × {e.defaults.reps} reps
                {e.equipment.length ? ` · ${e.equipment.join(', ')}` : ' · no equipment'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, gap: 10 },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted },
  note: { fontSize: 13, fontWeight: '700', color: colors.accent },
  status: { minHeight: 20, fontSize: 13, fontWeight: '700', color: '#51705f' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, fontSize: 15, color: colors.ink },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: '#e0e6d6', borderRadius: 20, padding: 14, gap: 10 },
  title: { fontSize: 15, fontWeight: '900', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, fontWeight: '800', color: colors.ink },
  gap: { marginLeft: 8 },
  step: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontWeight: '900', color: colors.ink },
  value: { minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: '900', color: colors.ink },
  reps: { minWidth: 70, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: colors.ink },
  pick: { backgroundColor: colors.accentSoft, borderRadius: 14, padding: 12, marginBottom: 6 },
});
