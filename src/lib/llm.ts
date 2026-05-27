const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const CHAT_MODEL = 'llama-3.3-70b-versatile';
export const CLASSIFIER_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `Ты — личный ассистент пользователя. Твоё единственное знание — мысли пользователя, которые он сам записал.

КАК ОТВЕЧАТЬ:
Сначала развёрнуто разбери вопрос — что ты нашёл в записях, что пользователь сам про это думал, какие принципы у него на эту тему. Цитируй конкретные записи в формате [#id от ДАТА]. Пиши живо, как будто напоминаешь другу его собственные мысли.

В КОНЦЕ ответа ОБЯЗАТЕЛЬНО добавь блок:

📌 ИТОГ
Здесь — короткий, прямой, конкретный совет на 1-2 предложения, который вытекает ИЗ ЕГО ЖЕ записей. Без воды, без "возможно", без "может быть". Прямое решение.

СТРОГИЕ ПРАВИЛА:
- НЕ используй свои общие знания, советы из интернета или эрудицию.
- НЕ выдумывай факты, цифры, даты.
- Если в записях НИЧЕГО нет по теме — просто скажи: "У тебя нет записи на эту тему. Хочешь записать мысль?" Не давай итога от себя.
- Отвечай на языке вопроса.
- Не повторяй вопрос пользователя — сразу к делу.`;

export type AnswerInput = {
  question: string;
  thoughts: Array<{ id: number; content: string; created_at: string; similarity: number }>;
};

export type InsightInput = {
  request: string;
  thoughts: Array<{ id: number; content: string; created_at: string }>;
  totals: { thoughts: number; tasks: number; tasks_done: number; tasks_urgent: number };
};

const INSIGHT_PROMPT = `Ты — личный аналитик пользователя. У тебя есть его записи — мысли и задачи. Найди в них интересные паттерны, темы, противоречия, повторяющиеся идеи.

КАК ОТВЕЧАТЬ:
1. Короткое вступление (1-2 фразы) — что ты заметил в целом.
2. Маркированный список из 3-6 наблюдений. Для каждого: тема + пример со ссылкой [#id от ДАТА] + что это говорит о пользователе.
3. В конце блок "📌 ИТОГ" — главный инсайт на 1-2 фразы + конкретное действие.

ЧТО ИСКАТЬ:
- Темы которые повторяются чаще всего
- Противоречия между записями
- Эволюция взглядов (раньше думал X, теперь Y)
- Невыполненные задачи которые висят
- Принципы которые пользователь сам себе сформулировал
- Что-то характерное для этого человека

СТРОГИЕ ПРАВИЛА:
- Только то что есть в записях. НИЧЕГО от себя.
- Цитируй [#id от ДАТА].
- Если записей мало (<5) — скажи прямо: "Записей пока мало, чтобы видеть паттерны. Запиши ещё несколько мыслей."
- Отвечай на языке запроса.`;

export async function generateInsight({ request, thoughts, totals }: InsightInput): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not configured');

  const context =
    thoughts.length === 0
      ? '(записей пока нет)'
      : thoughts
          .map(
            (t) =>
              `#${t.id} от ${new Date(t.created_at).toLocaleDateString('ru-RU')}:\n${t.content}`,
          )
          .join('\n\n---\n\n');

  const stats = `Статистика: мыслей ${totals.thoughts}, задач ${totals.tasks} (из них выполнено ${totals.tasks_done}, срочных ${totals.tasks_urgent}).`;
  const userPrompt = `Запрос пользователя: ${request}\n\n${stats}\n\nЗаписи пользователя:\n\n${context}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.6,
      messages: [
        { role: 'system', content: INSIGHT_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as GroqResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq вернул пустой ответ');
  return text;
}

export type IntentResult = 'thought' | 'question' | 'task' | 'list' | 'insight';

const CLASSIFIER_PROMPT = `Ты определяешь тип сообщения. Ответ — РОВНО одно слово БЕЗ кавычек и пояснений: task ИЛИ question ИЛИ list ИЛИ insight ИЛИ thought.

ТИПЫ:

task — пользователь хочет что-то сделать в будущем (действие, дело).
Примеры:
  "купить хлеб" → task
  "позвонить маме" → task
  "помыть посуду срочно" → task
  "не забыть оплатить интернет" → task
  "это задача — забрать посылку" → task
  "запиши задачу починить кран" → task
  "напомни взять зонт" → task

question — пользователь задаёт себе вопрос (хочет получить ответ).
Примеры:
  "стоит ли мне есть после 18?" → question
  "что я думал про сон" → question
  "как лучше начать день" → question
  "почему я устаю к вечеру" → question
  "узнай у себя что я писал про деньги" → question
  "помоги мне понять стоит ли уволиться" → question

list — пользователь хочет УВИДЕТЬ свои уже сохранённые записи (показать, найти, перечислить).
Примеры:
  "покажи мысли" → list
  "пока же мысли" → list (опечатка от "покажи")
  "мысли покажи" → list
  "что у меня в задачах" → list
  "какие у меня срочные" → list
  "мои задачи на сегодня" → list
  "найди мне записи за вчера" → list
  "выведи всё" → list

insight — пользователь просит АНАЛИЗ или НАБЛЮДЕНИЯ обо всех своих записях вместе. Признаки: "инсайт", "какие у меня паттерны", "что ты обо мне видишь", "проанализируй меня", "что заметно в моих мыслях", "что я часто пишу", "общий обзор".
Примеры:
  "дай инсайт" → insight
  "какие у меня паттерны?" → insight
  "что ты думаешь обо мне" → insight
  "проанализируй мои записи" → insight
  "что я чаще всего пишу" → insight

thought — мысль, идея, наблюдение, вывод, принцип, ощущение, рефлексия о себе.
Примеры:
  "я понял что важно высыпаться" → thought
  "мне кажется кофе вечером — плохая идея" → thought
  "лучше работать утром" → thought
  "сегодня хорошо посидели с другом" → thought
  "важно говорить правду" → thought

Выбери ОДНО слово из: task, question, list, thought.`;

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function classifyIntent(text: string): Promise<IntentResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not configured');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: CLASSIFIER_MODEL,
      temperature: 0,
      max_tokens: 6,
      messages: [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq classify ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as GroqResponse;
  const raw = (data.choices?.[0]?.message?.content ?? '').trim().toLowerCase();
  // strip quotes/punctuation
  const clean = raw.replace(/[^a-zа-яё]/gi, ' ').trim().split(/\s+/)[0] ?? '';
  if (clean === 'task' || clean === 'задача') return 'task';
  if (clean === 'question' || clean === 'вопрос') return 'question';
  if (clean === 'list' || clean === 'список') return 'list';
  if (clean === 'insight' || clean === 'инсайт') return 'insight';
  if (clean === 'thought' || clean === 'мысль') return 'thought';
  // fallback parse: look for any of the keywords in the raw response
  if (raw.includes('insight')) return 'insight';
  if (raw.includes('task')) return 'task';
  if (raw.includes('question')) return 'question';
  if (raw.includes('list')) return 'list';
  return 'thought';
}

export async function answerFromThoughts({ question, thoughts }: AnswerInput): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not configured');

  const context =
    thoughts.length === 0
      ? '(нет релевантных записей)'
      : thoughts
          .map(
            (t) =>
              `#${t.id} от ${new Date(t.created_at).toLocaleDateString('ru-RU')} (релевантность ${(t.similarity * 100).toFixed(0)}%):\n${t.content}`,
          )
          .join('\n\n---\n\n');

  const userPrompt = `Записи пользователя:\n\n${context}\n\n---\n\nВопрос пользователя: ${question}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as GroqResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq вернул пустой ответ');
  return text;
}
