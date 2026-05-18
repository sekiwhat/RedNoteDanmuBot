<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  ws: { type: null, required: true },
});

const keywords = ref([]);
const inputText = ref('');

function sendMsg(msg) {
  if (props.ws?.readyState === WebSocket.OPEN) {
    props.ws.send(JSON.stringify(msg));
  }
}

function setKeywords(list) {
  keywords.value = list;
}

function addKeyword() {
  const text = inputText.value.trim();
  if (!text) return;
  sendMsg({ type: 'addKeyword', text });
  inputText.value = '';
}

function removeKeyword(id) {
  sendMsg({ type: 'removeKeyword', id });
}

function toggleKeyword(id) {
  sendMsg({ type: 'toggleKeyword', id });
}

onMounted(() => {
  sendMsg({ type: 'listKeywords' });
});

defineExpose({ setKeywords });
</script>

<template>
  <section>
    <div class="section-header">
      <label>关键词管理</label>
      <span class="item-value" style="font-size:13px;color:var(--text-tertiary);">{{ keywords.length }} 个</span>
    </div>

    <!-- Add keyword -->
    <div class="card-group">
      <div class="card-item" style="padding:10px 16px; gap:8px;">
        <input
          class="ios-input"
          v-model="inputText"
          placeholder="输入关键词..."
          style="text-align:left;"
          @keyup.enter="addKeyword"
        />
        <button
          class="ios-btn ios-btn-primary"
          style="height:36px;padding:0 16px;font-size:14px;flex:none;"
          :disabled="!inputText.trim()"
          @click="addKeyword"
        >添加</button>
      </div>
    </div>

    <!-- Keyword list -->
    <div class="card-group" style="margin-top:var(--space-3);">
      <div v-if="keywords.length === 0" class="card-item" style="padding:24px 16px;justify-content:center;">
        <span style="color:var(--text-tertiary);font-size:14px;">暂无关键词</span>
      </div>
      <div
        v-for="kw in keywords"
        :key="kw.id"
        class="card-item"
        style="min-height:44px;"
      >
        <span
          class="item-label-sm"
          style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        >{{ kw.text }}</span>

        <!-- iOS Switch -->
        <label class="checkbox-row" style="margin-left:auto;flex:none;" @click.prevent.stop>
          <input type="checkbox" :checked="kw.enabled" @change="toggleKeyword(kw.id)" />
        </label>

        <!-- Delete button -->
        <button
          class="delete-btn"
          @click="removeKeyword(kw.id)"
          title="删除"
        >×</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background var(--duration, 200ms) var(--ease, cubic-bezier(0.25, 0.1, 0.25, 1)),
              color var(--duration, 200ms) var(--ease, cubic-bezier(0.25, 0.1, 0.25, 1));
  flex-shrink: 0;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.delete-btn:hover {
  background: var(--red-dim);
  color: var(--red);
}
.delete-btn:active {
  transform: scale(0.9);
}
</style>
