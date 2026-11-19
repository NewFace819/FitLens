import {
  getOnboardingMilestone,
  getOnboardingStep,
  isOnboardingCompleted,
  saveOnboardingMilestone,
  saveOnboardingStep,
  ONBOARDING_STEPS,
} from './onboarding';
import { clearAll, hydrate, KEYS, write, type Persistence } from '../../shared/storage';

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
