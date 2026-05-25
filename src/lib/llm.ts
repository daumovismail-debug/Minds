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

export type IntentResult = 'thought' | 'question' | 'task' | 'list';

const CLASSIFIER_PROMPT = `Ты определяешь тип сообщения. Ответ — РОВНО одно слово БЕЗ кавычек и пояснений: task ИЛИ question ИЛИ list ИЛИ thought.

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
  if (clean === 'thought' || clean === 'мысль') return 'thought';
  // fallback parse: look for any of the keywords in the raw response
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
