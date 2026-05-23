const RU_QUESTION_START = /^(что|чё|как|почему|зачем|когда|где|куда|откуда|кто|каки[ехой]|какая|какое|сколько|можно|можешь|нужно|надо|стоит|должен|должна|могу|может|правда|правильно|есть ли|нужно ли|стоит ли|надо ли)\b/;
const EN_QUESTION_START = /^(what|how|why|when|where|who|which|should|can|could|would|is|are|do|does|did|will|am)\b/;
const RU_LI_PATTERN = /\bли\b/;

export function isQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (t.endsWith('?')) return true;
  if (RU_QUESTION_START.test(t)) return true;
  if (EN_QUESTION_START.test(t)) return true;
  if (RU_LI_PATTERN.test(t.slice(0, 40))) return true;
  return false;
}

export type IntentMode = 'auto' | 'thought' | 'question';

export function resolveIntent(text: string, mode: IntentMode): 'thought' | 'question' {
  if (mode === 'thought' || mode === 'question') return mode;
  return isQuestion(text) ? 'question' : 'thought';
}
