import { newId } from '../../shared/ids';
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Activity as Entry, activityTypes, validateActivity } from './activity';
import Svg, { Path, Circle } from 'react-native-svg';
import { Button } from '../home/primitives';
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
      const e = validateActivity({
        id: newId('ac'),
        type,
        name,
        date: day,
        durationSec: Number(minutes) * 60,
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
    <View style={f.page}>
      <Text style={f.eyebrow}>YOUR MOVEMENT</Text>
      <Text style={f.title}>Log activity</Text>
      <Text style={f.description}>
        A walk, a ride, a little time for yourself.
      </Text>
      <View style={f.types}>
        {Object.entries(activityTypes).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: type === key }}
            onPress={() => setType(key as Entry['type'])}
            style={[f.type, type === key && f.typeSelected]}
          >
            <ActivityGlyph
              type={key}
              color={type === key ? '#fff9ec' : '#5b7355'}
            />
            <Text style={[f.typeLabel, type === key && { color: '#fff9ec' }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={f.section}>
        <Text style={f.sectionTitle}>The essentials</Text>
        <Field
          label="Name (optional)"
          value={name}
          onChange={setName}
          placeholder={activityTypes[type]}
        />
        <Field
          label="Date · YYYY-MM-DD"
          value={day}
          onChange={setDay}
          placeholder="YYYY-MM-DD"
        />
        <View style={f.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Duration · minutes"
              value={minutes}
              onChange={setMinutes}
              placeholder="30"
              numeric
            />
          </View>
          {type !== 'other' && (
            <View style={{ flex: 1 }}>
              <Field
                label="Distance · km (optional)"
                value={distance}
                onChange={setDistance}
                placeholder="—"
                numeric
              />
            </View>
          )}
        </View>
        {!['swim', 'other'].includes(type) && (
          <Field
            label="Ascent · m (optional)"
            value={ascent}
            onChange={setAscent}
            placeholder="—"
            numeric
          />
        )}
      </View>
      <View style={f.section}>
        <Text style={f.sectionTitle}>How did it feel?</Text>
        <Text style={f.optional}>Effort · optional</Text>
        <View style={f.efforts}>
          {(['easy', 'steady', 'hard'] as const).map((e, index) => (
            <Pressable
              key={e}
              accessibilityRole="button"
              accessibilityLabel={e}
              accessibilityState={{ selected: effort === e }}
              onPress={() => setEffort(effort === e ? null : e)}
              style={[
                f.effort,
                effort === e && {
                  backgroundColor: '#e3ead9',
                  borderColor: '#82917a',
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 3,
                  height: 18,
                }}
              >
                {[0, 1, 2].map(n => (
                  <View
                    key={n}
                    style={{
                      width: 4,
                      height: 7 + n * 5,
                      borderRadius: 2,
                      backgroundColor: n <= index ? '#6b815d' : '#dce2d5',
                    }}
                  />
                ))}
              </View>
              <Text style={f.effortLabel}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Note (optional)"
          value={note}
          onChange={setNote}
          placeholder="A few words about your movement…"
          multiline
        />
      </View>
      <Button
        disabled={busy || !enabled}
        label={busy ? 'Saving…' : 'Save activity'}
        onPress={submit}
      />
      <Text style={f.footer}>Every little movement counts.</Text>
    </View>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9aa58e"
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        multiline={multiline}
        maxLength={multiline ? 500 : 80}
        style={[
          f.input,
          multiline && { minHeight: 90, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}
function ActivityGlyph({ type, color }: { type: string; color: string }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {type === 'cycle' ? (
        <>
          <Circle cx={5} cy={17} r={4} />
          <Circle cx={19} cy={17} r={4} />
          <Path d="m5 17 5-10 5 10H5l6-6h6l2 6M8 7h4m2-3h3l2 5" />
        </>
      ) : type === 'swim' ? (
        <>
          <Circle cx={17} cy={6} r={2} />
          <Path d="m3 13 6-7 5 5-3 3M2 17q3-3 6 0t6 0t6 0M2 21q3-3 6 0t6 0t6 0" />
        </>
      ) : type === 'other' ? (
        <Path d="M3 12h4l3-7 4 14 3-7h4" />
      ) : (
        <>
          <Circle cx={14} cy={4} r={2} />
          <Path
            d={
              type === 'run'
                ? 'm8 8 5-1 3 5 5 1M13 7l-3 7-6-1m6 1 4 3-2 5M5 8l3 1'
                : 'm6 12 5-5 4 5 4 1M11 8l-1 8-4 5m4-5 6 6'
            }
          />
        </>
      )}
    </Svg>
  );
}
const f = StyleSheet.create({
  page: { gap: 20 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: '#7b886f',
  },
  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.8,
    color: '#294638',
    marginTop: -10,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#71806a',
    marginTop: -10,
  },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: {
    minWidth: 92,
    flexGrow: 1,
    flexBasis: '29%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#e9eddf',
    borderWidth: 1,
    borderColor: '#e1e6d7',
    alignItems: 'center',
    gap: 9,
  },
  typeSelected: { backgroundColor: '#29483b', borderColor: '#29483b' },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#4f6447' },
  section: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#eeefe7',
    gap: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#344d3d' },
  label: { fontSize: 11, fontWeight: '600', color: '#6e7d66' },
  input: {
    borderWidth: 1,
    borderColor: '#dce2d5',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#294638',
    backgroundColor: '#fffef9',
    minHeight: 48,
  },
  row: { flexDirection: 'row', gap: 12 },
  optional: { fontSize: 11, color: '#7d886f', marginTop: -8 },
  efforts: { flexDirection: 'row', gap: 8 },
  effort: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce2d5',
    backgroundColor: '#f7f6f2',
    padding: 13,
    alignItems: 'center',
    gap: 10,
  },
  effortLabel: { fontSize: 12, color: '#52634e' },
  footer: {
    fontSize: 11,
    color: '#8a947e',
    textAlign: 'center',
    paddingBottom: 8,
  },
});
