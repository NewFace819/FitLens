import React, { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  SvgXml,
} from 'react-native-svg';
import * as art from '../home/prototypeAssets';
import { getMascotMood } from './mascot';
import { subscribe, getVersion } from '../../shared/storage';
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
export function Mascot() {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const value = getMascotMood();
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
