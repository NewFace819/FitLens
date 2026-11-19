/**
 * Onboarding progress & milestones — DATA_CONTRACT §4.
 *
 * Tracks progress steps across the introduction sequence:
 * Welcome → NameEntry → Greeting → HealthIntro → NotificationsIntro → Home.
 */
import { KEYS, read, writeConfirmed } from '../../shared/storage';

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
