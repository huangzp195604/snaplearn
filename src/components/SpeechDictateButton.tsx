import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface SpeechDictateButtonProps {
  /** 当前 value（受控） */
  value: string;
  /** 有新识别文本（final）时的回调，组件自动追加到 value 末尾 */
  onDictated: (nextValue: string) => void;
  /** 识别语言，默认 en-US */
  lang?: string;
  /** 按钮尺寸 */
  size?: 'sm' | 'md';
}

/**
 * 语音输入按钮 —— 双模式：
 *   SR 模式：浏览器支持 Web Speech API → 直接录音识别 → 结果自动填入 input
 *     · iOS Safari 14.5+：本地识别，无需 Google
 *     · Android Chrome / 桌面 Chrome/Edge：走 Google 服务，需网络
 *     · 长按说话（松手指停止）；或点一下开始、再点停止
 *
 *   Focus 模式：浏览器完全不支持 SR（Firefox） → 聚焦 input → 用户用输入法语音
 */
export const SpeechDictateButton: React.FC<SpeechDictateButtonProps> = ({
  value,
  onDictated,
  lang = 'en-US',
  size = 'sm',
}) => {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const selfRef = useRef<HTMLButtonElement>(null);

  const showToast = useCallback((msg: string, timeoutMs = 3000) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), timeoutMs);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const rec = useSpeechRecognition({
    lang,
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (!isFinal) return;
      // 追加识别到的 final 文本
      const prefix = value ? (value.endsWith(' ') ? '' : value + ' ') : '';
      onDictated(prefix + text.trim());
    },
    onError: (err) => {
      switch (err.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          showToast('未获得麦克风权限，请在浏览器地址栏旁允许访问');
          break;
        case 'network':
          showToast('网络不可用，语音识别需要联网。可切换网络或稍后重试');
          break;
        case 'no-speech':
          showToast('没听到你说话哦～请靠近麦克风再试');
          break;
        case 'aborted':
          break;
        default:
          showToast(`识别出错：${err.error}`);
      }
    },
  });

  // ========== SR 不支持 → 降级 Focus 模式 ==========
  if (!rec.isSupported) {
    return <FocusButton selfRef={selfRef} showToast={showToast} size={size} toast={toast} />;
  }

  // ========== SR 模式 ==========
  return (
    <SRButton
      rec={rec}
      selfRef={selfRef}
      showToast={showToast}
      size={size}
      toast={toast}
    />
  );
};

// ========== SR 模式按钮（录音识别）==========
interface SRButtonProps {
  rec: ReturnType<typeof useSpeechRecognition>;
  selfRef: React.RefObject<HTMLButtonElement | null>;
  showToast: (msg: string, timeoutMs?: number) => void;
  size: 'sm' | 'md';
  toast: string | null;
}

const SRButton: React.FC<SRButtonProps> = ({ rec, selfRef, showToast, size, toast }) => {
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressingRef = useRef(false);
  const longPressThreshold = 350; // 超过 350ms 算长按说话

  const handlePressStart = useCallback(() => {
    isLongPressingRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressingRef.current = true;
      if (!rec.listeningNow.current) {
        rec.start();
      }
    }, longPressThreshold);
  }, [rec]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressingRef.current) {
      // 长按模式 —— 松手即停
      isLongPressingRef.current = false;
      rec.stop();
    } else {
      // 短按 —— toggle 模式
      if (rec.listeningNow.current) {
        rec.stop();
      } else {
        const ok = rec.start();
        if (!ok) showToast('启动失败，请再试一次');
      }
    }
  }, [rec, showToast]);

  // SR 内部状态同步（网络错误等导致的 listening 变化）
  useEffect(() => {
    if (!rec.listening && isLongPressingRef.current) {
      isLongPressingRef.current = false;
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, [rec.listening]);

  const listening = rec.listening;

  const btnSize =
    size === 'sm'
      ? 'h-6 w-6 sm:w-auto sm:px-2 sm:gap-1 sm:text-[10px]'
      : 'h-7 w-7 sm:w-auto sm:px-2.5 sm:gap-1.5 sm:text-[11px]';

  const btnBase = `shrink-0 inline-flex items-center justify-center sm:justify-center rounded-xl border font-medium transition-all duration-200 select-none ${btnSize}`;

  return (
    <>
      <button
        ref={selfRef}
        type="button"
        onClick={(e) => e.preventDefault()}
        onMouseDown={(e) => { e.preventDefault(); handlePressStart(); }}
        onMouseUp={(e) => { e.preventDefault(); handlePressEnd(); }}
        onMouseLeave={() => {
          if (isLongPressingRef.current || longPressTimerRef.current) handlePressEnd();
        }}
        onTouchStart={(e) => { e.preventDefault(); handlePressStart(); }}
        onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
        onTouchCancel={() => {
          if (isLongPressingRef.current || longPressTimerRef.current) handlePressEnd();
        }}
        className={`${btnBase} ${
          listening
            ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white border-rose-400 shadow-lg shadow-rose-400/40 scale-[1.02]'
            : 'bg-gradient-to-b from-rose-50 to-white hover:from-rose-100 hover:to-rose-50 active:from-rose-200 active:to-rose-100 text-rose-600 border-rose-300 hover:border-rose-400 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0'
        }`}
        title={
          listening
            ? '正在听… 再点一下（或松手）停止'
            : '点击开始识别；移动端可长按说话'
        }
      >
        <Mic
          className={`${size === 'sm' ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} ${
            listening ? 'animate-pulse' : ''
          }`}
        />
        <span className="hidden sm:inline">
          {listening ? '停止' : '语音'}
        </span>
      </button>

      {(toast || listening) && (
        <>
          {toast && <FloatingToast msg={toast} tone="error" />}
          {listening && <ListeningHint />}
        </>
      )}
    </>
  );
};

// ========== Focus 模式按钮（SR 不支持时的降级）==========
interface FocusButtonProps {
  selfRef: React.RefObject<HTMLButtonElement | null>;
  showToast: (msg: string, timeoutMs?: number) => void;
  size: 'sm' | 'md';
  toast: string | null;
}

const FocusButton: React.FC<FocusButtonProps> = ({ selfRef, showToast, size, toast }) => {
  const focusInput = useCallback(() => {
    const btn = selfRef.current;
    if (!btn) return;
    let el: HTMLElement | null = btn;
    let input: HTMLInputElement | null = null;
    while (el) {
      input = el.querySelector?.('input[type="text"]') || null;
      if (input) break;
      el = el.parentElement;
    }
    if (!input) return;
    input.focus();
    input.click();
    input.setSelectionRange(input.value.length, input.value.length);
    showToast('已聚焦，请长按键盘🎤麦克风说话', 2500);
  }, [selfRef, showToast]);

  const btnSize =
    size === 'sm'
      ? 'h-6 w-6 sm:w-auto sm:px-2 sm:gap-1 sm:text-[10px]'
      : 'h-7 w-7 sm:w-auto sm:px-2.5 sm:gap-1.5 sm:text-[11px]';

  const btnBase = `shrink-0 inline-flex items-center justify-center sm:justify-center rounded-xl border font-medium transition-all duration-200 select-none ${btnSize}`;

  return (
    <>
      <button
        ref={selfRef}
        type="button"
        onClick={(e) => { e.preventDefault(); focusInput(); }}
        className={`${btnBase} bg-gradient-to-b from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 active:from-amber-300 active:to-amber-400 text-amber-700 border-amber-300 hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5`}
        title="当前浏览器不支持语音识别，点击聚焦输入框后长按键盘🎤"
      >
        <MicOff className={size === 'sm' ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} />
        <span className="hidden sm:inline">输入法语音</span>
      </button>
      {toast && <FloatingToast msg={toast} />}
    </>
  );
};

// ========== 浮动 Toast / 监听提示 ==========
const FloatingToast: React.FC<{ msg: string; tone?: 'info' | 'error' }> = ({ msg, tone = 'info' }) => {
  const isError = tone === 'error';
  return (
    <div
      className={`pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full backdrop-blur text-[11px] shadow-lg border flex items-center gap-1.5 max-w-[90vw] text-center animate-[fadeIn_0.2s_ease-out] ${
        isError
          ? 'bg-slate-900/90 text-white border-white/10'
          : 'bg-amber-50/95 text-amber-800 border-amber-300'
      }`}
      role="status"
    >
      {isError ? (
        <AlertCircle className="w-3 h-3 text-amber-300 shrink-0" />
      ) : (
        <Mic className="w-3 h-3 text-amber-600 shrink-0" />
      )}
      <span>{msg}</span>
    </div>
  );
};

const ListeningHint: React.FC = () => (
  <div
    className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full bg-rose-500/95 backdrop-blur text-white text-[11px] shadow-lg shadow-rose-400/40 border border-rose-300 flex items-center gap-1.5 animate-[fadeIn_0.2s_ease-out]"
    role="status"
  >
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
    </span>
    <span>正在听… 说英文，再点按钮停止</span>
  </div>
);
