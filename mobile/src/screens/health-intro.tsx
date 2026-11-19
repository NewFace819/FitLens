import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  type HealthConnectAdapter,
  type TodayStepsResult,
  nativeHealthConnectAdapter,
} from '../modules/health/health-connect';
import { saveOnboardingStep } from '../modules/onboarding/onboarding';
import { useAppFocusEffect, useAppNavigation, useScopedBackHandler } from '../navigation';
import { Mascot } from '../ui/components';

export type HealthConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'denied'
  | 'provider-update'
  | 'unavailable'
  | 'read-error'
  | 'connect-error';

export interface HealthIntroScreenProps {
  adapter?: HealthConnectAdapter;
}

export function formatStepCount(steps: number): string {
  return steps.toLocaleString('en-US');
}

export default function HealthIntroScreen({
  adapter = nativeHealthConnectAdapter,
}: HealthIntroScreenProps) {
  const nav = useAppNavigation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const [connectionState, setConnectionState] = useState<HealthConnectionState>('idle');
  const [todaySteps, setTodaySteps] = useState<TodayStepsResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNativePending, setIsNativePending] = useState(false);
  const submittingRef = useRef(false);
  const connectingRef = useRef(false);
  const isNativeRequestPendingRef = useRef(false);
  const isScreenFocusedRef = useRef(true);
  const operationIdRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const isCompact = screenHeight < 680 || screenWidth < 360;
  const mascotSize = isCompact ? 130 : 170;

  // Silent check / refresh on mount, focus return, or foreground return (never prompts)
  const refreshSilently = useCallback(async () => {
    const opId = ++operationIdRef.current;

    try {
      const sdkStatus = await adapter.getSdkStatus();
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;

      if (sdkStatus === 'unavailable') {
        setTodaySteps(null);
        setConnectionState('unavailable');
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' || prev === 'Reading steps from Health Connect…'
            ? null
            : prev
        );
        return;
      }
      if (sdkStatus === 'provider-update-required') {
        setTodaySteps(null);
        setConnectionState('provider-update');
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' || prev === 'Reading steps from Health Connect…'
            ? null
            : prev
        );
        return;
      }

      let isGranted = false;
      try {
        isGranted = await adapter.checkPermission();
      } catch {
        if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
        setErrorMessage((prev) =>
          prev === 'Could not save progress. Please try again.'
            ? prev
            : 'Could not connect to Health Connect. Please try again.'
        );
        setConnectionState('connect-error');
        return;
      }

      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;

      if (isGranted) {
        try {
          const result = await adapter.getTodaySteps();
          if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
          setTodaySteps(result);
          setConnectionState('connected');
          setErrorMessage((prev) =>
            prev === 'Could not save progress. Please try again.' ? prev : null
          );
        } catch {
          if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
          setErrorMessage((prev) =>
            prev === 'Could not save progress. Please try again.'
              ? prev
              : 'Could not read your steps. Please try again.'
          );
          setConnectionState('read-error');
        }
      } else {
        // If permission is lost / revoked, clear displayed step total
        // If recovering from provider-update or unavailable, switch to ready-to-connect ('idle')
        setTodaySteps(null);
        setConnectionState((prev) => {
          if (prev === 'connected') return 'denied';
          if (prev === 'provider-update' || prev === 'unavailable' || prev === 'connecting') return 'idle';
          return prev;
        });
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' || prev === 'Reading steps from Health Connect…'
            ? null
            : prev
        );
      }
    } catch {
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
      setConnectionState('unavailable');
    }
  }, [adapter]);

  // Handle Android foreground return from settings or provider installer
  const handleAppStateChange = useCallback(
    (nextState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        typeof previousState === 'string' &&
        /inactive|background/.test(previousState) &&
        nextState === 'active' &&
        isScreenFocusedRef.current &&
        !connectingRef.current &&
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
      connectingRef.current = false;
      setIsNativePending(isNativeRequestPendingRef.current);

      // On re-entry, clear waiting UI from any abandoned operation
      setConnectionState((prev) => (prev === 'connecting' ? 'idle' : prev));
      setStatusAnnouncement((prev) =>
        prev === 'Waiting for your choice…' || prev === 'Reading steps from Health Connect…'
          ? null
          : prev
      );

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      if (!submittingRef.current) {
        refreshSilently();
      }

      return () => {
        isScreenFocusedRef.current = false;
        operationIdRef.current++;
        connectingRef.current = false;
        setConnectionState((prev) => (prev === 'connecting' ? 'idle' : prev));
        setStatusAnnouncement((prev) =>
          prev === 'Waiting for your choice…' || prev === 'Reading steps from Health Connect…'
            ? null
            : prev
        );
        subscription?.remove?.();
      };
    }, [handleAppStateChange, refreshSilently])
  );

  const handleConnect = async () => {
    if (
      connectingRef.current ||
      isSubmitting ||
      submittingRef.current ||
      isNativeRequestPendingRef.current
    ) {
      return;
    }

    const opId = ++operationIdRef.current;
    connectingRef.current = true;
    isNativeRequestPendingRef.current = true;
    setIsNativePending(true);
    setConnectionState('connecting');
    setErrorMessage(null);
    setStatusAnnouncement('Waiting for your choice…');

    try {
      let granted = false;
      try {
        granted = await adapter.requestPermission();
      } finally {
        isNativeRequestPendingRef.current = false;
        setIsNativePending(false);
      }

      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) {
        if (
          isScreenFocusedRef.current &&
          !submittingRef.current &&
          !connectingRef.current
        ) {
          refreshSilently();
        }
        return;
      }

      if (granted) {
        setStatusAnnouncement('Reading steps from Health Connect…');
        try {
          const stepsResult = await adapter.getTodaySteps();
          if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
          setTodaySteps(stepsResult);
          setConnectionState('connected');
          setStatusAnnouncement(
            stepsResult.hasData && stepsResult.steps !== null
              ? `Health Connect connected. Steps today: ${formatStepCount(stepsResult.steps)}`
              : 'Health Connect connected. No steps are available for today yet.'
          );
        } catch {
          if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
          setErrorMessage('Could not read your steps. Please try again.');
          setConnectionState('read-error');
          setStatusAnnouncement(null);
        }
      } else {
        setConnectionState('denied');
        setStatusAnnouncement('Step access wasn’t granted.');
      }
    } catch {
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) {
        if (
          isScreenFocusedRef.current &&
          !submittingRef.current &&
          !connectingRef.current
        ) {
          refreshSilently();
        }
        return;
      }
      setErrorMessage('Could not connect to Health Connect. Please try again.');
      setConnectionState('connect-error');
      setStatusAnnouncement(null);
    } finally {
      isNativeRequestPendingRef.current = false;
      setIsNativePending(false);
      if (opId === operationIdRef.current) {
        connectingRef.current = false;
      }
    }
  };

  // Retry reading steps directly without triggering permission dialog
  const handleRetryRead = async () => {
    if (
      connectingRef.current ||
      isSubmitting ||
      submittingRef.current ||
      isNativeRequestPendingRef.current
    ) {
      return;
    }

    const opId = ++operationIdRef.current;
    connectingRef.current = true;
    setErrorMessage(null);
    setStatusAnnouncement('Reading steps from Health Connect…');

    try {
      const stepsResult = await adapter.getTodaySteps();
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;

      setTodaySteps(stepsResult);
      setConnectionState('connected');
      setStatusAnnouncement(
        stepsResult.hasData && stepsResult.steps !== null
          ? `Health Connect connected. Steps today: ${formatStepCount(stepsResult.steps)}`
          : 'Health Connect connected. No steps are available for today yet.'
      );
    } catch {
      if (opId !== operationIdRef.current || !isScreenFocusedRef.current) return;
      setErrorMessage('Could not read your steps. Please try again.');
      setConnectionState('read-error');
      setStatusAnnouncement(null);
    } finally {
      if (opId === operationIdRef.current) {
        connectingRef.current = false;
      }
    }
  };

  const handleOpenProvider = async () => {
    if (
      connectingRef.current ||
      isSubmitting ||
      submittingRef.current ||
      isNativeRequestPendingRef.current
    ) {
      return;
    }
    try {
      const ok = await adapter.openHealthConnectProvider();
      if (!ok) {
        setErrorMessage('Could not open store. Please search for Health Connect in Google Play.');
      }
    } catch {
      setErrorMessage('Could not open store. Please search for Health Connect in Google Play.');
    }
  };

  const handleBack = useCallback(async () => {
    if (isSubmitting || submittingRef.current) return;

    operationIdRef.current++;
    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await saveOnboardingStep('greeting');
      if (ok) {
        if (nav.canGoBack()) {
          nav.goBack();
        } else {
          nav.reset({
            index: 0,
            routes: [{ name: 'Greeting' }],
          });
        }
      } else {
        setErrorMessage('Could not save progress. Please try again.');
        setConnectionState((prev) => (prev === 'connecting' ? 'idle' : prev));
        setStatusAnnouncement((prev) => (prev === 'Waiting for your choice…' ? null : prev));
        connectingRef.current = false;
      }
    } catch {
      setErrorMessage('Could not save progress. Please try again.');
      setConnectionState((prev) => (prev === 'connecting' ? 'idle' : prev));
      setStatusAnnouncement((prev) => (prev === 'Waiting for your choice…' ? null : prev));
      connectingRef.current = false;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isSubmitting, nav]);

  const handleProceed = async () => {
    if (isSubmitting || submittingRef.current) return;

    operationIdRef.current++;
    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await saveOnboardingStep('notifications');
      if (ok) {
        nav.navigate('NotificationsIntro');
      } else {
        setErrorMessage('Could not save progress. Please try again.');
        setConnectionState((prev) => (prev === 'connecting' ? 'idle' : prev));
        setStatusAnnouncement((prev) => (prev === 'Waiting for your choice…' ? null : prev));
        connectingRef.current = false;
      }
    } catch {
      setErrorMessage('Could not save progress. Please try again.');
      setConnectionState((prev) => (prev === 'connecting' ? 'idle' : prev));
      setStatusAnnouncement((prev) => (prev === 'Waiting for your choice…' ? null : prev));
      connectingRef.current = false;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  useScopedBackHandler(
    useCallback(() => {
      if (submittingRef.current || isSubmitting) {
        return true;
      }
      handleBack();
      return true;
    }, [handleBack, isSubmitting])
  );

  const isConnecting = connectionState === 'connecting';
  const isConnected = connectionState === 'connected';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topContainer}>
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
                  <RadialGradient id="healthGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop
                      offset="0%"
                      stopColor={isConnected ? '#a3d9a5' : '#78aee0'}
                      stopOpacity="0.45"
                    />
                    <Stop
                      offset="45%"
                      stopColor={isConnected ? '#cdecd0' : '#b3d6df'}
                      stopOpacity="0.25"
                    />
                    <Stop
                      offset="75%"
                      stopColor={isConnected ? '#eaf5eb' : '#deebef'}
                      stopOpacity="0.10"
                    />
                    <Stop offset="100%" stopColor="#f7f3ec" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="300" height="240" fill="url(#healthGlow)" />
              </Svg>
            </View>
            <View style={styles.mascotRotate}>
              <Mascot mood={isConnected ? 'content' : 'calm'} size={mascotSize} />
            </View>
          </View>

          <View style={[styles.copySection, isCompact && styles.copySectionCompact]}>
            <Text
              style={[styles.heading, isCompact && styles.headingCompact]}
              accessibilityRole="header"
            >
              {'See your movement\ncome to life.'}
            </Text>
            <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
              Bring your daily activity into FitLens with Health Connect.
            </Text>
          </View>

          {/* Connected Card: Steps Preview */}
          {isConnected && (
            <View
              style={styles.previewCard}
              accessibilityRole="status"
              accessibilityLabel={
                todaySteps?.hasData && todaySteps.steps !== null
                  ? `Steps today: ${formatStepCount(todaySteps.steps)} steps`
                  : 'No steps are available for today yet.'
              }
            >
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Steps today</Text>
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>Connected</Text>
                </View>
              </View>

              {todaySteps?.hasData && todaySteps.steps !== null ? (
                <View style={styles.stepsDisplay}>
                  <Text style={styles.stepsCount}>
                    {formatStepCount(todaySteps.steps)}
                  </Text>
                  <Text style={styles.stepsUnit}> steps</Text>
                </View>
              ) : (
                <View style={styles.emptyStepsContainer}>
                  <Text style={styles.emptyStepsText}>
                    No steps are available for today yet.
                  </Text>
                  <Text style={styles.emptyStepsSubtext}>
                    Steps will appear here as you move throughout the day.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Denied Feedback Banner */}
          {connectionState === 'denied' && (
            <View style={styles.noticeBanner} accessibilityRole="status">
              <Text style={styles.noticeTitle}>Step access wasn’t granted.</Text>
              <Text style={styles.noticeMessage}>
                FitLens needs step read access to show your daily activity preview. You can try
                again or continue without connecting.
              </Text>
            </View>
          )}

          {/* Provider Update Required Banner */}
          {connectionState === 'provider-update' && (
            <View style={styles.noticeBanner} accessibilityRole="status">
              <Text style={styles.noticeTitle}>Health Connect needs to be installed or updated.</Text>
              <Text style={styles.noticeMessage}>
                Install or update Health Connect from the Google Play Store to sync your daily
                activity with FitLens.
              </Text>
            </View>
          )}

          {/* Unavailable Banner */}
          {connectionState === 'unavailable' && (
            <View style={styles.noticeBanner} accessibilityRole="status">
              <Text style={styles.noticeTitle}>Health Connect isn’t available on this device.</Text>
              <Text style={styles.noticeMessage}>
                Your device does not support Health Connect. Your FitLens workouts and progress will
                continue to work smoothly.
              </Text>
            </View>
          )}

          {/* Collapsible details: What FitLens can read */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="What FitLens can read"
            onPress={() => setShowDetails((prev) => !prev)}
            style={styles.detailsToggle}
          >
            <Text style={styles.detailsToggleText}>What FitLens can read</Text>
            <Text style={styles.detailsToggleIcon}>{showDetails ? '−' : '+'}</Text>
          </Pressable>

          {showDetails && (
            <View style={styles.detailsContent}>
              <Text style={styles.detailsBullet}>• Daily step count.</Text>
              <Text style={styles.detailsFootnote}>
                FitLens requests read access only. You can change access anytime in Health Connect
                settings. Your workouts still work without a connection.
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.actionSection, isCompact && styles.actionSectionCompact]}>
          {statusAnnouncement && (
            <Text style={styles.statusText} accessibilityRole="status">
              {statusAnnouncement}
            </Text>
          )}

          {errorMessage && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {errorMessage}
            </Text>
          )}

          {/* Actions depending on state */}
          {isConnected ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              disabled={isSubmitting}
              onPress={handleProceed}
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
                style={[styles.primaryButtonText, isCompact && styles.primaryButtonTextCompact]}
              >
                Continue
              </Text>
              {isFocused === 'continue' ? <View style={styles.focusRing} /> : null}
            </Pressable>
          ) : connectionState === 'provider-update' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Update Health Connect"
                disabled={isSubmitting}
                onPress={handleOpenProvider}
                onFocus={() => setIsFocused('update')}
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
                  Update Health Connect
                </Text>
                {isFocused === 'update' ? <View style={styles.focusRing} /> : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                disabled={isSubmitting}
                onPress={handleProceed}
                onFocus={() => setIsFocused('notNow')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !isSubmitting && styles.secondaryButtonPressed,
                  isSubmitting && styles.secondaryButtonDisabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Not now</Text>
                {isFocused === 'notNow' ? <View style={styles.focusRingSecondary} /> : null}
              </Pressable>
            </>
          ) : connectionState === 'unavailable' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Not now"
              disabled={isSubmitting}
              onPress={handleProceed}
              onFocus={() => setIsFocused('notNow')}
              onBlur={() => setIsFocused(null)}
              style={({ pressed }) => [
                styles.primaryButton,
                isCompact && styles.primaryButtonCompact,
                pressed && !isSubmitting && styles.primaryButtonPressed,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
            >
              <Text
                style={[styles.primaryButtonText, isCompact && styles.primaryButtonTextCompact]}
              >
                Not now
              </Text>
              {isFocused === 'notNow' ? <View style={styles.focusRing} /> : null}
            </Pressable>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  connectionState === 'read-error' ||
                  connectionState === 'connect-error' ||
                  connectionState === 'denied'
                    ? 'Try again'
                    : 'Connect Health Connect'
                }
                accessibilityState={{
                  disabled: isConnecting || isSubmitting || isNativePending,
                }}
                disabled={isConnecting || isSubmitting || isNativePending}
                onPress={connectionState === 'read-error' ? handleRetryRead : handleConnect}
                onFocus={() => setIsFocused('connect')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isCompact && styles.primaryButtonCompact,
                  pressed &&
                    !isConnecting &&
                    !isSubmitting &&
                    !isNativePending &&
                    styles.primaryButtonPressed,
                  (isConnecting || isSubmitting || isNativePending) &&
                    styles.primaryButtonDisabled,
                ]}
              >
                {isConnecting ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        isCompact && styles.primaryButtonTextCompact,
                        styles.buttonLoadingText,
                      ]}
                    >
                      Connecting…
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,
                      isCompact && styles.primaryButtonTextCompact,
                    ]}
                  >
                    {connectionState === 'read-error' ||
                    connectionState === 'connect-error' ||
                    connectionState === 'denied'
                      ? 'Try again'
                      : 'Connect Health Connect'}
                  </Text>
                )}
                {isFocused === 'connect' ? <View style={styles.focusRing} /> : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                disabled={isSubmitting}
                onPress={handleProceed}
                onFocus={() => setIsFocused('notNow')}
                onBlur={() => setIsFocused(null)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !isSubmitting && styles.secondaryButtonPressed,
                  isSubmitting && styles.secondaryButtonDisabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Not now</Text>
                {isFocused === 'notNow' ? <View style={styles.focusRingSecondary} /> : null}
              </Pressable>
            </>
          )}

          <Text style={styles.privacyNote}>You choose what to share.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingBottom: 24,
  },
  topContainer: {
    flex: 1,
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
    height: 210,
    marginTop: 6,
    marginBottom: 10,
  },
  mascotSectionCompact: {
    height: 160,
    marginTop: 2,
    marginBottom: 6,
  },
  glowWrapper: {
    position: 'absolute',
    width: 280,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrapperCompact: {
    width: 220,
    height: 170,
  },
  mascotRotate: {
    transform: [{ rotate: '-4deg' }],
  },
  copySection: {
    paddingTop: 8,
  },
  copySectionCompact: {
    paddingTop: 4,
  },
  heading: {
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -1.2,
    color: '#273046',
  },
  headingCompact: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.0,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    color: '#505B70',
    marginTop: 18,
  },
  subtitleCompact: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E5D9',
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#273046',
  },
  connectedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  connectedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  stepsDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  stepsCount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#273046',
    fontVariant: ['tabular-nums'],
  },
  stepsUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#505B70',
  },
  emptyStepsContainer: {
    marginTop: 4,
  },
  emptyStepsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#505B70',
    lineHeight: 21,
  },
  emptyStepsSubtext: {
    fontSize: 13,
    color: '#7B8497',
    marginTop: 4,
    lineHeight: 18,
  },
  noticeBanner: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#795548',
    marginBottom: 4,
  },
  noticeMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6D4C41',
  },
  detailsToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#505B70',
  },
  detailsToggleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#505B70',
  },
  detailsContent: {
    backgroundColor: '#F0ECE3',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  detailsBullet: {
    fontSize: 13,
    color: '#3B485A',
    fontWeight: '600',
    marginBottom: 6,
  },
  detailsFootnote: {
    fontSize: 12,
    lineHeight: 17,
    color: '#505B70',
  },
  actionSection: {
    paddingTop: 20,
    gap: 8,
  },
  actionSectionCompact: {
    paddingTop: 14,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#505B70',
    marginBottom: 4,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8A3D28',
    marginBottom: 4,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 56,
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
  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    paddingVertical: 10,
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(53, 90, 70, 0.08)',
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: '#355A46',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLoadingText: {
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: 13,
    color: '#505B70',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#355A46',
  },
});
