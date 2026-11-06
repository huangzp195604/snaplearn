import React, { useState, useEffect } from 'react';
import { WechatFrame } from './components/WechatFrame';
import { HomeView } from './views/HomeView';
import { CardDetailView } from './views/CardDetailView';
import { ProfileView } from './views/ProfileView';
import { ProgressIndicator } from './components/ProgressIndicator';
import { LearningCard, UserQuota } from './types';
import {
  loadCards,
  addCard,
  updateCard,
  deleteCard,
  loadUserQuota,
  useQuotaCredit,
  addAdBonusCredits,
} from './utils/storage';
import { analyzeImageWithAI } from './services/api';
import { compressImage } from './utils/imageCompress';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'card' | 'profile'>('home');
  const [cards, setCards] = useState<LearningCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<LearningCard | null>(null);
  const [quota, setQuota] = useState<UserQuota>(loadUserQuota());
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulatorMode, setIsSimulatorMode] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Initialize cards
  useEffect(() => {
    const loaded = loadCards();
    setCards(loaded);
    if (loaded.length > 0) {
      setSelectedCard(loaded[0]);
    }
  }, []);

  // Handle uploading and analyzing a new user photo
  const handleUploadImage = async (file: File) => {
    // Check quota
    const quotaCheck = useQuotaCredit();
    if (!quotaCheck.allowed) {
      showToast('今日 5 次免费识别额度已用完！可在“我的”页面观看激励视频或切换 VIP 体验。');
      return;
    }
    setQuota(loadUserQuota());

    // 压缩后再上传：原图动辄 5-8MB，压缩到 1280px/JPEG85 速度提升数倍
    setIsLoading(true);
    try {
      const base64 = await compressImage(file);
      const newCard = await analyzeImageWithAI(base64, 'image/jpeg');
      const updatedCards = addCard(newCard);
      setCards(updatedCards);
      setSelectedCard(newCard);
      setActiveTab('card');
      showToast('✨ 学习卡片与引线海报已成功生成！');
    } catch (err: any) {
      console.error('Image analysis error:', err);
      showToast(err.message || '照片识别与海报生成失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCard = (card: LearningCard) => {
    setSelectedCard(card);
    setActiveTab('card');
  };

  const handleLoadPreset = (preset: LearningCard) => {
    setSelectedCard(preset);
    setActiveTab('card');
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = deleteCard(cardId);
    setCards(updated);
    if (selectedCard?.id === cardId) {
      setSelectedCard(updated.length > 0 ? updated[0] : null);
    }
    showToast('🗑️ 卡片已从本地卡库彻底删除');
  };

  const handleUpdateCard = (updated: LearningCard) => {
    updateCard(updated);
    setSelectedCard(updated);
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleWatchAd = () => {
    const updated = addAdBonusCredits(3);
    setQuota(updated);
    showToast('🎉 观看 15 秒激励视频完成！已为您增加 3 次拍照识别额度。');
  };

  // Determine navigation bar title
  const getNavTitle = () => {
    if (activeTab === 'home') return 'SnapLearn · 拍照学英语';
    if (activeTab === 'card') return selectedCard?.titleChinese || '学习卡片';
    return '个人中心 & 避坑指南';
  };

  return (
    <>
      {/* Global In-App Toast */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 border border-emerald-500/60 text-emerald-200 text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-3 max-w-sm text-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <WechatFrame
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        navTitle={getNavTitle()}
        isSimulatorMode={isSimulatorMode}
        setIsSimulatorMode={setIsSimulatorMode}
      >
        {activeTab === 'home' && (
          <HomeView
            cards={cards}
            quota={quota}
            onSelectCard={handleSelectCard}
            onUploadImage={handleUploadImage}
            onLoadPreset={handleLoadPreset}
            onDeleteCard={handleDeleteCard}
            onWatchAd={handleWatchAd}
          />
        )}

        {activeTab === 'card' && selectedCard && (
          <CardDetailView
            card={selectedCard}
            onUpdateCard={handleUpdateCard}
            onBack={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            quota={quota}
            onUpdateQuota={(newQ) => setQuota(newQ)}
            cardsCount={cards.length}
            cards={cards}
            onSelectCard={handleSelectCard}
            onUpdateCard={handleUpdateCard}
          />
        )}
      </WechatFrame>

      {/* 4-Stage Progressive Loading Modal */}
      <ProgressIndicator isLoading={isLoading} />
    </>
  );
}
