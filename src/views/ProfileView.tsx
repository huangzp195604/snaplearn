import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Gift,
  Crown,
  FileText,
  RotateCcw,
  Sparkles,
  Layers,
  DollarSign,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Star,
  BookOpen,
  Volume2,
  ChevronRight,
  Bookmark,
  Key,
} from 'lucide-react';
import { UserQuota, CorrectionFeedback, LearningCard } from '../types';
import { loadCorrections, addAdBonusCredits, toggleVipStatus, resetQuotaForTesting, getCustomApiKey, saveCustomApiKey } from '../utils/storage';
import { speakEnglish } from '../utils/speech';

interface ProfileViewProps {
  quota: UserQuota;
  onUpdateQuota: (newQuota: UserQuota) => void;
  cardsCount: number;
  cards: LearningCard[];
  onSelectCard: (card: LearningCard) => void;
  onUpdateCard?: (updated: LearningCard) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  quota,
  onUpdateQuota,
  cardsCount,
  cards,
  onSelectCard,
  onUpdateCard,
}) => {
  const [activeStrategyTab, setActiveStrategyTab] = useState<
    'notebook' | 'pitfalls' | 'monetization' | 'mvp' | 'feedback'
  >('notebook');
  const [activeSpeechWord, setActiveSpeechWord] = useState<string | null>(null);

  const favoriteCards = cards.filter((c) => c.isFavorite);
  const totalFavoriteWords = favoriteCards.reduce(
    (acc, card) => acc + card.keyVocabulary.length,
    0
  );

  const [corrections, setCorrections] = useState<CorrectionFeedback[]>(loadCorrections());
  const [apiKeyInput, setApiKeyInput] = useState<string>(getCustomApiKey());
  const [isApiKeySaved, setIsApiKeySaved] = useState<boolean>(false);

  const handleSaveApiKey = () => {
    saveCustomApiKey(apiKeyInput);
    setIsApiKeySaved(true);
    setTimeout(() => setIsApiKeySaved(false), 2500);
  };

  const handlePlayWord = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    setActiveSpeechWord(word);
    speakEnglish(
      word,
      0.9,
      undefined,
      () => setActiveSpeechWord(null),
      () => setActiveSpeechWord(null)
    );
  };

  const handleRemoveFavorite = (e: React.MouseEvent, card: LearningCard) => {
    e.stopPropagation();
    onUpdateCard?.({
      ...card,
      isFavorite: false,
    });
  };

  const handleWatchAd = () => {
    const updated = addAdBonusCredits(3);
    onUpdateQuota(updated);
    alert('🎉 观看激励视频完成！已为您增加 3 次拍照识别额度。');
  };

  const handleToggleVip = () => {
    const updated = toggleVipStatus();
    onUpdateQuota(updated);
  };

  const handleResetQuota = () => {
    const updated = resetQuotaForTesting();
    onUpdateQuota(updated);
    alert('已重置今日识别额度为初始 5 次。');
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-5 pb-24 text-slate-100 overflow-y-auto">
      {/* User Header Profile */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <User className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white">微信学习用户</h2>
              {quota.isVip && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3" />
                  VIP
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">免登录 · 本地专属词库已启用</p>
          </div>
        </div>

        {/* VIP Switcher */}
        <button
          onClick={handleToggleVip}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            quota.isVip
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {quota.isVip ? 'VIP已激活' : '模拟体验VIP'}
        </button>
      </div>

      {/* Quota & Cost Control Sandbox */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-white">每日免费识别额度控制</div>
              <div className="text-[11px] text-slate-400">防刷与 API 成本控制机制</div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            {quota.isVip ? '无限次' : `${Math.max(0, quota.dailyTotal - quota.dailyUsed)} / ${quota.dailyTotal} 次`}
          </span>
        </div>

        {/* Quota Progress Bar */}
        {!quota.isVip && (
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-amber-400 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((quota.dailyTotal - quota.dailyUsed) / quota.dailyTotal) * 100)}%`,
              }}
            />
          </div>
        )}

        {quota.bonusAdCredits > 0 && !quota.isVip && (
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <Gift className="w-3.5 h-3.5" />
            <span>含看广告额外赠送：+{quota.bonusAdCredits} 次</span>
          </div>
        )}

        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={handleWatchAd}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>模拟看激励视频广告 (+3次)</span>
          </button>

          <button
            onClick={handleResetQuota}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="重置额度测试"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Direct Gemini API Key Configuration Panel */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Key className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Gemini 3.8 Flash 视觉识别密钥</span>
                {getCustomApiKey() && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-mono">已配置</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">填入 API Key 即可实时识别上传的任何真实照片物品</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="填入 AIzaSy 开头的 Gemini API Key..."
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
          />
          <button
            onClick={handleSaveApiKey}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            {isApiKeySaved ? '✓ 已保存' : '保存密钥'}
          </button>
        </div>

        <div className="text-[10px] text-slate-500 leading-relaxed">
          💡 说明：配置密钥后，任何新上传的照片将 100% 实时调用 Google Gemini 视觉大模型提取画面真实物品与空间百分比坐标；若未配置，则自动调用本地美食多模态模板。
        </div>
      </div>

      {/* Nav Tabs for Strategy & Pitfalls Whitepaper */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl text-xs overflow-x-auto">
        <button
          onClick={() => setActiveStrategyTab('notebook')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            activeStrategyTab === 'notebook'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${activeStrategyTab === 'notebook' ? 'fill-current' : 'text-amber-400'}`} />
          <span>生词本 ({favoriteCards.length})</span>
        </button>

        <button
          onClick={() => setActiveStrategyTab('pitfalls')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeStrategyTab === 'pitfalls'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          避坑策略
        </button>
        <button
          onClick={() => setActiveStrategyTab('monetization')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeStrategyTab === 'monetization'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          变现矩阵
        </button>
        <button
          onClick={() => setActiveStrategyTab('mvp')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeStrategyTab === 'mvp'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          MVP分期
        </button>
        <button
          onClick={() => setActiveStrategyTab('feedback')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeStrategyTab === 'feedback'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          反馈闭环 ({corrections.length})
        </button>
      </div>

      {/* TAB 0: 生词本 (VOCABULARY NOTEBOOK) */}
      {activeStrategyTab === 'notebook' && (
        <div className="space-y-4">
          {/* Notebook Stats Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
                <Bookmark className="w-5 h-5 fill-amber-400/40" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>我的场景生词本</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-medium">
                    共收藏 {favoriteCards.length} 张卡片 · {totalFavoriteWords} 个词汇
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  在卡片页点击黄色五角星，随时沉淀你的专属日常生活记忆库
                </p>
              </div>
            </div>
          </div>

          {/* Favorited Cards List */}
          {favoriteCards.length === 0 ? (
            <div className="py-12 px-4 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-600">
                <Star className="w-7 h-7 text-slate-500" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-300">生词本目前还是空的</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  去探索样张或拍摄照片，在卡片页点击右上角的「收藏」按钮，即可把喜爱的卡片与词汇收录在此反复复习！
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {favoriteCards.map((favCard) => (
                <div
                  key={favCard.id}
                  onClick={() => onSelectCard(favCard)}
                  className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 p-3.5 transition-all shadow-md space-y-3 hover:-translate-y-0.5"
                >
                  {/* Card Header row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/10 relative">
                        <img
                          src={favCard.imageUrl}
                          alt={favCard.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-0.5 left-0.5 px-1 bg-black/75 rounded text-[9px] font-bold text-amber-300">
                          {favCard.sceneCategory === 'food' ? '🍳 美食' : favCard.sceneCategory === 'coffee' ? '☕ 咖啡' : '🐱 宠物'}
                        </div>
                      </div>

                      <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {favCard.titleChinese}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-serif italic truncate">
                          {favCard.title}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          收录于 {new Date(favCard.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Unfavorite button & Arrow */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => handleRemoveFavorite(e, favCard)}
                        className="p-1.5 text-amber-400 hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="取消收藏"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>

                  {/* Vocabulary Pills with click-to-speak audio button */}
                  <div className="pt-2.5 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-amber-400" />
                        <span>核心词汇便签 (点击小喇叭听发音):</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {favCard.keyVocabulary.length} 词
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {favCard.keyVocabulary.map((vocab, vIdx) => {
                        const isSpeaking = activeSpeechWord === vocab.english;
                        return (
                          <div
                            key={vIdx}
                            onClick={(e) => handlePlayWord(e, vocab.english)}
                            className={`group/pill cursor-pointer px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                              isSpeaking
                                ? 'bg-amber-400 text-slate-950 font-bold border-amber-300'
                                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-amber-400/40'
                            }`}
                            title="点击朗读此词汇"
                          >
                            <span className="font-semibold">{vocab.english}</span>
                            <span className={`text-[10px] ${isSpeaking ? 'text-slate-900' : 'text-slate-400'}`}>
                              {vocab.chinese}
                            </span>
                            <Volume2
                              className={`w-3 h-3 shrink-0 ${
                                isSpeaking
                                  ? 'text-slate-950 animate-bounce'
                                  : 'text-slate-500 group-hover/pill:text-amber-400'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: 5 PITFALLS & STRATEGIES */}
      {activeStrategyTab === 'pitfalls' && (
        <div className="space-y-3.5">
          {/* Pitfall 1: Category review */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="font-bold text-sm text-white">类目审核风险：避开教育，走工具类</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-rose-400">避坑要点：</strong>微信小程序若选择“教育/培训”类目，强制要求提供办学资质或前置行政审批，个人/轻资产团队 100% 驳回。
            </p>
            <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-400 space-y-1 border border-slate-800/80">
              <div className="text-emerald-400 font-semibold">✓ 落地执行策略：</div>
              <div>• 类目选择：申请【实用工具 - 图片处理】或【实用工具 - 办公/翻译】。</div>
              <div>• 文案合规：全站坚决规避“课程、名师、培训、系统教学、课时”等字样。</div>
              <div>• 统一改为“日常拍照卡片、场景记忆便签、生活英语笔记工具”。</div>
            </div>
          </div>

          {/* Pitfall 2: Dish accuracy */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-sm text-white">菜品英文名不准：模型校验 + 人工纠错</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-amber-400">避坑要点：</strong>菜品存在中西差异与细分（例如煎蛋分为 sunny-side up 单面、over-easy 双面流心、scrambled 炒蛋），模型容易笼统归为 "egg"。
            </p>
            <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-400 space-y-1 border border-slate-800/80">
              <div className="text-emerald-400 font-semibold">✓ 落地执行策略：</div>
              <div>• Prompt 加载餐饮专门词汇约束库（烹饪状态、餐盘组合地道惯用法）。</div>
              <div>• 交互兜底：在卡片页每个标签旁提供「笔形纠错按钮」，用户可一键修正中英文。</div>
              <div>• 修正自动记入本地错词库，积累后作为 Few-Shot 强化模型提示词。</div>
            </div>
          </div>

          {/* Pitfall 3: Coordinate instability */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="font-bold text-sm text-white">坐标定位不稳定：引线防重叠 + 允许拖拽</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-teal-400">避坑要点：</strong>多模态模型返回的坐标在盘子边缘或密集食物时容易靠太近，文字互相重叠覆盖。
            </p>
            <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-400 space-y-1 border border-slate-800/80">
              <div className="text-emerald-400 font-semibold">✓ 落地执行策略：</div>
              <div>• 前端排版引擎：根据食物在画面的象限向四周外推（labelSide 自动排布算法）。</div>
              <div>• 交互微调：提供「微调位置」模式，支持用户手指直接按住拖拽针点或词条。</div>
              <div>• 纯享开关：提供“隐藏标注层”按钮，随时切换原图与标注图。</div>
            </div>
          </div>

          {/* Pitfall 4: API cost control */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="font-bold text-sm text-white">单次成本控制：每日限额 + 广告对冲</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-emerald-400">避坑要点：</strong>视觉大模型单次交互耗费多模态 Token，防范羊毛党频繁无节制调用导致成本飙升。
            </p>
            <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-400 space-y-1 border border-slate-800/80">
              <div className="text-emerald-400 font-semibold">✓ 落地执行策略：</div>
              <div>• 限制每日 5 次免费额度，基于本地缓存与设备指纹限频。</div>
              <div>• 接入微信激励视频广告（看 15 秒广告奖励 3 次拍照），广告 eCPM 覆盖 API 成本。</div>
              <div>• 前端对上传相片做 canvas 压缩（降至 1200px），减少传输体积与运算 token。</div>
            </div>
          </div>

          {/* Pitfall 5: 5-15s loading latency */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">
                5
              </span>
              <h4 className="font-bold text-sm text-white">首屏等待 5~15s：明确阶段进度 + 趣味冷知识</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-sky-400">避坑要点：</strong>多模态复杂理解需要 5~15 秒，单纯白屏或常规菊花圈极易导致用户焦虑并直接退出。
            </p>
            <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-400 space-y-1 border border-slate-800/80">
              <div className="text-emerald-400 font-semibold">✓ 落地执行策略：</div>
              <div>• 四段式渐进骨架：图像解析 → 空间定位 → 语料生成 → 卡片排版，给用户清晰掌控感。</div>
              <div>• 英语冷知识轮播：等待期间自动播放餐桌文化、地道词源有趣知识，化等待为输入。</div>
              <div>• 实时秒数跑表与进度条，营造高科技精密分析氛围。</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONETIZATION MATRIX */}
      {activeStrategyTab === 'monetization' && (
        <div className="space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <DollarSign className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">商业化变现三重奏模型</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              结合轻工具属性，设计“广告打底 + VIP增值 + 社交自裂变”的高毛利轻量闭环：
            </p>
          </div>

          {/* 1. WeChat Ads */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                1. 流量主广告体系 (覆盖 80% 免费用户)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">即时变现</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pl-3.5">
              <div>• <strong>激励视频广告：</strong>今日免费 5 次用完后，看 15 秒视频奖励 +3 次拍照。</div>
              <div>• <strong>原生 Banner 广告：</strong>卡片学习页底部与海报生成页展示，不干扰核心视觉。</div>
              <div>• <strong>插屏广告：</strong>生成第 3 张卡片后轻量触发一次。</div>
            </div>
          </div>

          {/* 2. VIP Membership */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                2. VIP 付费会员订阅 (9.9元/月 · 68元/年)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400">高客单转化</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pl-3.5">
              <div>• <strong>核心特权：</strong>无限次拍照识别，无限制使用。</div>
              <div>• <strong>高清与定制：</strong>导出海报可一键移除平台水印，支持 4K 超清与 PDF 打印排版。</div>
              <div>• <strong>批量生卡：</strong>一次性上传 9 张照片批量生成本周生活英语周刊。</div>
            </div>
          </div>

          {/* 3. Viral Poster Loop */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                3. 海报自带小程序码自裂变 (零成本获客)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-400">裂变拉新</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pl-3.5">
              <div>• 每张生成的卡片视觉极具小红书 / 朋友圈分享感（如同手账海报）。</div>
              <div>• 海报右下角自动嵌入 Mini-Program 专属小程序码与“每日拍照打卡”标语。</div>
              <div>• 用户分享到朋友圈或小红书，好友扫码直接进入小程序，达成自然滚雪球。</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MVP ROADMAP */}
      {activeStrategyTab === 'mvp' && (
        <div className="space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Layers className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">MVP 场景分期渐进路线图</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              核心原则：<strong>“先做透美食单点，再横向复制生活高频场景”</strong>，避免一开始贪大求全导致识别率不高。
            </p>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-800 space-y-5 my-2">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-slate-950" />
              <div className="text-xs font-bold text-emerald-400">第一期 MVP (当前已实现)：美食餐盘做透</div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                • 抓准一日三餐刚需，食物形态具象、引线指向清晰、视觉分享欲极强。<br />
                • 构建 500+ 西餐/常见早餐/咖啡烘焙专有语料映射与音标。
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-700 ring-4 ring-slate-950" />
              <div className="text-xs font-bold text-white">第二期：精品咖啡馆 & 生鲜超市货架</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                • 咖啡器具（手冲壶、滤杯、杯垫、拉花）与烘焙风味词汇。<br />
                • 超市果蔬生鲜货架，学习各类罕见蔬菜水果、包装规格表达。
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-700 ring-4 ring-slate-950" />
              <div className="text-xs font-bold text-white">第三期：萌宠日常 & 城市街景户外</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                • 宠物动作（打盹、伸懒腰）、身体特征（胡须、肉垫、毛发）与情感表达。<br />
                • 街头招牌、红绿灯、斑马线、橱窗街景词汇。
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-700 ring-4 ring-slate-950" />
              <div className="text-xs font-bold text-white">第四期：每日穿搭 OOTD & 办公书桌</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                • 服装面料、版型剪裁、配饰单品（墨镜、皮带、帆布鞋）。<br />
                • 书桌文具、数码设备与工作流句型。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FEEDBACK & QUALITY LOOP */}
      {activeStrategyTab === 'feedback' && (
        <div className="space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-400">
              <MessageSquare className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">基于用户反馈的持续优化闭环机制</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              当用户在卡片页点击“笔”修改或纠错菜品时，系统自动沉淀入错词校准池。运营团队可据此不断丰富提示词前置字典，形成越用越准的飞轮效应。
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>本地纠错记录 ({corrections.length})</span>
              <span className="text-[10px] text-slate-500">点击卡片中的词条即可实时纠错</span>
            </div>

            {corrections.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                暂无纠错记录。在学习卡片中点击标注词条旁的编辑按钮，即可提交修正！
              </div>
            ) : (
              corrections.map((corr) => (
                <div key={corr.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 line-through">
                      {corr.originalEn} ({corr.originalZh})
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      → {corr.correctedEn} ({corr.correctedZh})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>原因: {corr.reason}</span>
                    <span>{new Date(corr.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
