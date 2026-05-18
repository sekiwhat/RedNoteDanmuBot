# 🕊️ RedNoteDanmuBot

小红书直播间弹幕机器人 — 通过 Web 控制面板自动发送弹幕。

## 功能

- **Web 控制面板**：浏览器操作界面，实时控制
- **自动发弹幕**：用户指定前缀 + 随机字符串（防吞弹幕）
- **频率控制**：可调发送间隔 + 随机抖动（防风控）
- **随机字符串**：字母、符号、表情混搭，不含数字，用户可自定义字符集
- **实时日志**：发送状态、计数、错误信息一目了然

## 快速开始

```bash
# 1. 安装后端依赖
npm install

# 2. 安装前端依赖并构建
cd client && npm install && npx vite build && cd ..

# 3. 启动服务
npm run server
```

打开浏览器访问 **http://localhost:3000**

## 使用说明

1. **启动服务**后，浏览器打开控制面板
2. 在小红书直播间页面**扫码登录**（需要先在浏览器登录小红书）
3. 复制直播间 URL 粘贴到控制面板 → 点击「连接」
4. Playwright 会自动打开一个浏览器窗口进入直播间，在**该窗口**中完成扫码登录（如有需要）
5. 设置消息前缀、发送间隔、随机串配置
6. 点击「开始发送」
7. 点击「停止」结束发送

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
| `randomLengthMin` | 3 | 随机串最小长度 |
| `randomLengthMax` | 6 | 随机串最大长度 |

## 开发

```bash
# 前端热更新开发
cd client && npx vite

# 运行测试
npx jest server/__tests__/randomizer.test.js

# 构建前端
cd client && npx vite build
```

## 项目结构

```
RedNoteDanmuBot/
├── server/
│   ├── index.js          # Express + WebSocket 服务
│   ├── bot.js            # Playwright 弹幕发送核心
│   ├── randomizer.js     # 随机字符串生成
│   ├── config.js         # 默认配置
│   └── __tests__/
│       └── randomizer.test.js
├── client/
│   ├── src/
│   │   ├── App.vue       # 主控制面板
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   └── vite.config.js
├── docs/
│   └── superpowers/
├── package.json
└── README.md
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express + WebSocket |
| 浏览器自动化 | Playwright |
| 前端 | Vue 3 + Vite |

## 注意事项

- 请合理使用，避免违反小红书社区规则
- 发送频率不宜过快，建议 2-3 秒以上间隔
- 首次使用需要在小红书直播间完成扫码登录
