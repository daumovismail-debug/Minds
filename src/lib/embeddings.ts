type CohereEmbedResponse = {
  embeddings?: { float?: number[][] };
  message?: string;
};

const COHERE_URL = 'https://api.cohere.com/v2/embed';
export const COHERE_MODEL = 'embed-multilingual-v3.0';
export const EMBEDDING_DIM = 1024;

async function embedCohere(texts: string[], inputType: 'search_document' | 'search_query'): Promise<number[][]> {
  const key = process.env.COHERE_API_KEY;
  if (!key) throw new Error('COHERE_API_KEY is not configured');

  const res = await fetch(COHERE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: COHERE_MODEL,
      texts,
      input_type: inputType,
      embedding_types: ['float'],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cohere ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as CohereEmbedResponse;
  const arr = data.embeddings?.float;
  if (!arr || !arr[0] || arr[0].length !== EMBEDDING_DIM) {
    throw new Error(`Cohere returned unexpected embedding shape`);
  }
  return arr;
}

export async function embed(text: string): Promise<number[]> {
  const [v] = await embedCohere([text], 'search_document');
  return v;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedCohere([text], 'search_query');
  return v;
}
