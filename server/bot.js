import { chromium, webkit } from 'playwright';
import { generate, applyTemplate } from './randomizer.js';
import { buildMessage } from './messageEngine.js';
import config from './config.js';

class DanmuBot {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.running = false;
    this._stopRequested = false;
    this.sentCount = 0;
    this.onLog = null;
    this.onError = null;
    this.onCount = null;
  }

  async connect(url, browserType) {
    browserType = browserType || config.browser;

    const launchOptions = {
      headless: config.headless,
      viewport: { width: 1280, height: 720 },
    };

    switch (browserType) {
      case 'edge':
        launchOptions.channel = 'msedge';
        this.context = await chromium.launchPersistentContext(config.userDataDir, launchOptions);
        break;
      case 'safari':
        // 使用 Playwright 自带的 WebKit 引擎（非系统 Safari）
        this.context = await webkit.launchPersistentContext(config.userDataDir, launchOptions);
        break;
      case 'chromium':
        // Playwright 自带的 Chromium（不需要系统安装）
        this.context = await chromium.launchPersistentContext(config.userDataDir, launchOptions);
        break;
      default:
        // 'chrome' — 使用系统安装的 Chrome
        launchOptions.channel = 'chrome';
        this.context = await chromium.launchPersistentContext(config.userDataDir, launchOptions);
        break;
    }

    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    this._log('info', `[${browserType}] 浏览器已打开，请在浏览器窗口中登录小红书`);
  }

  async disconnect() {
    await this.stop();
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }

  async start(prefix, options = {}) {
    this.running = true;
    this._stopRequested = false;
    this.sentCount = 0;

    const interval = options.interval || config.defaultInterval;
    const mode = options.mode || 'random';
    const randomOptions = options.random || {};

    while (!this._stopRequested) {
      try {
        let fullMessage;
        if (mode === 'random') {
          const randomStr = generate({
            minLen: randomOptions.minLen || config.randomLengthMin,
            maxLen: randomOptions.maxLen || config.randomLengthMax,
            useLetters: randomOptions.useLetters !== false,
            useSymbols: randomOptions.useSymbols !== false,
            useEmojis: randomOptions.useEmojis !== false,
          });
          fullMessage = prefix + randomStr;
        } else {
          fullMessage = buildMessage(prefix).fullMessage;
        }

        await this._sendMessage(fullMessage);
        this.sentCount++;

        if (this.onCount) {
          this.onCount(this.sentCount);
        }

        this._log('info', `Message sent: "${fullMessage}"`);
      } catch (err) {
        if (this.onError) {
          this.onError(err);
        }
        this._log('error', `Error sending message: ${err.message}`);
      }

      // Wait with bidirectional jitter: interval ±30%, floored at minInterval
      const jitter = (Math.random() * 2 - 1) * interval * config.jitterRatio;
      let waitTime = interval + jitter;
      if (waitTime < config.minInterval) {
        waitTime = config.minInterval;
      }
      await this._sleep(waitTime);
    }

    this.running = false;
  }

  async stop() {
    this._stopRequested = true;
    this.running = false;
  }

  async _sendMessage(text) {
    if (!this.page) throw new Error('Page not initialized');

    // Try multiple input selectors from specific to generic
    const inputSelectors = [
      'input[placeholder*="说点什么"]',
      'input[placeholder*="弹幕"]',
      'input[placeholder*="评论"]',
      'textarea[placeholder*="说点什么"]',
      '[contenteditable="true"]',
      '.input-area input',
      '.chat-input input',
    ];

    let inputEl = null;
    for (const selector of inputSelectors) {
      inputEl = await this.page.$(selector);
      if (inputEl) break;
    }

    // Fallback to generic input or textarea
    if (!inputEl) {
      inputEl = await this.page.$('input') || await this.page.$('textarea');
    }

    if (!inputEl) {
      throw new Error('找不到输入框 — 请确认已在浏览器中登录小红书并进入直播间');
    }

    await inputEl.click();
    await inputEl.fill('');
    await inputEl.type(text, { delay: 50 });

    // Try to find send button
    const sendButtonSelectors = [
      'button:has-text("发送")',
      '[type="submit"]',
      '.send-btn',
      'button:has-text("发布")',
    ];

    let sendBtn = null;
    for (const selector of sendButtonSelectors) {
      sendBtn = await this.page.$(selector);
      if (sendBtn) break;
    }

    if (sendBtn) {
      await sendBtn.click();
    } else {
      await this.page.keyboard.press('Enter');
    }
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _log(level, message) {
    if (this.onLog) {
      this.onLog({ level, message, time: new Date().toISOString() });
    }
  }
}

export { DanmuBot };
