import { LearningCard } from '../types';
import { getCustomApiKey } from '../utils/storage';

export async function analyzeImageWithAI(
  imageBase64: string,
  mimeType = 'image/jpeg',
  userPrompt = ''
): Promise<LearningCard> {
  const customApiKey = getCustomApiKey();

  const response = await fetch('/api/analyze-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType,
      userPrompt,
      customApiKey,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || '分析失败，请检查服务连接或重试');
  }

  const raw = data.card;

  // 视觉模型有时返回 0-1000 归一化坐标而非百分比，统一换算，避免标注全被挤到右下角
  const coordSamples: number[] = [];
  (Array.isArray(raw.detectedItems) ? raw.detectedItems : []).forEach((it: any) => {
    const b = it?.bbox || it;
    ['x', 'y', 'w', 'h'].forEach((k) => {
      const n = Number(b?.[k]);
      if (Number.isFinite(n)) coordSamples.push(Math.abs(n));
    });
  });
  if (raw.subjectBBox) {
    ['x', 'y', 'w', 'h'].forEach((k) => {
      const n = Number(raw.subjectBBox[k]);
      if (Number.isFinite(n)) coordSamples.push(Math.abs(n));
    });
  }
  const maxCoord = coordSamples.length ? Math.max(...coordSamples) : 100;
  const coordScale = maxCoord > 105 ? 0.1 : maxCoord > 1.5 ? 1 : 100;
  const scaleBox = (b: any) => {
    let x = Number(b.x) * coordScale;
    let y = Number(b.y) * coordScale;
    let w = Number(b.w) * coordScale;
    let h = Number(b.h) * coordScale;
    if (w < 0) {
      x += w;
      w = -w;
    }
    if (h < 0) {
      y += h;
      h = -h;
    }
    return {
      x: Math.min(98, Math.max(0, x)),
      y: Math.min(98, Math.max(0, y)),
      w: Math.min(100, Math.max(1, w)),
      h: Math.min(100, Math.max(1, h)),
    };
  };

  const card: LearningCard = {
    id: `card-${Date.now()}`,
    title: raw.headline || 'a moment Captured in time',
    titleChinese: raw.headlineChinese || '生活定格的一瞬',
    createdAt: Date.now(),
    imageUrl: imageBase64,
    sceneCategory: raw.sceneCategory || 'food',
    posterStyle: raw.posterStyle
      ? {
          theme: typeof raw.posterStyle.theme === 'string' ? raw.posterStyle.theme : undefined,
          motifs: Array.isArray(raw.posterStyle.motifs) ? raw.posterStyle.motifs.filter((m: any) => typeof m === 'string') : undefined,
          moodNote: typeof raw.posterStyle.moodNote === 'string' ? raw.posterStyle.moodNote : undefined,
        }
      : undefined,
    // 视觉模型有时返回 0-1000 归一化坐标而非百分比，统一换算，避免标注全被挤到右下角
    subjectBBox:
      raw.subjectBBox &&
      [raw.subjectBBox.x, raw.subjectBBox.y, raw.subjectBBox.w, raw.subjectBBox.h].every(
        (n: any) => typeof n === 'number'
      )
        ? scaleBox(raw.subjectBBox)
        : undefined,
    floatingPhrases: raw.floatingPhrases || [],
    detectedItems: (raw.detectedItems || []).map((item: any, idx: number) => {
      // 优先用物体包围盒中心作为锚点，比 AI 估计的单点更准
      const bbox =
        item.bbox &&
        [item.bbox.x, item.bbox.y, item.bbox.w, item.bbox.h].every((n: any) => typeof n === 'number')
          ? scaleBox(item.bbox)
          : undefined;
      const x = bbox ? bbox.x + bbox.w / 2 : typeof item.x === 'number' ? Math.min(100, Math.max(0, item.x * coordScale)) : 50;
      const y = bbox ? bbox.y + bbox.h / 2 : typeof item.y === 'number' ? Math.min(100, Math.max(0, item.y * coordScale)) : 50;
      return {
        id: item.id || `item-${idx}`,
        english: item.english,
        chinese: item.chinese,
        phonetic: item.phonetic || '',
        x,
        y,
        bbox,
        labelSide: item.labelSide || 'top',
        curvature: item.curvature || 0,
      };
    }),
    keyVocabulary: raw.keyVocabulary || [],
    naturalPhrases: raw.naturalPhrases || [],
    usefulPatterns: raw.usefulPatterns || [],
    sceneDescription: raw.sceneDescription || {
      english: 'This scene captures a wonderful daily moment.',
      chinese: '这个场景捕捉了美好的日常时刻。',
      wordCount: 50,
    },
    prompts: raw.prompts || [],
    studyTip: raw.studyTip || {
      title: 'Study Tip 学习建议',
      tipEn: 'Point at real things around you and label them in English daily.',
      tipZh: '每天指着身边的日常物品，用英语快速在心中命名它们。',
    },
    isFavorite: false,
  };

  return card;
}
