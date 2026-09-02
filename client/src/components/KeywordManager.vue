<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  ws: { type: null, required: true },
});

const keywords = ref([]);
const inputText = ref('');

function send(msg) {
  if (props.ws?.readyState === WebSocket.OPEN) {
    props.ws.send(JSON.stringify(msg));
  }
}

function setKeywords(list) {
  keywords.value = list;
}

function add() {
  const t = inputText.value.trim();
  if (!t) return;
  send({ type: 'addKeyword', text: t });
  inputText.value = '';
}

function remove(id) {
  send({ type: 'removeKeyword', id });
}

function toggle(id) {
  send({ type: 'toggleKeyword', id });
}

onMounted(() => send({ type: 'listKeywords' }));

defineExpose({ setKeywords });
</script>

<template>
  <div class="card">
    <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>📝 关键词管理</span>
      <span style="font-size:12px;color:var(--text-tertiary);font-weight:400;">{{ keywords.length }} 个</span>
    </div>

    <div class="card-body">
      <!-- Add bar -->
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <input
          v-model="inputText"
          class="input-field"
          style="flex:1;text-align:left;border:0.5px solid var(--separator);border-radius:6px;padding:8px 10px;font-size:14px;"
          placeholder="输入新关键词，回车添加…"
          @keyup.enter="add"
        />
        <button
          class="btn btn-primary"
          style="height:36px;flex-shrink:0;"
          :disabled="!inputText.trim()"
          @click="add"
        >添加</button>
      </div>

      <!-- Divider -->
      <div v-if="keywords.length > 0" style="font-size:11px;color:var(--text-tertiary);padding:2px 0 6px;letter-spacing:0.3px;">
        点击开关控制启用/禁用
      </div>

      <!-- List -->
      <div v-if="keywords.length === 0" style="text-align:center;padding:40px 0;color:var(--text-tertiary);">
        <div style="font-size:32px;margin-bottom:8px;">📝</div>
        <div style="font-size:14px;">暂无关键词</div>
        <div style="font-size:12px;margin-top:4px;">在上方输入并添加</div>
      </div>

      <div v-for="kw in keywords" :key="kw.id" class="kw-row">
        <span class="kw-text">{{ kw.text }}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <label class="toggle">
            <input type="checkbox" :checked="!!kw.enabled" @change="toggle(kw.id)" />
            <span class="toggle-slider"></span>
          </label>
          <button class="kw-del" @click="remove(kw.id)" title="删除关键词">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kw-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
  border-bottom: 0.5px solid var(--separator);
  min-height: 44px;
  transition: background 0.15s;
}
.kw-row:hover {
  background: var(--surface-hover);
  border-radius: 6px;
  margin: 0 -4px;
  padding: 10px 12px;
}
.kw-row:last-child {
  border-bottom: none;
}

.kw-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kw-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.kw-del:hover {
  background: rgba(255, 59, 48, 0.1);
  color: var(--red);
}
.kw-del:active {
  transform: scale(0.9);
}
</style>
