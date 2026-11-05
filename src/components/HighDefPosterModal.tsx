import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Loader2,
  QrCode,
  Image as ImageIcon,
  FileText,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { LearningCard } from '../types';
import {
  generateAnnotatedPhotoCanvas,
  generatePosterCanvas,
  downloadCanvasAsPNG,
} from '../utils/canvasPoster';

interface HighDefPosterModalProps {
  card: LearningCard;
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'annotated' | 'full';
}

export const HighDefPosterModal: React.FC<HighDefPosterModalProps> = ({
  card,
  isOpen,
  onClose,
  defaultMode = 'annotated',
}) => {
  const [exportMode, setExportMode] = useState<'annotated' | 'full'>(defaultMode);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDataUrl(null);
      setSaveSuccessToast(false);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    const generate = async () => {
      try {
        const canvas =
          exportMode === 'annotated'
            ? await generateAnnotatedPhotoCanvas(card)
            : await generatePosterCanvas(card);

        if (isMounted) {
          const url = canvas.toDataURL('image/png', 0.95);
          setDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate export canvas:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, card, exportMode]);

  if (!isOpen) return null;

  const handleSaveToAlbum = () => {
    if (!dataUrl) return;

    // Trigger PNG file download
    const filename = `SnapLearn_${
      exportMode === 'annotated' ? '图片标注卡' : '长图海报'
    }_${card.title.replace(/\s+/g, '_')}_${Date.now()}.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show mobile save toast
    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
    }, 4500);
  };

  const handleCopyShareText = () => {
    const text = `📸 我用【拍照学英语·SnapLearn】记录了我的日常「${card.titleChinese}」！\n\n核心单词：${card.detectedItems
      .slice(0, 4)
      .map((i) => `${i.english} (${i.chinese})`)
      .join('、')}\n\n生活里的每一个细节，都是最好的英语语境！扫码或微信搜索小程序一起拍照学英语吧~`;

    navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Download className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">导出卡片并保存到相册</h3>
              <p className="text-[11px] text-slate-400">转为高清 PNG 格式 · 默认添加品牌与裂变水印</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Mode Toggle */}
        <div className="grid grid-cols-2 gap-2 my-3 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs shrink-0">
          <button
            onClick={() => setExportMode('annotated')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              exportMode === 'annotated'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>图片标注卡 (精简出片)</span>
          </button>

          <button
            onClick={() => setExportMode('full')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              exportMode === 'full'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>完整学习长图海报</span>
          </button>
        </div>

        {/* Poster / Card Preview Container */}
        <div className="flex-1 my-1 overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 relative min-h-[340px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
              <span>正在生成 1200px 超清 PNG 与水印...</span>
            </div>
          ) : dataUrl ? (
            <div className="relative group max-h-[50vh] flex flex-col items-center">
              <img
                src={dataUrl}
                alt="Exported Card"
                className="max-h-[50vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
              />

              {/* Watermark verification badge */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/75 backdrop-blur-md rounded-md text-[10px] text-emerald-400 flex items-center gap-1 border border-white/10">
                <ShieldCheck className="w-3 h-3" />
                <span>默认品牌水印已嵌入</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-rose-400">生成失败，请重试</div>
          )}
        </div>

        {/* Mobile WeChat guidance note */}
        <div className="px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl my-2 flex items-center gap-2 text-[11px] text-amber-200 shrink-0">
          <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>保存提示：</strong>点击下方按钮将自动下载 PNG；在微信手机端亦可<strong>长按上方图片</strong>直接选择「保存到手机相册」。
          </span>
        </div>

        {/* Save success toast banner */}
        {saveSuccessToast && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 shrink-0 my-1">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>🎉 高清 PNG 已下载！若在手机微信中，长按上方图片即可直接保存到相册。</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 shrink-0">
          <button
            onClick={handleCopyShareText}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {copiedShareText ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>文案已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>复制分享口令文案</span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveToAlbum}
            disabled={!dataUrl || isGenerating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>保存到手机相册 (PNG)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
