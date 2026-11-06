export interface DetectedItem {
  id: string;
  english: string;
  chinese: string;
  phonetic: string;
  x: number; // 0 - 100 percentage（物体包围盒中心）
  y: number; // 0 - 100 percentage（物体包围盒中心）
  /** AI 返回的物体包围盒（百分比坐标），用于校准标注锚点 */
  bbox?: { x: number; y: number; w: number; h: number };
  labelSide?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  curvature?: number;
  labelOffsetX?: number; // Manual user drag adjustment in px or %
  labelOffsetY?: number;
}

export interface FloatingPhrase {
  english: string;
  chinese: string;
  color?: string;
}

export interface KeyVocab {
  english: string;
  chinese: string;
  phonetic: string;
  partOfSpeech: string;
  icon?: string;
}

export interface NaturalPhrase {
  english: string;
  chinese: string;
}

export interface SentencePattern {
  pattern: string;
  meaning: string;
  example: string;
}

export interface SceneDescription {
  english: string;
  chinese: string;
  wordCount: number;
}

export interface PracticePrompt {
  index: number;
  questionEn: string;
  questionZh: string;
  hint?: string;
  userAnswer?: string;
}

export interface StudyTip {
  title: string;
  tipEn: string;
  tipZh: string;
}

export interface PosterStyle {
  theme?: string;
  motifs?: string[];
  moodNote?: string;
}

/** 画面主体的包围盒（百分比坐标），用于海报裁切"主体集中" */
export interface SubjectBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LearningCard {
  id: string;
  title: string;
  titleChinese: string;
  createdAt: number;
  imageUrl: string;
  sceneCategory: 'food' | 'coffee' | 'pet' | 'street' | 'supermarket' | 'outfit' | 'study' | 'other';
  /** AI 根据图片内容选定的海报风格（千图千面） */
  posterStyle?: PosterStyle;
  /** 画面主体包围盒（海报据此裁切构图，让主体集中） */
  subjectBBox?: SubjectBBox;
  floatingPhrases: FloatingPhrase[];
  detectedItems: DetectedItem[];
  keyVocabulary: KeyVocab[];
  naturalPhrases: NaturalPhrase[];
  usefulPatterns: SentencePattern[];
  sceneDescription: SceneDescription;
  prompts: PracticePrompt[];
  studyTip: StudyTip;
  isFavorite?: boolean;
}

export interface UserQuota {
  dailyTotal: number;
  dailyUsed: number;
  lastResetDate: string; // YYYY-MM-DD
  isVip: boolean;
  bonusAdCredits: number;
}

export interface CorrectionFeedback {
  id: string;
  cardId: string;
  itemId: string;
  originalEn: string;
  originalZh: string;
  correctedEn: string;
  correctedZh: string;
  reason: string;
  timestamp: number;
}
