import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
export function Icon({
  name,
  size = 22,
  color = '#52634e',
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'home' ? (
        <Path d="m3 10 9-7 9 7v10H15v-7H9v7H3Z" />
      ) : name === 'workouts' ? (
        <Path d="m8 8 8 8M5 10l5-5m4 14 5-5M3 8l5-5m8 18 5-5" />
      ) : name === 'plan' ? (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={3} />
          <Path d="M7 3v5m10-5v5M3 11h18" />
        </>
      ) : name === 'insights' ? (
        <Path d="M4 20V12m6 8V8m6 12v-6m5 6V4" />
      ) : name === 'profile' ? (
        <>
          <Circle cx={12} cy={7.2} r={3.2} />
          <Path d="M5.1 20v-2.1c0-3.4 2.8-5.8 6.9-5.8s6.9 2.4 6.9 5.8V20Z" />
        </>
      ) : name === 'check' ? (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={5} />
          <Path d="m7 12 3 3 7-8" />
        </>
      ) : (
        <Path d={name === 'left' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'} />
      )}
    </Svg>
  );
}
