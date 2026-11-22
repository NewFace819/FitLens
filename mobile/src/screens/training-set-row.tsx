import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { validSetValues, type SetValues, type TrainingSet } from '../modules/training/training-model';
import { parseSetDuration, parseSetInput } from '../modules/training/set-input';
import { Button } from '../ui/components';
import { colors, space, type } from '../ui/theme';

const durationText = (seconds: number | null | undefined) => seconds == null
  ? ''
  : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function TrainingSetRow({
  set,
  index,
  locked,
  timed,
  onEdit,
  onComplete,
  onUndo,
}: {
  set: TrainingSet;
  index: number;
  locked: boolean;
  timed: boolean;
  onEdit: (values: SetValues) => void;
  onComplete: (values: SetValues) => void;
  onUndo: () => void;
}) {
  const [kg, setKg] = useState(set.kg?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');
  const [duration, setDuration] = useState(durationText(set.durationSec));
  useEffect(() => {
    setKg(set.kg?.toString() ?? '');
  }, [set.kg]);
  useEffect(() => {
    setReps(set.reps?.toString() ?? '');
  }, [set.reps]);
  useEffect(() => {
    setDuration(text => parseSetDuration(text)?.durationSec === set.durationSec
      ? text
      : durationText(set.durationSec));
  }, [set.durationSec]);
  // A completed legacy set keeps the values originally recorded for it.
  const showDuration = timed && (!set.done || set.durationSec !== undefined);
  const parsed = showDuration ? parseSetDuration(duration) : parseSetInput(kg, reps);
  const change = (weight: string, count: string) => {
    setKg(weight);
    setReps(count);
    const values = parseSetInput(weight, count);
    if (values) onEdit(values);
  };
  const changeDuration = (text: string) => {
    setDuration(text);
    const values = parseSetDuration(text);
    if (values) onEdit(values);
  };
  const canComplete = parsed !== null && validSetValues(parsed, true);
  return (
    <View style={styles.row}>
      <Text style={type.h3}>
        Set {index + 1}
        {set.done ? ' · Done' : ''}
      </Text>
      {showDuration ? (
        <View>
          <Text style={type.caption}>Duration (m:ss or seconds)</Text>
          <TextInput
            accessibilityLabel={`Set ${index + 1} duration`}
            style={[styles.input, styles.durationInput]}
            editable={!locked && !set.done}
            value={duration}
            placeholder="e.g. 5:00"
            onChangeText={changeDuration}
          />
        </View>
      ) : (
        <View style={styles.inputs}>
          <TextInput
            accessibilityLabel={`Set ${index + 1} weight in kg`}
            style={[styles.input, styles.repetitionInput]}
            editable={!locked && !set.done}
            keyboardType="decimal-pad"
            value={kg}
            placeholder="kg (0 for bodyweight)"
            onChangeText={text => change(text, reps)}
          />
          <TextInput
            accessibilityLabel={`Set ${index + 1} repetitions`}
            style={[styles.input, styles.repetitionInput]}
            editable={!locked && !set.done}
            keyboardType="number-pad"
            value={reps}
            placeholder="reps"
            onChangeText={text => change(kg, text)}
          />
        </View>
      )}
      {!parsed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {showDuration
            ? 'Enter a positive duration in seconds or m:ss.'
            : 'Enter kg from 0–1000 and whole reps from 1–999.'}
        </Text>
      ) : null}
      <Button
        title={set.done ? 'Undo set' : 'Complete set'}
        variant="secondary"
        disabled={locked || (!set.done && !canComplete)}
        onPress={() => {
          if (set.done) onUndo();
          else if (parsed && canComplete) onComplete(parsed);
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
  durationInput: { marginTop: space.xs },
  repetitionInput: { flex: 1 },
  input: {
    minHeight: 48,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
  },
  error: { color: colors.danger },
});
