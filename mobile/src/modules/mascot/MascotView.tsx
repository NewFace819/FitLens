import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  Text,
  View,
} from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  SvgXml,
} from 'react-native-svg';
import * as art from '../home/prototypeAssets';
import { getMascotMood } from './mascot';
import { getStrength } from './strength';
import { subscribe, getVersion } from '../../shared/storage';
import type { Mood } from '../../shared/constants';
const moods: Record<Mood, string> = {
  happy: art.happy,
  calm: art.calm,
  content: art.content,
  energized: art.energized,
  waiting: art.waiting,
  tired: art.tired,
  exhausted: art.exhausted,
  concerned: art.concerned,
};
const washes: Record<Mood, string> = {
  happy: '#c7def2',
  calm: '#d9e5cb',
  content: '#d7e4ce',
  energized: '#fae0a6',
  waiting: '#ddddec',
  tired: '#f4ddc1',
  exhausted: '#f3d3b7',
  concerned: '#e8d1ba',
};
export function Mascot() {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const base = getMascotMood();
  const strength = getStrength();
  const [reaction, setReaction] = useState<{ base: Mood; mood: Mood } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movement = useRef(new Animated.Value(0)).current;
  const reducedMotion = useRef(true);
  const value = reaction?.base === base ? reaction.mood : base;
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (active) reducedMotion.current = enabled;
    });
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        reducedMotion.current = enabled;
      },
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    setReaction(null);
    if (timer.current) clearTimeout(timer.current);
    movement.stopAnimation();
    movement.setValue(0);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      movement.stopAnimation();
    };
  }, [base, movement]);
  function react() {
    if (timer.current) clearTimeout(timer.current);
    const gentle = ['tired', 'exhausted', 'concerned'].includes(base);
    setReaction({ base, mood: gentle ? 'calm' : 'energized' });
    movement.stopAnimation();
    movement.setValue(0);
    if (!reducedMotion.current)
      Animated.sequence([
        Animated.timing(movement, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(movement, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    timer.current = setTimeout(() => {
      setReaction(null);
      timer.current = null;
    }, 950);
  }
  return (
    <View style={{ alignItems: 'center', height: 92 }}>
      <Svg
        pointerEvents="none"
        width={280}
        height={150}
        style={{ position: 'absolute', top: -30 }}
      >
        <Defs>
          <RadialGradient id="mascot-wash">
            <Stop offset="0" stopColor={washes[value]} stopOpacity={0.9} />
            <Stop offset="1" stopColor="#f7f6f2" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={280} height={150} fill="url(#mascot-wash)" />
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`FitLens mascot: ${value}`}
        accessibilityValue={{ text: `Strength level ${strength.level}, ${strength.name}` }}
        accessibilityHint="Tap to say hello. The expression returns to your latest check-in mood."
        onPress={react}
        style={{
          width: 170,
          height: 92,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            transform: [
              {
                translateY: movement.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5],
                }),
              },
              {
                rotate: movement.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-3deg', '4deg'],
                }),
              },
            ],
          }}
        >
          <SvgXml xml={moods[value]} width={130} height={86} />
        </Animated.View>
        <View
          testID="mascot-level"
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 4,
            bottom: 0,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: '#f6e3c8',
            borderWidth: 1,
            borderColor: '#e2bf8f',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#8a5418' }}>
            Lv {strength.level}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
