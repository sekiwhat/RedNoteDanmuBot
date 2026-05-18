<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ─── Props ───────────────────────────────────────────────────────────────────────
const props = defineProps({
  ws: { type: Object, default: null },
});

// ─── State ───────────────────────────────────────────────────────────────────────
const stats = ref({
  total: 0,
  today: 0,
  todaySuccess: 0,
  todayFail: 0,
  recentRate: [],
  dailyHistory: [],
});

const lineCanvas = ref(null);
const barCanvas = ref(null);
let lineChart = null;
let barChart = null;
let refreshTimer = null;

// ─── Computed ────────────────────────────────────────────────────────────────────
const successRate = computed(() => {
  const t = stats.value.today;
  return t === 0 ? 100 : Math.round((stats.value.todaySuccess / t) * 100);
});

const currentRate = computed(() => {
  const arr = stats.value.recentRate;
  return arr.length > 0 ? String(arr[arr.length - 1].count) : '0';
});

// ─── Expose ──────────────────────────────────────────────────────────────────────
function setStats(newStats) {
  stats.value = newStats;
  nextTick(() => {
    updateCharts();
  });
}

defineExpose({ setStats });

// ─── Chart helpers ───────────────────────────────────────────────────────────────
function buildLineChart() {
  if (!lineCanvas.value) return;
  const ctx = lineCanvas.value.getContext('2d');
  if (!ctx) return;
  if (lineChart) { lineChart.destroy(); lineChart = null; }

  const data = stats.value.recentRate;
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.time),
      datasets: [{
        label: '发送速率',
        data: data.map(d => d.count),
        borderColor: '#ff2442',
        backgroundColor: 'rgba(255, 36, 66, 0.10)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: '#ff2442',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { font: { size: 10 }, color: '#aeaeb2' },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 }, color: '#aeaeb2' },
          grid: { color: 'rgba(60, 60, 67, 0.06)' },
        },
      },
    },
  });
}

function buildBarChart() {
  if (!barCanvas.value) return;
  const ctx = barCanvas.value.getContext('2d');
  if (!ctx) return;
  if (barChart) { barChart.destroy(); barChart = null; }

  const data = stats.value.dailyHistory;
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: '发送量',
        data: data.map(d => d.count),
        backgroundColor: '#ff2442',
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { font: { size: 10 }, color: '#aeaeb2' },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 }, color: '#aeaeb2' },
          grid: { color: 'rgba(60, 60, 67, 0.06)' },
        },
      },
    },
  });
}

function destroyCharts() {
  if (lineChart) { lineChart.destroy(); lineChart = null; }
  if (barChart) { barChart.destroy(); barChart = null; }
}

function updateCharts() {
  destroyCharts();
  nextTick(() => {
    buildLineChart();
    buildBarChart();
  });
}

// ─── Data fetching ───────────────────────────────────────────────────────────────
function refreshStats() {
  if (props.ws && props.ws.readyState === WebSocket.OPEN) {
    props.ws.send(JSON.stringify({ type: 'getStats' }));
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────────
onMounted(() => {
  refreshStats();
  refreshTimer = setInterval(refreshStats, 5000);
});

onUnmounted(() => {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  destroyCharts();
});
</script>

<template>
  <section>
    <div class="section-header">
      <label>数据看板</label>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stat-number">{{ stats.total.toLocaleString() }}</div>
        <div class="stat-label">累计发送</div>
      </div>
      <div class="stats-card">
        <div class="stat-number">{{ stats.today.toLocaleString() }}</div>
        <div class="stat-label">今日发送</div>
      </div>
      <div class="stats-card">
        <div class="stat-number" :class="{ 'stat-warn': successRate < 90 && successRate >= 50, 'stat-danger': successRate < 50 }">
          {{ successRate }}%
        </div>
        <div class="stat-label">成功率</div>
      </div>
      <div class="stats-card">
        <div class="stat-number">{{ currentRate }}</div>
        <div class="stat-label">速率/秒</div>
      </div>
    </div>

    <!-- Line Chart: Real-time send rate -->
    <div class="card-group" style="margin-top:16px;">
      <div class="card-item" style="flex-direction:column; align-items:stretch; padding:16px;">
        <div class="chart-title">实时发送速率</div>
        <div class="chart-wrapper">
          <canvas ref="lineCanvas"></canvas>
        </div>
      </div>
    </div>

    <!-- Bar Chart: Daily history -->
    <div class="card-group" style="margin-top:16px;">
      <div class="card-item" style="flex-direction:column; align-items:stretch; padding:16px;">
        <div class="chart-title">近 7 日发送量</div>
        <div class="chart-wrapper">
          <canvas ref="barCanvas"></canvas>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ─── Stats Grid ──────────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 12px;
}

.stats-card {
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: 16px 12px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  border: 0.5px solid var(--separator);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-number.stat-warn {
  color: var(--orange);
}

.stat-number.stat-danger {
  color: var(--red);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ─── Charts ──────────────────────────────────────────────────────── */
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.chart-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
}

/* ─── Mobile (<=480px) ────────────────────────────────────────────── */
@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-number {
    font-size: 22px;
  }

  .chart-wrapper {
    height: 160px;
  }
}
</style>
