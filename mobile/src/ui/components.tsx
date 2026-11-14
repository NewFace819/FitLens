import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgCss } from 'react-native-svg/css';
import { router } from 'expo-router';
import { MASCOT_SVG, type MascotMood } from './mascot-svgs';
import { colors, radius, space, type } from './theme';

export function Mascot({ mood, size = 64 }: { mood: MascotMood; size?: number }) {
  return <SvgCss xml={MASCOT_SVG[mood]} width={size} height={(size * 145) / 220} />;
}

/** Top bar: back button, centred eyebrow title, optional right action. */
export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        ‹
      </IconButton>
      <Text style={[type.eyebrow, styles.topTitle]}>{title}</Text>
      <View style={styles.topRight}>{right}</View>
    </View>
  );
}

export function IconButton({ children, label, onPress }: { children: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Text style={styles.iconText}>{children}</Text>
    </Pressable>
  );
}

export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  disabled?: boolean;
  trailing?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, trailing, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant !== 'primary' && variant !== 'danger' && styles.buttonTextDark]}>
        {title}
      </Text>
      {trailing ? (
        <Text style={[styles.buttonText, variant !== 'primary' && variant !== 'danger' && styles.buttonTextDark]}>
          {trailing}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'green',
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'green' | 'blush';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && (tone === 'green' ? styles.chipSelected : styles.chipBlush),
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.chipText, selected && tone === 'green' && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Bottom sheet matching the prototype's sheets (grip, title, × button). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.grip} />
        <View style={styles.sheetHeader}>
          <Text style={[type.h2, { flex: 1 }]} accessibilityRole="header">
            {title}
          </Text>
          <IconButton label="Close" onPress={onClose}>
            ×
          </IconButton>
        </View>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: space.xl }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/** Row with a chevron, used in settings lists. */
export function ListRow({ label, onPress, detail }: { label: string; onPress: () => void; detail?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={[type.body, { flex: 1 }]}>{label}</Text>
      {detail ? <Text style={type.caption}>{detail}</Text> : null}
      <Text style={[type.h3, { color: colors.muted, marginLeft: space.sm }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  topTitle: { flex: 1, textAlign: 'center' },
  topRight: { minWidth: 44, alignItems: 'flex-end' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  iconText: { fontSize: 24, color: colors.ink, lineHeight: 28 },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primary: { backgroundColor: colors.accent },
  danger: { backgroundColor: colors.danger },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  text: { backgroundColor: 'transparent', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  buttonTextDark: { color: colors.ink },
  chip: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipBlush: { backgroundColor: colors.blushSoft, borderColor: colors.blush },
  chipText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  chipTextSelected: { color: colors.white },
  overlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    maxHeight: '88%',
  },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: space.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
