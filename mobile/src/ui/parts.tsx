import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export function Button({ label, onPress, kind = 'primary', testID, disabled }: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; testID?: string; disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[kind], disabled && styles.disabled]}>
      <Text style={[styles.buttonText, kind === 'primary' && styles.buttonTextPrimary, kind === 'danger' && styles.buttonTextDanger]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle} accessibilityRole="header">{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h1} accessibilityRole="header">{title}<Text style={styles.dot}>.</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: '#e8eddc', borderColor: colors.line },
  danger: { backgroundColor: colors.blushSoft, borderColor: '#efc9bb' },
  disabled: { opacity: 0.45 },
  buttonText: { fontSize: 14, fontWeight: '900', color: colors.ink },
  buttonTextPrimary: { color: colors.white },
  buttonTextDanger: { color: colors.danger },
  chip: { backgroundColor: colors.accentSoft, borderColor: colors.line, borderWidth: 1, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 12 },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  chipTextOn: { color: colors.white },
  backdrop: { flex: 1, backgroundColor: '#18382c66', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, maxHeight: '85%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: colors.ink },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e3ead8', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: colors.ink, fontWeight: '900' },
  heading: { paddingTop: 12, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 2, color: colors.muted },
  h1: { fontSize: 34, fontWeight: '900', color: colors.ink, marginTop: 6 },
  dot: { color: colors.accent },
});
