import { embedTexts, cosineSimilarity } from "./embeddings";
import { ragChunks } from "./chunks";

let cachedVectors: { chunkId: string; vector: number[] }[] | null = null;
let buildPromise: Promise<{ chunkId: string; vector: number[] }[]> | null = null;

export async function getVectorIndex() {
  if (cachedVectors) return cachedVectors;
  if (buildPromise) return buildPromise;

  buildPromise = embedTexts(ragChunks.map((chunk) => chunk.text))
    .then((vectors) => {
      cachedVectors = ragChunks.map((chunk, index) => ({ chunkId: chunk.chunkId, vector: vectors[index] }));
      return cachedVectors;
    })
    .finally(() => { buildPromise = null; });

  return buildPromise;
}

export async function semanticRetrieve(query: string, topK: number) {
  const [queryVector, index] = await Promise.all([embedTexts([query]).then((vectors) => vectors[0]), getVectorIndex()]);
  return index.map((entry) => ({ chunk: ragChunks.find((chunk) => chunk.chunkId === entry.chunkId)!, score: Math.max(0, cosineSimilarity(queryVector, entry.vector)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
