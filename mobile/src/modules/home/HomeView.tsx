import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { timeIcon } from './prototypeAssets';
import { styles as s, colors, Button } from './primitives';
import { Icon } from './Icon';
import { Mascot } from '../mascot/MascotView';
import { Activity as Entry } from '../activity/activity';
import { addDays, weekStartOf, toDateKey } from '../../shared/dates';
const today = () => toDateKey(new Date());
export type HomeDestination = 'workouts' | 'plan' | 'steps';
export type HomePlan = {
  id: string;
  date: string;
  name: string;
  minutes?: number;
  exercises?: number;
};
export type WorkoutMetric = { date: string; durationSec: number; sets: number };
export function ActivitySection({
  onSteps,
  workouts = [],
}: {
  onSteps?: () => void;
  workouts?: WorkoutMetric[];
}) {
  const recorded = workouts.filter(w => w.date === today());
  return (
    <View style={{ flexDirection: 'row', gap: 12, height: 188 }}>
      <Pressable
        accessibilityRole="button"
        onPress={onSteps}
        style={{
          flex: 1,
          backgroundColor: '#e4ecd9',
          borderRadius: 22,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={s.body}>
          Steps <Text style={{ fontSize: 10 }}>Sample</Text> ›
        </Text>
        <View
          style={{
            alignSelf: 'center',
            width: 116,
            height: 116,
            borderRadius: 60,
            backgroundColor: '#f5cf55',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 29, color: '#62491f', fontWeight: '600' }}>
            3,150
          </Text>
        </View>
      </Pressable>
      <View style={{ flex: 1, gap: 12 }}>
        {[
          [
            'Workout Time',
            Math.round(recorded.reduce((n, w) => n + w.durationSec, 0) / 60),
            'min',
          ],
          ['Sets completed', recorded.reduce((n, w) => n + w.sets, 0), 'sets'],
        ].map(([label, value, unit], i) => (
          <View
            key={label}
            style={{
              flex: 1,
              borderRadius: 22,
              backgroundColor: i ? '#eee5d7' : '#e1e9ee',
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={s.body}>{label}</Text>
            <View style={s.row}>
              <Text style={{ fontSize: 26, color: colors.ink }}>
                {value} <Text style={{ fontSize: 12 }}>{unit}</Text>
              </Text>
              {i ? (
                <Icon name="check" size={30} />
              ) : (
                <SvgXml xml={timeIcon} width={26} height={26} />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
export function HomeScreen({
  entries,
  plans = [],
  workouts = [],
  go,
  onLog,
  error,
  retry,
  onDateChange,
  onSession,
}: {
  entries: Entry[];
  plans?: HomePlan[];
  workouts?: WorkoutMetric[];
  go: (route: HomeDestination) => void;
  onLog: (date: string) => void;
  error: boolean;
  retry: () => void;
  onDateChange?: (date: string) => void;
  onSession?: (id: string) => void;
}) {
  const [date, setDate] = useState(today());
  useEffect(() => {
    onDateChange?.(date);
  }, [date, onDateChange]);
  const shift = addDays;
  const first = weekStartOf(date);
  const records = entries.filter(e => e.date === date);
  const planned = plans.find(p => p.date === date);
  const isToday = date === today();
  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text
          style={{
            position: 'absolute',
            zIndex: 1,
            top: 6,
            color: colors.ink,
            fontWeight: '600',
            fontSize: 15,
          }}
        >
          FitLens
        </Text>
        <Mascot />
      </View>
      <View style={s.row}>
        <Text style={s.heading}>
          {first === weekStartOf(today())
            ? 'This week'
            : new Date(first + 'T12:00:00').toLocaleDateString('en', {
                month: 'short',
                day: 'numeric',
              })}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          {[-7, 7].map(delta => (
            <Pressable
              key={delta}
              accessibilityRole="button"
              accessibilityLabel={delta < 0 ? 'Previous week' : 'Next week'}
              onPress={() => setDate(shift(date, delta))}
              style={{
                width: 44,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={delta < 0 ? 'left' : 'right'} size={16} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = shift(first, i);
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={d}
              accessibilityState={{ selected: d === date }}
              onPress={() => setDate(d)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderRadius: 18,
                backgroundColor: d === date ? colors.selection : 'transparent',
                gap: 3,
                borderWidth: 1,
                borderColor: d === date ? '#738466' : 'transparent',
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </Text>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: 19,
                  fontWeight: d === today() ? '700' : '400',
                }}
              >
                {Number(d.slice(-2))}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 10 }}>
                {entries.some(e => e.date === d) ||
                plans.some(p => p.date === d)
                  ? '●'
                  : ' '}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: colors.muted, fontSize: 11 }}>
        ● Planned or recorded activity
      </Text>
      <View style={[s.row, { minHeight: 40, paddingHorizontal: 20 }]}>
        <Text style={s.body}>
          {isToday ? 'Today, ' : ''}
          {new Date(date + 'T12:00:00').toLocaleDateString('en', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        {!isToday && (
          <Button quiet label="Today" onPress={() => setDate(today())} />
        )}
      </View>
      <View
        style={[
          s.card,
          { backgroundColor: planned ? '#29483b' : 'transparent' },
        ]}
      >
        <Text style={[s.title, planned && { color: '#fff9ec' }]}>
          {error
            ? 'Activity couldn’t be loaded.'
            : planned
            ? planned.name
            : records.length
            ? isToday
              ? records[0].name
              : 'Recorded activity.'
            : date < today()
            ? 'No recorded activity.'
            : 'No workout scheduled.'}
        </Text>
        {error ? (
          <Button label="Try again" onPress={retry} />
        ) : (
          <>
            {planned && (
              <Text style={{ color: '#d1dfbd' }}>
                {[
                  planned.minutes ? planned.minutes + ' min' : null,
                  planned.exercises ? planned.exercises + ' exercises' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
            {records.map(e => (
              <View
                key={e.id}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.rule,
                }}
              >
                <Text style={s.heading}>{e.name}</Text>
                <Text style={s.body}>
                  {Math.round(e.durationSec / 60)} min · Saved
                </Text>
              </View>
            ))}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                marginTop: 6,
              }}
            >
              <Button
                label={
                  planned
                    ? isToday
                      ? 'Start workout'
                      : 'View workout'
                    : date > today()
                    ? 'Schedule workout'
                    : 'Choose a workout'
                }
                onPress={() =>
                  planned && onSession
                    ? onSession(planned.id)
                    : go(date > today() ? 'plan' : 'workouts')
                }
              />
              {date <= today() && (
                <Button
                  quiet
                  label="Log activity"
                  onPress={() => onLog(date)}
                />
              )}
            </View>
          </>
        )}
      </View>
      <Text style={[s.heading, { marginTop: 10 }]}>Today’s activity</Text>
      <ActivitySection workouts={workouts} onSteps={() => go('steps')} />
    </View>
  );
}
