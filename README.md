# 🕊️ RedNoteDanmuBot

小红书直播间弹幕机器人 — 通过 Web 控制面板自动发送弹幕。

## 功能

- **🎮 三面板控制**：控制 / 关键词 / 数据，标签页切换
- **🧠 智能消息引擎**：`前缀 + 关键词 + 随机符号` 组合，每次不同，防检测
- **📝 关键词管理**：可增删改关键词，支持 iOS 开关启用/禁用
- **📊 数据看板**：实时速率折线图 + 7 日柱状图 + 统计卡片
- **💾 数据持久化**：SQLite 存储发送记录，重启不丢失
- **🎯 频率控制**：可调发送间隔 + 随机抖动（防风控）
- **📋 实时日志**：发送状态、计数、错误信息一目了然
- **🔄 免扫码**：持久化浏览器会话，一次登录长期使用

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 安装前端依赖并构建
cd client && npm install && npx vite build && cd ..

# 3. 启动服务
npm run server
```

打开浏览器访问 **http://localhost:3000**

## 使用说明

1. **启动服务**，浏览器打开控制面板
2. 在 Playwright 打开的 Chrome 窗口中登录小红书
3. 复制直播间 URL → 点击「连接」
4. 在 **关键词** 页面设置你想发的词句（如"中！"、"冲冲冲"）
5. 回到 **控制** 页面，输入前缀（如"76"），点击「开始发送」
6. 切换到 **数据** 页面查看实时发送统计

### 消息构成

```
用户前缀  +  关键词(随机选)  +  随机符号/表情
   "76"       "中！"           "~!@😊"
   "76"       "冲冲冲"          "🔥✨"

→ 每次发送结果都不同，防止被吞
```

## 配置

编辑 `server/config.js`：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `port` | 3000 | 服务端口 |
| `defaultInterval` | 2500 | 默认发送间隔 (ms) |
| `minInterval` | 1500 | 最小发送间隔 (ms) |
| `maxInterval` | 8000 | 最大发送间隔 (ms) |
| `jitterRatio` | 0.3 | 间隔抖动比例 (±30%) |
| `headless` | false | 是否无头浏览器模式 |
| `userDataDir` | `.chromium-profile` | 浏览器用户数据目录 |

## 开发

```bash
# 前端热更新开发
cd client && npx vite

# 运行全部测试
npx --node-options="--experimental-vm-modules" jest

# 构建前端
cd client && npx vite build
```

## 项目结构

```
RedNoteDanmuBot/
├── server/
│   ├── index.js            # Express + WebSocket 服务
│   ├── bot.js              # Playwright 弹幕发送核心
│   ├── messageEngine.js    # 智能消息引擎
│   ├── database.js         # SQLite 持久化
│   ├── randomizer.js       # 随机字符串生成
│   ├── config.js           # 默认配置
│   └── __tests__/          # 13 个测试
├── client/
│   ├── src/
│   │   ├── App.vue         # 主控制面板
│   │   ├── main.js
│   │   ├── style.css
│   │   └── components/
│   │       ├── KeywordManager.vue  # 关键词管理
│   │       └── AnalyticsPanel.vue  # 数据看板
│   ├── index.html
│   └── vite.config.js
├── data/                   # SQLite 数据库（自动创建）
├── .chromium-profile/      # 浏览器会话缓存
├── package.json
└── README.md
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express + WebSocket |
| 浏览器自动化 | Playwright |
| 前端 | Vue 3 + Chart.js + Vite |
| 存储 | SQLite (better-sqlite3) |

## 测试

```bash
npx --node-options="--experimental-vm-modules" jest
```

13 个测试覆盖：randomizer / database / messageEngine

## 注意事项

- 请合理使用，避免违反小红书社区规则
- 发送频率建议 2-3 秒以上间隔
- 首次使用需要在 Playwright 打开的浏览器中扫码登录
- 登录态会保存在 `.chromium-profile/` 目录，下次免扫码
