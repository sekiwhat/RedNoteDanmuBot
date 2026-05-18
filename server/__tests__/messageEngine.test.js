import { buildMessage } from '../messageEngine.js';

const PREFIX = '【测试】';

test('buildMessage returns message starting with prefix', () => {
  const result = buildMessage(PREFIX);
  expect(result.fullMessage.startsWith(PREFIX)).toBe(true);
});

test('buildMessage result contains the selected keyword', () => {
  const result = buildMessage(PREFIX);
  expect(result.fullMessage).toContain(result.keyword);
});

test('buildMessage appends symbols after keyword (length ≥ 2)', () => {
  const result = buildMessage(PREFIX);
  const symbolsPart = result.fullMessage.slice(PREFIX.length + 1 + result.keyword.length);
  expect(symbolsPart.length).toBeGreaterThanOrEqual(2);
});

test('buildMessage random part contains no digits across 20 runs', () => {
  for (let i = 0; i < 20; i++) {
    const result = buildMessage(PREFIX);
    const randomPart = result.fullMessage.slice(PREFIX.length + 1);
    expect(randomPart).not.toMatch(/[0-9]/);
  }
});
