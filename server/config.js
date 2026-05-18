export default {
  port: 3000,
  defaultInterval: 2500,
  minInterval: 1500,
  maxInterval: 8000,
  jitterRatio: 0.3,
  randomLengthMin: 3,
  randomLengthMax: 6,
  headless: false,
  retryCount: 1,
  maxConsecutiveErrors: 3,

  // 浏览器用户数据目录（用于持久化登录态，避免重复扫码）
  userDataDir: '.chromium-profile',

  // 浏览器类型: 'chrome' | 'edge' | 'chromium' | 'firefox'
  browser: 'chrome',
};
