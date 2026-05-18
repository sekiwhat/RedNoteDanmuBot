<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

// ─── Reactive state ──────────────────────────────────────────────────
const url = ref('');
const prefix = ref('76');
const interval = ref(2500);
const randomMinLen = ref(3);
const randomMaxLen = ref(6);
const useLetters = ref(true);
const useSymbols = ref(true);
const useEmojis = ref(true);
const status = ref('disconnected');   // disconnected | connected | running | idle
const sentCount = ref(0);
const logs = ref([]);
const logContainer = ref(null);

// ─── WebSocket ───────────────────────────────────────────────────────
let ws = null;
let reconnectTimer = null;
let reconnectAttempts = 0;

const wsUrl = computed(() => {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}`;
});

const statusLabel = computed(() => {
  const map = {
    disconnected: '未连接',
    connected: '已连接',
    running: '发送中',
    idle: '空闲',
  };
  return map[status.value] || status.value;
});

function connectWS() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(wsUrl.value);

  ws.onopen = () => {
    reconnectAttempts = 0;
    // Request current status from server
    ws.send(JSON.stringify({ type: 'getStatus' }));
  };

  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (data.type) {
      case 'status':
        status.value = data.state;
        if (data.sentCount !== undefined) {
          sentCount.value = data.sentCount;
        }
        break;

      case 'count':
        sentCount.value = data.sent;
        break;

      case 'log':
        logs.value.push({
          level: data.level,
          message: data.message,
          time: data.time || new Date().toISOString(),
        });
        trimLogs();
        scrollLogs();
        break;

      case 'error':
        logs.value.push({
          level: 'error',
          message: data.message,
          time: new Date().toISOString(),
        });
        trimLogs();
        scrollLogs();
        break;
    }
  };

  ws.onclose = () => {
    status.value = 'disconnected';
    // Auto-reconnect after 3 seconds
    reconnectTimer = setTimeout(() => {
      connectWS();
    }, 3000);
  };

  ws.onerror = () => {
    // onclose will fire right after, so we just let that handle reconnection
  };
}

function trimLogs() {
  if (logs.value.length > 200) {
    logs.value = logs.value.slice(logs.value.length - 200);
  }
}

function scrollLogs() {
  nextTick(() => {
    const el = logContainer.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

function sendCommand(cmd) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(cmd));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────
function connect() {
  if (!url.value.trim()) return;
  sendCommand({ type: 'connect', url: url.value.trim() });
}

function disconnect() {
  sendCommand({ type: 'disconnect' });
}

function start() {
  sendCommand({
    type: 'start',
    prefix: prefix.value,
    options: {
      interval: interval.value,
      random: {
        minLen: randomMinLen.value,
        maxLen: randomMaxLen.value,
        useLetters: useLetters.value,
        useSymbols: useSymbols.value,
        useEmojis: useEmojis.value,
      },
    },
  });
}

function stop() {
  sendCommand({ type: 'stop' });
}

// ─── Button state helpers ───────────────────────────────────────────
const canConnect = computed(() => status.value === 'disconnected');
const canDisconnect = computed(() => status.value === 'connected' || status.value === 'idle');
const canStart = computed(() => status.value === 'connected' || status.value === 'idle');
const canStop = computed(() => status.value === 'running');

// ─── Lifecycle ───────────────────────────────────────────────────────
onMounted(() => {
  connectWS();
});

onUnmounted(() => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) {
    ws.onclose = null; // prevent reconnect when manually leaving
    ws.close();
    ws = null;
  }
});

// ─── Time formatting helper ─────────────────────────────────────────
function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  } catch {
    return '--:--:--';
  }
}
</script>

<template>
  <!-- Header -->
  <header class="header">
    <h1>🕊️ RedNoteDanmuBot</h1>
    <p>小红书弹幕机器人控制面板</p>
  </header>

  <!-- Connection card -->
  <section class="card">
    <div class="card-title">🔗 连接</div>
    <div class="status-row">
      <span class="status-dot" :class="status"></span>
      <span class="status-label" :class="status">{{ statusLabel }}</span>
    </div>
    <div class="input-group">
      <label for="url">目标 URL</label>
      <input
        id="url"
        v-model="url"
        type="text"
        placeholder="https://www.xiaohongshu.com/..."
        :disabled="!canConnect"
      />
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" :disabled="!canConnect || !url.trim()" @click="connect">连接</button>
      <button class="btn btn-secondary" :disabled="!canDisconnect" @click="disconnect">断开</button>
    </div>
  </section>

  <!-- Message settings card -->
  <section class="card">
    <div class="card-title">⚙️ 消息设置</div>
    <div class="input-group">
      <label for="prefix">前缀</label>
      <input id="prefix" v-model="prefix" type="text" placeholder="76" />
    </div>
    <div class="input-group">
      <label for="interval">间隔 (ms)</label>
      <input id="interval" v-model.number="interval" type="number" min="1500" max="8000" step="100" />
    </div>
    <div class="input-group">
      <label for="randomMinLen">随机长度</label>
      <input id="randomMinLen" v-model.number="randomMinLen" type="number" min="1" max="20" />
      <span style="color: var(--text-dim); font-size:0.85rem; display:flex; align-items:center;">~</span>
      <input v-model.number="randomMaxLen" type="number" min="1" max="20" />
    </div>
    <div class="checkbox-row">
      <label><input type="checkbox" v-model="useLetters" /> 字母</label>
      <label><input type="checkbox" v-model="useSymbols" /> 符号</label>
      <label><input type="checkbox" v-model="useEmojis" /> 表情</label>
    </div>
  </section>

  <!-- Control card -->
  <section class="card">
    <div class="card-title">🎮 控制</div>
    <div class="count-display">
      <div class="count-number">{{ sentCount }}</div>
      <div class="count-label">已发送消息数</div>
    </div>
    <div class="btn-group" style="justify-content: center;">
      <button class="btn btn-success" :disabled="!canStart" @click="start">▶ 开始发送</button>
      <button class="btn btn-danger" :disabled="!canStop" @click="stop">■ 停止</button>
    </div>
  </section>

  <!-- Log card -->
  <section class="card">
    <div class="card-title">📋 日志</div>
    <div class="log-area" ref="logContainer">
      <div v-if="logs.length === 0" class="log-empty">暂无日志</div>
      <div v-for="(entry, idx) in logs" :key="idx" class="log-entry">
        <span class="log-time">{{ formatTime(entry.time) }}</span>
        <span class="log-level" :class="'log-level-' + entry.level">[{{ entry.level.toUpperCase() }}]</span>
        <span class="log-message"> {{ entry.message }}</span>
      </div>
    </div>
  </section>
</template>
