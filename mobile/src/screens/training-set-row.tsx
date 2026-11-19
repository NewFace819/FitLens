import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TrainingSet } from '../modules/training/training-model';
import { parseSetInput } from '../modules/training/set-input';
import { Button } from '../ui/components';
import { colors, space, type } from '../ui/theme';

export default function TrainingSetRow({
  set,
  index,
  locked,
  onEdit,
  onComplete,
  onUndo,
}: {
  set: TrainingSet;
  index: number;
  locked: boolean;
  onEdit: (kg: number | null, reps: number | null) => void;
  onComplete: (kg: number, reps: number) => void;
  onUndo: () => void;
}) {
  const [kg, setKg] = useState(set.kg?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');
  useEffect(() => {
    setKg(set.kg?.toString() ?? '');
  }, [set.kg]);
  useEffect(() => {
    setReps(set.reps?.toString() ?? '');
  }, [set.reps]);
  const parsed = parseSetInput(kg, reps);
  const change = (weight: string, count: string) => {
    setKg(weight);
    setReps(count);
    const values = parseSetInput(weight, count);
    if (values) onEdit(values.kg, values.reps);
  };
  return (
    <View style={styles.row}>
      <Text style={type.h3}>
        Set {index + 1}
        {set.done ? ' · Done' : ''}
      </Text>
      <View style={styles.inputs}>
        <TextInput
          accessibilityLabel={`Set ${index + 1} weight in kg`}
          style={styles.input}
          editable={!locked && !set.done}
          keyboardType="decimal-pad"
          value={kg}
          placeholder="kg (0 for bodyweight)"
          onChangeText={text => change(text, reps)}
        />
        <TextInput
          accessibilityLabel={`Set ${index + 1} repetitions`}
          style={styles.input}
          editable={!locked && !set.done}
          keyboardType="number-pad"
          value={reps}
          placeholder="reps"
          onChangeText={text => change(kg, text)}
        />
      </View>
      {!parsed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Enter kg from 0–1000 and whole reps from 1–999.
        </Text>
      ) : null}
      <Button
        title={set.done ? 'Undo set' : 'Complete set'}
        variant="secondary"
        disabled={
          locked ||
          (!set.done && (!parsed || parsed.kg === null || parsed.reps === null))
        }
        onPress={() => {
          if (set.done) onUndo();
          else if (parsed?.kg != null && parsed.reps != null)
            onComplete(parsed.kg, parsed.reps);
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    gap: space.sm,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  inputs: { flexDirection: 'row', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 48,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
  },
  error: { color: colors.danger },
});
