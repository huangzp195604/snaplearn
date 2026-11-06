import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Edit3, Move, Check, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { DetectedItem } from '../types';
import { speakEnglish, EnglishAccent } from '../utils/speech';

interface LeadLineOverlayProps {
  items: DetectedItem[];
  imageWidth: number;
  imageHeight: number;
  onUpdateItems: (newItems: DetectedItem[]) => void;
  onEditItem: (item: DetectedItem) => void;
  isEditingMode: boolean;
  setIsEditingMode: (editing: boolean) => void;
  accent?: EnglishAccent;  // 当前选的口音（US/UK），用于发音
}

export const LeadLineOverlay: React.FC<LeadLineOverlayProps> = ({
  items,
  imageWidth,
  imageHeight,
  onUpdateItems,
  onEditItem,
  isEditingMode,
  setIsEditingMode,
  accent = 'US',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<'pin' | 'label' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle word pronunciation（跟随当前选择的英/美音）
  const handlePlayAudio = (e: React.MouseEvent, item: DetectedItem) => {
    e.stopPropagation();
    setActiveSpeechId(item.id);
    speakEnglish(item.english, {
      rate: 0.9,
      accent,
      onEnd: () => setActiveSpeechId(null),
      onError: () => setActiveSpeechId(null),
    });
  };

  // Dragging logic for fine-tuning coordinates
  const handleMouseDown = (e: React.MouseEvent, itemId: string, target: 'pin' | 'label') => {
    if (!isEditingMode) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingItemId(itemId);
    setDragTarget(target);
  };

  const handleTouchStart = (e: React.TouchEvent, itemId: string, target: 'pin' | 'label') => {
    if (!isEditingMode) return;
    e.stopPropagation();
    setDraggingItemId(itemId);
    setDragTarget(target);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingItemId || !containerRef.current || !dragTarget) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Calculate relative percentage
      const relX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const relY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      const updated = items.map((item) => {
        if (item.id !== draggingItemId) return item;
        if (dragTarget === 'pin') {
          return { ...item, x: Math.round(relX), y: Math.round(relY) };
        } else {
          // Label offset
          const pinPixelX = (item.x / 100) * rect.width;
          const pinPixelY = (item.y / 100) * rect.height;
          const targetPixelX = (relX / 100) * rect.width;
          const targetPixelY = (relY / 100) * rect.height;

          // Default side offset
          const side = item.labelSide || 'top';
          let defaultX = pinPixelX;
          let defaultY = pinPixelY;
          const len = 65;
          if (side.includes('left')) defaultX -= len;
          if (side.includes('right')) defaultX += len;
          if (side.includes('top')) defaultY -= len * 0.7;
          if (side.includes('bottom')) defaultY += len * 0.7;

          return {
            ...item,
            labelOffsetX: Math.round(targetPixelX - defaultX),
            labelOffsetY: Math.round(targetPixelY - defaultY),
          };
        }
      });

      onUpdateItems(updated);
    };

    const handleMouseUp = () => {
      setDraggingItemId(null);
      setDragTarget(null);
    };

    if (draggingItemId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingItemId, dragTarget, items, onUpdateItems]);

  if (!isVisible) {
    return (
      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={() => setIsVisible(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-medium rounded-full backdrop-blur-md border border-white/20 shadow-lg transition-all"
        >
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>显示标注层</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 select-none overflow-hidden z-20 pointer-events-auto">
      {/* Top overlay control bar */}
      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-2">
        <button
          onClick={() => setIsEditingMode(!isEditingMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full shadow-md backdrop-blur-md transition-all ${
            isEditingMode
              ? 'bg-amber-500 text-slate-950 font-semibold ring-2 ring-amber-300'
              : 'bg-black/60 hover:bg-black/80 text-white/90 border border-white/20'
          }`}
          title="点击可拖动标注点与标签微调坐标"
        >
          {isEditingMode ? (
            <>
              <Check className="w-3 h-3 text-slate-950" />
              <span>完成微调</span>
            </>
          ) : (
            <>
              <Move className="w-3 h-3 text-amber-300" />
              <span>微调位置</span>
            </>
          )}
        </button>

        <button
          onClick={() => setIsVisible(false)}
          className="p-1.5 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white rounded-full border border-white/20 shadow-md backdrop-blur-md"
          title="隐藏标注"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {isEditingMode && (
        <div className="absolute top-2.5 left-2.5 z-30 px-2.5 py-1 bg-amber-500/90 text-slate-950 text-[11px] font-bold rounded-full shadow-md flex items-center gap-1">
          <Move className="w-3 h-3 animate-pulse" />
          <span>微调模式：按住黄点或词条可自由拖拽</span>
        </div>
      )}

      {/* SVG Layer for Leader Lines */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
        <defs>
          <radialGradient id="pinGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {items.map((item) => {
          const pinX = (item.x / 100) * imageWidth;
          const pinY = (item.y / 100) * imageHeight;

          // Default side placement
          const side = item.labelSide || 'top';
          let targetX = pinX;
          let targetY = pinY;
          const len = 70;
          if (side.includes('left')) targetX -= len;
          if (side.includes('right')) targetX += len;
          if (side.includes('top')) targetY -= len * 0.65;
          if (side.includes('bottom')) targetY += len * 0.65;

          // Apply manual user offset
          if (item.labelOffsetX) targetX += item.labelOffsetX;
          if (item.labelOffsetY) targetY += item.labelOffsetY;

          // Control point for smooth organic curve
          const cpX = (pinX + targetX) / 2 + (item.curvature || 0);
          const cpY = (pinY + targetY) / 2 - 10;

          // 箭头：指向物品的马克笔式手绘箭头
          const angle = Math.atan2(pinY - targetY, pinX - targetX);
          const ax1 = pinX - 9 * Math.cos(angle - 0.45);
          const ay1 = pinY - 9 * Math.sin(angle - 0.45);
          const ax2 = pinX - 9 * Math.cos(angle + 0.45);
          const ay2 = pinY - 9 * Math.sin(angle + 0.45);

          return (
            <g key={`line-${item.id}`}>
              {/* Outer delicate circle around pin */}
              <circle cx={pinX} cy={pinY} r="6" fill="none" stroke="#ffffff" strokeWidth="1.4" />
              {/* Inner solid white dot */}
              <circle cx={pinX} cy={pinY} r="2.2" fill="#ffffff" />

              {/* 参考海报的白色马克笔引线（实线 + 箭头） */}
              <path
                d={`M ${targetX} ${targetY} Q ${cpX} ${cpY} ${pinX} ${pinY}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d={`M ${ax1} ${ay1} L ${pinX} ${pinY} L ${ax2} ${ay2}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>

      {/* Pins and Labels interactive overlays */}
      {items.map((item) => {
        const pinPixelX = (item.x / 100) * imageWidth;
        const pinPixelY = (item.y / 100) * imageHeight;

        const side = item.labelSide || 'top';
        let targetX = pinPixelX;
        let targetY = pinPixelY;
        const len = 70;
        if (side.includes('left')) targetX -= len;
        if (side.includes('right')) targetX += len;
        if (side.includes('top')) targetY -= len * 0.65;
        if (side.includes('bottom')) targetY += len * 0.65;

        if (item.labelOffsetX) targetX += item.labelOffsetX;
        if (item.labelOffsetY) targetY += item.labelOffsetY;

        const isSpeaking = activeSpeechId === item.id;
        const isDraggingThis = draggingItemId === item.id;

        return (
          <React.Fragment key={item.id}>
            {/* Draggable pin dot when in editing mode */}
            {isEditingMode && (
              <div
                onMouseDown={(e) => handleMouseDown(e, item.id, 'pin')}
                onTouchStart={(e) => handleTouchStart(e, item.id, 'pin')}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center cursor-move z-30 transition-transform ${
                  isDraggingThis && dragTarget === 'pin' ? 'scale-125 bg-amber-400 text-slate-950' : 'bg-amber-400/90 hover:bg-amber-300 text-slate-950 ring-2 ring-white shadow-lg'
                }`}
                title="按住拖拽调整针点位置"
              >
                <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
              </div>
            )}

            {/* Label - Reference image style: crisp white typography directly over the photo */}
            <div
              style={{
                left: `${targetX}px`,
                top: `${targetY}px`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={(e) => handleMouseDown(e, item.id, 'label')}
              onTouchStart={(e) => handleTouchStart(e, item.id, 'label')}
              className={`absolute group z-20 flex items-center gap-1 transition-all select-none ${
                isEditingMode
                  ? 'cursor-move px-2 py-1 rounded-xl ring-2 ring-amber-400 bg-black/85 border border-amber-400 text-white shadow-xl backdrop-blur-sm'
                  : 'px-1 py-0.5 rounded-md hover:bg-black/30'
              }`}
            >
              {/* Word info —— 参考海报的手写马克笔标注 */}
              <div
                className="flex flex-col items-center leading-tight cursor-pointer"
                onClick={(e) => handlePlayAudio(e, item)}
                title="点击朗读发音"
              >
                <span
                  className="text-[16px] sm:text-[18px] font-extrabold tracking-tight text-white"
                  style={{
                    fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
                    textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.7)',
                  }}
                >
                  {item.english}
                </span>
                <span
                  className="text-[11px] sm:text-[12px] font-medium text-[#FFE58F] tracking-wide border-b border-white/50 pb-0.5"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                >
                  {item.chinese}
                </span>
              </div>

              {/* Action buttons (revealed on hover or always subtle) */}
              {!isEditingMode && (
                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity pl-0.5">
                  <button
                    onClick={(e) => handlePlayAudio(e, item)}
                    className={`p-1 rounded-full transition-colors ${
                      isSpeaking ? 'bg-amber-400 text-slate-950' : 'text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                    title="朗读发音"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-amber-300' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditItem(item);
                    }}
                    className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/20"
                    title="修改词汇或中文释义"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isEditingMode && (
                <div className="pl-1 text-amber-300">
                  <Move className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
