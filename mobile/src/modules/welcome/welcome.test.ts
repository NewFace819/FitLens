import { hydrate, clearAll } from '../../shared/storage';
import { hasSeenWelcome, markWelcomeSeen } from './welcome';

beforeEach(async () => {
  await hydrate(null);
  clearAll();
});

test('hasSeenWelcome is false initially', () => {
  expect(hasSeenWelcome()).toBe(false);
});

test('markWelcomeSeen marks welcome as seen with timestamp', () => {
  const now = new Date('2026-11-18T10:00:00Z');
  markWelcomeSeen(now);
  expect(hasSeenWelcome()).toBe(true);
});

test('clearAll resets welcome seen state (for sample data reset)', () => {
  markWelcomeSeen();
  expect(hasSeenWelcome()).toBe(true);
  clearAll();
  expect(hasSeenWelcome()).toBe(false);
});
