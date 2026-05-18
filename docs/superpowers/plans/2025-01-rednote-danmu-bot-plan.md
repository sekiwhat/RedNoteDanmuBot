# RedNoteDanmuBot 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `sp-subagent-dev` (recommended) or execute tasks directly.

**目标：** 实现小红书直播间弹幕机器人 MVP，通过 Web 控制面板控制 Playwright 自动发送弹幕

**架构：** Node.js + Express + WebSocket 后端 + Vue 3 前端，Playwright 控制浏览器

**技术栈：** Node.js, Express, ws, Playwright, Vue 3, Vite

---

### 任务 1: 项目初始化

**文件：**
- 创建: `package.json`
- 创建: `server/config.js`
- 创建: `.gitignore`

- [ ] **步骤 1: 创建 package.json**
  ```json
  {
    "name": "rednote-danmu-bot",
    "version": "1.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "server": "node server/index.js",
      "client:dev": "cd client && npx vite",
      "client:build": "cd client && npx vite build",
      "dev": "node server/index.js",
      "test": "node --experimental-vm-modules node_modules/.bin/jest"
    },
    "dependencies": {
      "express": "^4.21.0",
      "ws": "^8.18.0",
      "playwright": "^1.49.0"
    },
    "devDependencies": {
      "jest": "^29.7.0"
    }
  }
  ```

- [ ] **步骤 2: 创建 .gitignore**
  ```
  node_modules/
  dist/
  .env
  *.log
  ```

- [ ] **步骤 3: 创建 server/config.js**
  ```javascript
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
  };
  ```

- [ ] **步骤 4: 安装依赖**
  运行: `npm install`
  预期: 无报错，node_modules 目录生成

- [ ] **步骤 5: 提交**
  ```bash
  git init
  git add -A
  git commit -m "chore: init RedNoteDanmuBot project"
  ```

---

### 任务 2: randomizer.js 模块 + 单元测试

**文件：**
- 创建: `server/randomizer.js`
- 创建: `server/__tests__/randomizer.test.js`

- [ ] **步骤 1: 创建目录**
  运行: `mkdir -p server/__tests__`

- [ ] **步骤 2: 写失败的测试 — 默认生成不包含数字**
  ```javascript
  // server/__tests__/randomizer.test.js
  import { generate } from '../randomizer.js';

  describe('randomizer', () => {
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
  });
  ```

- [ ] **步骤 3: 运行测试确认失败**
  运行: `npx jest server/__tests__/randomizer.test.js 2>&1`
  预期: FAIL — "Cannot find module '../randomizer.js'"

- [ ] **步骤 4: 写 randomizer.js 实现**
  ```javascript
  // server/randomizer.js
  const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const SYMBOLS = '~!@#$%^&*_+-=:;,.?';
  const EMOJIS = ['😊','😂','❤️','🌹','🎉','🔥','✨','💪','🎊','🎁','😘','🥰','👏','💕','🎈','🌺','🌸','⭐','🌟','💫'];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function buildPool(options) {
    let pool = '';
    if (options.useLetters !== false) pool += LETTERS;
    if (options.useSymbols !== false) pool += SYMBOLS;
    if (options.useEmojis !== false) pool += EMOJIS.join('');
    return pool;
  }

  export function generate(options = {}) {
    const minLen = options.minLen ?? 3;
    const maxLen = options.maxLen ?? 6;
    const length = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
    const pool = buildPool(options);

    if (!pool) {
      throw new Error('At least one character set must be enabled');
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      result += pickRandom(pool);
    }
    return result;
  }

  export function applyTemplate(template, prefix, randomStr) {
    return template
      .replace('{{prefix}}', prefix)
      .replace('{{random}}', randomStr);
  }
  ```

- [ ] **步骤 5: 再配置一下 Jest（因为 type: module）**
  在 `package.json` 中补充:
  ```json
  "jest": {
    "transform": {}
  }
  ```

- [ ] **步骤 6: 运行测试确认通过**
  运行: `npx jest server/__tests__/randomizer.test.js 2>&1`
  预期: PASS (4 tests)

- [ ] **步骤 7: 提交**
  ```bash
  git add server/randomizer.js server/__tests__/randomizer.test.js package.json
  git commit -m "feat: add randomizer module with tests"
  ```

---

### 任务 3: bot.js — Playwright 核心逻辑

**文件：**
- 创建: `server/bot.js`

**注意：** 本模块涉及真实浏览器操作，无法单元测试，通过手动运行验证。

- [ ] **步骤 1: 写 bot.js**
  ```javascript
  // server/bot.js
  import { chromium } from 'playwright';
  import { generate, applyTemplate } from './randomizer.js';
  import config from './config.js';

  export class DanmuBot {
    constructor() {
      this.browser = null;
      this.page = null;
      this.running = false;
      this._stopRequested = false;
      this.sentCount = 0;
      this.onLog = null;    // callback(logLine)
      this.onError = null;  // callback(errorMsg)
      this.onCount = null;  // callback(sentCount)
    }

    async connect(url) {
      this.browser = await chromium.launch({ headless: config.headless });
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      this.page = await context.newPage();
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 等待直播间加载完成 — 通过检测常见 DOM 元素
      // 小红书直播间常见特征：输入框 .input-area 或相似的 class
      try {
        await this.page.waitForSelector('input, textarea, [contenteditable="true"]', { timeout: 15000 });
      } catch {
        // 用户可能需要扫码登录，给充足时间
      }

      this._log('info', `✅ 已连接到直播间: ${url}`);
      return true;
    }

    async disconnect() {
      await this.stop();
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
      this._log('info', '🔌 已断开连接');
    }

    async start(prefix, options = {}) {
      if (!this.page) throw new Error('未连接到直播间');
      this.running = true;
      this._stopRequested = false;
      this.sentCount = 0;

      const interval = options.interval ?? config.defaultInterval;
      const template = options.template ?? '{{prefix}} {{random}}';
      const randomOpts = {
        minLen: options.randomMinLen ?? config.randomLengthMin,
        maxLen: options.randomMaxLen ?? config.randomLengthMax,
        useLetters: options.useLetters,
        useSymbols: options.useSymbols,
        useEmojis: options.useEmojis,
      };

      while (!this._stopRequested) {
        try {
          const randomStr = generate(randomOpts);
          const message = applyTemplate(template, prefix, randomStr);
          await this._sendMessage(message);
          this.sentCount++;
          this._log('success', `✅ [${this.sentCount}] 已发送: ${message}`);
          if (this.onCount) this.onCount(this.sentCount);
        } catch (err) {
          this._log('error', `❌ 发送失败: ${err.message}`);
          if (this.onError) this.onError(err.message);
        }

        // 带抖动的等待
        const jitter = (Math.random() * 2 - 1) * interval * config.jitterRatio;
        const waitMs = Math.max(config.minInterval, interval + jitter);
        await this._sleep(waitMs);
      }

      this.running = false;
      this._log('info', '⏹ 已停止发送');
    }

    async stop() {
      this._stopRequested = true;
      this.running = false;
    }

    async _sendMessage(text) {
      // 尝试多种可能的输入框选择器（小红书可能有多个版本）
      const selectors = [
        'input[placeholder*="说点什么"]',
        'input[placeholder*="弹幕"]',
        'input[placeholder*="评论"]',
        'textarea[placeholder*="说点什么"]',
        '[contenteditable="true"]',
        '.input-area input',
        '.chat-input input',
      ];

      let inputEl = null;
      for (const sel of selectors) {
        inputEl = await this.page.$(sel);
        if (inputEl) break;
      }

      if (!inputEl) {
        // 尝试通用的 input 或 textarea
        inputEl = await this.page.$('input') || await this.page.$('textarea');
      }

      if (!inputEl) throw new Error('找不到输入框');

      await inputEl.click();
      await inputEl.fill('');
      await inputEl.type(text, { delay: 50 });

      // 尝试点击发送按钮
      const sendBtnSelectors = [
        'button:has-text("发送")',
        '[type="submit"]',
        '.send-btn',
        'button:has-text("发布")',
      ];

      let sent = false;
      for (const sel of sendBtnSelectors) {
        const btn = await this.page.$(sel);
        if (btn) {
          await btn.click();
          sent = true;
          break;
        }
      }

      if (!sent) {
        // 按回车发送
        await this.page.keyboard.press('Enter');
      }
    }

    _sleep(ms) {
      return new Promise(r => setTimeout(r, ms));
    }

    _log(level, message) {
      if (this.onLog) this.onLog({ level, message, time: new Date().toISOString() });
    }
  }
  ```

- [ ] **步骤 2: 提交**
  ```bash
  git add server/bot.js
  git commit -m "feat: add Playwright bot module"
  ```

---

### 任务 4: Server — Express + WebSocket

**文件：**
- 创建: `server/index.js`

- [ ] **步骤 1: 写 server/index.js**
  ```javascript
  // server/index.js
  import express from 'express';
  import { createServer } from 'http';
  import { WebSocketServer } from 'ws';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import { DanmuBot } from './bot.js';
  import config from './config.js';

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const app = express();
  const server = createServer(app);

  // 生产环境托管前端静态文件
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // WebSocket
  const wss = new WebSocketServer({ server });
  const bot = new DanmuBot();

  wss.on('connection', (ws) => {
    console.log('[WS] 客户端已连接');

    // 把 bot 的回调绑定到 WebSocket 推送
    bot.onLog = (logEntry) => {
      ws.send(JSON.stringify({ type: 'log', ...logEntry }));
    };
    bot.onError = (msg) => {
      ws.send(JSON.stringify({ type: 'error', message: msg }));
    };
    bot.onCount = (count) => {
      ws.send(JSON.stringify({ type: 'count', sent: count }));
    };

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'connect':
            await bot.connect(msg.url);
            ws.send(JSON.stringify({ type: 'status', state: 'connected', url: msg.url }));
            break;

          case 'disconnect':
            await bot.disconnect();
            ws.send(JSON.stringify({ type: 'status', state: 'disconnected' }));
            break;

          case 'start':
            await bot.start(msg.prefix, msg.options || {});
            ws.send(JSON.stringify({ type: 'status', state: 'idle' }));
            break;

          case 'stop':
            await bot.stop();
            ws.send(JSON.stringify({ type: 'status', state: 'idle' }));
            break;

          case 'getStatus':
            ws.send(JSON.stringify({
              type: 'status',
              state: bot.running ? 'running' : (bot.page ? 'connected' : 'disconnected'),
              sentCount: bot.sentCount,
            }));
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: `未知消息类型: ${msg.type}` }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      console.log('[WS] 客户端已断开');
    });

    // 发送初始状态
    ws.send(JSON.stringify({ type: 'status', state: 'disconnected', sentCount: 0 }));
  });

  server.listen(config.port, () => {
    console.log(`🕊️  RedNoteDanmuBot 服务已启动: http://localhost:${config.port}`);
  });
  ```

- [ ] **步骤 2: 提交**
  ```bash
  git add server/index.js
  git commit -m "feat: add Express + WebSocket server"
  ```

---

### 任务 5: Vue 3 前端 — 控制面板

**文件：**
- 创建: `client/package.json`
- 创建: `client/index.html`
- 创建: `client/vite.config.js`
- 创建: `client/src/main.js`
- 创建: `client/src/App.vue`
- 创建: `client/src/style.css`

- [ ] **步骤 1: 创建 client 目录结构**
  运行: `mkdir -p client/src/components`

- [ ] **步骤 2: 写 client/package.json**
  ```json
  {
    "name": "rednote-danmu-bot-client",
    "version": "1.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "vue": "^3.5.0"
    },
    "devDependencies": {
      "@vitejs/plugin-vue": "^5.2.0",
      "vite": "^6.0.0"
    }
  }
  ```

- [ ] **步骤 3: 写 client/vite.config.js**
  ```javascript
  import { defineConfig } from 'vite';
  import vue from '@vitejs/plugin-vue';

  export default defineConfig({
    plugins: [vue()],
    server: {
      proxy: {
        '/ws': {
          target: 'ws://localhost:3000',
          ws: true,
        },
      },
    },
  });
  ```

- [ ] **步骤 4: 写 client/index.html**
  ```html
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RedNoteDanmuBot</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
  </html>
  ```

- [ ] **步骤 5: 写 client/src/main.js**
  ```javascript
  import { createApp } from 'vue';
  import App from './App.vue';
  import './style.css';

  createApp(App).mount('#app');
  ```

- [ ] **步骤 6: 写 client/src/style.css**
  ```css
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    color: #333;
    min-height: 100vh;
  }
  #app {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  h1 {
    font-size: 24px;
    margin-bottom: 20px;
    color: #ff2442;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card {
    background: white;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .card h2 {
    font-size: 16px;
    margin-bottom: 12px;
    color: #666;
  }
  input, select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus { border-color: #ff2442; }
  button {
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  button:hover { opacity: 0.85; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: #ff2442; color: white; }
  .btn-success { background: #07c160; color: white; }
  .btn-danger  { background: #fa5151; color: white; }
  .btn-default { background: #f0f0f0; color: #333; }
  .status-dot {
    display: inline-block;
    width: 10px; height: 10px;
    border-radius: 50%;
    margin-right: 6px;
  }
  .status-dot.connected    { background: #07c160; }
  .status-dot.disconnected { background: #ccc; }
  .status-dot.running      { background: #ff2442; animation: pulse 1s infinite; }
  .status-dot.error        { background: #fa5151; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }
  .log-area {
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    max-height: 300px;
    overflow-y: auto;
    line-height: 1.6;
  }
  .log-area .success { color: #07c160; }
  .log-area .error   { color: #fa5151; }
  .log-area .info    { color: #70b8ff; }
  .row { display: flex; gap: 12px; align-items: center; }
  .row > * { flex: 1; }
  .checkbox-group { display: flex; gap: 16px; flex-wrap: wrap; }
  .checkbox-group label { display: flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer; }
  .checkbox-group input[type="checkbox"] { width: auto; }
  .sent-count {
    font-size: 32px;
    font-weight: bold;
    color: #ff2442;
    text-align: center;
  }
  ```

- [ ] **步骤 7: 写 App.vue — 主面板（完整组件）**
  ```vue
  <!-- client/src/App.vue -->
  <template>
    <div>
      <h1>🕊️ RedNoteDanmuBot</h1>

      <!-- 连接区 -->
      <div class="card">
        <h2>直播间连接</h2>
        <div class="row" style="margin-bottom: 8px;">
          <input v-model="url" placeholder="请输入小红书直播间 URL" :disabled="status !== 'disconnected'" />
          <button v-if="status === 'disconnected'" class="btn-primary" @click="connect" :disabled="!url">连接</button>
          <button v-else class="btn-danger" @click="disconnect">断开</button>
        </div>
        <div>
          <span class="status-dot" :class="status"></span>
          <span>{{ statusText }}</span>
        </div>
      </div>

      <!-- 消息设置区 -->
      <div class="card">
        <h2>消息设置</h2>
        <div class="row" style="margin-bottom: 12px;">
          <div>
            <label style="font-size: 13px; color: #888;">消息前缀</label>
            <input v-model="prefix" placeholder="例: 76" />
          </div>
          <div>
            <label style="font-size: 13px; color: #888;">间隔 (ms)</label>
            <input v-model.number="interval" type="number" :min="1500" :max="8000" />
          </div>
        </div>
        <div class="row" style="margin-bottom: 12px;">
          <div>
            <label style="font-size: 13px; color: #888;">随机串最短</label>
            <input v-model.number="randomMinLen" type="number" min="1" max="10" />
          </div>
          <div>
            <label style="font-size: 13px; color: #888;">随机串最长</label>
            <input v-model.number="randomMaxLen" type="number" min="1" max="10" />
          </div>
        </div>
        <div class="checkbox-group">
          <label><input type="checkbox" v-model="useLetters" /> 字母</label>
          <label><input type="checkbox" v-model="useSymbols" /> 符号</label>
          <label><input type="checkbox" v-model="useEmojis" /> 表情</label>
        </div>
      </div>

      <!-- 控制区 -->
      <div class="card">
        <h2>发送控制</h2>
        <div style="text-align: center; margin-bottom: 12px;">
          <div class="sent-count">{{ sentCount }}</div>
          <div style="font-size: 13px; color: #888;">已发送</div>
        </div>
        <div style="text-align: center;">
          <button
            v-if="status !== 'running'"
            class="btn-success"
            @click="start"
            :disabled="status !== 'connected'"
            style="padding: 12px 40px; font-size: 16px;"
          >▶ 开始发送</button>
          <button
            v-else
            class="btn-danger"
            @click="stop"
            style="padding: 12px 40px; font-size: 16px;"
          >■ 停止</button>
        </div>
      </div>

      <!-- 日志区 -->
      <div class="card">
        <h2>运行日志</h2>
        <div class="log-area" ref="logRef">
          <div v-for="(log, i) in logs" :key="i" :class="log.level">
            {{ log.time.slice(11, 19) }} {{ log.message }}
          </div>
          <div v-if="logs.length === 0" style="color: #888;">等待操作...</div>
        </div>
      </div>
    </div>
  </template>

  <script>
  import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';

  export default {
    name: 'App',
    setup() {
      const url = ref('');
      const prefix = ref('76');
      const interval = ref(2500);
      const randomMinLen = ref(3);
      const randomMaxLen = ref(6);
      const useLetters = ref(true);
      const useSymbols = ref(true);
      const useEmojis = ref(true);
      const status = ref('disconnected');
      const sentCount = ref(0);
      const logs = ref([]);
      const logRef = ref(null);

      let ws = null;
      let reconnectTimer = null;

      const statusText = computed(() => {
        const map = {
          disconnected: '未连接',
          connected: '已连接',
          running: '发送中...',
          idle: '就绪',
          error: '错误',
        };
        return map[status.value] || status.value;
      });

      function connectWebSocket() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WS] 已连接');
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'status':
              status.value = msg.state;
              if (msg.sentCount !== undefined) sentCount.value = msg.sentCount;
              break;
            case 'log':
              logs.value.push(msg);
              if (logs.value.length > 200) logs.value.shift();
              nextTick(() => {
                if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight;
              });
              break;
            case 'count':
              sentCount.value = msg.sent;
              break;
            case 'error':
              logs.value.push({ level: 'error', message: msg.message, time: new Date().toISOString() });
              break;
          }
        };

        ws.onclose = () => {
          console.log('[WS] 断开，3秒后重连');
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      }

      function sendWs(msg) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      }

      function connect() {
        if (!url.value) return;
        sendWs({ type: 'connect', url: url.value });
      }

      function disconnect() {
        sendWs({ type: 'disconnect' });
      }

      function start() {
        sendWs({
          type: 'start',
          prefix: prefix.value,
          options: {
            interval: interval.value,
            randomMinLen: randomMinLen.value,
            randomMaxLen: randomMaxLen.value,
            useLetters: useLetters.value,
            useSymbols: useSymbols.value,
            useEmojis: useEmojis.value,
          },
        });
      }

      function stop() {
        sendWs({ type: 'stop' });
      }

      onMounted(() => {
        connectWebSocket();
      });

      onUnmounted(() => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (ws) ws.close();
      });

      return {
        url, prefix, interval, randomMinLen, randomMaxLen,
        useLetters, useSymbols, useEmojis,
        status, statusText, sentCount, logs, logRef,
        connect, disconnect, start, stop,
      };
    },
  };
  </script>
  ```

- [ ] **步骤 8: 安装前端依赖并测试构建**
  运行:
  ```bash
  cd client && npm install && npx vite build
  ```
  预期: client/dist/ 目录生成

- [ ] **步骤 9: 提交**
  ```bash
  git add client/
  git commit -m "feat: add Vue 3 web control panel"
  ```

---

### 任务 6: 完善 README + 最终联调

**文件：**
- 创建: `README.md`

- [ ] **步骤 1: 写 README.md**
  ```markdown
  # 🕊️ RedNoteDanmuBot

  小红书直播间弹幕机器人 — 通过 Web 控制面板自动发送弹幕。

  ## 快速开始

  ```bash
  # 安装依赖
  npm install
  cd client && npm install && cd ..

  # 构建前端
  cd client && npx vite build && cd ..

  # 启动服务
  npm run server
  ```

  打开浏览器访问 `http://localhost:3000`

  ## 使用说明

  1. 在浏览器中打开小红书直播间页面，扫码登录
  2. 在控制面板输入直播间 URL → 点击「连接」
  3. 在 Playwright 打开的浏览器中完成扫码登录
  4. 设置消息前缀、发送间隔、随机字符串配置
  5. 点击「开始发送」

  ## 开发

  ```bash
  # 前端开发（热更新）
  cd client && npx vite

  # 运行测试
  npx jest
  ```

  ## 配置

  见 `server/config.js`
  ```

- [ ] **步骤 2: 提交**
  ```bash
  git add README.md
  git commit -m "docs: add README"
  ```

- [ ] **步骤 3: 最终验证**
  运行: `npm run server`
  预期: 服务启动在 http://localhost:3000，浏览器打开可看到控制面板

---

## Spec 覆盖检查

- [x] 技术架构（Node + Express + WS + Playwright + Vue 3）→ 任务 1, 4, 5
- [x] randomizer 模块 → 任务 2
- [x] bot.js 弹幕发送逻辑 → 任务 3
- [x] WebSocket 通信协议 → 任务 4, 5
- [x] Web 控制面板 UI → 任务 5
- [x] 频率控制 + 随机抖动 → 任务 3 (bot.js start 方法)
- [x] 随机字符串配置 → 任务 2, 5
- [x] 登录态通过 Playwright 手动扫码 → 任务 3 (connect 方法)
