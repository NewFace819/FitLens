import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { markWelcomeSeen } from '../modules/welcome/welcome';
import { useAppNavigation } from '../navigation';
import { Mascot } from '../ui/components';

export default function WelcomeScreen() {
  const nav = useAppNavigation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(false);

  const isCompact = screenHeight < 680 || screenWidth < 360;
  const mascotSize = isCompact ? 145 : 190;

  const handleGetStarted = () => {
    markWelcomeSeen();
    nav.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topContainer}>
          <View style={styles.topBar}>
            <Text style={styles.brand}>FITLENS</Text>
          </View>

          <View style={styles.mascotSection} accessibilityElementsHidden aria-hidden>
            <View style={[styles.glowWrapper, isCompact && styles.glowWrapperCompact]}>
              <Svg width="100%" height="100%" viewBox="0 0 300 240">
                <Defs>
                  <RadialGradient id="welcomeGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0%" stopColor="#78aee0" stopOpacity="0.45" />
                    <Stop offset="45%" stopColor="#b3d6df" stopOpacity="0.25" />
                    <Stop offset="75%" stopColor="#deebef" stopOpacity="0.10" />
                    <Stop offset="100%" stopColor="#f7f3ec" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="300" height="240" fill="url(#welcomeGlow)" />
              </Svg>
            </View>
            <View style={styles.mascotRotate}>
              <Mascot mood="happy" size={mascotSize} />
            </View>
          </View>

          <View style={[styles.copySection, isCompact && styles.copySectionCompact]}>
            <Text style={[styles.heading, isCompact && styles.headingCompact]} accessibilityRole="header">
              {'Welcome to\nFitLens.'}
            </Text>
            <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
              Your pace. Your way.
            </Text>
          </View>
        </View>

        <View style={[styles.actionSection, isCompact && styles.actionSectionCompact]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            onPress={handleGetStarted}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={({ pressed }) => [
              styles.ctaButton,
              isCompact && styles.ctaButtonCompact,
              pressed && styles.ctaButtonPressed,
            ]}
          >
            <Text style={[styles.ctaText, isCompact && styles.ctaTextCompact]}>Get Started</Text>
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
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'flex-start',
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
    height: 230,
    marginTop: 8,
    marginBottom: 12,
  },
  glowWrapper: {
    position: 'absolute',
    width: 300,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrapperCompact: {
    width: 240,
    height: 190,
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
  ctaButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#4F68D5',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  ctaButtonCompact: {
    minHeight: 48,
  },
  ctaButtonPressed: {
    opacity: 0.82,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  ctaTextCompact: {
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
