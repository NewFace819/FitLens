import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { buildContinuousRectPath } from './settings-icons';

// Settings Design System Palette (neutral reference-sampled + approved FitLens Blue)
export const SETTINGS_COLORS = {
  bg: '#F2F1F6',
  card: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#636366',
  separator: '#E5E5EA',
  accentBlue: '#4F68D5',
  accentBlueLight: '#EEF2FF',
  border: 'rgba(0, 0, 0, 0.05)',
  pressed: '#E5E5EA',
  backdropSoft: '#F2F1F6',
  errorBg: '#FEE2E2',
  errorText: '#DC2626',
};

// -------------------------------------------------------------------
// Component: Continuous Surface (Resizable Squircle Card / Inset Group)
// -------------------------------------------------------------------
interface ContinuousSurfaceProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  backgroundColor?: string;
  borderColor?: string;
}

export function ContinuousSurface({
  children,
  style,
  radius = 18,
  backgroundColor = SETTINGS_COLORS.card,
  borderColor = SETTINGS_COLORS.border,
}: ContinuousSurfaceProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const path =
    size && size.width > 0 && size.height > 0
      ? buildContinuousRectPath(size.width, size.height, radius)
      : null;

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
      }}
      style={[
        styles.base,
        { borderRadius: radius },
        size ? styles.transparent : { backgroundColor },
        style,
      ]}
    >
      {size && path ? (
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path
            d={path}
            fill={backgroundColor}
            stroke={borderColor}
            strokeWidth={StyleSheet.hairlineWidth}
          />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { position: 'relative', overflow: 'hidden' },
  transparent: { backgroundColor: 'transparent' },
});
