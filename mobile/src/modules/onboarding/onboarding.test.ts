import {
  getIntroductionInitialStep,
  getOnboardingMilestone,
  getOnboardingStep,
  getStartupRoute,
  isOnboardingCompleted,
  saveOnboardingMilestone,
  saveOnboardingStep,
  ONBOARDING_STEPS,
} from './onboarding';
import { clearAll, hydrate, KEYS, write, type Persistence } from '../../shared/storage';
import { saveProfileName } from '../profile/profile';
import { markWelcomeSeen } from '../welcome/welcome';

beforeEach(async () => {
  await hydrate(null);
  clearAll();
});

test('onboarding step is null initially', () => {
  expect(getOnboardingStep()).toBeNull();
  expect(getOnboardingMilestone()).toBeNull();
  expect(isOnboardingCompleted()).toBe(false);
});

test('saveOnboardingStep records each step and updates completed status appropriately', async () => {
  for (const step of ONBOARDING_STEPS) {
    const ok = await saveOnboardingStep(step);
    expect(ok).toBe(true);
    expect(getOnboardingStep()).toBe(step);
    expect(getOnboardingMilestone()).toBe(step);
    expect(isOnboardingCompleted()).toBe(step === 'completed');
  }
});

test('backward compatibility: parses legacy records with only milestone field', () => {
  write(KEYS.onboarding, { milestone: 'health', updatedAt: '2026-11-18T00:00:00Z' });
  expect(getOnboardingStep()).toBe('health');
  expect(isOnboardingCompleted()).toBe(false);

  write(KEYS.onboarding, { milestone: 'completed', updatedAt: '2026-11-18T01:00:00Z' });
  expect(getOnboardingStep()).toBe('completed');
  expect(isOnboardingCompleted()).toBe(true);
});

test('saveOnboardingStep rejects invalid step', async () => {
  // @ts-expect-error test invalid value
  const ok = await saveOnboardingStep('invalid-step');
  expect(ok).toBe(false);
  expect(getOnboardingStep()).toBeNull();
});

test('failed persistence does not advance onboarding step', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Disk full');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  const ok = await saveOnboardingStep('health');
  expect(ok).toBe(false);
  expect(getOnboardingStep()).toBeNull();
});

test('saveOnboardingMilestone alias behaves identically to saveOnboardingStep', async () => {
  const ok = await saveOnboardingMilestone('greeting');
  expect(ok).toBe(true);
  expect(getOnboardingStep()).toBe('greeting');
  expect(getOnboardingMilestone()).toBe('greeting');
});

test('getIntroductionInitialStep: explicit steps take precedence over profile name', async () => {
  await saveProfileName('Đỗ Huy');

  await saveOnboardingStep('welcome');
  expect(getIntroductionInitialStep()).toBe('Welcome');

  await saveOnboardingStep('name');
  expect(getIntroductionInitialStep()).toBe('NameEntry');

  await saveOnboardingStep('greeting');
  expect(getIntroductionInitialStep()).toBe('Greeting');

  await saveOnboardingStep('health');
  expect(getIntroductionInitialStep()).toBe('HealthIntro');

  await saveOnboardingStep('notifications');
  expect(getIntroductionInitialStep()).toBe('NotificationsIntro');
});

test('getIntroductionInitialStep: legacy records with no explicit step fall back appropriately', async () => {
  // Case 1: no step, no name, no welcome -> Welcome
  expect(getIntroductionInitialStep()).toBe('Welcome');

  // Case 2: welcome seen, no name, no step -> NameEntry
  markWelcomeSeen();
  expect(getIntroductionInitialStep()).toBe('NameEntry');

  // Case 3: confirmed name exists, no step -> Greeting
  await saveProfileName('Đỗ Huy');
  expect(getIntroductionInitialStep()).toBe('Greeting');
});

test('getStartupRoute: routes completed users to Home, and unfinished users to Welcome with intro step', async () => {
  // Unfinished user at step name
  await saveOnboardingStep('name');
  const startupUnfinished = getStartupRoute();
  expect(startupUnfinished).toEqual({
    rootRoute: 'Welcome',
    introStep: 'NameEntry',
  });

  // Completed user
  await saveOnboardingStep('completed');
  const startupCompleted = getStartupRoute();
  expect(startupCompleted).toEqual({
    rootRoute: 'Home',
  });
});
