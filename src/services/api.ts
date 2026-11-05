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

  const card: LearningCard = {
    id: `card-${Date.now()}`,
    title: raw.headline || 'a moment Captured in time',
    titleChinese: raw.headlineChinese || '生活定格的一瞬',
    createdAt: Date.now(),
    imageUrl: imageBase64,
    sceneCategory: raw.sceneCategory || 'food',
    floatingPhrases: raw.floatingPhrases || [],
    detectedItems: (raw.detectedItems || []).map((item: any, idx: number) => ({
      id: item.id || `item-${idx}`,
      english: item.english,
      chinese: item.chinese,
      phonetic: item.phonetic || '',
      x: typeof item.x === 'number' ? item.x : 50,
      y: typeof item.y === 'number' ? item.y : 50,
      labelSide: item.labelSide || 'top',
      curvature: item.curvature || 0,
    })),
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
