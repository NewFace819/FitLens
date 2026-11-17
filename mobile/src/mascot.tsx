import React, { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  SvgXml,
} from 'react-native-svg';
import * as art from './prototypeAssets';
const moods = {
  happy: art.happy,
  calm: art.calm,
  content: art.content,
  energized: art.energized,
  waiting: art.waiting,
  tired: art.tired,
  exhausted: art.exhausted,
  concerned: art.concerned,
};
export type MascotMood = keyof typeof moods;
let mood: MascotMood = 'happy';
const listeners = new Set<() => void>();
export function setMascotMood(next: MascotMood) {
  if (!(next in moods)) return;
  mood = next;
  listeners.forEach(fn => fn());
}
export function Mascot() {
  const value = useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => mood,
  );
  return (
    <View
      accessible
      accessibilityLabel={`FitLens mascot: ${value}`}
      style={{ alignItems: 'center', height: 92 }}
    >
      <Svg width={280} height={150} style={{ position: 'absolute', top: -30 }}>
        <Defs>
          <RadialGradient id="wash">
            <Stop offset="0" stopColor="#cbded3" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#f7f6f2" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={280} height={150} fill="url(#wash)" />
      </Svg>
      <SvgXml xml={moods[value]} width={130} height={86} />
    </View>
  );
}
