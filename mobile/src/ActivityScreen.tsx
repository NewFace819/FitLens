import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { Entry, activityTypes, validateEntry } from './activityModel';
import { styles as s, Button } from './ui';
export function ActivityScreen({
  date,
  save,
  enabled,
}: {
  date: string;
  save: (e: Entry) => Promise<boolean>;
  enabled: boolean;
}) {
  const [type, setType] = useState<Entry['type']>('walk'),
    [name, setName] = useState(''),
    [day, setDay] = useState(date),
    [minutes, setMinutes] = useState(''),
    [distance, setDistance] = useState(''),
    [ascent, setAscent] = useState(''),
    [note, setNote] = useState(''),
    [effort, setEffort] = useState<Entry['effort']>(null),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function submit() {
    if (lock.current || !enabled) return;
    lock.current = true;
    setBusy(true);
    try {
      const e = validateEntry({
        id: 'activity:' + Date.now(),
        type,
        name,
        date: day,
        seconds: Number(minutes) * 60,
        distanceKm: distance.trim() ? Number(distance) : null,
        elevationM: ascent.trim() ? Number(ascent) : null,
        note,
        effort,
        source: 'manual',
        at: new Date().toISOString(),
      });
      await save(e);
    } catch (err) {
      Alert.alert(
        'Check activity',
        err instanceof Error ? err.message : 'Please check your entries.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.title}>Log activity</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Object.entries(activityTypes).map(([key, label]) => (
          <Button
            key={key}
            label={label}
            quiet={type !== key}
            onPress={() => setType(key as Entry['type'])}
          />
        ))}
      </View>
      {(
        [
          ['Name (optional)', name, setName, 'default'],
          ['Date · YYYY-MM-DD', day, setDay, 'default'],
          ['Duration · minutes', minutes, setMinutes, 'decimal-pad'],
          ['Distance · km (optional)', distance, setDistance, 'decimal-pad'],
          ...(type === 'swim'
            ? []
            : [['Ascent · m (optional)', ascent, setAscent, 'decimal-pad']]),
          ['Note (optional)', note, setNote, 'default'],
        ] as Array<
          [string, string, (text: string) => void, 'default' | 'decimal-pad']
        >
      ).map(([label, value, setter, keyboard]) => (
        <View key={label} style={{ gap: 6 }}>
          <Text style={s.body}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={setter}
            keyboardType={keyboard}
            style={s.input}
            maxLength={label.startsWith('Note') ? 500 : 80}
          />
        </View>
      ))}
      <Text style={s.body}>Effort (optional)</Text>
      <View style={{ flexDirection: 'row' }}>
        {(['easy', 'steady', 'hard'] as const).map(e => (
          <Button
            key={e}
            label={e}
            quiet={effort !== e}
            onPress={() => setEffort(effort === e ? null : e)}
          />
        ))}
      </View>
      <Button
        disabled={busy || !enabled}
        label={busy ? 'Saving…' : 'Save activity'}
        onPress={submit}
      />
    </View>
  );
}
