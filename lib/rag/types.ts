import type knowledgeBase from "@/data/edtech_knowledge_base.json";

export type Program = (typeof knowledgeBase.programs)[number];

export type RagChunk = {
  chunkId: string;
  programId: string;
  program: Program;
  text: string;
};

export type LexicalMatch = {
  score: number;
  matchedTerms: string[];
};

export type RetrievalResult = {
  program: Program;
  score: number;
  lexicalScore: number;
  semanticScore: number;
  matchedTerms: string[];
  evidence: string;
};
