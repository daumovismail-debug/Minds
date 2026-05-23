import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

function getClient(): GoogleGenerativeAI {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

export const EMBEDDING_MODEL = 'text-embedding-004';
export const CHAT_MODEL = 'gemini-1.5-flash';

export async function embed(text: string, taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT): Promise<number[]> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
    taskType,
  });
  return result.embedding.values;
}

export async function embedQuery(text: string): Promise<number[]> {
  return embed(text, TaskType.RETRIEVAL_QUERY);
}

export type AnswerInput = {
  question: string;
  thoughts: Array<{ id: number; content: string; created_at: string; similarity: number }>;
};

export async function answerFromThoughts({ question, thoughts }: AnswerInput): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: `Ты — личный ассистент пользователя, который опирается ИСКЛЮЧИТЕЛЬНО на его собственные записанные мысли и принципы.

Правила:
- Отвечай на том же языке, на котором задан вопрос.
- Используй только предоставленные ниже записи пользователя. Не выдумывай факты.
- Цитируй записи в формате [#id от ДАТА] кратко, где это уместно.
- Если в записях нет ничего релевантного — честно скажи об этом и предложи записать новую мысль на эту тему.
- Отвечай кратко, по-человечески, как близкий друг, помнящий все принципы пользователя.`,
  });

  const context =
    thoughts.length === 0
      ? '(нет релевантных записей)'
      : thoughts
          .map(
            (t) =>
              `#${t.id} от ${new Date(t.created_at).toLocaleDateString('ru-RU')} (релевантность ${(t.similarity * 100).toFixed(0)}%):\n${t.content}`,
          )
          .join('\n\n---\n\n');

  const prompt = `Записи пользователя:\n\n${context}\n\n---\n\nВопрос пользователя: ${question}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
