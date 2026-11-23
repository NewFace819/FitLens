import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
export const colors = {
  paper: '#f7f6f2',
  ink: '#294638',
  muted: '#596b55',
  rule: '#cdd6c5',
  selection: '#e3ead9',
  primary: '#29483b',
};
export const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '600', color: colors.ink },
  heading: { fontSize: 19, fontWeight: '600', color: colors.ink },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.selection,
    gap: 14,
  },
  input: {
    backgroundColor: '#fffef9',
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
  },
});
export function Button({
  label,
  onPress,
  quiet = false,
  disabled = false,
  inverse = false,
}: {
  label: string;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  inverse?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: quiet
          ? 'transparent'
          : inverse
          ? '#fff9ec'
          : colors.primary,
        opacity: disabled || pressed ? 0.5 : 1,
      })}
    >
      <Text
        style={{
          color: inverse
            ? quiet
              ? '#d1dfbd'
              : colors.primary
            : quiet
            ? colors.ink
            : '#fff9ec',
          fontSize: 14,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
