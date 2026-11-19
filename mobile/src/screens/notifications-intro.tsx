import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  LiquidGlassView,
  getGlassCapabilities,
  type GlassPipelineInfo,
} from 'react-native-liquid-glassmorphism';
import {
  type NotificationPermissionAdapter,
  type NotificationPermissionStatus,
  nativeNotificationPermissionAdapter,
} from '../modules/onboarding/notification-permission';
import { saveOnboardingStep } from '../modules/onboarding/onboarding';
import { getProfile } from '../modules/profile/profile';
import { useAppFocusEffect, useAppNavigation, useScopedBackHandler } from '../navigation';
import { Mascot } from '../ui/components';

export interface NotificationsIntroScreenProps {
  adapter?: NotificationPermissionAdapter;
  onGlassPipelineReady?: (info: GlassPipelineInfo) => void;
}

export default function NotificationsIntroScreen({
  adapter = nativeNotificationPermissionAdapter,
  onGlassPipelineReady,
}: NotificationsIntroScreenProps) {
  const nav = useAppNavigation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('idle');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNativePending, setIsNativePending] = useState(false);

  const submittingRef = useRef(false);
  const requestingRef = useRef(false);
  const isNativeRequestPendingRef = useRef(false);
  const isScreenFocusedRef = useRef(true);
  const operationIdRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const isCompact = screenHeight < 680 || screenWidth < 360;
  const mascotSize = isCompact ? 104 : 136;

  const isNativeSupported = useRef(() => {
    try {
      const caps = getGlassCapabilities();
      return caps.supported && caps.supportsRefraction;
    } catch {
      return false;
    }
  }).current();

  const [useNativeGlass, setUseNativeGlass] = useState(isNativeSupported);

  const handlePipelineReady = useCallback(
    (event: NativeSyntheticEvent<GlassPipelineInfo>) => {
      onGlassPipelineReady?.(event.nativeEvent);
      if (
        event.nativeEvent.tier === 'none' ||
        (event.nativeEvent.osVersion >= 33 && !event.nativeEvent.shaderCompiled)
      ) {
        setUseNativeGlass(false);
      }
    },
    [onGlassPipelineReady]
  );

  const handleGlassError = useCallback(() => {
    setUseNativeGlass(false);
  }, []);

  // Silent check on mount, focus return, or foreground return (never prompts)
  const refreshSilently = useCallback(async () => {
    const opId = ++operationIdRef.current;

    try {
      const status = await adapter.checkPermission();
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;

      setPermissionStatus((prev) => {
        // If granted, always adopt granted state
        if (status === 'granted') return 'granted';
        // If unsupported (e.g. Android < 33), show unsupported guidance
        if (status === 'unsupported') return 'unsupported';
        // If previously granted and now denied (revocation in settings), reflect denial
        if (prev === 'granted' && status === 'denied') return 'denied';
        // If previously idle, keep idle until deliberate user action
        if (prev === 'idle') return 'idle';
        return status;
      });

      if (status === 'granted') {
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' ? null : prev
        );
      }
    } catch {
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
      // Do not infer denial or overwrite save error on silent check failures
    }
  }, [adapter]);

  // Handle Android foreground return from settings or background
  const handleAppStateChange = useCallback(
    (nextState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        typeof previousState === 'string' &&
        /inactive|background/.test(previousState) &&
        nextState === 'active' &&
        isScreenFocusedRef.current &&
        !requestingRef.current &&
        !submittingRef.current &&
        !isNativeRequestPendingRef.current
      ) {
        refreshSilently();
      }
    },
    [refreshSilently]
  );

  // Focus effect: registers listeners and initiates silent refresh
  useAppFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      operationIdRef.current++;
      requestingRef.current = false;
      setIsRequesting(false);
      setIsNativePending(isNativeRequestPendingRef.current);

      // On re-entry, clear waiting UI from any abandoned operation
      setStatusAnnouncement((prev) =>
        prev === 'Waiting for your choice…' ? null : prev
      );

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      if (!submittingRef.current) {
        refreshSilently();
      }

      return () => {
        isScreenFocusedRef.current = false;
        operationIdRef.current++;
        requestingRef.current = false;
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' ? null : prev
        );
        subscription?.remove?.();
      };
    }, [handleAppStateChange, refreshSilently])
  );

  // Explicit user action: Enable gentle reminders (API 33+)
  const handleEnable = async () => {
    if (
      requestingRef.current ||
      isRequesting ||
      isSubmitting ||
      submittingRef.current ||
      isNativeRequestPendingRef.current
    ) {
      return;
    }

    // If already granted, no need to re-prompt
    if (permissionStatus === 'granted') return;

    // Check if runtime requests are supported on this OS version
    if (!adapter.canRequestRuntimePermission()) {
      setPermissionStatus('unsupported');
      return;
    }

    const opId = ++operationIdRef.current;
    requestingRef.current = true;
    isNativeRequestPendingRef.current = true;
    setIsNativePending(true);
    setIsRequesting(true);
    setErrorMessage(null);
    setStatusAnnouncement('Waiting for your choice…');

    try {
      let result: NotificationPermissionStatus = 'denied';
      try {
        result = await adapter.requestPermission();
      } finally {
        isNativeRequestPendingRef.current = false;
        setIsNativePending(false);
      }

      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) {
        if (result === 'granted') {
          setPermissionStatus('granted');
        }
        return;
      }

      setPermissionStatus(result);
      if (result === 'granted') {
        setStatusAnnouncement(null);
      } else if (result === 'blocked') {
        setStatusAnnouncement('Notifications are turned off in settings.');
      } else {
        setStatusAnnouncement('Reminders weren’t enabled.');
      }
    } catch {
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) {
        return;
      }
      setPermissionStatus('request-error');
      setErrorMessage('Could not request notification permission. Please try again.');
      setStatusAnnouncement(null);
    } finally {
      isNativeRequestPendingRef.current = false;
      setIsNativePending(false);
      requestingRef.current = false;
      setIsRequesting(false);
    }
  };

  // Explicit user action: Open device notification settings
  const handleOpenSettings = async () => {
    if (
      isSubmitting ||
      submittingRef.current ||
      isNativeRequestPendingRef.current
    ) {
      return;
    }

    try {
      const ok = await adapter.openSettings();
      if (!ok) {
        setErrorMessage('Could not open settings. Please open Settings manually.');
      }
    } catch {
      setErrorMessage('Could not open settings. Please open Settings manually.');
    }
  };

  // Navigates back to HealthIntro and saves step health
  const handleBack = useCallback(async () => {
    if (isSubmitting || submittingRef.current) return;

    operationIdRef.current++;
    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await saveOnboardingStep('health');
      if (ok) {
        if (nav.canGoBack()) {
          nav.goBack();
        } else {
          nav.reset({
            index: 0,
            routes: [{ name: 'HealthIntro' }],
          });
        }
      } else {
        setErrorMessage('Could not save progress. Please try again.');
        requestingRef.current = false;
        setIsRequesting(false);
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' ? null : prev
        );
      }
    } catch {
      setErrorMessage('Could not save progress. Please try again.');
      requestingRef.current = false;
      setIsRequesting(false);
      setStatusAnnouncement((prev) =>
        prev === 'Waiting for your choice…' ? null : prev
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isSubmitting, nav]);

  // Completes onboarding milestone and navigates to Home (Continue or Maybe later)
  const handleComplete = async () => {
    if (isSubmitting || submittingRef.current) return;

    operationIdRef.current++;
    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await saveOnboardingStep('completed');
      if (ok) {
        const rootNav = (nav as any).getParent?.() ?? nav;
        rootNav.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        setErrorMessage('Could not save progress. Please try again.');
        requestingRef.current = false;
        setIsRequesting(false);
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' ? null : prev
        );
      }
    } catch {
      setErrorMessage('Could not save progress. Please try again.');
      requestingRef.current = false;
      setIsRequesting(false);
      setStatusAnnouncement((prev) =>
        prev === 'Waiting for your choice…' ? null : prev
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  useScopedBackHandler(
    useCallback(() => {
      if (submittingRef.current || isSubmitting) {
        return true; // consume Back without causing a second transition
      }
      handleBack();
      return true;
    }, [handleBack, isSubmitting])
  );

  const isGranted = permissionStatus === 'granted';
  const name = getProfile().name;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.screenLayout, isCompact && styles.screenLayoutCompact]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            disabled={isSubmitting}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              styles.backButton,
              isSubmitting && styles.backButtonDisabled,
              pressed && !isSubmitting && styles.backButtonPressed,
            ]}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" aria-hidden={true}>
              <Path
                d="m14 5-7 7 7 7"
                stroke="#273046"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>
          <Text style={styles.brand}>FITLENS</Text>
        </View>

        <View
          style={[styles.mascotSection, isCompact && styles.mascotSectionCompact]}
          accessibilityElementsHidden
          aria-hidden
        >
          <View style={[styles.glowWrapper, isCompact && styles.glowWrapperCompact]}>
            <Svg width="100%" height="100%" viewBox="0 0 300 240">
              <Defs>
                <RadialGradient id="notificationsGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop
                    offset="0%"
                    stopColor={isGranted ? '#a3d9a5' : '#78aee0'}
                    stopOpacity="0.45"
                  />
                  <Stop
                    offset="45%"
                    stopColor={isGranted ? '#cdecd0' : '#b3d6df'}
                    stopOpacity="0.25"
                  />
                  <Stop
                    offset="75%"
                    stopColor={isGranted ? '#eaf5eb' : '#deebef'}
                    stopOpacity="0.10"
                  />
                  <Stop offset="100%" stopColor="#f7f3ec" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="300" height="240" fill="url(#notificationsGlow)" />
            </Svg>
          </View>
          <View style={styles.mascotRotate}>
            <Mascot mood="content" size={mascotSize} />
          </View>
        </View>
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.copySection, isCompact && styles.copySectionCompact]}>
            <Text
              style={[styles.heading, isCompact && styles.headingCompact]}
              accessibilityRole="header"
            >
              {'A little nudge,\nwhen it matters.'}
            </Text>
            <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
              Gentle reminders for workouts, check-ins, and moments worth looking back on.
            </Text>
          </View>

          {(permissionStatus === 'idle' || permissionStatus === 'unsupported') && (
            <View style={[styles.notificationExample, isCompact && styles.notificationExampleCompact]}>
              <Text style={styles.exampleLabel}>EXAMPLE NOTIFICATION</Text>
              <View style={[styles.exampleStage, isCompact && styles.exampleStageCompact]}>
                <View style={styles.exampleAmbient} pointerEvents="none" aria-hidden>
                  <Svg width="100%" height="100%" viewBox="0 0 360 176" preserveAspectRatio="none">
                    <Defs>
                      <RadialGradient id="exampleBlue" cx="31%" cy="45%" rx="31%" ry="45%">
                        <Stop offset="0%" stopColor="#9FB4F7" stopOpacity={0.9} />
                        <Stop offset="68%" stopColor="#BAC9FA" stopOpacity={0.57} />
                        <Stop offset="100%" stopColor="#BAC9FA" stopOpacity={0} />
                      </RadialGradient>
                      <RadialGradient id="examplePeach" cx="72%" cy="56%" rx="28%" ry="44%">
                        <Stop offset="0%" stopColor="#F5B393" stopOpacity={0.72} />
                        <Stop offset="68%" stopColor="#F9CDB1" stopOpacity={0.45} />
                        <Stop offset="100%" stopColor="#F9CDB1" stopOpacity={0} />
                      </RadialGradient>
                      <LinearGradient id="exampleRibbon" x1="0%" y1="45%" x2="100%" y2="55%">
                        <Stop offset="0%" stopColor="#829DF0" stopOpacity={0} />
                        <Stop offset="23%" stopColor="#829DF0" stopOpacity={0.32} />
                        <Stop offset="52%" stopColor="#AFADF1" stopOpacity={0.29} />
                        <Stop offset="80%" stopColor="#F6AD94" stopOpacity={0.25} />
                        <Stop offset="100%" stopColor="#F6AD94" stopOpacity={0} />
                      </LinearGradient>
                    </Defs>
                    <Rect width={360} height={176} fill="url(#exampleBlue)" />
                    <Rect width={360} height={176} fill="url(#examplePeach)" />
                    <Path
                      d="M0 113C62 153 102 53 160 47C227 39 273 109 360 49V79C265 142 223 71 165 78C110 85 64 169 0 132Z"
                      fill="url(#exampleRibbon)"
                    />
                  </Svg>
                </View>
                <View
                  style={[
                    styles.exampleCard,
                    isCompact && styles.exampleCardCompact,
                    useNativeGlass && styles.exampleCardNative,
                  ]}
                >
                  {useNativeGlass ? (
                    <LiquidGlassView
                      style={styles.exampleGlass}
                      borderRadius={22}
                      variant="regular"
                      tintColor="rgba(255, 253, 251, 0.45)"
                      blurRadius={20}
                      refraction={true}
                      thickness={0.65}
                      edgeReflectionStrength={0.25}
                      rim={true}
                      specular={false}
                      interactive={false}
                      tilt={false}
                      legibilityFloor={0.15}
                      onPipelineReady={handlePipelineReady}
                      onError={handleGlassError}
                      pointerEvents="none"
                      accessibilityElementsHidden
                      aria-hidden
                    />
                  ) : (
                    <View style={styles.exampleGlass} pointerEvents="none" aria-hidden>
                      <Svg width="100%" height="100%">
                        <Defs>
                          <LinearGradient id="exampleGlassFace" x1="0%" y1="0%" x2="35%" y2="100%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.57} />
                            <Stop offset="44%" stopColor="#FFFFFF" stopOpacity={0.22} />
                            <Stop offset="78%" stopColor="#FFFBF7" stopOpacity={0} />
                            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                          </LinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#exampleGlassFace)" />
                      </Svg>
                    </View>
                  )}
                  <Svg width={36} height={36} viewBox="0 0 128 128" aria-hidden>
                    <Defs>
                      <ClipPath id="notificationExampleMouth">
                        <Path d="M38 60C44 54 55 62 64 61C74 61 82 56 87 60C93 69 81 80 65 80C50 80 37 69 38 60Z" />
                      </ClipPath>
                    </Defs>
                    <Rect width={128} height={128} rx={29} fill="#294638" />
                    <Circle cx={36} cy={46} r={2.5} fill="#FFF1D6" />
                    <Circle cx={92} cy={48} r={2.5} fill="#FFF1D6" />
                    <Path
                      d="M38 60C44 54 55 62 64 61C74 61 82 56 87 60C93 69 81 80 65 80C50 80 37 69 38 60Z"
                      fill="#FFF1D6"
                    />
                    <Ellipse cx={75} cy={82} rx={15} ry={10} fill="#EE9884" clipPath="url(#notificationExampleMouth)" />
                  </Svg>
                  <View style={styles.exampleContent}>
                    <View style={styles.exampleMeta}>
                      <Text style={styles.exampleAppName}>FitLens</Text>
                      <Text style={styles.exampleTime}>now</Text>
                    </View>
                    <Text style={styles.exampleTitle}>
                      {`A little time for yourself${name ? `, ${name}` : ''}?`}
                    </Text>
                    <Text style={styles.exampleBody}>Your scheduled workout begins at 6:30 PM.</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.exampleNote}>Illustrative preview. No reminder is scheduled.</Text>
            </View>
          )}

          {/* Granted feedback card */}
          {isGranted && (
            <View
              style={styles.noticeCard}
              accessibilityLiveRegion="polite"
              accessibilityLabel="Notifications allowed."
            >
              <View style={styles.noticeHeader}>
                <Text style={styles.noticeTitle}>Notifications allowed</Text>
                <View style={styles.grantedBadge}>
                  <Text style={styles.grantedBadgeText}>Allowed</Text>
                </View>
              </View>
              <Text style={styles.noticeMessage}>
                You can change notification permissions anytime in Android settings.
              </Text>
            </View>
          )}

          {/* Denied / Dismissed Feedback Banner */}
          {permissionStatus === 'denied' && (
            <View style={styles.noticeBanner} accessibilityLiveRegion="polite">
              <Text style={styles.noticeTitle}>Reminders aren’t enabled.</Text>
              <Text style={styles.noticeMessage}>
                You can try again now, or continue and turn on notifications later in settings.
              </Text>
            </View>
          )}

          {/* Blocked / Settings Required Banner */}
          {permissionStatus === 'blocked' && (
            <View style={styles.noticeBanner} accessibilityLiveRegion="polite">
              <Text style={styles.noticeTitle}>Notifications are turned off.</Text>
              <Text style={styles.noticeMessage}>
                To receive gentle reminders, enable notifications for FitLens in your device settings.
              </Text>
            </View>
          )}

          {/* Unsupported (Android < 33) Banner */}
          {permissionStatus === 'unsupported' && (
            <View style={styles.noticeBanner} accessibilityLiveRegion="polite">
              <Text style={styles.noticeTitle}>Notification settings</Text>
              <Text style={styles.noticeMessage}>
                This version of Android does not show a permission prompt for notifications. You can manage notification preferences anytime in device settings.
              </Text>
            </View>
          )}

          {/* Request Error Banner */}
          {permissionStatus === 'request-error' && (
            <View style={styles.noticeBanner} accessibilityLiveRegion="polite">
              <Text style={styles.noticeTitle}>Could not request notification permission.</Text>
              <Text style={styles.noticeMessage}>
                Please try again or continue without reminders.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.actionSection}>
          {statusAnnouncement && (
            <Text style={styles.statusText} accessibilityLiveRegion="polite">
              {statusAnnouncement}
            </Text>
          )}

          {errorMessage && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {errorMessage}
            </Text>
          )}

          {isGranted ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              disabled={isSubmitting}
              onPress={handleComplete}
              onFocus={() => setIsFocused('continue')}
              onBlur={() => setIsFocused(null)}
              style={({ pressed }) => [
                styles.primaryButton,
                isCompact && styles.primaryButtonCompact,
                pressed && !isSubmitting && styles.primaryButtonPressed,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  isCompact && styles.primaryButtonTextCompact,
                ]}
              >
                Continue
              </Text>
              {isFocused === 'continue' ? <View style={styles.focusRing} /> : null}
            </Pressable>
          ) : permissionStatus === 'blocked' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
                disabled={isSubmitting}
                onPress={handleOpenSettings}
                onFocus={() => setIsFocused('settings')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isCompact && styles.primaryButtonCompact,
                  pressed && !isSubmitting && styles.primaryButtonPressed,
                  isSubmitting && styles.primaryButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    isCompact && styles.primaryButtonTextCompact,
                  ]}
                >
                  Open Settings
                </Text>
                {isFocused === 'settings' ? <View style={styles.focusRing} /> : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Maybe later"
                disabled={isSubmitting}
                onPress={handleComplete}
                onFocus={() => setIsFocused('maybeLater')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !isSubmitting && styles.secondaryButtonPressed,
                  isSubmitting && styles.secondaryButtonDisabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Maybe later</Text>
                {isFocused === 'maybeLater' ? (
                  <View style={styles.focusRingSecondary} />
                ) : null}
              </Pressable>
            </>
          ) : permissionStatus === 'unsupported' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue"
                disabled={isSubmitting}
                onPress={handleComplete}
                onFocus={() => setIsFocused('continue')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isCompact && styles.primaryButtonCompact,
                  pressed && !isSubmitting && styles.primaryButtonPressed,
                  isSubmitting && styles.primaryButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    isCompact && styles.primaryButtonTextCompact,
                  ]}
                >
                  Continue
                </Text>
                {isFocused === 'continue' ? <View style={styles.focusRing} /> : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
                disabled={isSubmitting}
                onPress={handleOpenSettings}
                onFocus={() => setIsFocused('settings')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !isSubmitting && styles.secondaryButtonPressed,
                  isSubmitting && styles.secondaryButtonDisabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Open Settings</Text>
                {isFocused === 'settings' ? (
                  <View style={styles.focusRingSecondary} />
                ) : null}
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enable gentle reminders"
                accessibilityState={{
                  disabled: isRequesting || isSubmitting || isNativePending,
                }}
                disabled={isRequesting || isSubmitting || isNativePending}
                onPress={handleEnable}
                onFocus={() => setIsFocused('enable')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isCompact && styles.primaryButtonCompact,
                  pressed &&
                    !isRequesting &&
                    !isSubmitting &&
                    !isNativePending &&
                    styles.primaryButtonPressed,
                  (isRequesting || isSubmitting || isNativePending) &&
                    styles.primaryButtonDisabled,
                ]}
              >
                {isRequesting ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        isCompact && styles.primaryButtonTextCompact,
                        styles.buttonLoadingText,
                      ]}
                    >
                      Enabling…
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,
                      isCompact && styles.primaryButtonTextCompact,
                    ]}
                  >
                    Enable gentle reminders
                  </Text>
                )}
                {isFocused === 'enable' ? <View style={styles.focusRing} /> : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Maybe later"
                disabled={isSubmitting}
                onPress={handleComplete}
                onFocus={() => setIsFocused('maybeLater')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !isSubmitting && styles.secondaryButtonPressed,
                  isSubmitting && styles.secondaryButtonDisabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Maybe later</Text>
                {isFocused === 'maybeLater' ? (
                  <View style={styles.focusRingSecondary} />
                ) : null}
              </Pressable>
            </>
          )}

          <Text style={styles.reassuranceText}>
            Only when it matters. Always your choice.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EC',
  },
  screenLayout: {
    flex: 1,
    paddingHorizontal: 26,
    paddingBottom: 24,
  },
  screenLayoutCompact: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 3,
    paddingBottom: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
    minHeight: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    borderRadius: 22,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonDisabled: {
    opacity: 0.4,
  },
  brand: {
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: '800',
    color: '#273046',
  },
  mascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 90,
    marginTop: 3,
    marginBottom: 14,
  },
  mascotSectionCompact: {
    height: 54,
    marginTop: 0,
    marginBottom: 6,
  },
  glowWrapper: {
    position: 'absolute',
    width: 236,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrapperCompact: {
    width: 200,
    height: 96,
  },
  mascotRotate: {
    transform: [{ rotate: '-4deg' }],
  },
  copySection: {
    paddingTop: 8,
  },
  copySectionCompact: {
    paddingTop: 0,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -1,
    color: '#273046',
  },
  headingCompact: {
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#505B70',
    marginTop: 13,
  },
  subtitleCompact: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 10,
  },
  notificationExample: {
    marginTop: 22,
  },
  notificationExampleCompact: {
    marginTop: 9,
  },
  exampleLabel: {
    color: '#505B70',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  exampleStage: {
    paddingVertical: 18,
    position: 'relative',
  },
  exampleStageCompact: {
    paddingVertical: 8,
  },
  exampleAmbient: {
    ...StyleSheet.absoluteFill,
    left: -8,
    right: -8,
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(129, 133, 173, 0.22)',
    borderTopColor: 'rgba(255, 255, 255, 0.96)',
    borderLeftColor: 'rgba(255, 255, 255, 0.78)',
    backgroundColor: 'rgba(255, 253, 251, 0.47)',
    overflow: 'hidden',
  },
  exampleCardCompact: {
    padding: 10,
  },
  exampleCardNative: {
    backgroundColor: 'transparent',
  },
  exampleGlass: {
    ...StyleSheet.absoluteFill,
  },
  exampleContent: {
    flex: 1,
    minWidth: 0,
  },
  exampleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 5,
  },
  exampleAppName: {
    color: '#273046',
    fontSize: 13,
    fontWeight: '700',
  },
  exampleTime: {
    color: '#505B70',
    fontSize: 12,
  },
  exampleTitle: {
    color: '#273046',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  exampleBody: {
    color: '#424D61',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  exampleNote: {
    color: '#505B70',
    fontSize: 12,
    lineHeight: 17,
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E3E7EC',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#273046',
  },
  grantedBadge: {
    backgroundColor: '#E2F3E3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  grantedBadgeText: {
    color: '#226330',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  noticeMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#505B70',
  },
  noticeBanner: {
    backgroundColor: '#EBF0EB',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  actionSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D7D1C6',
    paddingTop: 10,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#505B70',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8A3D28',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#4F68D5',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  primaryButtonCompact: {
    minHeight: 48,
  },
  primaryButtonPressed: {
    backgroundColor: '#4057BD',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  primaryButtonTextCompact: {
    fontSize: 16,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLoadingText: {
    marginLeft: 2,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(79, 104, 213, 0.06)',
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: '#273046',
    fontSize: 16,
    fontWeight: '700',
  },
  reassuranceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A788F',
    textAlign: 'center',
    marginTop: 4,
  },
  focusRing: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  focusRingSecondary: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4F68D5',
  },
});
