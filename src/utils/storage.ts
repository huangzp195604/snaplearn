import { LearningCard, UserQuota, CorrectionFeedback } from '../types';
import { REFERENCE_BREAKFAST_CARD, PRESET_CARDS } from '../data/presets';

const STORAGE_KEY_CARDS = 'snaplearn_history_cards_v1';
const STORAGE_KEY_QUOTA = 'snaplearn_user_quota_v1';
const STORAGE_KEY_CORRECTIONS = 'snaplearn_corrections_v1';

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadCards(): LearningCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CARDS);
    if (raw === null) {
      // First time initialization only when key is strictly null
      saveCards(PRESET_CARDS);
      return PRESET_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveCards(PRESET_CARDS);
      return PRESET_CARDS;
    }
    // Respect user deletions even when array is empty []
    return parsed;
  } catch (e) {
    console.error('Error loading cards from localStorage:', e);
    return PRESET_CARDS;
  }
}

export function saveCards(cards: LearningCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Error saving cards to localStorage:', e);
  }
}

export function addCard(card: LearningCard): LearningCard[] {
  const existing = loadCards();
  const updated = [card, ...existing.filter((c) => c.id !== card.id)];
  saveCards(updated);
  return updated;
}

export function updateCard(card: LearningCard): void {
  const existing = loadCards();
  const updated = existing.map((c) => (c.id === card.id ? card : c));
  saveCards(updated);
}

export function deleteCard(cardId: string): LearningCard[] {
  const existing = loadCards();
  const updated = existing.filter((c) => c.id !== cardId);
  saveCards(updated);
  return updated;
}

export function loadUserQuota(): UserQuota {
  const today = getTodayString();
  const defaultQuota: UserQuota = {
    dailyTotal: 5,
    dailyUsed: 0,
    lastResetDate: today,
    isVip: false,
    bonusAdCredits: 0,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUOTA);
    if (!raw) {
      saveUserQuota(defaultQuota);
      return defaultQuota;
    }
    const parsed = JSON.parse(raw) as UserQuota;
    // Check date reset
    if (parsed.lastResetDate !== today) {
      parsed.lastResetDate = today;
      parsed.dailyUsed = 0;
      saveUserQuota(parsed);
    }
    return parsed;
  } catch (e) {
    return defaultQuota;
  }
}

export function saveUserQuota(quota: UserQuota): void {
  try {
    localStorage.setItem(STORAGE_KEY_QUOTA, JSON.stringify(quota));
  } catch (e) {
    console.error('Error saving quota:', e);
  }
}

export function useQuotaCredit(): { allowed: boolean; remaining: number } {
  const quota = loadUserQuota();
  if (quota.isVip) {
    return { allowed: true, remaining: 999 };
  }

  const remainingDaily = Math.max(0, quota.dailyTotal - quota.dailyUsed);
  const totalAvailable = remainingDaily + quota.bonusAdCredits;

  if (totalAvailable <= 0) {
    return { allowed: false, remaining: 0 };
  }

  if (remainingDaily > 0) {
    quota.dailyUsed += 1;
  } else if (quota.bonusAdCredits > 0) {
    quota.bonusAdCredits -= 1;
  }

  saveUserQuota(quota);
  const newTotal = Math.max(0, quota.dailyTotal - quota.dailyUsed) + quota.bonusAdCredits;
  return { allowed: true, remaining: newTotal };
}

export function addAdBonusCredits(amount = 3): UserQuota {
  const quota = loadUserQuota();
  quota.bonusAdCredits += amount;
  saveUserQuota(quota);
  return quota;
}

export function toggleVipStatus(): UserQuota {
  const quota = loadUserQuota();
  quota.isVip = !quota.isVip;
  saveUserQuota(quota);
  return quota;
}

export function resetQuotaForTesting(): UserQuota {
  const quota = loadUserQuota();
  quota.dailyUsed = 0;
  quota.bonusAdCredits = 0;
  saveUserQuota(quota);
  return quota;
}

export function logCorrection(correction: Omit<CorrectionFeedback, 'id' | 'timestamp'>): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CORRECTIONS);
    const list: CorrectionFeedback[] = raw ? JSON.parse(raw) : [];
    const item: CorrectionFeedback = {
      ...correction,
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    list.unshift(item);
    localStorage.setItem(STORAGE_KEY_CORRECTIONS, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to log correction:', e);
  }
}

export function loadCorrections(): CorrectionFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CORRECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

const STORAGE_KEY_CUSTOM_API_KEY = 'snaplearn_custom_gemini_api_key';

export function getCustomApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_API_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCustomApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_API_KEY);
    }
  } catch (e) {
    console.error('Failed to save API key to localStorage', e);
  }
}
