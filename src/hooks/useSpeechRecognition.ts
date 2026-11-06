import { useCallback, useEffect, useRef, useState } from 'react';

// SpeechRecognition 是实验性 API，Chrome/Edge/Safari 14.5+ 支持
// Firefox 默认不支持 → 检测失败时 isSupported=false，UI 可降级
type SpeechRecognition = any; // 浏览器原生类，没有 TypeScript 类型

interface UseSpeechRecognitionOptions {
  /** 识别语言，默认 en-US */
  lang?: string;
  /** 连续识别模式：true=一直听直到 stop；false=识别完一句就停 */
  continuous?: boolean;
  /** 中间结果：true=实时给 partial；false=只给 final */
  interimResults?: boolean;
  /** 当识别到新的文本（final 片段）时回调 */
  onResult?: (text: string, isFinal: boolean) => void;
  /** 发生错误时回调（network / no-speech / aborted / not-allowed / service-not-allowed） */
  onError?: (err: SpeechRecognitionErrorLike) => void;
}

export interface SpeechRecognitionErrorLike {
  error: string;
  message?: string;
}

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}) {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
  } = opts;

  const [isSupported, setIsSupported] = useState(false);
  const [networkReady, setNetworkReady] = useState<boolean | null>(null); // null=未检测, false=不可达
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [lastError, setLastError] = useState<SpeechRecognitionErrorLike | null>(null);

  const recRef = useRef<SpeechRecognition | null>(null);
  const restartingRef = useRef(false);
  const shouldListenRef = useRef(false); // 用户意图（stop 之后不要自动重启）
  const listeningRef = useRef(false);    // 实时 listening 镜像（绕过 React state 延迟）
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  // 网络检测改为「被动模式」—— 不主动探测，而是依赖 SpeechRecognition 自己的 network error
  // 好处：不产生额外的 net::ERR_FAILED 控制台噪音
  // 流程：用户点按钮 → Chrome 尝试 SR → 500ms 内触发 network error → 标记 networkReady=false → 下次自动 Focus 模式
  useEffect(() => {
    // 无操作 —— 等待 SR 自己的 onerror 事件来标记状态
  }, []);

  // 初始化 recognition 实例
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = interimResults;

    rec.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      setLastError(null);
    };

    rec.onend = () => {
      listeningRef.current = false;
      setListening(false);
      // 单一重启点：onend 里决定要不要重启，避免双重重启竞争
      if (shouldListenRef.current && !restartingRef.current) {
        restartingRef.current = true;
        try {
          rec.start();
        } catch {
          /* InvalidStateError — 上一次完全还没停 */
        }
        setTimeout(() => { restartingRef.current = false; }, 300);
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorLike) => {
      // network error → 标记网络不通，下次启动由 Button 层自动降级为 Focus 模式
      if (e.error === 'network') {
        setNetworkReady(false);
      }
      // no-speech / aborted 是正常流程，不要当致命错误
      if (e.error === 'aborted' || e.error === 'no-speech') {
        return;
      }
      setLastError(e);
      onErrorRef.current?.(e);
      // 严重错误 → 不要再自动重启，主动 abort 确保 onend 触发
      if (
        e.error === 'network' ||
        e.error === 'service-not-allowed' ||
        e.error === 'not-allowed' ||
        e.error === 'not-found'
      ) {
        shouldListenRef.current = false;
        try { rec.abort(); } catch { /* ignore */ }
      }
    };

    rec.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }
      if (finalChunk) {
        setFinalText((prev) => (prev ? prev + ' ' : '') + finalChunk.trim());
        onResultRef.current?.(finalChunk.trim(), true);
      }
      setInterimText(interimChunk);
      if (interimChunk) {
        onResultRef.current?.(interimChunk, false);
      }
    };

    recRef.current = rec;
    return () => {
      shouldListenRef.current = false;
      try { rec.abort(); } catch { /* ignore */ }
    };
  }, [lang, continuous, interimResults]);

  const start = useCallback(() => {
    if (!recRef.current) return false;
    shouldListenRef.current = true;
    setFinalText('');
    setInterimText('');
    setLastError(null);
    try {
      recRef.current.start();
      return true;
    } catch (e) {
      console.warn('[SnapLearn] rec.start() failed:', e);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    shouldListenRef.current = false;
    try {
      recRef.current.stop();
    } catch { /* ignore */ }
  }, []);

  const reset = useCallback(() => {
    setFinalText('');
    setInterimText('');
    setLastError(null);
  }, []);

  return {
    isSupported,
    /** 网络是否已检测到可达 Google（null=未检测，false=不可达，true=可达） */
    networkReady,
    listening,
    /** 实时 listening 状态（useRef 镜像，不受 React state 延迟影响） */
    listeningNow: listeningRef,
    finalText,
    interimText,
    transcript: finalText + (interimText ? ' ' + interimText : ''),
    lastError,
    start,
    stop,
    reset,
    toggle: useCallback(() => (listeningRef.current ? stop() : start()), [start, stop]),
  };
}
