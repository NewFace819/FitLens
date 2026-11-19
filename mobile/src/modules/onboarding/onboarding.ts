/**
 * Onboarding progress & milestones — DATA_CONTRACT §4.
 *
 * Tracks progress steps across the introduction sequence:
 * Welcome → NameEntry → Greeting → HealthIntro → NotificationsIntro → Home.
 */
import { KEYS, read, writeConfirmed } from '../../shared/storage';
import { hasConfirmedName } from '../profile/profile';
import { hasSeenWelcome } from '../welcome/welcome';

export const ONBOARDING_STEPS = [
  'welcome',
  'name',
  'greeting',
  'health',
  'notifications',
  'completed',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// Backward-compatibility aliases
export const ONBOARDING_MILESTONES = ONBOARDING_STEPS;
export type OnboardingMilestone = OnboardingStep;

export type OnboardingData = {
  step: OnboardingStep;
  milestone?: OnboardingStep;
  updatedAt: string;
};

export function isStep(val: unknown): val is OnboardingStep {
  return typeof val === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(val);
}

function parse(data: unknown): OnboardingStep | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const step = d.step ?? d.milestone;
  return isStep(step) ? step : null;
}

export function getOnboardingStep(): OnboardingStep | null {
  return read<OnboardingStep | null>(KEYS.onboarding, null, { parse });
}

export const getOnboardingMilestone = getOnboardingStep;

export async function saveOnboardingStep(step: OnboardingStep): Promise<boolean> {
  if (!isStep(step)) return false;
  return writeConfirmed(KEYS.onboarding, {
    step,
    milestone: step,
    updatedAt: new Date().toISOString(),
  });
}

export const saveOnboardingMilestone = saveOnboardingStep;

export function isOnboardingCompleted(): boolean {
  return getOnboardingStep() === 'completed';
}

export type IntroductionStepRoute =
  | 'Welcome'
  | 'NameEntry'
  | 'Greeting'
  | 'HealthIntro'
  | 'NotificationsIntro';

/**
 * Determines the introductory flow step on startup.
 *
 * Rules:
 * - An explicit saved step ('welcome' | 'name' | 'greeting' | 'health' | 'notifications')
 *   takes precedence over profile/name fallback.
 * - Legacy records with no explicit step follow reviewed Greeting behavior:
 *   - Confirmed name in profile -> 'Greeting'.
 *   - Welcome acknowledged without a name -> 'NameEntry'.
 *   - Otherwise -> 'Welcome'.
 */
export function getIntroductionInitialStep(): IntroductionStepRoute {
  const step = getOnboardingStep();
  if (step === 'welcome') return 'Welcome';
  if (step === 'name') return 'NameEntry';
  if (step === 'greeting') return 'Greeting';
  if (step === 'health') return 'HealthIntro';
  if (step === 'notifications') return 'NotificationsIntro';

  // Legacy records with no explicit step
  if (hasConfirmedName()) {
    return 'Greeting';
  }
  if (hasSeenWelcome()) {
    return 'NameEntry';
  }
  return 'Welcome';
}

/**
 * Startup route decision for the app.
 * A confirmed 'completed' step opens 'Home'.
 * Unfinished users route to 'Welcome' (the introduction container) with their restored step.
 */
export function getStartupRoute(): {
  rootRoute: 'Home' | 'Welcome';
  introStep?: IntroductionStepRoute;
} {
  if (isOnboardingCompleted()) {
    return { rootRoute: 'Home' };
  }
  return {
    rootRoute: 'Welcome',
    introStep: getIntroductionInitialStep(),
  };
}
