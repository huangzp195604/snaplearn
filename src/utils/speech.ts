// Web Speech API 发音工具 — 修复版
// 关键事实：
// 1. utterance.lang 是"发音提示"，utterance.voice 是"强制选哪个 voice"。
//    一旦设了 voice，utterance.lang 就会被 voice.lang 覆盖 — 所以选错 voice 等于白设 lang。
// 2. Windows 自带的 Edge/Chrome 可能**只有中文 voice**！此时不能硬找 en-GB/en-US voice，
//    必须把 voice 字段留空，让浏览器用 utterance.lang 作提示自己挑。
// 3. cancel() 后再 speak() 之间要等浏览器清队列，否则新 utterance 会被丢弃。

export type SpeechRate = 0.75 | 0.9 | 1.0;
export type EnglishAccent = 'US' | 'UK';

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices) return cachedVoices;
  const v = window.speechSynthesis.getVoices();
  if (v && v.length) {
    cachedVoices = v;
  } else {
    // Chrome 需要等 onvoiceschanged 才拿得到
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
  return cachedVoices || [];
}

export function getAvailableEnglishVoices(): SpeechSynthesisVoice[] {
  return getVoices().filter((v) => v.lang && v.lang.startsWith('en'));
}

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  accent?: EnglishAccent;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

/** 挑最合适的 voice。找不到就返回 null — 让浏览器按 lang 提示自己处理 */
function pickVoice(targetAccent: EnglishAccent): SpeechSynthesisVoice | null {
  const voices = getAvailableEnglishVoices();
  if (!voices.length) return null; // 系统无英文 voice，交给浏览器 lang hint

  const prefix = targetAccent === 'UK' ? 'en-GB' : 'en-US';
  const preferred = targetAccent === 'UK'
    ? ['Daniel', 'Samantha', 'Arthur', 'Google UK', 'British', 'Aria']
    : ['Samantha', 'Serena', 'Jennifer', 'Google US', 'Zira', 'Aria'];

  const exact = voices.filter((v) => v.lang && v.lang.startsWith(prefix));
  if (exact.length) {
    const named = exact.find((v) => preferred.some((kw) => v.name.includes(kw)));
    return named || exact[0];
  }

  // 次选：en-AU / en-CA 勉强替代美式
  if (targetAccent === 'US') {
    const au = voices.find((v) => v.lang && (v.lang.startsWith('en-AU') || v.lang.startsWith('en-CA')));
    if (au) return au;
  }

  // 退而求其次：任何 en-* 都可以，至少是英语
  return voices[0];
}

/** 确保 speech engine 处于"干净"状态：cancel 是核心，pause/resume 仅在 speaking 时才安全 */
function resetEngine() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const ss = window.speechSynthesis;
  try {
    ss.cancel();
    // Chrome 有时 cancel 之后 speaking 状态卡住，给一个极小的 pause/resume 信号
    if (ss.speaking) {
      ss.pause();
      ss.resume();
    }
  } catch { /* ignore */ }
}

export function speakEnglish(
  text: string,
  rateOrOptions: number | SpeechOptions = 0.9,
  legacyOnStart?: () => void,
  legacyOnEnd?: () => void,
  legacyOnError?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[SnapLearn] Speech synthesis not supported');
    if (typeof rateOrOptions === 'object') rateOrOptions.onError?.();
    else legacyOnError?.();
    return false;
  }

  // 预热 voices（Chrome 启动时 getVoices 返回空数组）
  if (!cachedVoices || cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }

  resetEngine();

  const options: SpeechOptions =
    typeof rateOrOptions === 'number'
      ? { rate: rateOrOptions, onStart: legacyOnStart, onEnd: legacyOnEnd, onError: legacyOnError }
      : rateOrOptions;

  const rate = options.rate ?? 0.9;
  const pitch = options.pitch ?? 1.0;
  const accent: EnglishAccent = options.accent ?? 'US';

  const cleaned = text.replace(/\.\.\./g, '').replace(/…/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;

  try {
    const u = new SpeechSynthesisUtterance(cleaned);
    u.lang = accent === 'UK' ? 'en-GB' : 'en-US';
    u.rate = rate;
    u.pitch = pitch;

    const picked = pickVoice(accent);
    if (picked) {
      u.voice = picked;
      // 双保险：voice.lang 覆盖 utterance.lang 本身
      u.lang = picked.lang;
      console.log(`[SnapLearn] speak → ${accent} voice=${picked.name} lang=${picked.lang}`);
    } else {
      // 无英文 voice —— 故意不设 voice 字段，让浏览器根据 utterance.lang 做"伪英语"
      console.log(`[SnapLearn] speak → ${accent} (no dedicated en voice, rely on lang hint '${u.lang}')`);
    }

    u.onstart = () => options.onStart?.();
    u.onend = () => options.onEnd?.();
    u.onerror = (e) => {
      console.warn('[SnapLearn] speech error:', e?.error || e);
      options.onError?.(e);
    };

    window.speechSynthesis.speak(u);
    return true;
  } catch (err) {
    console.error('[SnapLearn] speak failed:', err);
    options.onError?.(err);
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  } catch { /* ignore */ }
}

export function isCurrentlySpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}
