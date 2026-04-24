import { connectDB } from '@/lib/db'
import { SearchCache } from '@/lib/models'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

const VOYAGE_ENDPOINT_PRIMARY  = 'https://ai.mongodb.com/v1/embeddings'
const VOYAGE_ENDPOINT_FALLBACK = 'https://api.voyageai.com/v1/embeddings'

async function callVoyageAPI(
  texts: string[],
  inputType: 'query' | 'document',
  endpoint: string,
): Promise<number[][] | null> {
  if (!VOYAGE_API_KEY) return null
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input:      texts,
        model:      'voyage-4-large',
        input_type: inputType,
      }),
    })

    if (!res.ok) {
      console.error(`[Voyage] ${endpoint} → HTTP ${res.status}`)
      return null
    }

    const { data } = await res.json()
    return data.map((d: any) => d.embedding)
  } catch (err) {
    console.error(`[Voyage] ${endpoint} error:`, err)
    return null
  }
}

export async function getEmbeddings(
  texts: string[],
  inputType: 'query' | 'document' = 'document',
): Promise<number[][] | null> {
  let result = await callVoyageAPI(texts, inputType, VOYAGE_ENDPOINT_PRIMARY)
  if (result) return result

  result = await callVoyageAPI(texts, inputType, VOYAGE_ENDPOINT_FALLBACK)
  return result
}

export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  await connectDB()
  const normalised = query.toLowerCase().trim()

  try {
    const cached = await SearchCache.findOneAndUpdate(
      { query: normalised },
      { $inc: { hitCount: 1 } },
      { new: true },
    ).lean()

    if (cached) {
      return cached.embedding as number[]
    }
  } catch (err) {
    console.error('[Embedding] SearchCache lookup failed:', err)
  }

  const embeddings = await getEmbeddings([normalised], 'query')
  if (!embeddings || embeddings.length === 0) return null

  const embedding = embeddings[0]

  SearchCache.create({ query: normalised, embedding }).catch(err => {
    console.error('[Embedding] SearchCache save failed:', err)
  })

  return embedding
}

export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const dim = vectors[0].length
  const avg = new Array(dim).fill(0)
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += vec[i]
  }
  return avg.map(v => v / vectors.length)
}
