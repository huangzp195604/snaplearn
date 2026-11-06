import { LearningCard } from '../types';

/**
 * 海报主题系统 —— "千图千面"的核心
 * AI 只负责从固定主题列表里"选风格"（保证不出错），
 * 代码里的配色由本文件统一管理（保证一定好看）。
 */

export interface PosterStyle {
  /** AI 选定的主题名，与 POSTER_THEMES 的 key 对应 */
  theme?: string;
  /** AI 挑选的场景装饰 emoji（3-4 个），以贴纸形式画在照片四角 */
  motifs?: string[];
  /** AI 给出的一句选风格理由（仅用于调试/展示） */
  moodNote?: string;
}

export interface PosterTheme {
  /** 海报整体背景 */
  bg: string;
  /** 头部渐变（顶部 → 下缘） */
  headerTop: string;
  headerBottom: string;
  /** 英文大标题颜色 */
  titleColor: string;
  /** 中文副标题徽章 */
  badgeBg: string;
  badgeText: string;
  /** 右上角短语泡泡（4 色循环） */
  bubbles: { bg: string; text: string }[];
  /** 下半学习区"纸面"底色与描边 */
  sheetBg: string;
  sheetBorder: string;
  /** 纸面上的正文/辅文颜色 */
  sectionText: string;
  sectionSub: string;
  /** 01-05 区块强调色 */
  accents: { s1: string; s2: string; s3: string; s4: string; s5: string };
  /** 照片加载失败时的兜底渐变 */
  photoFallbackTop: string;
  photoFallbackBottom: string;
  /** 底部水印副文字颜色 */
  watermarkSub: string;
}

export const POSTER_THEMES: Record<string, PosterTheme> = {
  // 经典黑板风（原版默认，适合暗调背景、高级餐厅、深夜食堂）
  'chalkboard-dark': {
    bg: '#1e242b',
    headerTop: '#15191e',
    headerBottom: '#1f2730',
    titleColor: '#ffffff',
    badgeBg: '#ffd13b',
    badgeText: '#1a1a1a',
    bubbles: [
      { bg: '#8ec07c', text: '#1b2b1a' },
      { bg: '#fabd2f', text: '#2b2208' },
      { bg: '#fb4934', text: '#ffffff' },
      { bg: '#b8bb26', text: '#1d2a13' },
    ],
    sheetBg: '#f8f9fa',
    sheetBorder: '#e2e8f0',
    sectionText: '#0f172a',
    sectionSub: '#64748b',
    accents: { s1: '#f59e0b', s2: '#ef4444', s3: '#10b981', s4: '#fbbf24', s5: '#ef4444' },
    photoFallbackTop: '#3a4454',
    photoFallbackBottom: '#232b36',
    watermarkSub: '#94a3b8',
  },

  // 暖奶油海报风（美食、咖啡、烘焙、brunch —— 对齐参考图的黑顶 + 奶油纸面）
  'warm-cream': {
    bg: '#0C0C0E',
    headerTop: '#0C0C0E',
    headerBottom: '#161616',
    titleColor: '#FFFFFF',
    badgeBg: '#FFD51E',
    badgeText: '#141414',
    bubbles: [
      { bg: '#A8CC3A', text: '#16210A' },
      { bg: '#FFD93D', text: '#221B00' },
      { bg: '#F0562B', text: '#FFFFFF' },
      { bg: '#B9C46B', text: '#1B2208' },
    ],
    sheetBg: '#FBF4E2',
    sheetBorder: '#E6D9BE',
    sectionText: '#2B2118',
    sectionSub: '#7A6A55',
    accents: { s1: '#FFD51E', s2: '#D94A28', s3: '#EBD9A8', s4: '#FFD51E', s5: '#D94A28' },
    photoFallbackTop: '#2A2A2A',
    photoFallbackBottom: '#101010',
    watermarkSub: '#9A8C75',
  },

  // 清新绿（沙拉、健康餐、超市生鲜、果蔬）
  'fresh-green': {
    bg: '#F0F7F1',
    headerTop: '#E1F0E3',
    headerBottom: '#F0F7F1',
    titleColor: '#1B4332',
    badgeBg: '#2E7D32',
    badgeText: '#FFFFFF',
    bubbles: [
      { bg: '#2E7D32', text: '#FFFFFF' },
      { bg: '#8BC34A', text: '#1F330D' },
      { bg: '#FFB300', text: '#3D2E00' },
      { bg: '#00897B', text: '#FFFFFF' },
    ],
    sheetBg: '#FFFFFF',
    sheetBorder: '#CDE3D0',
    sectionText: '#1F3A27',
    sectionSub: '#6B8F77',
    accents: { s1: '#F9A825', s2: '#E53935', s3: '#2E7D32', s4: '#F9A825', s5: '#E53935' },
    photoFallbackTop: '#BFD8C2',
    photoFallbackBottom: '#A3C4AB',
    watermarkSub: '#6B8F77',
  },

  // 街拍冷调（穿搭、街景、夜景、潮酷场景）
  'cool-street': {
    bg: '#14181F',
    headerTop: '#0F131A',
    headerBottom: '#1A2230',
    titleColor: '#F5F7FA',
    badgeBg: '#4FC3F7',
    badgeText: '#0A1520',
    bubbles: [
      { bg: '#4FC3F7', text: '#0A1520' },
      { bg: '#9575CD', text: '#FFFFFF' },
      { bg: '#FF7043', text: '#FFFFFF' },
      { bg: '#26A69A', text: '#FFFFFF' },
    ],
    sheetBg: '#F6F8FA',
    sheetBorder: '#2E3A4D',
    sectionText: '#1A2332',
    sectionSub: '#5D6D7E',
    accents: { s1: '#29B6F6', s2: '#FF7043', s3: '#26A69A', s4: '#FFB300', s5: '#FF7043' },
    photoFallbackTop: '#2C3849',
    photoFallbackBottom: '#1D2634',
    watermarkSub: '#8FA1B5',
  },

  // 治愈粉彩（宠物、萌娃、花束、甜品）
  'soft-pastel': {
    bg: '#FDF3F5',
    headerTop: '#FBE7EC',
    headerBottom: '#FDF3F5',
    titleColor: '#83314E',
    badgeBg: '#EC4899',
    badgeText: '#FFFFFF',
    bubbles: [
      { bg: '#F9A8D4', text: '#4A1F30' },
      { bg: '#FCD34D', text: '#443200' },
      { bg: '#A7C7F9', text: '#1F2E44' },
      { bg: '#B5EAD7', text: '#234437' },
    ],
    sheetBg: '#FFFBFC',
    sheetBorder: '#F3D7E0',
    sectionText: '#4A2E3A',
    sectionSub: '#9A7E8A',
    accents: { s1: '#F59E0B', s2: '#EC4899', s3: '#34B39A', s4: '#F59E0B', s5: '#EC4899' },
    photoFallbackTop: '#F2D9E0',
    photoFallbackBottom: '#E4C3CD',
    watermarkSub: '#9A7E8A',
  },

  // 牛皮纸手账风（书桌、文具、笔记、书店）
  'paper-kraft': {
    bg: '#EFE6D5',
    headerTop: '#E5D9C3',
    headerBottom: '#EFE6D5',
    titleColor: '#3E2F23',
    badgeBg: '#8D6E63',
    badgeText: '#FFFFFF',
    bubbles: [
      { bg: '#8D6E63', text: '#FFFFFF' },
      { bg: '#C0CA33', text: '#263000' },
      { bg: '#FF8A65', text: '#FFFFFF' },
      { bg: '#4DD0E1', text: '#003444' },
    ],
    sheetBg: '#FFFDF8',
    sheetBorder: '#DACDB4',
    sectionText: '#33261A',
    sectionSub: '#857358',
    accents: { s1: '#C98A2D', s2: '#BF5B3F', s3: '#6B8E23', s4: '#C98A2D', s5: '#BF5B3F' },
    photoFallbackTop: '#CDBBA0',
    photoFallbackBottom: '#B5A184',
    watermarkSub: '#857358',
  },
};

// 场景类别 → 默认主题（AI 没选或选错时的兜底）
const CATEGORY_THEME_MAP: Record<string, string> = {
  food: 'warm-cream',
  coffee: 'warm-cream',
  pet: 'soft-pastel',
  street: 'cool-street',
  outfit: 'cool-street',
  supermarket: 'fresh-green',
  study: 'paper-kraft',
  other: 'chalkboard-dark',
};

const DEFAULT_MOTIFS = ['✨', '📷', '🌱'];

/**
 * 依据 AI 的 posterStyle 决定最终主题与装饰 emoji。
 * 三级兜底：AI 选的主题 → 场景类别映射 → 经典黑板。
 */
export function pickPosterTheme(
  card: Pick<LearningCard, 'posterStyle' | 'sceneCategory'>
): { theme: PosterTheme; motifs: string[] } {
  const aiTheme = card.posterStyle?.theme;
  const categoryTheme = CATEGORY_THEME_MAP[card.sceneCategory] || 'chalkboard-dark';

  const themeName =
    aiTheme && POSTER_THEMES[aiTheme] ? aiTheme : categoryTheme;

  const motifsRaw = card.posterStyle?.motifs;
  const motifs =
    Array.isArray(motifsRaw) && motifsRaw.length > 0
      ? motifsRaw.slice(0, 4)
      : DEFAULT_MOTIFS;

  return { theme: POSTER_THEMES[themeName], motifs };
}
