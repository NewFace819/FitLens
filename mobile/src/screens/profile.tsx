/**
 * Profile & Settings Screen — OWNER: Thông.
 * Native Settings screen with local profile and plan editors.
 *
 * Implements:
 * 1. Settings Overview:
 *    - Inset FitLens Account card with mascot and local name editor.
 *    - 3 Inset Groups (TRAINING, CONNECTIONS, INFORMATION) with 5 rows.
 *    - Continuous superellipse corners for card and grouped surfaces.
 *    - Squircle icon tiles with subtle vertical gradients and Lucide SVGs.
 *    - Clean neutral background (#F2F1F6), pure white surfaces (#FFFFFF),
 *      near-black primary text (#1C1C1E), neutral secondary text (#636366),
 *      and aligned separators (#E5E5EA).
 * 2. Training Plan Editor:
 *    - Full-page editor for goal, experience, days per week, and duration.
 *    - Represents saved duration accurately (including custom values like 25 min).
 *    - Submits ONLY changed fields on Save, preserving unmodified fields.
 * 3. Equipment & Areas to Avoid Editor:
 *    - Full-page editor with multi-select equipment and region sections.
 *    - Submits ONLY changed fields on Save, supporting empty selections.
 * 4. Health Connect Status Page:
 *    - Non-intrusive checking without prompting, direct deep link to system settings.
 *    - Auto-refreshes status on screen focus and app resume.
 * 5. Privacy & Data Page:
 *    - Explains local storage, permissions, and zero cloud retention in plain language.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  LiquidGlassView,
  getGlassCapabilities,
} from 'react-native-liquid-glassmorphism';
import {
  DURATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  REGION_OPTIONS,
  SESSIONS_PER_WEEK_OPTIONS,
  getProfile,
  isValidName,
  normalizeName,
  saveProfileName,
  saveProfilePreferences,
  type Profile,
  type ProfilePreferencesPatch,
} from '../modules/profile/profile';
import {
  nativeHealthConnectAdapter,
  type HealthConnectAdapter,
  type HealthConnectSdkStatus,
} from '../modules/health/health-connect';
import { useAppFocusEffect, useAppNavigation, useScopedBackHandler } from '../navigation';
import { type Equipment, type Experience, type Goal, type Region } from '../shared/constants';
import {
  SettingsIconKind,
  SquircleIconTile,
} from '../ui/settings-icons';

import { ContinuousSurface, SETTINGS_COLORS } from '../ui/settings-surface';

export { ContinuousSurface, SETTINGS_COLORS } from '../ui/settings-surface';

type SettingsView = 'overview' | 'preferredName' | 'trainingPlan' | 'equipmentAreas' | 'healthConnect' | 'privacy';

interface ProfileScreenProps {
  healthConnectAdapter?: HealthConnectAdapter;
  forceSolidFallback?: boolean;
}

// -------------------------------------------------------------------
// Component: Up and Down Chevrons (chevron.up.chevron.down SF Symbol)
// -------------------------------------------------------------------
export function UpAndDownChevron({
  size = 12,
  color = '#8E8E93',
  style,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg width={size * 0.75} height={size} viewBox="0 0 9 12" style={style}>
      <Path
        d="M 1.5 4.5 L 4.5 1.5 L 7.5 4.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M 1.5 7.5 L 4.5 10.5 L 7.5 7.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// -------------------------------------------------------------------
// Component: Vector Close (Symmetric × with rounded caps)
// -------------------------------------------------------------------
export function VectorClose({
  size = 16,
  color = '#3C3C43',
  strokeWidth = 1.9,
  pathOverride,
  style,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  pathOverride?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" style={style}>
      <Path
        d={pathOverride ?? "M 4.5 4.5 L 11.5 11.5 M 11.5 4.5 L 4.5 11.5"}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// -------------------------------------------------------------------
// Component: Vector Checkmark (Distinct short arm and longer rising arm)
// -------------------------------------------------------------------
export function VectorCheckmark({
  size = 16,
  color = '#007AFF',
  strokeWidth = 1.9,
  pathOverride,
  style,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  pathOverride?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" style={style}>
      <Path
        d={pathOverride ?? "M 3.5 8.2 L 6.8 11.5 L 12.8 4.8"}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function VectorBackArrow({
  size = 24,
  color = SETTINGS_COLORS.textPrimary,
  strokeWidth = 2.4,
  style,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden={true}>
      <Path
        d="m14 5-7 7 7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// -------------------------------------------------------------------
// Component: Account Avatar with Initials
// -------------------------------------------------------------------
/**
 * Derives up to two uppercase initials from a user's name:
 * - 1 word: single initial (e.g. "Huy" -> "H")
 * - Multi-word: first and last initials (e.g. "Đỗ Huy" -> "ĐH", "Nguyễn Văn Nam" -> "NN")
 * - Empty / whitespace: defaults to "FL"
 * Preserves Vietnamese diacritics.
 */
export function getInitials(name?: string | null): string {
  if (!name) return 'FL';
  const trimmed = name.trim();
  if (!trimmed) return 'FL';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'FL';
  if (words.length === 1) {
    return Array.from(words[0])[0].toLocaleUpperCase('vi');
  }
  const firstChar = Array.from(words[0])[0];
  const lastChar = Array.from(words[words.length - 1])[0];
  return (firstChar + lastChar).toLocaleUpperCase('vi');
}

interface AccountAvatarProps {
  name?: string | null;
  size?: number;
}

export function AccountAvatar({ name, size = 52 }: AccountAvatarProps) {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      accessible={false}
      aria-hidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[styles.accountAvatarWrap, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="fl-avatar-grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6C87EC" stopOpacity={1} />
            <Stop offset="100%" stopColor="#4862D0" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#fl-avatar-grad)" />
      </Svg>
      <Text
        style={[styles.avatarText, { fontSize, lineHeight: fontSize + 4 }]}
        accessible={false}
        aria-hidden={true}
      >
        {initials}
      </Text>
    </View>
  );
}

// -------------------------------------------------------------------
// Root Component: Profile & Settings Screen
// -------------------------------------------------------------------
export default function ProfileScreen({
  healthConnectAdapter = nativeHealthConnectAdapter,
  forceSolidFallback,
}: ProfileScreenProps = {}) {
  const nav = useAppNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 360;

  // Navigation state within Settings
  const [currentView, setCurrentView] = useState<SettingsView>('overview');

  // Profile data state
  const [profile, setProfile] = useState<Profile>(() => getProfile());

  // Name editor modal state
  const nameField = useRef<React.ComponentRef<typeof TextInput>>(null);
  const savingName = useRef(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  // Health Connect status state
  const [hcSdkStatus, setHcSdkStatus] = useState<HealthConnectSdkStatus>('unavailable');
  const [hcPermissionGranted, setHcPermissionGranted] = useState(false);
  const [hcChecked, setHcChecked] = useState(false);

  // Reload profile from storage
  const reloadProfile = useCallback(() => {
    const fresh = getProfile();
    setProfile((prev) => {
      if (
        prev.name === fresh.name &&
        prev.goal === fresh.goal &&
        prev.experience === fresh.experience &&
        prev.daysPerWeek === fresh.daysPerWeek &&
        prev.minutes === fresh.minutes &&
        JSON.stringify(prev.equipment) === JSON.stringify(fresh.equipment) &&
        JSON.stringify(prev.avoidRegions) === JSON.stringify(fresh.avoidRegions)
      ) {
        return prev;
      }
      return fresh;
    });
  }, []);

  // Health Connect check without prompting
  const checkHealthConnect = useCallback(async () => {
    try {
      const status = await healthConnectAdapter.getSdkStatus();
      setHcSdkStatus((prev) => (prev !== status ? status : prev));
      if (status === 'available') {
        const hasPermission = await healthConnectAdapter.checkPermission();
        setHcPermissionGranted((prev) => (prev !== hasPermission ? hasPermission : prev));
      } else {
        setHcPermissionGranted(false);
      }
    } catch {
      setHcSdkStatus('unavailable');
      setHcPermissionGranted(false);
    } finally {
      setHcChecked(true);
    }
  }, [healthConnectAdapter]);

  // Refresh data on screen focus
  useAppFocusEffect(
    useCallback(() => {
      reloadProfile();
      checkHealthConnect();
    }, [reloadProfile, checkHealthConnect])
  );

  // Refresh Health Connect on app return from system settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkHealthConnect();
      }
    });
    return () => sub.remove();
  }, [checkHealthConnect]);

  // Handle hardware Back button on Android
  useScopedBackHandler(
    useCallback(() => {
      if (currentView === 'preferredName') {
        if (!savingName.current) {
          Keyboard.dismiss();
          setCurrentView('overview');
        }
        return true;
      }
      if (currentView !== 'overview') {
        setCurrentView('overview');
        reloadProfile();
        return true;
      }
      return false;
    }, [currentView, reloadProfile])
  );

  // Name editor handlers
  const openNameEditor = () => {
    setNameInput(profile.name ?? '');
    setNameError(null);
    setCurrentView('preferredName');
  };

  const closeNameEditor = () => {
    if (savingName.current) return;
    Keyboard.dismiss();
    setCurrentView('overview');
  };

  const handleSaveName = async () => {
    if (savingName.current) return;
    const trimmed = normalizeName(nameInput);
    if (!isValidName(trimmed)) {
      setNameError('Please enter a name between 1 and 40 characters.');
      return;
    }
    savingName.current = true;
    setIsSavingName(true);
    setNameError(null);
    try {
      const ok = await saveProfileName(trimmed);
      if (ok) {
        reloadProfile();
        Keyboard.dismiss();
        setCurrentView('overview');
      } else {
        setNameError('Could not save name. Please try again.');
      }
    } catch {
      setNameError('Could not save name. Please try again.');
    } finally {
      savingName.current = false;
      setIsSavingName(false);
    }
  };

  if (currentView === 'preferredName') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={[styles.editorTopBar, styles.subpageTopBar]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Settings"
            accessibilityState={{ disabled: isSavingName }}
            disabled={isSavingName}
            onPress={closeNameEditor}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <View style={styles.subpageBackFace}>
              <VectorBackArrow size={22} strokeWidth={2.2} />
            </View>
          </Pressable>
          <Text style={styles.editorNavTitle} accessibilityRole="header" numberOfLines={1}>
            Preferred Name
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.editorScrollContent} keyboardShouldPersistTaps="handled">
          <ContinuousSurface
            radius={24}
            borderColor={nameError ? SETTINGS_COLORS.errorText : SETTINGS_COLORS.border}
            style={styles.preferredNameField}
          >
            <TextInput
              ref={nameField}
              style={styles.preferredNameInput}
              value={nameInput}
              onChangeText={(value) => {
                setNameInput(value);
                setNameError(null);
              }}
              onSubmitEditing={handleSaveName}
              placeholder="Enter your name"
              placeholderTextColor={SETTINGS_COLORS.textSecondary}
              cursorColor={SETTINGS_COLORS.accentBlue}
              selectionColor={SETTINGS_COLORS.accentBlue}
              returnKeyType="done"
              submitBehavior="submit"
              editable={!isSavingName}
              accessibilityState={{ busy: isSavingName }}
              maxLength={40}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Preferred name"
            />
            {isSavingName ? (
              <ActivityIndicator color={SETTINGS_COLORS.accentBlue} style={styles.nameFieldAction} />
            ) : nameInput.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear name"
                onPress={() => {
                  setNameInput('');
                  setNameError(null);
                  nameField.current?.focus();
                }}
                style={({ pressed }) => [styles.nameFieldAction, pressed && styles.pressed]}
              >
                <View style={styles.nameClearFace}>
                  <VectorClose size={14} color={SETTINGS_COLORS.textPrimary} strokeWidth={1.8} />
                </View>
              </Pressable>
            ) : null}
          </ContinuousSurface>
          <Text style={styles.editorSectionFooter}>Your preferred name across FitLens</Text>
          {nameError ? (
            <Text style={[styles.editorSectionFooter, styles.nameFieldError]} accessibilityLiveRegion="polite">
              {nameError}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Trailing label for Health Connect row
  const getHealthConnectRowDetail = (): string => {
    if (!hcChecked) return '';
    if (hcSdkStatus === 'available') {
      return hcPermissionGranted ? 'Connected' : 'Not connected';
    }
    if (hcSdkStatus === 'provider-update-required') {
      return 'Update needed';
    }
    return 'Unavailable';
  };

  // -------------------------------------------------------------
  // Sub-view: Training Plan Editor
  // -------------------------------------------------------------
  if (currentView === 'trainingPlan') {
    return (
      <TrainingPlanEditor
        initialProfile={profile}
        forceSolidFallback={forceSolidFallback}
        onCancel={() => {
          setCurrentView('overview');
          reloadProfile();
        }}
        onSaved={() => {
          setCurrentView('overview');
          reloadProfile();
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // Sub-view: Equipment & Areas to Avoid Editor
  // -------------------------------------------------------------
  if (currentView === 'equipmentAreas') {
    return (
      <EquipmentAreasEditor
        initialProfile={profile}
        onCancel={() => {
          setCurrentView('overview');
          reloadProfile();
        }}
        onSaved={() => {
          setCurrentView('overview');
          reloadProfile();
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // Sub-view: Health Connect Focused Status Page
  // -------------------------------------------------------------
  if (currentView === 'healthConnect') {
    return (
      <HealthConnectStatusPage
        sdkStatus={hcSdkStatus}
        permissionGranted={hcPermissionGranted}
        adapter={healthConnectAdapter}
        onBack={() => {
          setCurrentView('overview');
          checkHealthConnect();
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // Sub-view: Privacy & Data Page
  // -------------------------------------------------------------
  if (currentView === 'privacy') {
    return (
      <PrivacyDataPage
        onBack={() => {
          setCurrentView('overview');
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // Default View: Settings Overview
  // -------------------------------------------------------------
  const hasName = typeof profile.name === 'string' && profile.name.trim().length > 0;
  const primaryAccountTitle = hasName ? profile.name.trim() : 'FitLens Account';
  const supportingAccountSubtitle = hasName ? 'FitLens Account' : 'Set up your profile name';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollCompact]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Large Navigation Title */}
        <Text style={[styles.screenTitle, isCompact && styles.screenTitleCompact]} accessibilityRole="header">
          Settings
        </Text>

        {/* FitLens Account Card with Continuous Corners */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${primaryAccountTitle}, ${supportingAccountSubtitle}`}
          onPress={openNameEditor}
          style={({ pressed }) => [styles.accountCardWrap, pressed && styles.cardPressed]}
        >
          <ContinuousSurface radius={18} style={styles.accountCardInner}>
            <AccountAvatar name={profile.name} size={52} />
            <View style={styles.accountTextContainer}>
              <Text style={styles.accountName} numberOfLines={1}>
                {primaryAccountTitle}
              </Text>
              <Text style={styles.accountSubtitle} numberOfLines={1}>
                {supportingAccountSubtitle}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </ContinuousSurface>
        </Pressable>

        {/* Group 1: TRAINING */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>TRAINING</Text>
          <ContinuousSurface radius={18}>
            <SettingsRow
              kind="plan"
              label="Training Plan"
              onPress={() => setCurrentView('trainingPlan')}
              showDivider={true}
              isFirst={true}
            />
            <SettingsRow
              kind="equipment"
              label="Equipment & Areas to Avoid"
              onPress={() => setCurrentView('equipmentAreas')}
              showDivider={false}
              isLast={true}
            />
          </ContinuousSurface>
        </View>

        {/* Group 2: CONNECTIONS */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>CONNECTIONS</Text>
          <ContinuousSurface radius={18}>
            <SettingsRow
              kind="health"
              label="Health Connect"
              detail={getHealthConnectRowDetail()}
              onPress={() => setCurrentView('healthConnect')}
              showDivider={true}
              isFirst={true}
            />
            <SettingsRow
              kind="reminders"
              label="Reminders"
              onPress={() => nav.navigate('Reminders')}
              showDivider={false}
              isLast={true}
            />
          </ContinuousSurface>
        </View>

        {/* Group 3: INFORMATION */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>INFORMATION</Text>
          <ContinuousSurface radius={18}>
            <SettingsRow
              kind="privacy"
              label="Privacy & Data"
              onPress={() => setCurrentView('privacy')}
              showDivider={false}
              isFirst={true}
              isLast={true}
            />
          </ContinuousSurface>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

// -------------------------------------------------------------------
// Component: Single Row inside Inset Groups
// -------------------------------------------------------------------
interface SettingsRowProps {
  kind: SettingsIconKind;
  label: string;
  detail?: string;
  onPress: () => void;
  showDivider?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

function SettingsRow({
  kind,
  label,
  detail,
  onPress,
  showDivider,
  isFirst,
  isLast,
}: SettingsRowProps) {
  const { width: screenWidth, fontScale } = useWindowDimensions();
  // Stack status below label at narrow widths (< 360 dp, e.g. 320 dp) or with enlarged text (fontScale >= 1.2)
  const shouldStackDetail = Boolean(
    detail && (screenWidth < 360 || fontScale >= 1.2)
  );

  const cornerStyle =
    isFirst && isLast
      ? styles.rowSingle
      : isFirst
        ? styles.rowFirst
        : isLast
          ? styles.rowLast
          : null;

  return (
    <View style={[styles.rowWrapper, cornerStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={detail ? `${label}, ${detail}` : label}
        onPress={onPress}
        style={({ pressed }) => [styles.rowPressable, cornerStyle, pressed && styles.rowPressed]}
      >
        <View style={styles.rowIconContainer}>
          <SquircleIconTile kind={kind} size={30} />
        </View>
        <View style={styles.rowTextColumn}>
          <Text style={styles.rowLabel} numberOfLines={2}>
            {label}
          </Text>
          {detail && shouldStackDetail ? (
            <Text style={styles.rowDetailStacked} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        {detail && !shouldStackDetail ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      {showDivider ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

// -------------------------------------------------------------------
// Editor: Training Plan Full-Page Editor
// -------------------------------------------------------------------
interface TrainingPlanEditorProps {
  initialProfile: Profile;
  onCancel: () => void;
  onSaved: () => void;
  forceSolidFallback?: boolean;
}

function TrainingPlanEditor({
  initialProfile,
  onCancel,
  onSaved,
  forceSolidFallback,
}: TrainingPlanEditorProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };

  const [goal, setGoal] = useState<Goal>(initialProfile.goal ?? 'habit');
  const [experience, setExperience] = useState<Experience>(initialProfile.experience ?? 'beginner');
  const [daysPerWeek, setDaysPerWeek] = useState<number>(initialProfile.daysPerWeek ?? 3);
  const [minutes, setMinutes] = useState<number>(initialProfile.minutes ?? 30);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // In-place choice menu state
  const [openMenu, setOpenMenu] = useState<'sessions' | 'duration' | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    which: 'sessions' | 'duration';
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [panelSize, setPanelSize] = useState<{ width: number; height: number } | null>(null);

  const sessionsTriggerRef = useRef<any>(null);
  const durationTriggerRef = useRef<any>(null);

  const isNativeSupported = useRef(() => {
    try {
      const caps = getGlassCapabilities();
      return caps.supported && caps.supportsRefraction;
    } catch {
      return false;
    }
  }).current();

  const [useNativeGlass, setUseNativeGlass] = useState(isNativeSupported && !forceSolidFallback);

  const handlePipelineReady = useCallback((event: any) => {
    const ne = event?.nativeEvent;
    if (ne && (ne.tier === 'none' || (ne.osVersion >= 33 && !ne.shaderCompiled))) {
      setUseNativeGlass(false);
    }
  }, []);

  const closeMenuAndRestoreFocus = useCallback((rowType: 'sessions' | 'duration') => {
    setOpenMenu(null);
    setMenuAnchor(null);
    setPanelSize(null);
    try {
      const target =
        rowType === 'sessions'
          ? sessionsTriggerRef.current
          : durationTriggerRef.current;
      if (target) {
        AccessibilityInfo.sendAccessibilityEvent?.(target as any, 'focus');
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Hardware Back button on Android: dismisses open in-place menu first!
  useScopedBackHandler(
    useCallback(() => {
      if (openMenu !== null) {
        closeMenuAndRestoreFocus(openMenu);
        return true;
      }
      return false;
    }, [openMenu, closeMenuAndRestoreFocus])
  );

  const savedMinutes = initialProfile.minutes ?? 30;
  const isCustomDuration = !DURATION_OPTIONS.includes(savedMinutes as (typeof DURATION_OPTIONS)[number]);

  const durationOptions = useMemo(() => {
    const list: { value: number; label: string; accessibilityLabel: string }[] = [];
    const allDurations = isCustomDuration
      ? Array.from(new Set([...DURATION_OPTIONS, savedMinutes])).sort((a, b) => a - b)
      : [...DURATION_OPTIONS];

    for (const d of allDurations) {
      if (d === savedMinutes && isCustomDuration) {
        list.push({
          value: d,
          label: `${d} min (Current)`,
          accessibilityLabel: `${d} minutes per session, current saved duration`,
        });
      } else {
        list.push({
          value: d,
          label: `${d} min`,
          accessibilityLabel: `${d} minutes per session`,
        });
      }
    }
    return list;
  }, [savedMinutes, isCustomDuration]);

  const openMenuFor = (which: 'sessions' | 'duration') => {
    setOpenMenu(which);
    const target = which === 'sessions' ? sessionsTriggerRef.current : durationTriggerRef.current;
    if (target && typeof target.measureInWindow === 'function') {
      target.measureInWindow((x: number, y: number, width: number, height: number) => {
        setMenuAnchor({ which, x, y, width, height });
      });
    }
    // In Jest / automated test environments where measureInWindow does not fire callbacks:
    if (typeof (globalThis as any).expect === 'function') {
      setMenuAnchor({
        which,
        x: 16,
        y: which === 'sessions' ? 380 : 440,
        width: screenWidth - 32,
        height: 52,
      });
    }
  };

  const openSessionsMenu = () => openMenuFor('sessions');
  const openDurationMenu = () => openMenuFor('duration');

  const getMenuPositionStyle = (): ViewStyle => {
    const minWidth = 176;
    const maxWidth = Math.max(minWidth, screenWidth - 32);

    if (!menuAnchor) {
      return {
        top: 360,
        right: 16,
        minWidth,
        maxWidth,
      };
    }

    const { y, height } = menuAnchor;
    const right = 16;

    const safeTop = insets.top + 56 + 8;
    const safeBottom = screenHeight - insets.bottom - 16;

    const spaceBelow = Math.max(0, safeBottom - (y + height + 6));
    const spaceAbove = Math.max(0, (y - 6) - safeTop);

    const panelHeight = panelSize?.height ?? null;

    if (panelHeight !== null) {
      const fitsBelow = panelHeight <= spaceBelow;
      const fitsAbove = panelHeight <= spaceAbove;

      if (fitsBelow) {
        return {
          top: y + height + 6,
          right,
          minWidth,
          maxWidth,
          maxHeight: spaceBelow,
        };
      } else if (fitsAbove) {
        return {
          bottom: screenHeight - y + 6,
          right,
          minWidth,
          maxWidth,
          maxHeight: spaceAbove,
        };
      } else {
        // Neither fits completely: constrain to side with more space
        if (spaceBelow >= spaceAbove) {
          return {
            top: y + height + 6,
            right,
            minWidth,
            maxWidth,
            maxHeight: spaceBelow,
          };
        } else {
          return {
            bottom: screenHeight - y + 6,
            right,
            minWidth,
            maxWidth,
            maxHeight: spaceAbove,
          };
        }
      }
    }

    // Initial pass before panel onLayout: choose side with more space
    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      return {
        top: y + height + 6,
        right,
        minWidth,
        maxWidth,
        maxHeight: spaceBelow,
      };
    } else {
      return {
        bottom: screenHeight - y + 6,
        right,
        minWidth,
        maxWidth,
        maxHeight: spaceAbove,
      };
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    // Submit ONLY changed fields — preserve non-picker custom values if unchanged
    const patch: ProfilePreferencesPatch = {};
    if (goal !== initialProfile.goal) {
      patch.goal = goal;
    }
    if (experience !== initialProfile.experience) {
      patch.experience = experience;
    }
    if (daysPerWeek !== initialProfile.daysPerWeek) {
      patch.daysPerWeek = daysPerWeek;
    }
    if (minutes !== initialProfile.minutes) {
      patch.minutes = minutes;
    }

    // Opening an editor and saving without changes preserves stored data
    if (Object.keys(patch).length === 0) {
      setIsSaving(false);
      onSaved();
      return;
    }

    try {
      const ok = await saveProfilePreferences(patch);
      if (ok) {
        onSaved();
      } else {
        setSaveError('Could not save training preferences. Please try again.');
      }
    } catch {
      setSaveError('Could not save training preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMenuItems = () => {
    if (openMenu === 'sessions') {
      return SESSIONS_PER_WEEK_OPTIONS.map((days, idx) => {
        const isSelected = daysPerWeek === days;
        return (
          <View key={days}>
            <Pressable
              accessibilityRole="menuitem"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${days} days per week`}
              onPress={() => {
                setDaysPerWeek(days);
                closeMenuAndRestoreFocus('sessions');
              }}
              style={({ pressed }) => [
                styles.menuItemRow,
                pressed && styles.menuItemRowPressed,
              ]}
            >
              <View style={styles.menuItemLeadingCheckWrap}>
                {isSelected ? (
                  <VectorCheckmark size={15} color={SETTINGS_COLORS.accentBlue} strokeWidth={1.8} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.menuItemText,
                  isSelected && styles.menuItemTextSelected,
                ]}
              >
                {days} days
              </Text>
            </Pressable>
            {idx < SESSIONS_PER_WEEK_OPTIONS.length - 1 ? (
              <View style={styles.menuItemDivider} />
            ) : null}
          </View>
        );
      });
    }

    return durationOptions.map((opt, idx) => {
      const isSelected = minutes === opt.value;
      return (
        <View key={opt.value}>
          <Pressable
            accessibilityRole="menuitem"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={opt.accessibilityLabel}
            onPress={() => {
              setMinutes(opt.value);
              closeMenuAndRestoreFocus('duration');
            }}
            style={({ pressed }) => [
              styles.menuItemRow,
              pressed && styles.menuItemRowPressed,
            ]}
          >
            <View style={styles.menuItemLeadingCheckWrap}>
              {isSelected ? (
                <VectorCheckmark size={15} color={SETTINGS_COLORS.accentBlue} strokeWidth={1.8} />
              ) : null}
            </View>
            <Text
              style={[
                styles.menuItemText,
                isSelected && styles.menuItemTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
          {idx < durationOptions.length - 1 ? (
            <View style={styles.menuItemDivider} />
          ) : null}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.editorTopBar, styles.trainingPlanTopBar]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
          onPress={onCancel}
          style={({ pressed }) => [styles.editorHeaderCircleBtn, pressed && styles.pressed]}
          hitSlop={4}
        >
          <EditorActionFace action="cancel" />
        </Pressable>

        <Text
          style={styles.editorNavTitle}
          accessibilityRole="header"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Training Plan
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaving ? 'Saving training plan…' : 'Save training plan'}
          accessibilityState={{ disabled: isSaving, busy: isSaving }}
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.editorHeaderCircleBtn,
            isSaving && styles.disabledBtn,
            pressed && styles.pressed,
          ]}
          hitSlop={4}
        >
          <EditorActionFace action="save" isSaving={isSaving} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.editorScrollContent} keyboardShouldPersistTaps="handled">
        {saveError ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        {/* Section 1: Primary Goal */}
        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>Primary goal</Text>
          <ContinuousSurface radius={22}>
            {GOAL_OPTIONS.map((opt, i) => {
              const isSelected = goal === opt.value;
              return (
                <View key={opt.value}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${opt.title}, ${opt.subtitle}`}
                    onPress={() => setGoal(opt.value)}
                    style={({ pressed }) => [
                      styles.selectableRow,
                      styles.editorSelectionRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.selectableRowText}>
                      <Text style={styles.selectableRowTitle}>
                        {opt.title}
                      </Text>
                      <Text style={styles.selectableRowSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <View style={styles.editorSelectionIndicator}>
                      {isSelected ? (
                        <VectorCheckmark size={18} color={SETTINGS_COLORS.accentBlue} strokeWidth={1.7} />
                      ) : null}
                    </View>
                  </Pressable>
                  {i < GOAL_OPTIONS.length - 1 ? <View style={[styles.innerDivider, styles.editorInsetDivider]} /> : null}
                </View>
              );
            })}
          </ContinuousSurface>
        </View>

        {/* Section 2: Experience Level */}
        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>Experience level</Text>
          <ContinuousSurface radius={22}>
            {EXPERIENCE_OPTIONS.map((opt, i) => {
              const isSelected = experience === opt.value;
              return (
                <View key={opt.value}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${opt.title}, ${opt.subtitle}`}
                    onPress={() => setExperience(opt.value)}
                    style={({ pressed }) => [
                      styles.selectableRow,
                      styles.editorSelectionRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.selectableRowText}>
                      <Text style={styles.selectableRowTitle}>
                        {opt.title}
                      </Text>
                      <Text style={styles.selectableRowSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <View style={styles.editorSelectionIndicator}>
                      {isSelected ? (
                        <VectorCheckmark size={18} color={SETTINGS_COLORS.accentBlue} strokeWidth={1.7} />
                      ) : null}
                    </View>
                  </Pressable>
                  {i < EXPERIENCE_OPTIONS.length - 1 ? <View style={[styles.innerDivider, styles.editorInsetDivider]} /> : null}
                </View>
              );
            })}
          </ContinuousSurface>
        </View>

        {/* Section 3: Schedule & Duration (In-Place Choice Summary Rows) */}
        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>Schedule & duration</Text>
          <ContinuousSurface radius={22}>
            {/* Row 1: Sessions per week */}
            <Pressable
              ref={sessionsTriggerRef}
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel={`Sessions per week, currently ${daysPerWeek} days`}
              accessibilityHint="Double tap to choose sessions per week"
              onPress={openSessionsMenu}
              style={({ pressed }) => [
                styles.menuSummaryRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuSummaryLabel}>Sessions per week</Text>
              <View collapsable={false} style={styles.menuSummaryValueWrap}>
                <Text style={styles.menuSummaryValueText}>{daysPerWeek} days</Text>
                <UpAndDownChevron style={styles.menuDisclosureGlyph} />
              </View>
            </Pressable>

            <View style={[styles.innerDivider, styles.editorInsetDivider]} />

            {/* Row 2: Session duration */}
            <Pressable
              ref={durationTriggerRef}
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel={`Session duration, currently ${minutes} minutes`}
              accessibilityHint="Double tap to choose session duration"
              onPress={openDurationMenu}
              style={({ pressed }) => [
                styles.menuSummaryRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuSummaryLabel}>Session duration</Text>
              <View collapsable={false} style={styles.menuSummaryValueWrap}>
                <Text style={styles.menuSummaryValueText}>
                  {minutes === savedMinutes && isCustomDuration
                    ? `${savedMinutes} min (Current)`
                    : `${minutes} min`}
                </Text>
                <UpAndDownChevron style={styles.menuDisclosureGlyph} />
              </View>
            </Pressable>
          </ContinuousSurface>
        </View>
      </ScrollView>

      {/* Floating In-Place Choice Menu Overlay */}
      {openMenu !== null && menuAnchor !== null && menuAnchor.which === openMenu ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Dismiss backdrop */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
            onPress={() => {
              if (openMenu) {
                closeMenuAndRestoreFocus(openMenu);
              }
            }}
            style={styles.menuDismissBackdrop}
          />

          {/* Floating Menu Surface */}
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setPanelSize((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
            }}
            style={[styles.floatingMenuContainer, getMenuPositionStyle()]}
            accessibilityRole="menu"
          >
            {useNativeGlass && !forceSolidFallback ? (
              <LiquidGlassView
                style={styles.floatingMenuGlassCard}
                borderRadius={14}
                variant="regular"
                tintColor="rgba(255, 255, 255, 0.70)"
                blurRadius={20}
                refraction={true}
                thickness={0.65}
                edgeReflectionStrength={0.25}
                rim={true}
                specular={false}
                interactive={false}
                tilt={false}
                legibilityFloor={0.20}
                onPipelineReady={handlePipelineReady}
                onError={() => setUseNativeGlass(false)}
              >
                <ScrollView
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.floatingMenuInner}
                >
                  {renderMenuItems()}
                </ScrollView>
              </LiquidGlassView>
            ) : (
              <View style={styles.floatingMenuSolidCard}>
                <ScrollView
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.floatingMenuInner}
                >
                  {renderMenuItems()}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// -------------------------------------------------------------------
// Editor: Equipment & Areas to Avoid Editor
// -------------------------------------------------------------------
interface EquipmentAreasEditorProps {
  initialProfile: Profile;
  onCancel: () => void;
  onSaved: () => void;
}

function EditorActionFace({
  action,
  isSaving = false,
}: {
  action: 'cancel' | 'save';
  isSaving?: boolean;
}) {
  const isSave = action === 'save';
  const rimId = `editor-${action}-rim`;

  return (
    <View style={styles.editorActionFace} accessible={false}>
      <Svg width={42} height={42} viewBox="0 0 42 42" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={isSave ? 0.62 : 0.92} />
            <Stop offset="55%" stopColor="#FFFFFF" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={isSave ? 0.36 : 0.78} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={21}
          cy={21}
          r={20.55}
          fill={isSave ? SETTINGS_COLORS.accentBlue : '#F1F1F6'}
          stroke={isSave ? '#4258BB' : '#BFC0C9'}
          strokeWidth={0.65}
        />
        <Circle cx={21} cy={21} r={19.85} fill="none" stroke={`url(#${rimId})`} strokeWidth={0.75} />
      </Svg>
      {isSaving ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : isSave ? (
        <VectorCheckmark
          size={20}
          color="#FFFFFF"
          strokeWidth={1.5}
          pathOverride="M 2.7 8.3 L 6.5 12.5 L 13.4 3.1"
        />
      ) : (
        <VectorClose
          size={20}
          color="#626571"
          strokeWidth={1.45}
          pathOverride="M 3.2 3.2 L 12.8 12.8 M 12.8 3.2 L 3.2 12.8"
        />
      )}
    </View>
  );
}

function EquipmentAreasEditor({ initialProfile, onCancel, onSaved }: EquipmentAreasEditorProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>(() => [
    ...(initialProfile.equipment ?? []),
  ]);
  const [selectedRegions, setSelectedRegions] = useState<Region[]>(() => [
    ...(initialProfile.avoidRegions ?? []),
  ]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hardware Back button on Android: cancels editing and discards draft
  useScopedBackHandler(
    useCallback(() => {
      onCancel();
      return true;
    }, [onCancel])
  );

  const toggleEquipment = (item: Equipment) => {
    setSelectedEquipment((prev) => (prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]));
  };

  const toggleRegion = (region: Region) => {
    setSelectedRegions((prev) => (prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const initialEquip = initialProfile.equipment ?? [];
    const initialAvoid = initialProfile.avoidRegions ?? [];

    const equipChanged =
      selectedEquipment.length !== initialEquip.length ||
      !selectedEquipment.every((e) => initialEquip.includes(e));

    const avoidChanged =
      selectedRegions.length !== initialAvoid.length ||
      !selectedRegions.every((r) => initialAvoid.includes(r));

    // Submit ONLY changed fields
    const patch: ProfilePreferencesPatch = {};
    if (equipChanged) {
      patch.equipment = selectedEquipment;
    }
    if (avoidChanged) {
      patch.avoidRegions = selectedRegions;
    }

    // Opening an editor and saving without changes preserves stored data
    if (Object.keys(patch).length === 0) {
      setIsSaving(false);
      onSaved();
      return;
    }

    try {
      const ok = await saveProfilePreferences(patch);
      if (ok) {
        onSaved();
      } else {
        setSaveError('Could not save preferences. Please try again.');
      }
    } catch {
      setSaveError('Could not save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Top Header matching Training Plan visual hierarchy */}
      <View style={[styles.editorTopBar, styles.trainingPlanTopBar]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
          onPress={onCancel}
          style={({ pressed }) => [styles.editorHeaderCircleBtn, pressed && styles.pressed]}
          hitSlop={4}
        >
          <EditorActionFace action="cancel" />
        </Pressable>

        <Text
          style={styles.editorNavTitle}
          accessibilityRole="header"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Equipment & Areas
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaving ? 'Saving preferences…' : 'Save preferences'}
          accessibilityState={{ disabled: isSaving, busy: isSaving }}
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.editorHeaderCircleBtn,
            isSaving && styles.disabledBtn,
            pressed && styles.pressed,
          ]}
          hitSlop={4}
        >
          <EditorActionFace action="save" isSaving={isSaving} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.editorScrollContent} keyboardShouldPersistTaps="handled">
        {saveError ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        {/* Section 1: Equipment */}
        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>Available equipment</Text>
          <ContinuousSurface radius={22}>
            {EQUIPMENT_OPTIONS.map((opt, i) => {
              const isSelected = selectedEquipment.includes(opt.value);
              return (
                <View key={opt.value}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${opt.label}, ${opt.description}`}
                    onPress={() => toggleEquipment(opt.value)}
                    style={({ pressed }) => [
                      styles.selectableRow,
                      styles.editorSelectionRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.selectableRowText}>
                      <Text style={styles.selectableRowTitle}>{opt.label}</Text>
                      <Text style={styles.selectableRowSubtitle}>{opt.description}</Text>
                    </View>
                    <View style={styles.editorSelectionIndicator}>
                      {isSelected ? (
                        <VectorCheckmark size={18} color={SETTINGS_COLORS.accentBlue} strokeWidth={1.7} />
                      ) : null}
                    </View>
                  </Pressable>
                  {i < EQUIPMENT_OPTIONS.length - 1 ? <View style={[styles.innerDivider, styles.editorInsetDivider]} /> : null}
                </View>
              );
            })}
          </ContinuousSurface>
          <Text style={styles.editorSectionFooter}>
            Select what you have access to. An empty selection defaults to bodyweight exercises.
          </Text>
        </View>

        {/* Section 2: Areas to Avoid */}
        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>Areas to avoid</Text>
          <ContinuousSurface radius={22}>
            {REGION_OPTIONS.map((opt, i) => {
              const isSelected = selectedRegions.includes(opt.value);
              return (
                <View key={opt.value}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`Avoid ${opt.label}`}
                    onPress={() => toggleRegion(opt.value)}
                    style={({ pressed }) => [
                      styles.selectableRow,
                      styles.editorSelectionRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.selectableRowText}>
                      <Text style={styles.selectableRowTitle}>{opt.label}</Text>
                    </View>
                    <View style={styles.editorSelectionIndicator}>
                      {isSelected ? (
                        <VectorCheckmark size={18} color={SETTINGS_COLORS.accentBlue} strokeWidth={1.7} />
                      ) : null}
                    </View>
                  </Pressable>
                  {i < REGION_OPTIONS.length - 1 ? <View style={[styles.innerDivider, styles.editorInsetDivider]} /> : null}
                </View>
              );
            })}
          </ContinuousSurface>
          <Text style={styles.editorSectionFooter}>
            Workouts will automatically avoid exercises that put excessive load on these regions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------------------------------------------------
// Sub-view: Health Connect Focused Status Page
// -------------------------------------------------------------------
interface HealthConnectStatusPageProps {
  sdkStatus: HealthConnectSdkStatus;
  permissionGranted: boolean;
  adapter: HealthConnectAdapter;
  onBack: () => void;
}

function HealthConnectStatusPage({
  sdkStatus,
  permissionGranted,
  adapter,
  onBack,
}: HealthConnectStatusPageProps) {
  const [openingSettings, setOpeningSettings] = useState(false);

  // Hardware Back button on Android: returns to overview
  useScopedBackHandler(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack])
  );

  const handleOpenSettings = async () => {
    setOpeningSettings(true);
    try {
      if (sdkStatus === 'provider-update-required') {
        await adapter.openHealthConnectProvider();
      } else {
        await adapter.openHealthConnectSettings();
      }
    } finally {
      setOpeningSettings(false);
    }
  };

  const status = sdkStatus === 'available'
    ? {
        label: permissionGranted ? 'Connected' : 'Not connected',
        action: 'Open Health Connect Settings',
        actionLabel: 'Open Health Connect settings',
        guidance: permissionGranted ? null : 'You can grant read access in Android settings.',
      }
    : sdkStatus === 'provider-update-required'
      ? {
          label: 'Update needed',
          action: 'Update Health Connect',
          actionLabel: 'Update Health Connect',
          guidance: 'Update Health Connect to manage FitLens access on this device.',
        }
      : {
          label: 'Unavailable',
          action: null,
          actionLabel: null,
          guidance: 'Health Connect is not supported or not installed on this Android device.',
        };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.editorTopBar, styles.subpageTopBar]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          hitSlop={8}
        >
          <View style={styles.subpageBackFace}>
            <VectorBackArrow size={22} strokeWidth={2.2} />
          </View>
        </Pressable>
        <Text style={styles.editorNavTitle} accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail">
          Health Connect
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.editorScrollContent}>
        <View style={styles.editorSection}>
          <ContinuousSurface radius={22}>
            <View style={[styles.healthSettingsRow, styles.healthStatusRow]}>
              <Text style={styles.menuSummaryLabel}>Status</Text>
              <Text style={styles.healthStatusValue}>{status.label}</Text>
            </View>
            {status.action ? (
              <>
                <View style={[styles.innerDivider, styles.editorInsetDivider]} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={openingSettings ? 'Opening…' : status.actionLabel ?? undefined}
                  accessibilityState={{ busy: openingSettings, disabled: openingSettings }}
                  onPress={handleOpenSettings}
                  disabled={openingSettings}
                  style={({ pressed }) => [styles.healthSettingsRow, pressed && styles.pressed]}
                >
                  <Text style={styles.menuSummaryLabel}>{openingSettings ? 'Opening…' : status.action}</Text>
                  <Svg width={10} height={16} viewBox="0 0 10 16" aria-hidden={true}>
                    <Path
                      d="M 3 4 L 7 8 L 3 12"
                      stroke={SETTINGS_COLORS.textSecondary}
                      strokeOpacity={0.7}
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </Pressable>
              </>
            ) : null}
          </ContinuousSurface>
          {status.guidance ? <Text style={styles.editorSectionFooter}>{status.guidance}</Text> : null}
          {sdkStatus === 'available' ? (
            <Text style={styles.editorSectionFooter}>
              FitLens only reads your daily step count. It never writes or modifies Health Connect records.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------------------------------------------------
// Sub-view: Privacy & Data Page
// -------------------------------------------------------------------
interface PrivacyDataPageProps {
  onBack: () => void;
}

function PrivacyDataPage({ onBack }: PrivacyDataPageProps) {
  // Hardware Back button on Android: returns to overview
  useScopedBackHandler(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack])
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.editorTopBar, styles.subpageTopBar]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          hitSlop={8}
        >
          <View style={styles.subpageBackFace}>
            <VectorBackArrow size={22} strokeWidth={2.2} />
          </View>
        </Pressable>
        <Text style={styles.editorNavTitle} accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail">
          Privacy & Data
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.editorScrollContent}>
        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>On this device</Text>
          <ContinuousSurface radius={22}>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowTitle}>Local-First Storage</Text>
              <Text style={styles.infoRowDesc}>
                Your profile, workout history, plans, and settings are saved on this device.
              </Text>
            </View>
          </ContinuousSurface>
        </View>

        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>Permissions and reminders</Text>
          <ContinuousSurface radius={22}>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowTitle}>Health Connect Permissions</Text>
              <Text style={styles.infoRowDesc}>
                FitLens reads your daily steps when you grant access in Health Connect.
              </Text>
            </View>
            <View style={[styles.innerDivider, styles.editorInsetDivider]} />
            <View style={styles.infoRow}>
              <Text style={styles.infoRowTitle}>Workout Reminders</Text>
              <Text style={styles.infoRowDesc}>
                Your device schedules workout reminders locally.
              </Text>
            </View>
            <View style={[styles.innerDivider, styles.editorInsetDivider]} />
            <View style={styles.infoRow}>
              <Text style={styles.infoRowTitle}>On-Device Camera Coaching</Text>
              <Text style={styles.infoRowDesc}>
                FitLens processes camera frames on your device without saving or sending them.
              </Text>
            </View>
          </ContinuousSurface>
        </View>

        <View style={styles.editorSection}>
          <Text style={styles.editorSectionHeader}>Data retention</Text>
          <ContinuousSurface radius={22}>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowTitle}>Zero Cloud Tracking</Text>
              <Text style={styles.infoRowDesc}>
                FitLens does not collect diagnostic analytics, tracking IDs, or personal telemetry. Clearing FitLens app data removes data stored locally by the app.
              </Text>
            </View>
          </ContinuousSurface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------------------------------------------------
// Styles
// -------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SETTINGS_COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  scrollCompact: {
    paddingBottom: 36,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: SETTINGS_COLORS.textPrimary,
    letterSpacing: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    marginBottom: 16,
  },
  screenTitleCompact: {
    fontSize: 28,
    paddingTop: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginLeft: -4,
  },
  accountCardWrap: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 18,
  },
  accountCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  accountAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  accountTextContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 20,
    fontWeight: '700',
    color: SETTINGS_COLORS.textPrimary,
    letterSpacing: 0,
  },
  accountSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: SETTINGS_COLORS.textSecondary,
    letterSpacing: 0,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '400',
    color: '#C7C7CC',
    lineHeight: 22,
    marginLeft: 8,
  },
  groupSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  groupHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: SETTINGS_COLORS.textSecondary,
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  rowWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  rowFirst: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  rowLast: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  rowSingle: {
    borderRadius: 18,
  },
  rowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowTextColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  rowPressed: {
    backgroundColor: SETTINGS_COLORS.pressed,
  },
  cardPressed: {
    opacity: 0.85,
  },
  rowIconContainer: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: SETTINGS_COLORS.textPrimary,
    letterSpacing: 0,
  },
  rowDetail: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6E6E73',
    letterSpacing: 0,
    marginRight: 4,
  },
  rowDetailStacked: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6E6E73',
    letterSpacing: 0,
    marginTop: 2,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SETTINGS_COLORS.separator,
    marginLeft: 58,
  },

  preferredNameField: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingLeft: 18,
    paddingRight: 8,
  },
  preferredNameInput: {
    flex: 1,
    minHeight: 54,
    paddingLeft: 0,
    paddingRight: 6,
    paddingVertical: 12,
    fontSize: 16,
    color: SETTINGS_COLORS.textPrimary,
  },
  nameFieldAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameClearFace: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: SETTINGS_COLORS.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameFieldError: {
    color: SETTINGS_COLORS.errorText,
  },

  // Editor generic styles
  editorTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SETTINGS_COLORS.separator,
    backgroundColor: SETTINGS_COLORS.bg,
  },
  trainingPlanTopBar: {
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    paddingTop: 12,
    paddingBottom: 6,
  },
  subpageTopBar: {
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    paddingTop: 12,
    paddingBottom: 6,
  },
  editorHeaderCircleBtn: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorSaveCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4F68D5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#142566',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3.0,
    elevation: 2,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  editorNavBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 64,
  },
  editorNavBtnText: {
    fontSize: 17,
    color: SETTINGS_COLORS.accentBlue,
  },
  editorNavTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: SETTINGS_COLORS.textPrimary,
    letterSpacing: 0,
  },
  editorSaveBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: SETTINGS_COLORS.accentBlue,
    textAlign: 'right',
  },
  disabledText: {
    opacity: 0.5,
  },
  headerSpacer: {
    minWidth: 44,
    width: 44,
  },
  editorScrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  editorSection: {
    marginBottom: 24,
  },
  editorSectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: SETTINGS_COLORS.textSecondary,
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  editorActionFace: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorSectionFooter: {
    fontSize: 13,
    color: SETTINGS_COLORS.textSecondary,
    paddingHorizontal: 16,
    marginTop: 8,
    lineHeight: 18,
  },
  editorSelectionRow: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  editorSelectionIndicator: {
    width: 24,
    alignItems: 'flex-end',
  },
  editorInsetDivider: {
    marginLeft: 18,
    marginRight: 18,
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  selectableRowActive: {
    backgroundColor: '#FFFFFF',
  },
  selectableRowText: {
    flex: 1,
    marginRight: 12,
  },
  selectableRowTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: SETTINGS_COLORS.textPrimary,
  },
  selectableRowTitleActive: {
    color: SETTINGS_COLORS.textPrimary,
  },
  selectableRowSubtitle: {
    fontSize: 13,
    color: SETTINGS_COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: SETTINGS_COLORS.accentBlue,
    backgroundColor: SETTINGS_COLORS.accentBlue,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  innerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SETTINGS_COLORS.separator,
    marginLeft: 16,
  },

  // Summary rows for in-place choice menus
  menuSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 52,
    flexWrap: 'wrap',
    gap: 8,
  },
  menuSummaryLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: SETTINGS_COLORS.textPrimary,
    letterSpacing: 0,
    flexShrink: 1,
  },
  menuSummaryValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuSummaryValueText: {
    fontSize: 16,
    fontWeight: '400',
    color: SETTINGS_COLORS.textSecondary,
  },
  menuDisclosureGlyph: {
    marginLeft: 2,
  },

  // Floating In-Place Menu Overlay styles
  menuDismissBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  floatingMenuContainer: {
    position: 'absolute',
    zIndex: 1000,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  floatingMenuSolidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.10)',
    overflow: 'hidden',
  },
  floatingMenuGlassCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    overflow: 'hidden',
  },
  floatingMenuInner: {
    paddingVertical: 4,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  menuItemRowPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  menuItemLeadingCheckWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '400',
    color: SETTINGS_COLORS.textPrimary,
  },
  menuItemTextSelected: {
    fontWeight: '400',
    color: SETTINGS_COLORS.textPrimary,
  },
  menuItemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SETTINGS_COLORS.separator,
    marginLeft: 44,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: SETTINGS_COLORS.errorBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: SETTINGS_COLORS.errorText,
    fontSize: 14,
    fontWeight: '500',
  },

  subpageBackFace: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SETTINGS_COLORS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SETTINGS_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthSettingsRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  healthStatusRow: {
    flexWrap: 'wrap',
  },
  healthStatusValue: {
    fontSize: 16,
    color: SETTINGS_COLORS.textSecondary,
    textAlign: 'right',
    flexShrink: 1,
  },

  // Info rows
  infoRow: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  infoRowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: SETTINGS_COLORS.textPrimary,
    marginBottom: 4,
  },
  infoRowDesc: {
    fontSize: 14,
    color: SETTINGS_COLORS.textSecondary,
    lineHeight: 20,
  },

  pressed: {
    opacity: 0.75,
  },
});
