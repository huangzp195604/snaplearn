export interface DetectedItem {
  id: string;
  english: string;
  chinese: string;
  phonetic: string;
  x: number; // 0 - 100 percentage
  y: number; // 0 - 100 percentage
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

export interface LearningCard {
  id: string;
  title: string;
  titleChinese: string;
  createdAt: number;
  imageUrl: string;
  sceneCategory: 'food' | 'coffee' | 'pet' | 'street' | 'supermarket' | 'outfit' | 'study' | 'other';
  /** AI 根据图片内容选定的海报风格（千图千面） */
  posterStyle?: PosterStyle;
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
