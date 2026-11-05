import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Clock, ChevronRight, Zap, Gift, BookOpen, Trash2 } from 'lucide-react';
import { LearningCard, UserQuota } from '../types';
import { PRESET_CARDS } from '../data/presets';

interface HomeViewProps {
  cards: LearningCard[];
  quota: UserQuota;
  onSelectCard: (card: LearningCard) => void;
  onUploadImage: (file: File) => void;
  onLoadPreset: (preset: LearningCard) => void;
  onDeleteCard: (cardId: string) => void;
  onWatchAd: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  cards,
  quota,
  onSelectCard,
  onUploadImage,
  onLoadPreset,
  onDeleteCard,
  onWatchAd,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cardToDelete, setCardToDelete] = React.useState<LearningCard | null>(null);
  const remainingDaily = Math.max(0, quota.dailyTotal - quota.dailyUsed);
  const totalAvailable = quota.isVip ? 999 : remainingDaily + quota.bonusAdCredits;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
      e.target.value = ''; // Reset for re-uploading same file
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-6 pb-20">
      {/* Top Banner / Philosophy */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              认知即词汇 · 处处皆语境
            </span>
          </div>

          {/* Daily Quota Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">
              {quota.isVip ? 'VIP无限次' : `今日剩余 ${totalAvailable} 次`}
            </span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1.5">
          拍下日常，生成你的英语学习卡
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
          不背枯燥词表。把餐盘里的食物、手边的咖啡和可爱的宠物，变成带引线标注的高清学习卡片。
        </p>
      </div>

      {/* Primary Big Camera / Photo Button */}
      <div className="flex flex-col items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <button
          onClick={() => {
            fileInputRef.current?.click();
          }}
          className="w-full relative group overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 p-6 text-slate-950 font-bold shadow-xl shadow-emerald-500/20 active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-3"
        >
          {/* Animated decorative ring */}
          <div className="w-16 h-16 rounded-2xl bg-slate-950/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <Camera className="w-8 h-8 text-slate-950" />
          </div>

          <div className="text-center">
            <div className="text-lg font-black tracking-tight flex items-center justify-center gap-1.5">
              <span>拍照 / 从相册选择照片</span>
            </div>
            <div className="text-xs text-slate-900/80 font-medium mt-0.5">
              支持餐盘美食、咖啡杯、超市货架、萌宠与日常街景
            </div>
          </div>
        </button>

        {/* Quota reminder and Ad Watch Bonus */}
        {!quota.isVip && totalAvailable <= 2 && (
          <div className="w-full mt-2 flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
            <div className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span>今日额度偏低？看激励广告立增 3 次</span>
            </div>
            <button
              onClick={onWatchAd}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition-colors"
            >
              看视频+3次
            </button>
          </div>
        )}
      </div>

      {/* Preset Quick-Test Scenarios - Synced with local cards */}
      {cards.some((c) => PRESET_CARDS.some((p) => p.id === c.id)) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-white">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>一键体验样张（参考图原案）</span>
            </div>
            <span className="text-[11px] text-slate-400">免消耗额度直接查看</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_CARDS.filter((preset) => cards.some((c) => c.id === preset.id)).map((preset) => (
              <div
                key={preset.id}
                onClick={() => onLoadPreset(preset)}
                className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 shadow-md"
              >
                <div className="h-20 w-full relative overflow-hidden bg-slate-950">
                  <img
                    src={preset.imageUrl}
                    alt={preset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-bold text-amber-300">
                    {preset.sceneCategory === 'food' ? '🍳 美食原案' : preset.sceneCategory === 'coffee' ? '☕ 咖啡' : '🐱 宠物'}
                  </div>
                </div>
                <div className="p-2 flex flex-col">
                  <span className="text-xs font-bold text-white truncate">{preset.titleChinese}</span>
                  <span className="text-[10px] text-slate-400 truncate">{preset.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Generated Cards */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>我的本地卡片库 ({cards.length})</span>
          </div>
          <span className="text-[11px] text-slate-500">仅存本地 · 免登录</span>
        </div>

        {cards.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 text-xs">
            <ImageIcon className="w-8 h-8 text-slate-700 mb-2" />
            <span>还没有生成过卡片，点击上方拍照或体验样张吧！</span>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => onSelectCard(card)}
                className="group cursor-pointer p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all hover:bg-slate-850 shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/10 relative">
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 right-0 px-1 bg-black/75 text-[9px] text-emerald-400 font-mono">
                      {card.detectedItems.length}词
                    </div>
                  </div>

                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white truncate">{card.titleChinese}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-serif italic truncate">{card.title}</span>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span>{new Date(card.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="truncate text-emerald-400/80">
                        {card.detectedItems.map((i) => i.english).slice(0, 3).join(', ')}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardToDelete(card);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 active:bg-rose-500/20 transition-all cursor-pointer"
                    title="从本地卡库彻底删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-App Delete Confirmation Modal */}
      {cardToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setCardToDelete(null)}
        >
          <div
            className="w-full max-w-xs bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">彻底删除卡片？</h3>
              <p className="text-xs text-slate-400">
                确定要从本地卡片库中删除「<span className="text-rose-300 font-semibold">{cardToDelete.titleChinese}</span>」吗？此操作无法撤销。
              </p>
            </div>

            <div className="w-full flex items-center gap-2 pt-1">
              <button
                onClick={() => setCardToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const id = cardToDelete.id;
                  setCardToDelete(null);
                  onDeleteCard(id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
