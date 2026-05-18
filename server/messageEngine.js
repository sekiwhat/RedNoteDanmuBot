import { listKeywords, logSend } from './database.js';
import { generate } from './randomizer.js';

export function buildMessage(prefix) {
  // 1. 获取所有启用的关键词
  const keywords = listKeywords().filter(k => k.enabled);
  
  if (keywords.length === 0) {
    // Fallback: 没有启用关键词时用随机字符串
    const randomStr = generate({ minLen: 3, maxLen: 6 });
    const fullMessage = prefix + ' ' + randomStr;
    logSend(prefix, '(random)', fullMessage, 'success');
    return { fullMessage, keyword: '(random)' };
  }

  // 2. 随机选一个关键词
  const keyword = keywords[Math.floor(Math.random() * keywords.length)].text;

  // 3. 生成 2-5 个随机符号（symbols + emojis，不含数字和字母）
  const symbols = generate({
    useLetters: false,
    useSymbols: true,
    useEmojis: true,
    minLen: 2,
    maxLen: 5,
  });

  // 4. 组装消息
  const fullMessage = prefix + ' ' + keyword + symbols;
  logSend(prefix, keyword, fullMessage, 'success');
  return { fullMessage, keyword };
}
