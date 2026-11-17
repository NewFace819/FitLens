import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cameraScene } from './prototypeAssets';

export function CameraScreen({ onBack }: { onBack: () => void }) {
  const [ready, setReady] = useState(true);
  const [mirror, setMirror] = useState(false);
  return (
    <View style={{ gap: 18 }}>
      <Text style={s.caption}>UPPER BODY SET 01 / 03</Text>
      <Text style={s.title}>Lateral Raise</Text>
      <View style={s.frame}>
        <View style={s.top}>
          <Text style={s.badge}>CAMERA OFF · PREVIEW</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mirror preview"
            accessibilityState={{ selected: mirror }}
            onPress={() => setMirror(!mirror)}
            style={s.flip}
          >
            <Text style={s.badge}>⇄</Text>
          </Pressable>
        </View>
        <View style={{ transform: [{ scaleX: mirror ? -1 : 1 }] }}>
          <SvgXml xml={cameraScene} width="100%" height={360} />
        </View>
        <View style={s.status}>
          <Text style={s.statusIcon}>{ready ? '✓' : '↔'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{ready ? 'Ready' : 'Step back'}</Text>
            <Text style={s.body}>
              {ready
                ? 'Full body and weights in view.'
                : 'Bring your feet into view.'}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 32 }}>
        <View>
          <Text style={s.caption}>WEIGHT</Text>
          <Text style={s.title}>
            5 <Text style={s.body}>kg / hand</Text>
          </Text>
        </View>
        <View>
          <Text style={s.caption}>TARGET</Text>
          <Text style={s.title}>
            12–15 <Text style={s.body}>reps</Text>
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        style={[s.button, { backgroundColor: '#efa579' }]}
      >
        <Text style={s.label}>Start Set ▷</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onBack} style={s.outline}>
        <Text style={s.label}>Back to workout</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => setReady(!ready)}
        style={s.outline}
      >
        <Text style={s.label}>
          {ready ? 'Preview framing adjustment' : 'Preview ready state'}
        </Text>
      </Pressable>
      <Text style={s.note}>Illustrated placeholder · Camera is off</Text>
    </View>
  );
}
const s = StyleSheet.create({
  caption: { fontSize: 10, letterSpacing: 2, color: '#71806f' },
  title: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '700',
    color: '#27362d',
    letterSpacing: -1,
  },
  body: { color: '#65765f', lineHeight: 21, fontSize: 13 },
  frame: { borderRadius: 28, backgroundColor: '#e5eddf', overflow: 'hidden' },
  top: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: { color: '#526454', fontSize: 10, letterSpacing: 1 },
  flip: { padding: 12, backgroundColor: '#f7f6f2', borderRadius: 25 },
  status: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  statusIcon: { color: '#527153', fontSize: 24 },
  label: { fontWeight: '600', color: '#344d3d', fontSize: 14 },
  tips: { padding: 18, borderRadius: 20, backgroundColor: '#eeefe8', gap: 8 },
  note: { fontSize: 12, lineHeight: 18, color: '#7a8474', textAlign: 'center' },
  outline: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd6c5',
  },
  button: {
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#344d3d',
    borderRadius: 18,
  },
});
