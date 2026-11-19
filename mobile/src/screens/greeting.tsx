import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { getProfile } from '../modules/profile/profile';
import { saveOnboardingStep } from '../modules/onboarding/onboarding';
import { useAppNavigation, useScopedBackHandler } from '../navigation';
import { Mascot } from '../ui/components';

export default function GreetingScreen() {
  const nav = useAppNavigation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const profile = getProfile();
  const name = profile.name || '';

  const isCompact = screenHeight < 680 || screenWidth < 360;
  const mascotSize = isCompact ? 130 : 170;

  const handleBack = useCallback(async () => {
    if (isSubmitting || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await saveOnboardingStep('name');
      if (ok) {
        if (nav.canGoBack()) {
          nav.goBack();
        } else {
          nav.reset({
            index: 0,
            routes: [{ name: 'NameEntry' }],
          });
        }
      } else {
        setErrorMessage('Could not save progress. Please try again.');
      }
    } catch {
      setErrorMessage('Could not save progress. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isSubmitting, nav]);

  const handleContinue = async () => {
    if (isSubmitting || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await saveOnboardingStep('health');
      if (ok) {
        nav.navigate('HealthIntro');
      } else {
        setErrorMessage('Could not save progress. Please try again.');
      }
    } catch {
      setErrorMessage('Could not save progress. Please try again.');
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

          <View style={[styles.mascotSection, isCompact && styles.mascotSectionCompact]} accessibilityElementsHidden aria-hidden>
            <View style={[styles.glowWrapper, isCompact && styles.glowWrapperCompact]}>
              <Svg width="100%" height="100%" viewBox="0 0 300 240">
                <Defs>
                  <RadialGradient id="greetingGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0%" stopColor="#78aee0" stopOpacity="0.45" />
                    <Stop offset="45%" stopColor="#b3d6df" stopOpacity="0.25" />
                    <Stop offset="75%" stopColor="#deebef" stopOpacity="0.10" />
                    <Stop offset="100%" stopColor="#f7f3ec" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="300" height="240" fill="url(#greetingGlow)" />
              </Svg>
            </View>
            <View style={styles.mascotRotate}>
              <Mascot mood="content" size={mascotSize} />
            </View>
          </View>

          <View style={[styles.copySection, isCompact && styles.copySectionCompact]}>
            <Text style={[styles.heading, isCompact && styles.headingCompact]} accessibilityRole="header">
              {`Nice to meet you,\n${name}!`}
            </Text>
            <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
              Let's make FitLens feel like yours.
            </Text>
          </View>
        </View>

        <View style={[styles.actionSection, isCompact && styles.actionSectionCompact]}>
          {errorMessage ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              {errorMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            disabled={isSubmitting}
            onPress={handleContinue}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={({ pressed }) => [
              styles.primaryButton,
              isCompact && styles.primaryButtonCompact,
              pressed && !isSubmitting && styles.primaryButtonPressed,
              isSubmitting && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={[styles.primaryButtonText, isCompact && styles.primaryButtonTextCompact]}>
              Continue
            </Text>
            {isFocused ? <View style={styles.focusRing} /> : null}
          </Pressable>
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
  actionSection: {
    paddingTop: 24,
  },
  actionSectionCompact: {
    paddingTop: 16,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8A3D28',
    marginBottom: 12,
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
});
