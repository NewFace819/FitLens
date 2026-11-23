import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  ClipPath,
  Path,
  Rect,
} from 'react-native-svg';
/** Native counterpart of the prototype sun: a warm orb behind the usual-day mist. */
export function StepSun({
  size = 126,
  steps = 3150,
}: {
  size?: number;
  steps?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="sun-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#f9edbc" />
            <Stop offset="1" stopColor="#efb626" />
          </LinearGradient>
          <ClipPath id="sun-circle">
            <Circle cx={70} cy={70} r={68} />
          </ClipPath>
        </Defs>
        <Circle cx={70} cy={70} r={68} fill="url(#sun-fill)" />
        <Path
          d="M0 72 Q35 60 70 73 T140 70 V140 H0Z"
          fill="#f2bf35"
          clipPath="url(#sun-circle)"
        />
        <Rect
          width={140}
          height={49}
          fill="#e4ecd9"
          opacity={0.72}
          clipPath="url(#sun-circle)"
        />
        <Path
          d="M9 52Q70 48 131 52"
          stroke="#fff3b0"
          opacity={0.7}
          fill="none"
        />
      </Svg>
      <Text style={{ fontSize: 11, color: '#84682d', marginTop: 24 }}>
        STEPS
      </Text>
      <Text
        style={{
          fontSize: size * 0.23,
          fontWeight: '700',
          color: '#62491f',
          letterSpacing: -1,
        }}
      >
        {steps.toLocaleString('en')}
      </Text>
    </View>
  );
}
