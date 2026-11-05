// Enhanced Web Speech API utility for native English pronunciation and practice

export type SpeechRate = 0.75 | 0.9 | 1.0;
export type EnglishAccent = 'US' | 'UK';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Initialize voices listener for Chrome/Safari/Edge
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getAvailableEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices.filter((v) => v.lang.startsWith('en'));
}

export interface SpeechOptions {
  rate?: number; // 0.75 (slow for practice), 0.9 (natural), 1.0 (normal)
  pitch?: number;
  accent?: EnglishAccent;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

export function speakEnglish(
  text: string,
  rateOrOptions: number | SpeechOptions = 0.9,
  legacyOnStart?: () => void,
  legacyOnEnd?: () => void,
  legacyOnError?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    if (typeof rateOrOptions === 'object') {
      rateOrOptions.onError?.();
    } else {
      legacyOnError?.();
    }
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Parse arguments (support both simple rate number and options object)
  const options: SpeechOptions =
    typeof rateOrOptions === 'number'
      ? {
          rate: rateOrOptions,
          onStart: legacyOnStart,
          onEnd: legacyOnEnd,
          onError: legacyOnError,
        }
      : rateOrOptions;

  const targetRate = options.rate ?? 0.9;
  const targetPitch = options.pitch ?? 1.0;
  const targetAccent = options.accent ?? 'US';

  try {
    // Clean text of non-pronounceable markers like "..." or "…"
    const cleanedText = text
      .replace(/\.\.\./g, '')
      .replace(/…/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = targetAccent === 'UK' ? 'en-GB' : 'en-US';
    utterance.rate = targetRate;
    utterance.pitch = targetPitch;

    // Pick best natural voice
    const voices = getAvailableEnglishVoices();
    const langPrefix = targetAccent === 'UK' ? 'en-GB' : 'en-US';

    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith(langPrefix) &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Serena'))
      ) ||
      voices.find((v) => v.lang.startsWith(langPrefix)) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      currentUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      currentUtterance = null;
      options.onError?.(e);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('Failed to trigger speech synthesis:', err);
    currentUtterance = null;
    options.onError?.(err);
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isCurrentlySpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}
