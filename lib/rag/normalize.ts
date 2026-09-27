const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "is", "are", "with",
  "my", "me", "i", "we", "you", "your", "can", "what", "which", "how", "do", "does", "this",
  "that", "it", "from", "at", "be", "want", "need", "about", "please", "would", "could",
  "has", "have", "had", "who", "where", "when", "why", "their", "they", "child", "student"
]);

export function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenize(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function extractAge(query: string): number | undefined {
  const normalized = normalize(query);
  const match = normalized.match(/\b(?:age|aged)\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:year|years)[ -]?old\b/);
  const value = match?.[1] ?? match?.[2];
  return value ? Number(value) : undefined;
}

export function extractGrade(query: string): string | undefined {
  const normalized = normalize(query);
  const match = normalized.match(/\b(?:grade|class)\s*(?:no\.?\s*)?(\d{1,2})(?:st|nd|rd|th)?\b|\b(\d{1,2})(?:st|nd|rd|th)\s+grade\b/);
  return match?.[1] ?? match?.[2];
}

export function expandQuery(query: string): string[] {
  const normalized = normalize(query);
  const terms = tokenize(query);
  const expansions: Record<string, string[]> = {
    coding: ["python", "programming", "algorithm", "app"],
    programmer: ["python", "programming", "coding"],
    programming: ["coding", "python", "algorithm"],
    math: ["mathematics", "algebra", "problem solving", "patterns"],
    mathematics: ["math", "algebra", "problem solving"],
    ai: ["artificial intelligence", "machine learning", "ai fundamentals"],
    artificial: ["artificial intelligence", "ai"],
    ml: ["machine learning", "data", "modeling"],
    trial: ["free trial", "demo", "one on one"],
    demo: ["free trial", "trial class", "one on one"],
    beginner: ["beginner", "fundamentals", "no prior programming"],
    student: ["school student", "learner"]
  };

  const expanded = [...terms];
  for (const term of terms) expanded.push(...(expansions[term] ?? []));

  const grade = extractGrade(normalized);
  if (grade) expanded.push(`grade ${grade}`);

  const age = extractAge(normalized);
  if (age) expanded.push(`age ${age}`);

  return Array.from(new Set(expanded));
}
