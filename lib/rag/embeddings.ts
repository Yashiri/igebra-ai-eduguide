import { InferenceClient } from "@huggingface/inference";

const MODEL = process.env.HF_EMBEDDING_MODEL || "BAAI/bge-small-en-v1.5";
const TIMEOUT_MS = 7_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Embedding request timed out")), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }).catch((error) => { clearTimeout(timer); reject(error); });
  });
}

export function embeddingsEnabled(): boolean {
  return Boolean(process.env.HF_TOKEN);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!process.env.HF_TOKEN) throw new Error("HF_TOKEN is not configured");
  const client = new InferenceClient(process.env.HF_TOKEN);
  const result = await withTimeout(client.featureExtraction({ model: MODEL, inputs: texts, normalize: true, provider: "hf-inference" }), TIMEOUT_MS);
  if (!Array.isArray(result)) throw new Error("Unexpected embedding response");

  return result.map((item) => {
    if (Array.isArray(item) && item.every((value) => typeof value === "number")) return item as number[];
    if (Array.isArray(item) && Array.isArray(item[0])) {
      const rows = item as number[][];
      const width = rows[0]?.length ?? 0;
      return Array.from({ length: width }, (_, index) => rows.reduce((sum, row) => sum + row[index], 0) / Math.max(rows.length, 1));
    }
    throw new Error("Invalid embedding vector");
  });
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
