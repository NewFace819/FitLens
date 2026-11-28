/** The one safety notice (#45). Text lives in shared/safety.ts; screens only place this component. */
import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { SAFETY_NOTICE } from '../shared/safety';
import { type } from './theme';

export default function SafetyNotice({ style }: { style?: StyleProp<TextStyle> }) {
  return (
    <Text testID="safety-notice" accessibilityRole="text" style={[type.caption, style]}>
      {SAFETY_NOTICE}
    </Text>
  );
}
