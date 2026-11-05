import React, { useState } from 'react';
import { X, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { DetectedItem } from '../types';
import { logCorrection } from '../utils/storage';

interface CorrectionModalProps {
  item: DetectedItem | null;
  cardId: string;
  onClose: () => void;
  onSave: (updatedItem: DetectedItem) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  item,
  cardId,
  onClose,
  onSave,
}) => {
  if (!item) return null;

  const [english, setEnglish] = useState(item.english);
  const [chinese, setChinese] = useState(item.chinese);
  const [phonetic, setPhonetic] = useState(item.phonetic);
  const [reason, setReason] = useState('菜品名称地道化调整');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !chinese.trim()) return;

    // Log feedback for continuous fine-tuning loop
    logCorrection({
      cardId,
      itemId: item.id,
      originalEn: item.english,
      originalZh: item.chinese,
      correctedEn: english.trim(),
      correctedZh: chinese.trim(),
      reason,
    });

    onSave({
      ...item,
      english: english.trim(),
      chinese: chinese.trim(),
      phonetic: phonetic.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </span>
            <h3 className="font-semibold text-white">校正 / 纠错菜品名称</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 my-3 leading-relaxed">
          AI 识别可能对特殊菜肴或特色食物存在偏差。您修改后不仅会实时更新当前卡片，还会记入专属“错词优化闭环库”，辅助后续模型精准度。
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">英文名称 (English)</label>
            <input
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="例如 scrambled eggs, croissant"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">中文释义 (Chinese)</label>
            <input
              type="text"
              value={chinese}
              onChange={(e) => setChinese(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="例如 炒鸡蛋, 羊角可颂面包"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">国际音标 (IPA Phonetic)</label>
            <input
              type="text"
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
              placeholder="/.../"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">校准原因</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="菜品名称地道化调整">地道化用词（如 sunny-side up）</option>
              <option value="误识别为近似食物">误识别为其他食物</option>
              <option value="中文翻译不够精确">中文翻译不够精确</option>
              <option value="物品细分更具体">希望细分（如 sourdough toast）</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-950 rounded-xl bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>保存并更新卡片</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
