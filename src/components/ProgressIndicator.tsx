import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Clock, Lightbulb, Compass, BookOpen } from 'lucide-react';

interface ProgressIndicatorProps {
  isLoading: boolean;
}

const FUN_TIPS = [
  '💡 知识冷锦囊：单面煎太阳蛋叫 "sunny-side up"，而双面轻煎蛋黄流心的叫 "over-easy"。',
  '☕ 咖啡小词源："Latte" 在意大利语里就是牛奶，所以在国外只点 "latte" 可能会真的拿到一杯温牛奶！',
  '🍳 地道表达：西方人常说 "a plate to start the day"，意指一顿丰盛早餐能唤醒你整天的好状态。',
  '🥐 美食搭配：培根在英语中常用 "crispy bacon"（酥脆）来形容，香肠常被亲切叫做 "bangers"。',
  '🐱 宠物俚语："cat nap" 是指白天打个十几分钟的短打盹，非常恢复精力。',
  '🛒 超市技巧：生鲜区在英文超市里常被称为 "Produce Section"，包含新鲜蔬果。',
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ isLoading }) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setSecondsElapsed(0);
      return;
    }

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    const tipTimer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % FUN_TIPS.length);
    }, 3200);

    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  // Calculate simulated stage
  const getStage = () => {
    if (secondsElapsed < 3) return 1;
    if (secondsElapsed < 7) return 2;
    if (secondsElapsed < 11) return 3;
    return 4;
  };

  const currentStage = getStage();
  const progressPercent = Math.min(95, Math.round((secondsElapsed / 12) * 100));

  const stages = [
    { id: 1, name: '视觉多模态图像分析', desc: '提取画面主体轮廓与环境' },
    { id: 2, name: '空间物体检测与引线锚点测算', desc: '计算 x/y 精准坐标百分比' },
    { id: 3, name: '地道生活语料库与句型生成', desc: '匹配母语者常用表达与音标' },
    { id: 4, name: '视觉学习卡片结构化排版', desc: '渲染引线、词汇与练习题' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Animated Icon */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
            <Sparkles className="w-8 h-8 text-slate-950" />
          </div>
          <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-slate-950 border border-emerald-500/50 rounded-full text-[10px] font-mono text-emerald-400">
            {secondsElapsed}s
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-1">正在识别照片并生成学习卡片...</h3>
        <p className="text-xs text-slate-400 mb-5 text-center">
          AI 正在对画面进行引线定位与地道英语语料结构化输出
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-5 border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 4 Progressive Stages */}
        <div className="w-full space-y-2.5 mb-5">
          {stages.map((stage) => {
            const isDone = currentStage > stage.id;
            const isCurrent = currentStage === stage.id;

            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-xs ${
                  isCurrent
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : isDone
                    ? 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] shrink-0">
                    {stage.id}
                  </div>
                )}

                <div className="flex-1">
                  <div className={`font-medium ${isCurrent ? 'text-white' : ''}`}>{stage.name}</div>
                  <div className="text-[11px] text-slate-400">{stage.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rotating Fun Tips & Trivia */}
        <div className="w-full bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-200/90">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed transition-opacity duration-300">
            {FUN_TIPS[currentTipIndex]}
          </p>
        </div>

        <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>通常需 5~12 秒，请稍候...</span>
        </div>
      </div>
    </div>
  );
};
