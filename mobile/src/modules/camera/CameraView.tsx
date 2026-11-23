import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cameraScene } from '../home/prototypeAssets';
import { Icon } from '../home/Icon';
export function CameraScreen({
  onBack,
  exerciseId,
  targetReps,
}: {
  onBack: () => void;
  exerciseId?: string;
  targetReps?: number;
}) {
  const [ready, setReady] = useState(true),
    [mirror, setMirror] = useState(false);
  const { height } = useWindowDimensions();
  const name = exerciseId
    ? exerciseId
        .split('-')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    : 'Lateral Raise';
  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={s.circle}
        >
          <Icon name="left" size={18} />
        </Pressable>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.eyebrow}>CAMERA SETUP · PREVIEW</Text>
          <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit>
            {name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mirror preview"
          accessibilityState={{ selected: mirror }}
          onPress={() => setMirror(!mirror)}
          style={s.circle}
        >
          <Text style={{ fontSize: 22, color: '#344b3d' }}>⇄</Text>
        </Pressable>
      </View>
      <View
        style={[
          s.frame,
          { height: Math.max(320, Math.min(510, height - 365)) },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ scaleX: mirror ? -1 : 1 }] },
          ]}
        >
          <SvgXml
            xml={cameraScene}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid slice"
          />
        </View>
        <View style={s.frameTop}>
          <Text style={s.preview}>● PREVIEW</Text>
          <Text style={s.front}>Front view</Text>
        </View>
        <View pointerEvents="none" style={s.guides}>
          {[s.tl, s.tr, s.bl, s.br].map((position, i) => (
            <View
              key={i}
              style={[
                s.corner,
                position,
                { borderColor: ready ? '#e4edce' : '#f4bf8e' },
              ]}
            />
          ))}
        </View>
        <View
          accessibilityRole="alert"
          style={[s.status, { backgroundColor: ready ? '#245a42' : '#b94024' }]}
        >
          <View
            style={[
              s.statusDot,
              { backgroundColor: ready ? '#d8ecac' : '#ffe0a8' },
            ]}
          >
            <Text
              style={{ fontSize: 24, color: ready ? '#245a42' : '#9b331d' }}
            >
              {ready ? '✓' : '↔'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.statusTitle}>{ready ? 'Ready' : 'Step back'}</Text>
            <Text style={s.statusText}>
              {ready
                ? 'Full body and weights in view.'
                : 'Bring your feet into view.'}
            </Text>
          </View>
        </View>
      </View>
      <View style={s.summary}>
        <View style={{ gap: 6 }}>
          <Text style={s.eyebrow}>WEIGHT · SAMPLE</Text>
          <Text style={s.value}>
            5 <Text style={s.unit}>kg / hand</Text>
          </Text>
        </View>
        <View style={s.divider} />
        <View style={{ gap: 6 }}>
          <Text style={s.eyebrow}>TARGET</Text>
          <Text style={s.value}>
            {Number.isFinite(targetReps) && targetReps! > 0
              ? targetReps
              : '12–15'}{' '}
            <Text style={s.unit}>reps</Text>
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Alert.alert(
            'Camera preview',
            'This screen is an illustrated UI preview. Camera tracking is not connected yet.',
          )
        }
        style={({ pressed }) => [s.start, pressed && { opacity: 0.8 }]}
      >
        <Text style={s.startText}>Start Set ▷</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={{ padding: 12, alignItems: 'center' }}
      >
        <Text style={s.backText}>Back to workout</Text>
      </Pressable>
      <View style={s.demo}>
        <Text style={s.demoLabel}>UI PREVIEW</Text>
        <View
          style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}
        >
          {[true, false].map(state => (
            <Pressable
              key={String(state)}
              accessibilityRole="button"
              accessibilityState={{ selected: ready === state }}
              onPress={() => setReady(state)}
              style={[
                s.demoChip,
                ready === state && { backgroundColor: '#d4dfc9' },
              ]}
            >
              <Text style={s.demoText}>{state ? 'Ready' : 'Adjust view'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.note}>Illustrated placeholder · Camera is off</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  page: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    backgroundColor: '#faf7ed',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 18,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef0e4',
    borderWidth: 1,
    borderColor: '#d9dfd0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#687c66',
    fontWeight: '700',
  },
  title: {
    fontSize: 25,
    color: '#293d34',
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  frame: { overflow: 'hidden', borderRadius: 28, backgroundColor: '#8f9e94' },
  frameTop: {
    position: 'absolute',
    left: 17,
    right: 17,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 10,
    color: '#edf0df',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  front: {
    backgroundColor: '#2d493c70',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    color: '#f0f2e6',
    fontSize: 11,
  },
  guides: { position: 'absolute', left: 22, right: 22, top: 54, bottom: 124 },
  corner: { position: 'absolute', width: 22, height: 22 },
  tl: {
    left: 0,
    top: 0,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 10,
  },
  tr: {
    right: 0,
    top: 0,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderTopRightRadius: 10,
  },
  bl: {
    left: 0,
    bottom: 0,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 10,
  },
  br: {
    right: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 10,
  },
  status: {
    position: 'absolute',
    left: 13,
    right: 13,
    bottom: 13,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#fff8e8',
  },
  statusText: { fontSize: 14, lineHeight: 19, color: '#e1eccf' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    paddingHorizontal: 10,
    paddingVertical: 18,
  },
  value: { fontSize: 26, fontWeight: '700', color: '#293d34' },
  unit: { fontSize: 13, fontWeight: '500', color: '#63735d' },
  divider: { width: 1, height: 32, backgroundColor: '#d8ddcd' },
  start: {
    backgroundColor: '#efa579',
    borderWidth: 1,
    borderColor: '#ffbd96',
    borderRadius: 17,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 10,
  },
  startText: { fontSize: 18, fontWeight: '700', color: '#2d4639' },
  backText: { fontSize: 14, fontWeight: '600', color: '#61755d' },
  demo: { gap: 8, alignItems: 'center', marginTop: 4 },
  demoLabel: { fontSize: 9, letterSpacing: 1.6, color: '#61735b' },
  demoChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9d6bf',
  },
  demoText: { fontSize: 11, color: '#36553c' },
  note: { fontSize: 10, color: '#7a8973' },
});
