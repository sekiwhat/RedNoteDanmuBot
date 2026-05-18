import { generate, applyTemplate } from '../randomizer.js';

test('default generate should not contain digits', () => {
  for (let i = 0; i < 100; i++) {
    const result = generate();
    expect(result).not.toMatch(/[0-9]/);
  }
});

test('generate should respect length range', () => {
  for (let i = 0; i < 50; i++) {
    const result = generate({ minLen: 3, maxLen: 6 });
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.length).toBeLessThanOrEqual(6);
  }
});

test('generate should only use allowed char sets', () => {
  for (let i = 0; i < 50; i++) {
    const result = generate({ useLetters: true, useSymbols: false, useEmojis: false });
    expect(result).toMatch(/^[a-zA-Z]+$/);
  }
});

test('generate with only emojis should return emojis', () => {
  for (let i = 0; i < 20; i++) {
    const result = generate({ useLetters: false, useSymbols: false, useEmojis: true, minLen: 2, maxLen: 2 });
    expect(result.length).toBe(2);
  }
});
