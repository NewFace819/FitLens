import { cleanDurationText, cleanKgText, cleanRepsText } from '../src/modules/training/set-input';

test('kg keeps digits and one decimal point; a comma counts as the point', () => {
  expect(cleanKgText('-12,5')).toBe('12.5');
  expect(cleanKgText('1.2.3')).toBe('1.23');
  expect(cleanKgText('a#b')).toBe('');
});

test('reps keep whole digits only', () => {
  expect(cleanRepsText('-8')).toBe('8');
  expect(cleanRepsText('1.5')).toBe('15');
  expect(cleanRepsText('12345')).toBe('123');
});

test('duration keeps digits and one colon', () => {
  expect(cleanDurationText('5:0-5')).toBe('5:05');
  expect(cleanDurationText('1:2:3')).toBe('1:23');
  expect(cleanDurationText('90s')).toBe('90');
});
