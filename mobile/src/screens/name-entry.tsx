import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { getProfile, isValidName, normalizeName, saveProfileName } from '../modules/profile/profile';
import { saveOnboardingStep } from '../modules/onboarding/onboarding';
import { useAppNavigation, useScopedBackHandler } from '../navigation';
import { Mascot } from '../ui/components';

export default function NameEntryScreen() {
  const nav = useAppNavigation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const [name, setName] = useState(() => getProfile().name ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const isCompact = screenHeight < 680 || screenWidth < 360;
  const mascotSize = isCompact ? 120 : 160;

  const valid = isValidName(name);
  const isConfirmDisabled = !valid || isSubmitting;

  const handleBack = useCallback(async () => {
    if (isSubmitting || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    Keyboard.dismiss();

    try {
      const ok = await saveOnboardingStep('welcome');
      if (ok) {
        if (nav.canGoBack()) {
          nav.goBack();
        } else {
          nav.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
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

  const handleConfirm = async () => {
    if (isConfirmDisabled || isSubmitting || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    Keyboard.dismiss();

    const normalized = normalizeName(name);
    try {
      const ok = await saveProfileName(normalized);
      if (ok) {
        const stepOk = await saveOnboardingStep('greeting');
        if (stepOk) {
          nav.navigate('Greeting');
        } else {
          setErrorMessage('Could not save progress. Please try again.');
        }
      } else {
        setErrorMessage('Your name could not be saved. Please try again.');
      }
    } catch {
      setErrorMessage('Your name could not be saved. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useScopedBackHandler(
    useCallback(() => {
      if (submittingRef.current || isSubmitting) {
        return true; // consume Back without causing a second transition
      }
      const keyboardOpen =
        isKeyboardVisible || (typeof Keyboard.isVisible === 'function' && Keyboard.isVisible());
      if (keyboardOpen) {
        Keyboard.dismiss();
        setIsKeyboardVisible(false);
        return true;
      }
      handleBack();
      return true;
    }, [handleBack, isKeyboardVisible, isSubmitting])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
                    <RadialGradient id="nameGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0%" stopColor="#78aee0" stopOpacity="0.45" />
                      <Stop offset="45%" stopColor="#b3d6df" stopOpacity="0.25" />
                      <Stop offset="75%" stopColor="#deebef" stopOpacity="0.10" />
                      <Stop offset="100%" stopColor="#f7f3ec" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Rect x="0" y="0" width="300" height="240" fill="url(#nameGlow)" />
                </Svg>
              </View>
              <View style={styles.mascotRotate}>
                <Mascot mood="content" size={mascotSize} />
              </View>
            </View>

            <View style={[styles.copySection, isCompact && styles.copySectionCompact]}>
              <Text style={[styles.heading, isCompact && styles.headingCompact]} accessibilityRole="header">
                {'What should\nI call you?'}
              </Text>
            </View>

            <View style={styles.formSection}>
              <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
                <TextInput
                  style={[styles.input, isCompact && styles.inputCompact]}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Your name"
                  placeholderTextColor="#7E8B9B"
                  autoComplete="name-given"
                  textContentType="givenName"
                  returnKeyType="done"
                  maxLength={40}
                  autoCorrect={false}
                  spellCheck={false}
                  accessibilityLabel="Your name"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onSubmitEditing={handleConfirm}
                  editable={!isSubmitting}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm name"
                  accessibilityState={{ disabled: isConfirmDisabled }}
                  disabled={isConfirmDisabled}
                  onPress={handleConfirm}
                  onFocus={() => setIsConfirmFocused(true)}
                  onBlur={() => setIsConfirmFocused(false)}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    isCompact && styles.confirmButtonCompact,
                    isConfirmDisabled && styles.confirmButtonDisabled,
                    pressed && !isConfirmDisabled && styles.confirmButtonPressed,
                  ]}
                >
                  <Svg width={24} height={24} viewBox="0 0 24 24" aria-hidden={true}>
                    <Path
                      d="M5 12h14m-6-6 6 6-6 6"
                      stroke="#FFFFFF"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                  {isConfirmFocused && !isConfirmDisabled ? <View style={styles.focusRing} /> : null}
                </Pressable>
              </View>

              {errorMessage ? (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {errorMessage}
                </Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EC',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    height: 190,
    marginTop: 4,
    marginBottom: 8,
  },
  mascotSectionCompact: {
    height: 140,
    marginTop: 2,
    marginBottom: 4,
  },
  glowWrapper: {
    position: 'absolute',
    width: 260,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrapperCompact: {
    width: 200,
    height: 150,
  },
  mascotRotate: {
    transform: [{ rotate: '-4deg' }],
  },
  copySection: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  copySectionCompact: {
    paddingTop: 4,
    paddingBottom: 12,
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
  formSection: {
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 56,
  },
  inputRowFocused: {
    // Row remains clean without abrupt borders
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#273046',
  },
  inputCompact: {
    fontSize: 28,
    letterSpacing: -0.6,
  },
  confirmButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4F68D5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  confirmButtonCompact: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  confirmButtonDisabled: {
    opacity: 0.3,
  },
  confirmButtonPressed: {
    backgroundColor: '#4057BD',
  },
  focusRing: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8A3D28',
    marginTop: 8,
  },
});
