import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Share2,
  Download,
  Edit3,
  Move,
  Play,
  Pause,
  Sparkles,
  ChevronLeft,
  Send,
  CheckCircle,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Star,
  Copy,
  MessageCircle,
  ExternalLink,
  QrCode,
  X,
  Check,
} from 'lucide-react';
import { LearningCard, DetectedItem, PracticePrompt } from '../types';
import { LeadLineOverlay } from '../components/LeadLineOverlay';
import { CorrectionModal } from '../components/CorrectionModal';
import { HighDefPosterModal } from '../components/HighDefPosterModal';
import { speakEnglish, stopSpeaking } from '../utils/speech';
import { generatePosterCanvas, generateAnnotatedPhotoCanvas } from '../utils/canvasPoster';

interface CardDetailViewProps {
  card: LearningCard;
  onUpdateCard: (updated: LearningCard) => void;
  onBack: () => void;
}

export const CardDetailView: React.FC<CardDetailViewProps> = ({
  card,
  onUpdateCard,
  onBack,
}) => {
  const [isEditingPins, setIsEditingPins] = useState(false);
  const [editingItem, setEditingItem] = useState<DetectedItem | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [speechRate, setSpeechRate] = useState<0.75 | 0.9 | 1.0>(0.9);
  const [speechAccent, setSpeechAccent] = useState<'US' | 'UK'>('US');
  const [currentlyPlayingText, setCurrentlyPlayingText] = useState<string | null>(null);
  const [isReadingWholeText, setIsReadingWholeText] = useState(false);

  // Practice prompt answers
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, string>>({});
  const [favoriteToast, setFavoriteToast] = useState<string | null>(null);
  const [isWechatShareOpen, setIsWechatShareOpen] = useState(false);
  const [sharePosterUrl, setSharePosterUrl] = useState<string | null>(null);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [copiedLinkToast, setCopiedLinkToast] = useState(false);

  // Container dimensions for responsive leader lines
  const photoContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 380, height: 260 });

  useEffect(() => {
    const updateDimensions = () => {
      if (photoContainerRef.current) {
        const rect = photoContainerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width || 380,
          height: rect.height || 260,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      stopSpeaking();
    };
  }, []);

  // Update item coordinates or labels
  const handleUpdateItems = (newItems: DetectedItem[]) => {
    onUpdateCard({
      ...card,
      detectedItems: newItems,
    });
  };

  // Toggle favorite status for vocabulary notebook
  const handleToggleFavorite = () => {
    const nextFavorite = !card.isFavorite;
    onUpdateCard({
      ...card,
      isFavorite: nextFavorite,
    });

    setFavoriteToast(nextFavorite ? '⭐ 已收藏至生词本！可在“我的”页面随时复习' : '已取消收藏');
    setTimeout(() => {
      setFavoriteToast(null);
    }, 2500);
  };

  // Save correction from modal
  const handleSaveCorrection = (updatedItem: DetectedItem) => {
    const updated = card.detectedItems.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    // Also sync with keyVocabulary if item exists there
    const updatedVocab = card.keyVocabulary.map((v) =>
      v.english.toLowerCase() === updatedItem.english.toLowerCase()
        ? { ...v, chinese: updatedItem.chinese, phonetic: updatedItem.phonetic }
        : v
    );

    onUpdateCard({
      ...card,
      detectedItems: updated,
      keyVocabulary: updatedVocab,
    });
  };

  // Play individual word, sentence, or pattern using Web Speech API
  const handlePlaySpeech = (text: string) => {
    if (currentlyPlayingText === text) {
      stopSpeaking();
      setCurrentlyPlayingText(null);
      setIsReadingWholeText(false);
      return;
    }

    setCurrentlyPlayingText(text);
    const success = speakEnglish(text, {
      rate: speechRate,
      accent: speechAccent,
      onStart: () => setCurrentlyPlayingText(text),
      onEnd: () => {
        setCurrentlyPlayingText(null);
        setIsReadingWholeText(false);
      },
      onError: () => {
        setCurrentlyPlayingText(null);
        setIsReadingWholeText(false);
      },
    });

    if (!success) {
      setCurrentlyPlayingText(null);
    }
  };

  // Play full scene description
  const handleToggleReadWhole = () => {
    if (isReadingWholeText || currentlyPlayingText === card.sceneDescription.english) {
      stopSpeaking();
      setIsReadingWholeText(false);
      setCurrentlyPlayingText(null);
    } else {
      setIsReadingWholeText(true);
      handlePlaySpeech(card.sceneDescription.english);
    }
  };

  // Practice prompt answer submit
  const handleAnswerSubmit = (promptIndex: number) => {
    const ans = userAnswers[promptIndex];
    if (!ans || !ans.trim()) return;

    // Provide instant positive pedagogical reinforcement
    setFeedbackGiven((prev) => ({
      ...prev,
      [promptIndex]: `✨ 太棒了！你的表达非常自然。核心词汇运用精准，语境感十足！坚持每天看图说英语，口语表达会越来越流利！`,
    }));
  };

  // Dedicated deep-link scheme for WeChat Mini Program sharing
  const sharePath = `/pages/card/detail?cardId=${encodeURIComponent(card.id)}&title=${encodeURIComponent(card.title)}&utm_source=wechat_share&from=applet`;
  const shareUniversalUrl = `https://snaplearn.app${sharePath}`;

  // WeChat Native API handler & fallback trigger
  const handleOpenWechatShare = async () => {
    setIsPreparingShare(true);
    try {
      // Generate the official high-res poster canvas with leader-lines, QR code and watermark
      const canvas = await generateAnnotatedPhotoCanvas(card);
      const url = canvas.toDataURL('image/png', 0.95);
      setSharePosterUrl(url);

      // If running inside real WeChat Mini Program web-view, trigger wx.miniProgram API
      const win = window as any;
      if (win.wx && win.wx.miniProgram) {
        win.wx.miniProgram.postMessage({
          data: {
            action: 'shareCard',
            title: `📸 看看我用这道「${card.titleChinese}」学到的地道英语词卡！`,
            path: sharePath,
            imageUrl: url,
          },
        });
      }

      setIsWechatShareOpen(true);
    } catch (e) {
      console.error('Error generating share card:', e);
      setIsWechatShareOpen(true);
    } finally {
      setIsPreparingShare(false);
    }
  };

  const handleCopyShareLink = () => {
    const textToCopy = `【SnapLearn · 拍照学英语】\n我在用生活场景学英语！这是我刚生成的场景词卡「${card.titleChinese} - ${card.title}」。\n核心词汇：${card.detectedItems.map(i => i.english).join(', ')}\n点击专属链接即刻查看卡片：\n${shareUniversalUrl}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedLinkToast(true);
      setTimeout(() => setCopiedLinkToast(false), 2500);
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 pb-24 overflow-y-auto">
      {/* Top Bar with Back and Poster Button */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>返回</span>
        </button>

        <div className="flex items-center gap-2">
          {/* WeChat Native Share Button */}
          <button
            onClick={handleOpenWechatShare}
            disabled={isPreparingShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#07C160] hover:bg-[#06AD56] active:bg-[#059B4D] text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            title="通过微信分享给好友或微信群"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isPreparingShare ? '生成中...' : '分享'}</span>
          </button>

          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              card.isFavorite
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={card.isFavorite ? '已收藏到生词本' : '收藏到生词本'}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                card.isFavorite ? 'fill-current text-slate-950' : 'text-amber-400'
              }`}
            />
            <span>{card.isFavorite ? '已收藏' : '收藏'}</span>
          </button>

          <button
            onClick={() => setIsPosterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>保存到相册</span>
          </button>
        </div>
      </div>

      {/* Favorite Toast Notification */}
      {favoriteToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-full shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 border border-amber-300">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>{favoriteToast}</span>
        </div>
      )}

      {/* --- QUICK SCENE SWITCHER BAR --- */}
      <div className="max-w-2xl mx-auto w-full px-3 pt-3 flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-slate-400 shrink-0 font-medium">主题场景:</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              onUpdateCard({
                ...card,
                title: 'a hearty Sandwich & Warm Soup',
                titleChinese: '金黄三明治与暖胃丸子汤',
                floatingPhrases: [
                  { english: 'warm and hearty', chinese: '温暖又治愈的饱腹感', color: 'amber' },
                  { english: 'a bite of comfort', chinese: '一口治愈身心', color: 'emerald' },
                  { english: 'crispy on the outside', chinese: '外皮金黄酥脆', color: 'rose' },
                  { english: 'comfort food bliss', chinese: '家常暖胃的幸福感', color: 'teal' },
                ],
                detectedItems: [
                  { id: 'item-sw-1', english: 'toasted sandwich', chinese: '煎吐司三明治', phonetic: '/ˈtəʊstɪd ˈsænwɪtʃ/', x: 48, y: 28, labelSide: 'top-right', curvature: 15 },
                  { id: 'item-sw-2', english: 'beef meatball soup', chinese: '牛肉丸清汤', phonetic: '/biːf ˈmiːtbɔːl suːp/', x: 38, y: 76, labelSide: 'bottom-left', curvature: -20 },
                  { id: 'item-sw-3', english: 'crispy bacon', chinese: '酥脆培根', phonetic: '/ˈkrɪspi ˈbeɪkən/', x: 44, y: 44, labelSide: 'left', curvature: -15 },
                  { id: 'item-sw-4', english: 'fresh lettuce', chinese: '新鲜脆生菜', phonetic: '/freʃ ˈletɪs/', x: 34, y: 35, labelSide: 'top-left', curvature: -10 },
                  { id: 'item-sw-5', english: 'steamed rice', chinese: '白米饭 / 饭团', phonetic: '/stiːmd raɪs/', x: 23, y: 45, labelSide: 'bottom-left', curvature: -15 },
                  { id: 'item-sw-6', english: 'gingham tablecloth', chinese: '蓝白方格桌布', phonetic: '/ˈɡɪŋəm ˈteɪblklɒθ/', x: 68, y: 65, labelSide: 'bottom-right', curvature: 20 },
                ],
                keyVocabulary: [
                  { english: 'sandwich', chinese: '三明治', phonetic: '/ˈsænwɪtʃ/', partOfSpeech: 'n.' },
                  { english: 'meatball', chinese: '肉丸', phonetic: '/ˈmiːtbɔːl/', partOfSpeech: 'n.' },
                  { english: 'broth', chinese: '高汤/清汤', phonetic: '/brɒθ/', partOfSpeech: 'n.' },
                  { english: 'bacon', chinese: '培根', phonetic: '/ˈbeɪkən/', partOfSpeech: 'n.' },
                  { english: 'lettuce', chinese: '生菜', phonetic: '/ˈletɪs/', partOfSpeech: 'n.' },
                  { english: 'steamed rice', chinese: '白米饭', phonetic: '/stiːmd raɪs/', partOfSpeech: 'n.' },
                  { english: 'comfort food', chinese: '治愈系美食', phonetic: '/ˈkʌmfət fuːd/', partOfSpeech: 'n.' },
                  { english: 'hearty', chinese: '丰盛饱腹的', phonetic: '/ˈhɑːti/', partOfSpeech: 'adj.' },
                  { english: 'savory', chinese: '咸香诱人的', phonetic: '/ˈseɪvəri/', partOfSpeech: 'adj.' },
                  { english: 'crispy', chinese: '酥脆的', phonetic: '/ˈkrɪspi/', partOfSpeech: 'adj.' },
                ],
                naturalPhrases: [
                  { english: 'warm and hearty', chinese: '温暖又治愈的饱腹感' },
                  { english: 'a bite of comfort', chinese: '一口治愈身心' },
                  { english: 'crispy on the outside', chinese: '外皮金黄酥脆' },
                  { english: 'comfort food bliss', chinese: '家常暖胃的幸福感' },
                  { english: 'piping-hot soup', chinese: '热气腾腾的汤' },
                  { english: 'packed with flavor', chinese: '风味十足' },
                ],
                usefulPatterns: [
                  { pattern: 'There is nothing more comforting than a hot bowl of ...', meaning: '没有什么比一碗热腾腾的……更治愈人的了', example: 'There is nothing more comforting than a hot bowl of beef meatball soup.' },
                  { pattern: 'The sandwich is filled with ...', meaning: '三明治里夹着……', example: 'The toasted sandwich is filled with crispy bacon and fresh greens.' },
                  { pattern: 'It pairs perfectly with ...', meaning: '它与……简直是绝配', example: 'A hot savory broth pairs perfectly with crunchy golden toast.' },
                  { pattern: 'It looks so appetizing on ...', meaning: '摆在……上看起来格外诱人', example: 'It looks so appetizing on the blue gingham tablecloth.' },
                ],
                sceneDescription: {
                  english: 'This satisfying meal features a golden toasted sandwich filled with savory bacon and fresh lettuce, paired with a piping-hot bowl of homemade beef meatball soup. A small portion of steamed rice sits on the floral plate, laid out on a cozy blue gingham tablecloth. It is pure comfort food that warms both the body and soul.',
                  chinese: '这顿令人满足的餐食包含一份金黄煎吐司三明治，夹着咸香酥脆的培根和新鲜生菜，旁边搭配着一碗热气腾腾的自制牛肉丸清汤。碎花盘里还有一小份白米饭，摆在温馨的蓝白格子桌布上。这是温暖身心的纯粹治愈系美食。',
                  wordCount: 57,
                },
              });
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              card.title.includes('Sandwich')
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            🥪 三明治与丸子汤
          </button>

          <button
            onClick={() => {
              onUpdateCard({
                ...card,
                title: 'a plate to Start the day',
                titleChinese: '开启美好一天的一盘早餐',
                floatingPhrases: [
                  { english: 'start the day right', chinese: '从一顿好早餐开始', color: 'emerald' },
                  { english: 'set me up for the day', chinese: '让我为新的一天做好准备', color: 'amber' },
                  { english: 'keep me going', chinese: '让我充满能量，持续向前', color: 'rose' },
                  { english: 'a bit of everything', chinese: '一点点，样样都有', color: 'teal' },
                ],
                detectedItems: [
                  { id: 'item-banana', english: 'banana', chinese: '香蕉', phonetic: '/bəˈnænə/', x: 39, y: 22, labelSide: 'top-left', curvature: -15 },
                  { id: 'item-salad', english: 'salad', chinese: '沙拉', phonetic: '/ˈsæləd/', x: 55, y: 22, labelSide: 'top-right', curvature: 20 },
                  { id: 'item-sausage', english: 'sausage', chinese: '香肠', phonetic: '/ˈsɔːsɪdʒ/', x: 32, y: 29, labelSide: 'left', curvature: -10 },
                  { id: 'item-toast', english: 'toast', chinese: '吐司', phonetic: '/təʊst/', x: 71, y: 36, labelSide: 'right', curvature: 25 },
                  { id: 'item-bacon', english: 'bacon', chinese: '培根', phonetic: '/ˈbeɪkən/', x: 34, y: 41, labelSide: 'bottom-left', curvature: -20 },
                  { id: 'item-egg', english: 'egg', chinese: '鸡蛋', phonetic: '/eɡ/', x: 54, y: 44, labelSide: 'bottom-right', curvature: 15 },
                ],
                keyVocabulary: [
                  { english: 'egg', chinese: '鸡蛋', phonetic: '/eɡ/', partOfSpeech: 'n.' },
                  { english: 'bacon', chinese: '培根', phonetic: '/ˈbeɪkən/', partOfSpeech: 'n.' },
                  { english: 'sausage', chinese: '香肠', phonetic: '/ˈsɔːsɪdʒ/', partOfSpeech: 'n.' },
                  { english: 'toast', chinese: '吐司', phonetic: '/təʊst/', partOfSpeech: 'n.' },
                  { english: 'banana', chinese: '香蕉', phonetic: '/bəˈnænə/', partOfSpeech: 'n.' },
                  { english: 'salad', chinese: '沙拉', phonetic: '/ˈsæləd/', partOfSpeech: 'n.' },
                  { english: 'breakfast', chinese: '早餐', phonetic: '/ˈbrekfəst/', partOfSpeech: 'n.' },
                  { english: 'plate', chinese: '盘子', phonetic: '/pleɪt/', partOfSpeech: 'n.' },
                ],
                naturalPhrases: [
                  { english: 'a plate to start the day', chinese: '开启美好一天的一盘早餐' },
                  { english: 'start the day right', chinese: '从一顿好早餐开始' },
                  { english: 'set me up for the day', chinese: '让我为新的一天做好准备' },
                  { english: 'keep me going', chinese: '让我充满能量，持续向前' },
                  { english: 'a bit of everything', chinese: '一点点，样样都有' },
                ],
                usefulPatterns: [
                  { pattern: 'This is a plate of ...', meaning: '这是一盘……', example: 'This is a plate of hearty breakfast with eggs and toast.' },
                  { pattern: 'It includes ...', meaning: '它包括……', example: 'It includes eggs, crispy bacon, and sweet bananas.' },
                ],
                sceneDescription: {
                  english: 'This is my breakfast plate. It includes eggs, bacon, sausages, toast, banana and a fresh salad. The colors look so inviting, and the food looks delicious. It is a balanced meal with protein, carbohydrates, fruit and vegetables.',
                  chinese: '这是我的早餐盘。它包括鸡蛋、培根、香肠、吐司、香蕉和新鲜的沙拉。色彩搭配诱人，食物看起来很美味。这是一顿营养均衡的餐食。',
                  wordCount: 52,
                },
              });
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              card.title.includes('Start the day')
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            🍳 经典大早餐
          </button>
        </div>
      </div>

      {/* --- THE POSTER CANVAS REPRODUCTION --- */}
      <div className="p-3 sm:p-5 max-w-2xl mx-auto w-full space-y-4">
        {/* Poster Top Chalkboard/Slate Section */}
        <div className="rounded-3xl bg-[#14181c] border-2 border-[#2b3540] p-4 sm:p-6 shadow-2xl relative overflow-hidden">
          {/* Subtle chalk dust background effect */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-60" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header Title & Floating Badges */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 relative z-10">
            <div className="space-y-2">
              {/* Handwritten English Title */}
              <h2
                className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md"
                style={{ fontFamily: "'Patrick Hand', 'Caveat', cursive, sans-serif" }}
              >
                {card.title}
              </h2>
              {/* Yellow highlighter badge for Chinese title */}
              <div className="inline-block px-3.5 py-1 rounded-full bg-[#FFE500] text-slate-950 font-black text-xs sm:text-sm shadow-md tracking-wider">
                {card.titleChinese}
              </div>
            </div>

            {/* Floating phrase stickers (reference image right badges) */}
            <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
              {card.floatingPhrases.slice(0, 4).map((p, idx) => {
                const colorStyles = [
                  'bg-[#34D399]/20 text-[#6EE7B7] border-[#059669]',
                  'bg-[#FBBF24]/20 text-[#FCD34D] border-[#D97706]',
                  'bg-[#F87171]/20 text-[#FCA5A5] border-[#DC2626]',
                  'bg-[#2DD4BF]/20 text-[#5EEAD4] border-[#0D9488]',
                ];
                return (
                  <div
                    key={idx}
                    className={`px-3 py-1 rounded-full border text-[11px] font-medium flex flex-col items-start sm:items-end shadow-sm backdrop-blur-sm ${
                      colorStyles[idx % colorStyles.length]
                    }`}
                  >
                    <span className="font-bold tracking-tight">{p.english}</span>
                    <span className="text-[10px] opacity-90">{p.chinese}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photo & Interactive Leader-Line Overlay Area */}
          <div
            ref={photoContainerRef}
            className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden relative bg-slate-950 border-2 border-white/15 shadow-[0_8px_30px_rgb(0,0,0,0.8)] group"
          >
            <img
              src={card.imageUrl}
              alt={card.title}
              className="w-full h-full object-cover select-none"
              onLoad={() => {
                if (photoContainerRef.current) {
                  const rect = photoContainerRef.current.getBoundingClientRect();
                  setContainerDimensions({
                    width: rect.width || 380,
                    height: rect.height || 260,
                  });
                }
              }}
            />

            {/* Dark vignette to make leader-lines and text pop */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

            {/* The core LeadLineOverlay with SVG curved arrows, dots, and words */}
            <LeadLineOverlay
              items={card.detectedItems}
              imageWidth={containerDimensions.width}
              imageHeight={containerDimensions.height}
              onUpdateItems={handleUpdateItems}
              onEditItem={(item) => setEditingItem(item)}
              isEditingMode={isEditingPins}
              setIsEditingMode={setIsEditingPins}
            />
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>点击标签朗读发音，点击微调可自由拖动位置</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  card.isFavorite
                    ? 'bg-amber-400 text-slate-950 font-bold shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="收藏此卡片到生词本"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    card.isFavorite ? 'fill-current text-slate-950' : 'text-amber-400'
                  }`}
                />
                <span>{card.isFavorite ? '已收藏' : '收藏'}</span>
              </button>

              <button
                onClick={handleOpenWechatShare}
                disabled={isPreparingShare}
                className="px-3 py-1 rounded-lg bg-[#07C160] hover:bg-[#06AD56] active:bg-[#059B4D] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                title="通过微信原生分享卡片"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isPreparingShare ? '生成中' : '分享'}</span>
              </button>

              <button
                onClick={() => setIsEditingPins(!isEditingPins)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              >
                <Move className="w-3 h-3" />
                <span>{isEditingPins ? '完成微调' : '微调位置'}</span>
              </button>

              <button
                onClick={() => setIsPosterModalOpen(true)}
                className="px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>保存标注卡到相册</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- LOWER LEARNING MODULES CONTAINER (Paper-Textured Cream Notebook Style) --- */}
        <div className="rounded-3xl bg-[#FAF6EC] border-2 border-[#E5DECF] p-4 sm:p-6 space-y-6 shadow-2xl text-slate-800">
          {/* Web Speech API Pronunciation Practice Toolbar */}
          <div className="p-3.5 rounded-2xl bg-[#F0E9DA] border border-[#DDD3C0] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-sm">
                  <Volume2 className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs font-black text-slate-900 tracking-tight">点击朗读与跟读练习 (Web Speech)</span>
                  <p className="text-[10px] text-slate-600">点击任意单词、句型或段落即可播放纯正发音</p>
                </div>
              </div>

              {/* Speed & Accent Selectors */}
              <div className="flex items-center gap-1.5 text-xs">
                {/* Accent selector */}
                <button
                  onClick={() => setSpeechAccent((prev) => (prev === 'US' ? 'UK' : 'US'))}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-mono text-[11px] shadow-sm transition-colors"
                  title="切换美式/英式发音"
                >
                  {speechAccent === 'US' ? '🇺🇸 美音 (US)' : '🇬🇧 英音 (UK)'}
                </button>

                {/* Speed buttons */}
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-300 text-[11px] shadow-sm">
                  <button
                    onClick={() => setSpeechRate(0.75)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      speechRate === 0.75
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="0.75x 慢速模式"
                  >
                    0.75x慢速
                  </button>
                  <button
                    onClick={() => setSpeechRate(0.9)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      speechRate === 0.9
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="0.9x 自然口语语速"
                  >
                    0.9x自然
                  </button>
                  <button
                    onClick={() => setSpeechRate(1.0)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      speechRate === 1.0
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="1.0x 常速"
                  >
                    1.0x
                  </button>
                </div>
              </div>
            </div>

            {/* Currently Playing Status Indicator */}
            {currentlyPlayingText && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-xs text-emerald-950 animate-in fade-in">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="w-1.5 h-3 bg-emerald-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-4 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                  <span className="truncate font-bold">正在朗读: "{currentlyPlayingText}"</span>
                </div>
                <button
                  onClick={() => {
                    stopSpeaking();
                    setCurrentlyPlayingText(null);
                    setIsReadingWholeText(false);
                  }}
                  className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold shrink-0 ml-2 shadow-xs"
                >
                  停止
                </button>
              </div>
            )}
          </div>

          {/* 01 Key Vocabulary */}
          <section className="bg-white/70 p-4 rounded-2xl border border-[#E2D8C3] shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FFE500] text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
                  01
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                    <span style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }} className="text-lg">Key Vocabulary</span>
                    <span className="text-xs text-slate-500 font-bold">核心词汇 (点击发音)</span>
                  </h3>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{card.keyVocabulary.length} 词</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {card.keyVocabulary.map((vocab, i) => {
                const isPlaying = currentlyPlayingText === vocab.english;
                return (
                  <div
                    key={i}
                    onClick={() => handlePlaySpeech(vocab.english)}
                    className={`group cursor-pointer p-2.5 rounded-xl border flex items-center justify-between transition-all select-none ${
                      isPlaying
                        ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400 text-slate-950 shadow-sm'
                        : 'bg-white hover:bg-amber-50/60 border-[#E8DFD0] hover:border-amber-400 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-black text-xs transition-colors ${
                            isPlaying ? 'text-amber-900' : 'text-slate-900 group-hover:text-amber-800'
                          }`}
                        >
                          {vocab.english}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{vocab.partOfSpeech}</span>
                      </div>
                      <span className="text-[11px] text-slate-600 truncate font-medium">{vocab.chinese}</span>
                      {vocab.phonetic && (
                        <span className="text-[10px] text-amber-700 font-mono truncate">
                          {vocab.phonetic}
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-1.5 rounded-full transition-colors ${
                        isPlaying
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-100'
                      }`}
                      title="点击发音"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 02 Natural Phrases */}
          <section className="bg-white/70 p-4 rounded-2xl border border-[#E2D8C3] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FF4D4F] text-white font-black text-sm flex items-center justify-center shadow-xs">
                  02
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                    <span style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }} className="text-lg">Natural Phrases</span>
                    <span className="text-xs text-slate-500 font-bold">常用短语 (点击跟读)</span>
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {card.naturalPhrases.map((phrase, i) => {
                const isPlaying = currentlyPlayingText === phrase.english;
                return (
                  <div
                    key={i}
                    onClick={() => handlePlaySpeech(phrase.english)}
                    className={`group cursor-pointer p-2.5 rounded-xl border flex items-center justify-between transition-all select-none ${
                      isPlaying
                        ? 'bg-rose-100 border-rose-500 ring-2 ring-rose-400 text-slate-950 shadow-sm'
                        : 'bg-white hover:bg-rose-50/60 border-[#E8DFD0] hover:border-rose-400 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <div>
                        <div
                          className={`text-xs font-bold transition-colors ${
                            isPlaying ? 'text-rose-900' : 'text-slate-900 group-hover:text-rose-800'
                          }`}
                        >
                          {phrase.english}
                        </div>
                        <div className="text-[11px] text-slate-600">{phrase.chinese}</div>
                      </div>
                    </div>
                    <div
                      className={`p-1.5 rounded-full transition-colors shrink-0 ml-1 ${
                        isPlaying
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-400 group-hover:text-rose-600 group-hover:bg-rose-100'
                      }`}
                      title="点击朗读短语"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 03 Useful Sentence Patterns */}
          <section className="bg-white/70 p-4 rounded-2xl border border-[#E2D8C3] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#10B981] text-white font-black text-sm flex items-center justify-center shadow-xs">
                  03
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                    <span style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }} className="text-lg">Useful Sentence Patterns</span>
                    <span className="text-xs text-slate-500 font-bold">实用句型 (点击朗读)</span>
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {card.usefulPatterns.map((pat, i) => {
                const isPlayingPattern = currentlyPlayingText === pat.pattern;
                const isPlayingExample = currentlyPlayingText === pat.example;

                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border transition-all ${
                      isPlayingPattern || isPlayingExample
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/50'
                        : 'bg-white border-[#E8DFD0] hover:border-emerald-400 shadow-xs'
                    }`}
                  >
                    {/* Pattern Template Row */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-black text-emerald-800 font-mono tracking-tight">
                          {pat.pattern}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium">({pat.meaning})</span>
                      </div>

                      <button
                        onClick={() => handlePlaySpeech(pat.pattern)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          isPlayingPattern
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                        title="朗读句型框架"
                      >
                        <Volume2 className={`w-3 h-3 ${isPlayingPattern ? 'animate-bounce' : ''}`} />
                        <span>句型</span>
                      </button>
                    </div>

                    {/* Example Sentence Row */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <div
                        onClick={() => handlePlaySpeech(pat.example)}
                        className="cursor-pointer group flex-1 text-[11px] text-slate-700 hover:text-slate-950 leading-relaxed"
                      >
                        <span className="text-emerald-700 font-bold mr-1">例句:</span>
                        <span
                          className={`italic ${
                            isPlayingExample ? 'text-amber-800 font-bold underline' : ''
                          }`}
                        >
                          {pat.example}
                        </span>
                      </div>

                      <button
                        onClick={() => handlePlaySpeech(pat.example)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                          isPlayingExample
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        }`}
                        title="朗读完整生活例句"
                      >
                        <Volume2 className={`w-3 h-3 ${isPlayingExample ? 'animate-bounce' : ''}`} />
                        <span>读例句</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 04 Scene Description */}
          <section className="bg-white/70 p-4 rounded-2xl border border-[#E2D8C3] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FFE500] text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
                  04
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                    <span style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }} className="text-lg">Scene Description</span>
                    <span className="text-xs text-slate-500 font-bold">
                      场景描述 ({card.sceneDescription.wordCount || 55}词)
                    </span>
                  </h3>
                </div>
              </div>

              <button
                onClick={handleToggleReadWhole}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                  isReadingWholeText || currentlyPlayingText === card.sceneDescription.english
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                }`}
              >
                {isReadingWholeText || currentlyPlayingText === card.sceneDescription.english ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-slate-950" />
                    <span>暂停朗读</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                    <span>全篇朗读</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#EADFC7] shadow-xs space-y-3">
              <div className="text-sm text-slate-800 leading-relaxed font-serif space-x-1">
                {card.sceneDescription.english.split(/(?<=[.?!])\s+/).map((sentence, idx) => {
                  const isPlayingSentence = currentlyPlayingText === sentence;
                  return (
                    <span
                      key={idx}
                      onClick={() => handlePlaySpeech(sentence)}
                      className={`inline cursor-pointer px-1 py-0.5 rounded transition-colors ${
                        isPlayingSentence
                          ? 'bg-amber-200 text-amber-950 underline decoration-amber-500 font-bold'
                          : 'hover:bg-amber-100 hover:text-slate-950'
                      }`}
                      title="点击单句发音跟读"
                    >
                      {sentence}
                    </span>
                  );
                })}
              </div>
              <div className="pt-3 border-t border-[#E8DFD0] text-xs text-slate-600 leading-relaxed font-sans">
                {card.sceneDescription.chinese}
              </div>
              <div className="text-[10px] text-slate-500 italic">
                💡 提示：点击段落中的任意单句可单独精听，或点击右上角「全篇朗读」连贯听取。
              </div>
            </div>
          </section>

          {/* 05 Speaking & Writing Prompts */}
          <section className="bg-white/70 p-4 rounded-2xl border border-[#E2D8C3] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FF4D4F] text-white font-black text-sm flex items-center justify-center shadow-xs">
                  05
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                    <span style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }} className="text-lg">Speaking & Writing Prompts</span>
                    <span className="text-xs text-slate-500 font-bold">口语与写作练习 (仅3题)</span>
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {card.prompts.map((prompt) => (
                <div key={prompt.index} className="p-3.5 rounded-2xl bg-[#FFFDF7] border border-[#EADFC7] shadow-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FF4D4F] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {prompt.index}
                    </span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900">{prompt.questionEn}</div>
                      <div className="text-[11px] text-slate-600">{prompt.questionZh}</div>
                      {prompt.hint && (
                        <div className="text-[10px] text-amber-800 mt-1 flex items-center gap-1 font-medium">
                          <Lightbulb className="w-3 h-3 text-amber-600" />
                          <span>提示: {prompt.hint}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive response field */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userAnswers[prompt.index] || ''}
                        onChange={(e) =>
                          setUserAnswers((prev) => ({ ...prev, [prompt.index]: e.target.value }))
                        }
                        placeholder="用英文输入你的回答，或尝试大声说出来..."
                        className="flex-1 px-3 py-2 bg-white border border-[#DDD3C0] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-400 shadow-inner"
                      />
                      <button
                        onClick={() => handleAnswerSubmit(prompt.index)}
                        className="px-3 py-2 bg-[#FF4D4F] hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>提交</span>
                      </button>
                    </div>

                    {feedbackGiven[prompt.index] && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-start gap-2 animate-in fade-in">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-medium">{feedbackGiven[prompt.index]}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Study Tip */}
          <div className="p-4 rounded-2xl bg-[#FFF9E6] border-2 border-[#FFE58F] text-slate-800 text-xs flex items-start gap-3 shadow-xs">
            <span className="p-1 rounded-full bg-amber-400 text-slate-950 shadow-xs shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </span>
            <div className="space-y-0.5">
              <div className="font-black text-amber-950 text-xs">{card.studyTip.title}</div>
              <div className="leading-relaxed font-medium text-slate-800">{card.studyTip.tipEn}</div>
              <div className="text-[11px] text-slate-600">{card.studyTip.tipZh}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Correction Modal */}
      {editingItem && (
        <CorrectionModal
          item={editingItem}
          cardId={card.id}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveCorrection}
        />
      )}

      {/* High-Definition Poster Share Modal */}
      <HighDefPosterModal
        card={card}
        isOpen={isPosterModalOpen}
        onClose={() => setIsPosterModalOpen(false)}
      />

      {/* WeChat Native Share Action Sheet & Poster Modal */}
      {isWechatShareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in select-none"
          onClick={() => setIsWechatShareOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#07C160] text-white flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>微信小程序原生分享</span>
                    <span className="text-[10px] font-normal px-1.5 py-0.2 bg-[#07C160]/20 text-[#6EE7B7] rounded border border-[#07C160]/30">
                      wx.miniProgram
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">已自动附加品牌水印及专属跳转卡片深度链接</p>
                </div>
              </div>

              <button
                onClick={() => setIsWechatShareOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Watermarked Poster Preview Card */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">分享附带高清海报卡（含品牌水印 &amp; 小程序码）：</span>
              <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 relative shadow-inner flex items-center justify-center group">
                {sharePosterUrl ? (
                  <img
                    src={sharePosterUrl}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>正在绘制水印卡片...</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/75 text-[10px] text-emerald-300 font-mono border border-white/15">
                  已添加水印
                </div>
              </div>
            </div>

            {/* Exclusive Deep Link Path */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>专属跳转路径 (Mini-Program Path)</span>
                </span>
                <span className="text-emerald-400 font-mono text-[10px]">直达此卡片</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-300 break-all select-all">
                {sharePath}
              </div>
            </div>

            {/* WeChat Sharing Action Options */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Share to WeChat Friend / Group */}
              <button
                onClick={() => {
                  const win = window as any;
                  if (win.wx && win.wx.miniProgram) {
                    win.wx.miniProgram.postMessage({
                      data: {
                        action: 'shareAppMessage',
                        title: `【拍照学英语】我在看这道「${card.titleChinese}」！`,
                        path: sharePath,
                        imageUrl: sharePosterUrl || card.imageUrl,
                      },
                    });
                  }
                  // Copy link as universal fallback and alert feedback
                  handleCopyShareLink();
                }}
                className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span>发给微信好友/群</span>
                <span className="text-[10px] font-normal opacity-85">触发 onShareAppMessage</span>
              </button>

              {/* Option 2: Share to Moments (WeChat Timeline) */}
              <button
                onClick={() => {
                  const win = window as any;
                  if (win.wx && win.wx.miniProgram) {
                    win.wx.miniProgram.postMessage({
                      data: {
                        action: 'shareTimeline',
                        title: `【拍照学英语】生活皆语境！「${card.titleChinese}」场景英语词卡`,
                        query: `cardId=${card.id}`,
                        imageUrl: sharePosterUrl || card.imageUrl,
                      },
                    });
                  }
                  handleCopyShareLink();
                }}
                className="p-3 rounded-2xl bg-[#07C160] hover:bg-[#06AD56] active:bg-[#059B4D] text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <span>分享到朋友圈</span>
                <span className="text-[10px] font-normal opacity-85">触发 onShareTimeline</span>
              </button>
            </div>

            {/* Copy Universal Link / Cancel */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyShareLink}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                {copiedLinkToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">已复制微信分享文案与链接</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>复制专属文案与跳转链接</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsWechatShareOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
