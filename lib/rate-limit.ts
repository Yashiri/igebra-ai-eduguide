import "server-only";

import { adminDb } from "@/lib/firebase-admin";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

export async function consumeChatRateLimit(userId: string) {
  const ref = adminDb.collection("rateLimits").doc(userId);
  const now = Date.now();
  let count = 1;

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as { windowStart?: number; requestCount?: number } | undefined;
    if (!data || now - Number(data.windowStart ?? 0) >= WINDOW_MS) {
      count = 1;
      transaction.set(ref, { windowStart: now, requestCount: 1 });
      return;
    }
    count = Number(data.requestCount ?? 0) + 1;
    transaction.update(ref, { requestCount: count });
  });

  return { allowed: count <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - count), limit: MAX_REQUESTS };
}
