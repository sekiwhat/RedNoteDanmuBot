# 小红书直播弹幕机器人 — 设计文档

## 概述

一个通过 Web 控制面板控制浏览器自动发送直播间弹幕的工具，用于在指定小红书直播间中以可控频率发送自定义消息，帮助用户在直播间互动/抢东西。

## 技术架构

| 层级 | 选型 | 理由 |
|------|------|------|
| 后端运行时 | Node.js | Playwright 官方 Node.js SDK，生态成熟 |
| Web 框架 | Express | 轻量，配合 ws 库做 WebSocket |
| 实时通信 | WebSocket (ws) | 双向实时推送状态 + 控制指令 |
| 浏览器自动化 | Playwright | 模拟真人浏览器，稳定性好 |
| 前端框架 | Vue 3 + Vite | 国内生态友好，控制面板场景简洁 |
| 前端 HTTP 客户端 | fetch + WebSocket 原生 API | 不引入额外依赖 |

## 项目目录结构

```
xiaohongshu-live-bot/
├── server/
│   ├── index.js          # Express 入口 + WebSocket 服务
│   ├── bot.js            # Playwright 核心逻辑（浏览器管理 + 弹幕发送）
│   ├── randomizer.js     # 随机字符串生成器
│   └── config.js         # 默认配置
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.js
│       ├── App.vue       # 主面板
│       ├── components/
│       │   ├── ConnectionPanel.vue   # 直播间连接区
│       │   ├── ControlPanel.vue      # 开始/停止/频率控制
│       │   ├── MessageInput.vue      # 消息前缀 + 随机串配置
│       │   └── StatusLog.vue         # 实时日志
│       └── style.css
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2025-01-xiaohongshu-live-bot-design.md
├── package.json
└── README.md
```

## 核心模块设计

### 1. 连接模块 (bot.js)

```
用户输入直播间URL
    → Playwright 启动浏览器（有头/无头可配）
    → 打开直播间页面
    → 检测页面加载完成（等待特定 DOM 元素出现）
    → 准备就绪 → 通知前端
```

- **浏览器实例**：全局单例，复用同一个浏览器上下文
- **有头/无头**：默认有头（可见浏览器便于调试），支持切换无头模式
- **登录态**：用户需要先在 Playwright 打开的浏览器中扫码登录小红书
- **连接状态**：disconnected / connecting / connected / error

### 2. 弹幕发送模块 (bot.js)

```
sendMessage(prefix, randomString)
    → 定位输入框（DOM 选择器）
    → 清空输入框
    → 输入: prefix + " " + randomString
    → 点击发送按钮（或回车）
    → 记录发送日志
```

**DOM 选择器策略：**
- 输入框：通过小红书直播间页面的 DOM 结构定位（需要实测）
- 发送按钮：同上
- 支持选择器配置化，便于页面改版时更新

### 3. 随机字符串生成器 (randomizer.js)

```javascript
// 默认字符集
const CHARS = {
  letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  symbols: '~!@#$%^&*_+-=:;,.?',
  emojis: '😊😂❤️🌹🎉🔥✨💪🎊🎁😘🥰👏💕🎈🌺🌸⭐🌟💫'
};

generate(options = {})
  // length: 随机串长度（默认 3-6）
  // charSets: 使用的字符集（默认 letters + symbols + emojis）
  // excludeNumbers: true（硬编码，不含数字）
  // customTemplate: 用户自定义格式
```

用户可配置项：
- 随机串长度范围（默认 3-6）
- 启用/禁用某类字符（字母/符号/表情）
- 自定义模板（如 `{{prefix}} {{random}} ~`）

### 4. 控制逻辑

**发送模式：循环发送**
```
用户点击「开始」
    → 读取间隔配置（默认 2500ms，带 ±800ms 随机抖动）
    → 进入循环：
        1. 生成随机字符串
        2. 发送消息（prefix + " " + randomString）
        3. 等待 interval + randomJitter
        4. 检查是否收到「停止」信号
    → 用户点击「停止」→ 退出循环
```

**频率保护：**
- 基础间隔：用户可配置（建议范围 1500-8000ms）
- 随机抖动：±30% 的基础间隔（防止固定间隔被风控）
- 发送计数：实时显示已发送条数
- 错误处理：发送失败自动重试 1 次，连续 3 次失败则暂停

### 5. WebSocket 消息协议

```
客户端 → 服务端：
  { type: 'connect',   url: 'https://...' }       // 连接直播间
  { type: 'disconnect' }                            // 断开连接
  { type: 'start',     prefix: '76', interval: 2500 }  // 开始发送
  { type: 'stop' }                                  // 停止发送
  { type: 'updateConfig', { ... } }                 // 更新配置

服务端 → 客户端：
  { type: 'status',    state: 'connected' }         // 状态更新
  { type: 'log',       message: '...', level: 'info' }  // 日志
  { type: 'count',     sent: 42 }                   // 发送计数
  { type: 'error',     message: '...' }             // 错误
```

### 6. 前端界面布局

```
┌──────────────────────────────────────────┐
│  小红书直播弹幕机器人                       │
├──────────────────────────────────────────┤
│  直播间连接                               │
│  [输入直播间 URL _________________] [连接] │
│  状态: ● 已连接 / ○ 未连接                │
├──────────────────────────────────────────┤
│  消息设置                                 │
│  消息前缀: [76      ]                     │
│  随机串长度: [3] ~ [6]                    │
│  ☑ 字母  ☑ 符号  ☑ 表情                  │
│  自定义模板: [{{prefix}} {{random}}]      │
├──────────────────────────────────────────┤
│  发送控制     [▶ 开始]  [■ 停止]          │
│  间隔: [2500]ms 已发送: 42 条             │
├──────────────────────────────────────────┤
│  运行日志                                 │
│  [12:00:01] ✅ 已发送: 76 Ab3@ 😊         │
│  [12:00:03] ✅ 已发送: 76 xK!9 🌹         │
│  [12:00:06] ❌ 发送失败，重试中...         │
└──────────────────────────────────────────┘
```

## 测试策略

- Playwright 浏览器操作部分：通过手动测试验证（需要真实小红书直播间）
- randomizer.js：单元测试（Jest），验证字符集、长度、不包含数字
- WebSocket 协议：集成测试
- 前端：Vue 组件的手动测试为主

## 项目初始化

```bash
npm init -y
npm install express ws playwright vue@next vite @vitejs/plugin-vue
npx playwright install chromium
```

## MVP 范围

第一期实现：
- [x] 手动输入直播间 URL 连接
- [x] Playwright 打开直播间页面
- [x] 发送消息（前缀 + 随机串）
- [x] Web 控制面板（开始/停止/状态/日志）
- [x] 频率控制（可配置间隔 + 随机抖动）
- [x] 随机字符串配置（字符集/长度/模板）
- [x] 发送计数显示

后续迭代：
- [ ] 小红书表情库内置
- [ ] 扫码登录 + 直播列表
- [ ] 协议直发（无需浏览器）
- [ ] 多直播间同时控制
- [ ] 定时任务/预设方案

## 开放问题

1. DOM 选择器需要在实际小红书直播间页面验证
2. 登录态保持策略：需要用户手动扫码登录一次，后续通过 session/cookie 持久化？
3. 是否需要 Docker 容器化方便部署？
