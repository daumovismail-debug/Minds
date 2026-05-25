const QUESTION_END = /\?\s*$/;

const RU_QUESTION_START =
  /^(что|чё|как|почему|зачем|когда|где|куда|откуда|кто|каки[ехой]|какая|какое|сколько|можно ли|можешь ли|нужно ли|надо ли|стоит ли|правда ли|есть ли|должен ли|должна ли|будет ли|есть)\b/;

const EN_QUESTION_START =
  /^(what|how|why|when|where|who|which|should|can|could|would|is|are|do|does|did|will|am)\b/;

const RU_LI_PATTERN = /\bли\b/;

const RU_LIST_VERBS =
  /\b(покажи?|пока\s+же|покаж[уы]?|выведи|выдай|вывод|открой|найди|посмотр[ею]|посмотри|вывод[иь]|показывай|открой-ка|покажи-ка|сколько)\b/;

const RU_LIST_OBJECTS =
  /\b(мысл|задач|запис|всё|все\b|срочн|важн|выполнен|невыполнен|активн|сделанн)/;

const RU_LIST_QUERIES =
  /(что\s+у\s+меня|сколько\s+у\s+меня|сколько\s+(задач|мысл|запис|срочн|важн)|какие\s+у\s+меня|какие\s+мои|где\s+мои|мои\s+(задач|мысл|запис|срочн|важн))/;

const RU_TASK_VERBS_INF =
  /^(купить|сделать|позвонить|написать|отправить|помыть|постирать|забрать|отнести|починить|заплатить|оплатить|заказать|забронировать|проверить|узнать|спросить|сходить|заехать|встретить|поздравить|поблагодарить|записать|прочитать|посмотреть|подписать|отослать|выкинуть|выбросить|собрать|принять|выпить|съесть|приготовить|убрать|вытереть|поговорить|обсудить|решить|выучить|тренироваться|пойти|поехать|вернуть|пригласить|отремонтировать|постричься|погладить|зайти|открыть|закрыть|включить|выключить|перенести|перевести|выбрать|найти|настроить|обновить|зарегистрировать|подать|сдать|пройти|прислать)/i;

const RU_TASK_IMP =
  /^(купи|сделай|позвони|напиши|отправь|помой|постирай|забери|отнеси|почини|заплати|оплати|закажи|проверь|узнай|спроси|сходи|поезжай|заедь|встреть|поздравь|поблагодари|запиши|прочитай|посмотри|выкини|выброси|собери|приготовь|убери|погладь|реши|выучи|потренируйся|вернись|открой|закрой|включи|выключи|перенеси|выбери|найди|настрой|обнови)/i;

const RU_TASK_MARKERS =
  /^(не забыть|надо\s+\S+ть\b|нужно\s+\S+ть\b|должен\s+\S+ть\b|должна\s+\S+ть\b|должны\s+\S+ть\b)/;

const RU_DATE_PREFIX =
  /^(сегодня|завтра|послезавтра|вечером|утром|днём|днем|ночью|на этой неделе|на следующей неделе|в (?:понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)|через\s+\d+)\b/;

const RU_REFLECTIVE_THOUGHT =
  /^(я\s+(понял|поняла|думаю|считаю|чувствую|хочу|вижу|заметил|заметила|осознал|осознала|верю)|мне\s+(кажется|нравится)|стоит\b|правильно\b|важно\b|лучше\b|нельзя\b|можно\b)/;

const URGENT_PATTERNS =
  /(\bсрочн|\basap\b|немедленно|критичн|поскорее|\bгорит\b|\bгоряч|сегодня\s+обязательно|до\s+конца\s+дня|сейчас\s+же|очень\s+нужно|очень\s+важн|обязательно\s+сегодня)/i;

export type Intent = 'thought' | 'question' | 'task' | 'list';

export function isQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (QUESTION_END.test(t)) return true;
  if (RU_QUESTION_START.test(t)) return true;
  if (EN_QUESTION_START.test(t)) return true;
  if (RU_LI_PATTERN.test(t.slice(0, 40))) return true;
  return false;
}

export function isListQuery(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (RU_LIST_QUERIES.test(t)) return true;
  if (RU_LIST_VERBS.test(t) && RU_LIST_OBJECTS.test(t)) return true;
  if (/^(список\b|мои\s+(задач|мысл|запис))/.test(t)) return true;
  return false;
}

export function isTask(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (RU_REFLECTIVE_THOUGHT.test(t)) return false;
  if (RU_TASK_MARKERS.test(t)) return true;
  if (RU_TASK_IMP.test(t)) return true;
  if (RU_TASK_VERBS_INF.test(t)) return true;
  if (RU_DATE_PREFIX.test(t)) {
    const rest = t.replace(RU_DATE_PREFIX, '').trim();
    if (RU_TASK_VERBS_INF.test(rest) || RU_TASK_IMP.test(rest)) return true;
  }
  return false;
}

export function isUrgent(text: string): boolean {
  return URGENT_PATTERNS.test(text);
}

export function classify(text: string): Intent {
  if (isListQuery(text)) return 'list';
  if (isQuestion(text)) return 'question';
  if (isTask(text)) return 'task';
  return 'thought';
}
