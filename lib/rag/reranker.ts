import type { RetrievalResult, RagChunk } from "./types";
import type { LexicalMatch } from "./types";

export function rerank(candidates: Array<{ chunk: RagChunk; semanticScore: number; lexical: LexicalMatch }>, topK: number): RetrievalResult[] {
  const grouped = new Map<string, typeof candidates>();
  for (const candidate of candidates) grouped.set(candidate.chunk.programId, [...(grouped.get(candidate.chunk.programId) ?? []), candidate]);

  return Array.from(grouped.values()).map((items) => {
    const best = [...items].sort((a, b) => b.semanticScore - a.semanticScore)[0];
    const normalizedLexical = Math.min(1, best.lexical.score / 25);
    const fused = best.semanticScore * 0.65 + normalizedLexical * 0.35;
    const exactSignal = Math.min(0.2, Math.max(0, best.lexical.score) / 50);
    return {
      program: best.chunk.program,
      score: Math.min(1, fused + exactSignal),
      lexicalScore: best.lexical.score,
      semanticScore: Math.max(...items.map((item) => item.semanticScore)),
      matchedTerms: best.lexical.matchedTerms,
      evidence: items.sort((a, b) => b.semanticScore - a.semanticScore).slice(0, 2).map((item) => item.chunk.text).join("\n\n")
    };
  }).filter((item) => item.score >= 0.18).sort((a, b) => b.score - a.score).slice(0, topK);
}
