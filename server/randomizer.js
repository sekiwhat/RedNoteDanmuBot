const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SYMBOLS = '~!@#$%^&*_+-=:;,.?';
const EMOJIS = ['😊','😂','❤️','🌹','🎉','🔥','✨','💪','🎊','🎁','😘','🥰','👏','💕','🎈','🌺','🌸','⭐','🌟','💫'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generate(options = {}) {
  const {
    minLen = 3,
    maxLen = 6,
    useLetters = true,
    useSymbols = true,
    useEmojis = true,
  } = options;

  if (!useLetters && !useSymbols && !useEmojis) {
    throw new Error('At least one character set must be enabled');
  }

  let chars = [];
  if (useLetters) chars.push(...LETTERS.split(''));
  if (useSymbols) chars.push(...SYMBOLS.split(''));
  if (useEmojis) chars.push(...EMOJIS);

  const targetLen = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
  let result = '';
  while (result.length < targetLen) {
    const c = pickRandom(chars);
    // Avoid overshooting the target length (needed because emojis can be multi-codepoint)
    if (result.length + c.length <= targetLen) {
      result += c;
    }
  }
  return result;
}

function applyTemplate(template, prefix, randomStr) {
  return template.replace('{{prefix}}', prefix).replace('{{random}}', randomStr);
}

export { generate, applyTemplate };
