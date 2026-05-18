<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import KeywordManager from './components/KeywordManager.vue';
import AnalyticsPanel from './components/AnalyticsPanel.vue';

// ─── State ──────────────────────────────────────────────────────────────────────
const url = ref('');
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
  send({ type: 'connect', url: url.value.trim() });
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
    <h1>RedNoteDanmuBot</h1>
    <div class="subtitle">小红书弹幕控制面板</div>
  </header>

  <!-- ─── Tab Bar ─── -->
  <div class="tab-bar">
    <button class="tab-btn" :class="{ active: activeTab === 'control' }" @click="activeTab = 'control'">🎮 控制</button>
    <button class="tab-btn" :class="{ active: activeTab === 'keywords' }" @click="activeTab = 'keywords'">📝 关键词</button>
    <button class="tab-btn" :class="{ active: activeTab === 'analytics' }" @click="activeTab = 'analytics'">📊 数据</button>
  </div>

  <!-- ─── Control Tab ─── -->
  <div v-show="activeTab === 'control'">

  <!-- ─── Connection ─── -->
  <section>
    <div class="section-header"><label>连接</label></div>
    <div class="card-group">
      <!-- Status row -->
      <div class="card-item" style="padding:14px 16px;">
        <div class="status-badge">
          <span class="status-dot" :class="status"></span>
          <span>{{ statusLabel }}</span>
        </div>
        <span class="item-value" style="font-size:13px;color:var(--text-tertiary);">
          {{ url || '未指定直播间' }}
        </span>
      </div>

      <!-- URL input -->
      <div class="card-item" style="min-height:44px;">
        <label class="item-label-sm">URL</label>
        <input
          class="ios-input"
          v-model="url"
          placeholder="https://www.xiaohongshu.com/..."
          :disabled="!canConnect"
          @keyup.enter="connect"
        />
      </div>

      <!-- Buttons -->
      <div class="card-item" style="padding:10px 16px 14px; gap:10px;">
        <button
          class="ios-btn ios-btn-primary fill"
          :disabled="!canConnect || !url.trim()"
          @click="connect"
        >连接</button>
        <button
          class="ios-btn ios-btn-secondary fill"
          :disabled="!canDisconnect"
          @click="disconnect"
        >断开</button>
      </div>

      <!-- Error banner -->
      <div v-if="errorMsg && status === 'disconnected'" class="card-item" style="padding:8px 16px 12px;">
        <div class="error-banner">
          <span>⚠</span>
          <span>{{ errorMsg }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── Message ─── -->
  <section>
    <div class="section-header"><label>消息</label></div>
    <div class="card-group">
      <!-- Prefix -->
      <div class="card-item" style="min-height:44px;">
        <label class="item-label">前缀</label>
        <input class="ios-input" v-model="prefix" placeholder="76" style="max-width:120px;" />
        <span class="item-value" style="flex:none;font-size:13px;">+ 关键词+符号</span>
      </div>

      <!-- Interval -->
      <div class="card-item" style="min-height:44px;">
        <label class="item-label">间隔</label>
        <input class="ios-input number" v-model.number="interval" type="number" min="1500" max="8000" step="100" />
        <span class="item-value" style="flex:none;">毫秒</span>
      </div>




    </div>
  </section>

  <!-- ─── Control ─── -->
  <section>
    <div class="section-header"><label>控制</label></div>
    <div class="card-group">
      <!-- Count -->
      <div class="card-item" style="flex-direction:column; padding:20px 16px 12px;">
        <div class="count-display">
          <div class="count-number" :class="{ bump: countBump }">{{ sentCount }}</div>
          <div class="count-label">已发送</div>
        </div>
      </div>

      <!-- Start / Stop -->
      <div class="card-item" style="padding:8px 16px 16px; gap:10px;">
        <button
          class="ios-btn ios-btn-success fill"
          style="height:48px;"
          :disabled="!canStart"
          @click="start"
        >▶ 开始</button>
        <button
          class="ios-btn ios-btn-danger fill"
          style="height:48px;"
          :disabled="!canStop"
          @click="stop"
        >■ 停止</button>
      </div>
    </div>
  </section>

  <!-- ─── Log ─── -->
  <section>
    <div class="section-header"><label>日志</label></div>
    <div class="card-group">
      <div class="card-item" style="padding:6px; background:transparent; border:none;">
        <div class="log-area" ref="logContainer">
          <!-- Empty state -->
          <div v-if="logs.length === 0" class="log-empty">
            ── 暂无日志 ──<br>
            <span style="font-size:11px;color:#636366;">连接直播间并开始发送后将显示在此</span>
          </div>
          <!-- Log entries -->
          <div v-for="(entry, i) in logs" :key="i" class="log-entry" :class="'log-level-' + entry.level">
            <span class="log-time">{{ fmtTime(entry.time) }}</span>
            <span class="log-level-tag">[{{ entry.level.toUpperCase() }}]</span>
            <span class="log-level-text">{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  </div>  <!-- /control tab -->

  <!-- ─── Keywords Tab ─── -->
  <div v-show="activeTab === 'keywords'">
    <KeywordManager ref="kwManagerRef" :ws="ws" />
  </div>

  <!-- ─── Analytics Tab ─── -->
  <div v-show="activeTab === 'analytics'">
    <AnalyticsPanel ref="analyticsRef" :ws="ws" />
  </div>

  <!-- Sent flash animation -->
  <div v-if="countBump" class="sent-flash">✓</div>
</template>
