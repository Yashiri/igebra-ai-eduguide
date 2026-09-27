import type { Program, LexicalMatch } from "./types";
import knowledgeBase from "@/data/edtech_knowledge_base.json";
import { expandQuery, extractAge, extractGrade, normalize } from "./normalize";
import { programText } from "./chunks";

export function lexicalScore(query: string, program: Program): LexicalMatch {
  const queryTerms = expandQuery(query);
  const searchable = normalize(programText(program));
  const matchedTerms = queryTerms.filter((term) => searchable.includes(normalize(term)));
  let score = 0;

  for (const term of queryTerms) {
    const cleanTerm = normalize(term);
    if (!cleanTerm) continue;
    if (normalize(program.name).includes(cleanTerm)) score += 8;
    else if (program.rag_keywords.some((keyword) => {
      const normalizedKeyword = normalize(keyword);
      return normalizedKeyword.includes(cleanTerm) || cleanTerm.includes(normalizedKeyword);
    })) score += 5;
    else if (searchable.includes(cleanTerm)) score += 2;
  }

  const grade = extractGrade(query);
  if (grade) score += program.grades.includes(grade) ? 10 : -4;

  const age = extractAge(query);
  if (age) score += age >= program.min_age && age <= program.max_age ? 10 : -4;

  return { score, matchedTerms };
}

export function lexicalRetrieve(query: string, topK: number) {
  return knowledgeBase.programs
    .map((program) => {
      const match = lexicalScore(query, program);
      return { program, score: match.score, lexicalScore: match.score, semanticScore: 0, matchedTerms: match.matchedTerms, evidence: programText(program) };
    })
    .filter((item) => item.lexicalScore > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
