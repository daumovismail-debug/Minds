const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const CHAT_MODEL = 'llama-3.3-70b-versatile';
export const CLASSIFIER_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `Ты — личный ассистент пользователя. Твоё единственное знание — мысли пользователя, которые он сам записал ниже.

СТРОГИЕ ПРАВИЛА:
1. Опирайся ИСКЛЮЧИТЕЛЬНО на записи пользователя, приведённые ниже. НЕ используй свои общие знания, советы из интернета, факты о мире или эрудицию — ничего, чего нет в его записях.
2. Если в записях нет релевантной информации по вопросу — честно скажи: «У тебя нет записи на эту тему. Хочешь записать мысль?» — и НЕ давай никакого совета от себя.
3. Цитируй записи в формате [#id от ДАТА], когда ссылаешься на них.
4. Отвечай на том же языке, на котором задан вопрос.
5. Отвечай кратко, по-человечески, как близкий друг, помнящий принципы пользователя.
6. Не выдумывай факты, даты, числа — только то, что есть в записях.`;

export type AnswerInput = {
  question: string;
  thoughts: Array<{ id: number; content: string; created_at: string; similarity: number }>;
};

export type IntentResult = 'thought' | 'question' | 'task' | 'list';

const CLASSIFIER_PROMPT = `Ты определяешь тип короткого сообщения от пользователя. Ответь ОДНИМ словом из списка: thought, question, task, list.

Правила:
- "task" — что-то нужно сделать, действие на будущее. Глаголы: купить, позвонить, написать, сделать, починить, оплатить, не забыть, забрать, заехать и т.п. Также если пользователь явно говорит "это задача", "задача:", "запиши задачу", "добавь задачу", "напомни".
- "question" — пользователь спрашивает что-то у себя. Признаки: вопросительные слова (что, как, почему, стоит ли, нужно ли), знак "?", частица "ли", обращение "узнай", "скажи мне".
- "list" — запрос показать ранее записанное. Признаки: "покажи", "выведи", "найди мне", "что у меня", "сколько у меня", "мои задачи/мысли", "какие задачи/мысли". Также "пока же" — это опечатка от "покажи".
- "thought" — мысль, идея, наблюдение, рефлексия, принцип. "Я понял что", "важно", "стоит", "лучше", "мне кажется" и т.п. Это запись о себе или своих принципах.

Никаких объяснений. Только одно слово.`;

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
  const raw = data.choices?.[0]?.message?.content?.trim().toLowerCase() ?? '';
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
