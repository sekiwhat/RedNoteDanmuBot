import { chromium } from 'playwright';
import { generate, applyTemplate } from './randomizer.js';
import config from './config.js';

class DanmuBot {
  constructor() {
    this.browser = null;
    this.page = null;
    this.running = false;
    this._stopRequested = false;
    this.sentCount = 0;
    this.onLog = null;
    this.onError = null;
    this.onCount = null;
  }

  async connect(url) {
    this.browser = await chromium.launch({ headless: config.headless });
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    this.page = await context.newPage();
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Try multiple selectors to find the input box
    const inputSelectors = [
      'input[placeholder*="说点什么"]',
      'input[placeholder*="弹幕"]',
      'input[placeholder*="评论"]',
      'textarea[placeholder*="说点什么"]',
      '[contenteditable="true"]',
      '.input-area input',
      '.chat-input input',
    ];

    let found = false;
    for (const selector of inputSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        this._log('info', `Connected — input found with selector: ${selector}`);
        found = true;
        return;
      } catch {
        // Try next selector
      }
    }

    // Fallback to generic input or textarea
    if (!found) {
      try {
        await this.page.waitForSelector('input', { timeout: 5000 });
        this._log('info', 'Connected — input found with generic selector: input');
      } catch {
        await this.page.waitForSelector('textarea', { timeout: 5000 });
        this._log('info', 'Connected — input found with generic selector: textarea');
      }
    }
  }

  async disconnect() {
    await this.stop();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async start(prefix, options = {}) {
    this.running = true;
    this._stopRequested = false;
    this.sentCount = 0;

    const interval = options.interval || config.defaultInterval;
    const template = options.template;

    while (!this._stopRequested) {
      try {
        const randomStr = generate(options.random || {});
        let message;
        if (template) {
          message = applyTemplate(template, prefix, randomStr);
        } else {
          message = prefix + ' ' + randomStr;
        }

        await this._sendMessage(message);
        this.sentCount++;

        if (this.onCount) {
          this.onCount(this.sentCount);
        }

        this._log('info', `Message sent: "${message}"`);
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
      throw new Error('Cannot find input element on the page');
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
