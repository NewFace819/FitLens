import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Rect, SvgXml } from 'react-native-svg';
import { timeIcon } from './prototypeAssets';
import { styles as s, colors, Button } from './primitives';
import { StepSun } from './StepSun';
import { Icon } from './Icon';
import { Mascot } from '../mascot/MascotView';
import { Activity as Entry } from '../activity/activity';
import { toDateKey } from '../../shared/dates';
const today = () => toDateKey(new Date());
export type HomeDestination = 'workouts' | 'plan' | 'steps';
export type HomePlan = {
  id: string;
  date: string;
  name: string;
  minutes?: number;
  exercises?: number;
  time?: string | null;
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
        <StepSun size={126} steps={3150} />
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
  onAccount,
}: {
  entries: Entry[];
  plans?: HomePlan[];
  workouts?: WorkoutMetric[];
  go: (route: HomeDestination) => void;
  onLog: (date: string) => void;
  error: boolean;
  retry: () => void;
  onAccount?: () => void;
}) {
  const date = today();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const records = entries.filter(e => e.date === date);
  const planned = plans.find(p => p.date === date);
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
        {onAccount && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Account"
            onPress={onAccount}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#e6c9b7',
                backgroundColor: '#f5e4d7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="profile" size={20} color="#a65536" />
            </View>
          </Pressable>
        )}
      </View>
      {/* The week calendar lives in Plan; Home shows only today (team decision 2026-11-28). */}
      <Text style={s.heading}>
        Today,{' '}
        {new Date(date + 'T12:00:00').toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
        })}
      </Text>
      <View
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setStageSize(previous =>
            previous.width === width && previous.height === height
              ? previous
              : { width, height },
          );
        }}
        style={[
          s.card,
          {
            backgroundColor: 'transparent',
            borderRadius: 30,
            gap: 10,
          },
        ]}
      >
        {planned && (
          <Svg
            pointerEvents="none"
            width={stageSize.width}
            height={stageSize.height}
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            <Rect
              width={stageSize.width}
              height={stageSize.height}
              rx={30}
              fill="#29483b"
            />
          </Svg>
        )}
        {planned && (
          <Text style={{ color: '#d1dfbd', fontSize: 13 }}>
            Scheduled{planned.time ? ` · ${planned.time}` : ''}
          </Text>
        )}
        {!planned && records.length > 0 && (
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Saved on this day.
          </Text>
        )}
        <Text style={[s.title, planned && { color: '#fff9ec' }]}>
          {error
            ? 'Activity couldn’t be loaded.'
            : planned
            ? planned.name
            : records.length
            ? records[0].name
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
                <Text style={[s.heading, planned && { color: '#fff9ec' }]}>
                  {e.name}
                </Text>
                <Text style={[s.body, planned && { color: '#d1dfbd' }]}>
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
                quiet
                inverse={Boolean(planned)}
                label="Log activity"
                onPress={() => onLog(date)}
              />
            </View>
          </>
        )}
      </View>
      <Text style={[s.heading, { marginTop: 10 }]}>Today’s activity</Text>
      <ActivitySection workouts={workouts} onSteps={() => go('steps')} />
    </View>
  );
}
