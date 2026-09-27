import knowledgeBase from "@/data/edtech_knowledge_base.json";
import { embeddingsEnabled } from "./embeddings";
import { ragChunks, programText } from "./chunks";
import { lexicalRetrieve, lexicalScore } from "./lexical";
import { semanticRetrieve } from "./vector-store";
import { rerank } from "./reranker";
import type { RetrievalResult } from "./types";

export { knowledgeBase };
export type { Program, RetrievalResult } from "./types";

export async function retrieveKnowledge(query: string, topK = 3): Promise<RetrievalResult[]> {
  const safeQuery = query.trim() || "general AI education information";
  if (!embeddingsEnabled()) return lexicalRetrieve(safeQuery, topK);

  try {
    const semantic = await semanticRetrieve(safeQuery, Math.min(ragChunks.length, topK * 3));
    const candidates = semantic.map(({ chunk, score }) => ({ chunk, semanticScore: score, lexical: lexicalScore(safeQuery, chunk.program) }));
    return rerank(candidates, topK);
  } catch (error) {
    console.warn("Semantic RAG unavailable; falling back to lexical retrieval.", error);
    return lexicalRetrieve(safeQuery, topK);
  }
}

export async function buildRagContext(query: string, topK = 3): Promise<string> {
  const results = await retrieveKnowledge(query, topK);
  if (!results.length) return "No high-confidence course records matched. Do not invent program details.";
  return results.map((result) => [
    `PROGRAM: ${result.program.name}`,
    `HYBRID SCORE: ${result.score.toFixed(3)}`,
    `SEMANTIC SCORE: ${result.semanticScore.toFixed(3)}`,
    `LEXICAL SCORE: ${result.lexicalScore.toFixed(2)}`,
    `MATCHED TERMS: ${result.matchedTerms.slice(0, 8).join(", ") || "semantic match"}`,
    `EVIDENCE:\n${result.evidence}`
  ].join("\n")).join("\n\n---\n\n");
}

export async function searchPrograms(filters: { grade?: string; age?: number; interest?: string; query?: string }) {
  const query = [filters.query, filters.interest, filters.grade ? `grade ${filters.grade}` : "", filters.age ? `age ${filters.age}` : ""].filter(Boolean).join(" ");
  const results = await retrieveKnowledge(query || "AI education programs", knowledgeBase.programs.length);
  return results.filter(({ program }) => (!filters.grade || program.grades.includes(filters.grade)) && (!filters.age || (filters.age >= program.min_age && filters.age <= program.max_age)));
}
