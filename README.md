# 🕊️ RedNoteDanmuBot

小红书直播间弹幕机器人 — Web 控制面板自动发送弹幕，支持 Chrome / Edge / Safari。

## 功能一览

| 功能 | 说明 |
|------|------|
| 🎮 **三面板控制** | 控制 / 关键词 / 数据，标签页切换 |
| 🧠 **双模式消息** | 关键词模式（前缀+词+符号）或全随机模式 |
| 📝 **关键词管理** | 增删改关键词，iOS 开关启用/禁用 |
| 📊 **数据看板** | 实时折线图 + 7 日柱状图 + 4 张统计卡 |
| 💾 **自动持久化** | SQLite 存储发送记录，重启不丢 |
| 🎯 **智能防检测** | 随机抖动 ±30%、每次消息不同、真人化 |
| 🔄 **免重复扫码** | 浏览器会话持久化，一次登录长期使用 |
| 🌐 **多浏览器** | Chrome / Edge / Safari 任意切换 |

## 快速开始

### macOS

```bash
# 1. 克隆项目
git clone https://github.com/sekiwhat/RedNoteDanmuBot.git
cd RedNoteDanmuBot

# 2. 安装后端依赖
npm install

# 3. 安装前端依赖并构建
cd client && npm install && npx vite build && cd ..

# 4. 启动
npm run server
```

打开浏览器访问 **http://localhost:3000**

### Windows

```bash
# 步骤同上，完全一致
npm install
cd client && npm install && npx vite build && cd ..
npm run server
```

### macOS 特别说明

| 浏览器 | 是否需要额外操作 |
|--------|----------------|
| **Chrome** | ✅ 即开即用（需已安装 Chrome） |
| **Edge** | ✅ 即开即用 |
| **Safari / WebKit** | 运行 `npx playwright install webkit`（首次） |

> 💡 macOS 上 Safari 模式使用的是 Playwright 自带的 WebKit 引擎（非系统 Safari），表现与 Chrome 一致。

## 使用指南

### 第一步：连接直播间

```
① 启动服务 → ② 打开 http://localhost:3000
③ 选择浏览器 → ④ 输入直播间 URL → ⑤ 点击「连接」
⑥ 在 Playwright 打开的浏览器窗口中扫码登录小红书
```

### 第二步：选择消息模式

**全随机模式**（默认）：前缀 + 随机字母/符号/表情（可调长度和字符集）

```
"76" + "xK@!😊"  →  "76xK@!😊"
"76" + "Ab~#🌹"  →  "76Ab~#🌹"
```

**关键词模式**：每次从你的词库中随机选一个，追加符号

```
"76" + "xK@!😊"  →  "76xK@!😊"
"76" + "Ab~#🌹"  →  "76Ab~#🌹"
```

### 第三步：开始发送

```
设置前缀（如 "76"）→ 调整间隔（建议 2000ms）
→ 点击「开始发送」→ 切到「数据」看实时统计
→ 点击「停止」结束
```

## 配置

编辑 `server/config.js`：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `port` | 3000 | 服务端口 |
| `browser` | `chrome` | 默认浏览器 |
| `defaultInterval` | 2500 | 发送间隔 (ms) |
| `minInterval` | 1500 | 最小间隔 |
| `maxInterval` | 8000 | 最大间隔 |
| `jitterRatio` | 0.3 | 抖动比例 (±30%) |
| `headless` | false | 无头模式 |
| `userDataDir` | `.chromium-profile` | 会话缓存目录 |

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express + WebSocket |
| 浏览器 | Playwright (Chrome / Edge / WebKit) |
| 前端 | Vue 3 + Chart.js + Vite |
| 存储 | SQLite (better-sqlite3) |

## 项目结构

```
RedNoteDanmuBot/
├── server/                      # 后端
│   ├── index.js                 # Express + WebSocket
│   ├── bot.js                   # Playwright 核心
│   ├── messageEngine.js         # 智能消息引擎
│   ├── database.js              # SQLite 持久化
│   ├── randomizer.js            # 随机字符串
│   ├── config.js                # 配置
│   └── __tests__/               # 13 个测试
├── client/                      # 前端
│   └── src/
│       ├── App.vue              # 主面板
│       ├── components/
│       │   ├── KeywordManager.vue   # 关键词管理
│       │   └── AnalyticsPanel.vue   # 数据看板
│       └── style.css
├── data/                        # SQLite（自动创建）
├── .chromium-profile/           # 浏览器会话（自动创建）
└── package.json
```

## 开发

```bash
# 前端热更新
cd client && npx vite

# 运行测试
npx --node-options="--experimental-vm-modules" jest

# 构建前端
cd client && npx vite build
```

测试覆盖：`randomizer` / `database` / `messageEngine`，共 13 个。

## 注意

- ⚠️ 请合理使用，遵守小红书社区规则
- ⏱ 发送间隔建议 2000ms 以上，太快容易被风控
- 🔑 首次使用需在 Playwright 打开的浏览器中扫码登录
- 💾 登录态保存在 `.chromium-profile/`，下次免扫码
- 🍎 macOS 用户首次使用 Safari 模式需先跑 `npx playwright install webkit`
