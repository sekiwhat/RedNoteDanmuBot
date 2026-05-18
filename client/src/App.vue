<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import KeywordManager from './components/KeywordManager.vue';
import AnalyticsPanel from './components/AnalyticsPanel.vue';

// ─── State ──────────────────────────────────────────────────────────────────────
const url = ref('');
const browser = ref('chrome');
const prefix = ref('76');
const interval = ref(2500);
const activeTab = ref('control');
const kwManagerRef = ref(null);
const analyticsRef = ref(null);
const status = ref('disconnected');
const sentCount = ref(0);
const logs = ref([]);
const logContainer = ref(null);
const countBump = ref(false);
const errorMsg = ref('');

// ─── WebSocket ───────────────────────────────────────────────────────────────────
let ws = null;
let reconnectTimer = null;

const wsUrl = computed(() => {
  const p = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${p}//${location.host}`;
});

const statusLabel = computed(() => ({
  disconnected: '未连接',
  connected: '已连接',
  running: '发送中…',
  idle: '已连接',
}[status.value] || status.value));

function connectWS() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  ws = new WebSocket(wsUrl.value);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'getStatus' }));
  ws.onmessage = (e) => {
    let d;
    try { d = JSON.parse(e.data); } catch { return; }
    switch (d.type) {
      case 'status':
        status.value = d.state;
        errorMsg.value = '';
        if (d.sentCount !== undefined) sentCount.value = d.sentCount;
        break;
      case 'count':
        sentCount.value = d.sent;
        countBump.value = true;
        setTimeout(() => countBump.value = false, 150);
        break;
      case 'keywords':
        if (kwManagerRef.value?.setKeywords) kwManagerRef.value.setKeywords(d.list);
        break;
      case 'stats':
        if (analyticsRef.value?.setStats) analyticsRef.value.setStats(d);
        break;
      case 'log':
      case 'error':
        logs.value.push({
          level: d.type === 'error' ? 'error' : (d.level || 'info'),
          message: d.message,
          time: d.time || new Date().toISOString(),
        });
        if (d.type === 'error') errorMsg.value = d.message;
        if (logs.value.length > 200) logs.value = logs.value.slice(-200);
        nextTick(scrollLogs);
        break;
    }
  };
  ws.onclose = () => {
    status.value = 'disconnected';
    reconnectTimer = setTimeout(connectWS, 3000);
  };
}

function scrollLogs() {
  const el = logContainer.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function send(cmd) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(cmd));
}

// ─── Actions ─────────────────────────────────────────────────────────────────────
function connect() {
  if (!url.value.trim()) return;
  errorMsg.value = '';
  send({ type: 'connect', url: url.value.trim(), browser: browser.value });
}
function disconnect() {
  errorMsg.value = '';
  send({ type: 'disconnect' });
}
function start() {
  errorMsg.value = '';
  send({ type: 'start', prefix: prefix.value, options: { interval: interval.value } });
}
function stop() { send({ type: 'stop' }); }

// ─── Button states ───────────────────────────────────────────────────────────────
const canConnect = computed(() => status.value === 'disconnected');
const canDisconnect = computed(() => ['connected', 'idle'].includes(status.value));
const canStart = computed(() => ['connected', 'idle'].includes(status.value));
const canStop = computed(() => status.value === 'running');

// ─── Watch tab changes ────────────────────────────────────────────────────────────
watch(activeTab, (tab) => {
  if (tab === 'keywords') send({ type: 'listKeywords' });
  if (tab === 'analytics') send({ type: 'getStats' });
});

// ─── Lifecycle ───────────────────────────────────────────────────────────────────
onMounted(connectWS);
onUnmounted(() => {
  clearTimeout(reconnectTimer);
  if (ws) { ws.onclose = null; ws.close(); ws = null; }
});

function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false }); }
  catch { return '--:--:--'; }
}
</script>

<template>
  <!-- Header -->
  <header class="app-header">
    <h1>🕊️ RedNoteDanmuBot</h1>
    <span class="subtitle">小红书弹幕控制面板</span>
  </header>

  <!-- ─── Tab Bar ─── -->
  <div class="tab-bar">
    <button class="tab-btn" :class="{ active: activeTab === 'control' }" @click="activeTab = 'control'">🎮 控制</button>
    <button class="tab-btn" :class="{ active: activeTab === 'keywords' }" @click="activeTab = 'keywords'">📝 关键词</button>
    <button class="tab-btn" :class="{ active: activeTab === 'analytics' }" @click="activeTab = 'analytics'">📊 数据</button>
  </div>

  <!-- ════════════════════════ 控制 ════════════════════════ -->
  <div v-show="activeTab === 'control'">

    <div class="dash-grid">

      <!-- ─── Column 1: 连接 ─── -->
      <div class="dash-col">
        <div class="card">
          <div class="card-header">🔗 连接</div>
          <div class="card-body">
            <div class="status-line">
              <span class="status-dot" :class="status"></span>
              <span>{{ statusLabel }}</span>
            </div>
            <div class="status-url">{{ url || '未指定直播间' }}</div>
            <div style="margin-top:10px;display:flex;gap:6px;">
              <input
                class="input-field"
                style="flex:1;text-align:left;border:0.5px solid var(--separator);border-radius:6px;padding:8px 10px;"
                v-model="url"
                placeholder="https://www.xiaohongshu.com/..."
                :disabled="!canConnect"
                @keyup.enter="connect"
              />
              <select
                v-model="browser"
                class="browser-select"
                :disabled="!canConnect"
              >
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="safari">Safari</option>
              </select>
            </div>
            <div class="btn-row" style="margin-top:8px;">
              <button class="btn btn-primary btn-half" :disabled="!canConnect || !url.trim()" @click="connect">连接</button>
              <button class="btn btn-secondary btn-half" :disabled="!canDisconnect" @click="disconnect">断开</button>
            </div>
            <div v-if="errorMsg && status === 'disconnected'" class="error-banner" style="margin-top:8px;">
              <span>⚠</span><span>{{ errorMsg }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Column 2: 消息 ─── -->
      <div class="dash-col">
        <div class="card">
          <div class="card-header">✏️ 消息</div>
          <div class="card-body">
            <div class="card-row">
              <span class="input-label">前缀</span>
              <input class="input-field" v-model="prefix" placeholder="76" style="max-width:100px;" />
              <span class="input-hint">+ 词</span>
            </div>
            <div class="card-row">
              <span class="input-label">间隔</span>
              <input class="input-field num" v-model.number="interval" type="number" min="1500" max="8000" step="100" />
              <span class="input-hint">ms</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Column 3: 控制 ─── -->
      <div class="dash-col">
        <div class="card">
          <div class="card-header">🎯 控制</div>
          <div class="card-body">
            <div class="count-box">
              <div class="count-number" :class="{ bump: countBump }">{{ sentCount }}</div>
              <div class="count-label">已发送</div>
            </div>
            <div class="btn-row" style="margin-top:4px;">
              <button class="btn btn-success btn-lg btn-half" :disabled="!canStart" @click="start">▶ 开始</button>
              <button class="btn btn-danger btn-lg btn-half" :disabled="!canStop" @click="stop">■ 停止</button>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /dash-grid -->

    <!-- ─── Log (full width) ─── -->
    <div class="card" style="margin-top:0;">
      <div class="card-header">📋 日志</div>
      <div class="card-body" style="padding:0 12px 12px;">
        <div class="log-area" ref="logContainer">
          <div v-if="logs.length === 0" class="log-empty">
            ── 暂无日志 ──<br>
            <span style="font-size:11px;color:#636366;">连接直播间并开始发送后将显示在此</span>
          </div>
          <div v-for="(entry, i) in logs" :key="i" class="log-entry" :class="'log-level-' + entry.level">
            <span class="log-time">{{ fmtTime(entry.time) }}</span>
            <span class="log-tag">[{{ entry.level.toUpperCase() }}]</span>
            <span class="log-msg">{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /控制 -->

  <!-- ════════════════════════ 关键词 ════════════════════════ -->
  <div v-show="activeTab === 'keywords'">
    <KeywordManager ref="kwManagerRef" :ws="ws" />
  </div>

  <!-- ════════════════════════ 数据 ════════════════════════ -->
  <div v-show="activeTab === 'analytics'">
    <AnalyticsPanel ref="analyticsRef" :ws="ws" />
  </div>

  <div v-if="countBump" class="sent-flash">✓</div>
</template>
