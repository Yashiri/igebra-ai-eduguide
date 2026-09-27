import knowledgeBase from "@/data/edtech_knowledge_base.json";
import type { Program, RagChunk } from "./types";

export function programText(program: Program): string {
  return [
    `Program: ${program.name}`,
    `Description: ${program.short_description}`,
    `Audience: ${program.audience}`,
    `Age range: ${program.min_age}-${program.max_age}`,
    `Grades: ${program.grades.join(", ")}`,
    `Level: ${program.level}`,
    `Delivery: ${program.delivery.join(", ")}`,
    `Focus: ${program.focus.join(", ")}`,
    `Outcomes: ${program.outcomes.join("; ")}`,
    `Prerequisites: ${program.prerequisites.join("; ")}`,
    `Keywords: ${program.rag_keywords.join(", ")}`,
    `Demo pitch: ${program.demo_pitch}`
  ].join("\n");
}

export function buildChunks(): RagChunk[] {
  return knowledgeBase.programs.flatMap((program) => [
    { chunkId: `${program.id}:overview`, programId: program.id, program, text: programText(program) },
    {
      chunkId: `${program.id}:audience`, programId: program.id, program,
      text: `Program: ${program.name}\nAudience: ${program.audience}\nAges: ${program.min_age}-${program.max_age}\nGrades: ${program.grades.join(", ")}\nLevel: ${program.level}`
    },
    {
      chunkId: `${program.id}:learning`, programId: program.id, program,
      text: `Program: ${program.name}\nFocus: ${program.focus.join(", ")}\nOutcomes: ${program.outcomes.join("; ")}\nPrerequisites: ${program.prerequisites.join("; ")}`
    }
  ]);
}

export const ragChunks = buildChunks();
