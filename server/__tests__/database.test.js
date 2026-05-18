import { listKeywords, addKeyword, removeKeyword, toggleKeyword, logSend, getStats } from '../database.js';

// Helper: find a keyword by text
function findByText(list, text) {
  return list.find(k => k.text === text);
}

// Helper: find a keyword by id
function findById(list, id) {
  return list.find(k => k.id === id);
}

afterAll(() => {
  // Clean up any test keywords left behind
  const all = listKeywords();
  for (const kw of all) {
    if (kw.text.startsWith('__test__')) {
      removeKeyword(kw.id);
    }
  }
});

test('listKeywords returns default keywords (≥8) with id, text, enabled', () => {
  const list = listKeywords();
  expect(list.length).toBeGreaterThanOrEqual(8);
  for (const kw of list) {
    expect(kw).toHaveProperty('id');
    expect(kw).toHaveProperty('text');
    expect(kw).toHaveProperty('enabled');
  }
});

test('addKeyword adds a new keyword and it appears in the list', () => {
  const testText = '__test__add_' + Date.now();
  const updatedList = addKeyword(testText);
  const found = findByText(updatedList, testText);
  expect(found).toBeDefined();
  expect(found.text).toBe(testText);
  expect(found.enabled).toBe(1);

  // Clean up
  removeKeyword(found.id);
});

test('toggleKeyword toggles enabled status', () => {
  // Add a fresh keyword to toggle
  const testText = '__test__toggle_' + Date.now();
  const afterAdd = addKeyword(testText);
  const kw = findByText(afterAdd, testText);

  // Initially enabled should be 1
  expect(kw.enabled).toBe(1);

  // Toggle → should become 0
  const afterToggle1 = toggleKeyword(kw.id);
  const toggled1 = findById(afterToggle1, kw.id);
  expect(toggled1.enabled).toBe(0);

  // Toggle again → should become 1
  const afterToggle2 = toggleKeyword(kw.id);
  const toggled2 = findById(afterToggle2, kw.id);
  expect(toggled2.enabled).toBe(1);

  // Clean up
  removeKeyword(kw.id);
});

test('removeKeyword removes a keyword and it no longer appears', () => {
  const testText = '__test__remove_' + Date.now();
  const afterAdd = addKeyword(testText);
  const kw = findByText(afterAdd, testText);
  expect(kw).toBeDefined();

  const afterRemove = removeKeyword(kw.id);
  const stillThere = findByText(afterRemove, testText);
  expect(stillThere).toBeUndefined();
});

test('getStats returns the correct structure', () => {
  // Insert a test log entry so stats have at least some data
  logSend('testPrefix', 'testKeyword', 'testPrefix testKeyword', 'success');

  const stats = getStats();
  expect(stats).toHaveProperty('total');
  expect(typeof stats.total).toBe('number');
  expect(stats.total).toBeGreaterThanOrEqual(1);

  expect(stats).toHaveProperty('today');
  expect(typeof stats.today).toBe('number');

  expect(stats).toHaveProperty('todaySuccess');
  expect(typeof stats.todaySuccess).toBe('number');

  expect(stats).toHaveProperty('todayFail');
  expect(typeof stats.todayFail).toBe('number');

  expect(stats).toHaveProperty('recentRate');
  expect(Array.isArray(stats.recentRate)).toBe(true);
  if (stats.recentRate.length > 0) {
    expect(stats.recentRate[0]).toHaveProperty('time');
    expect(stats.recentRate[0]).toHaveProperty('count');
  }

  expect(stats).toHaveProperty('dailyHistory');
  expect(Array.isArray(stats.dailyHistory)).toBe(true);
  if (stats.dailyHistory.length > 0) {
    expect(stats.dailyHistory[0]).toHaveProperty('date');
    expect(stats.dailyHistory[0]).toHaveProperty('count');
  }
});
