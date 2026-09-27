import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import type { UIMessage } from "ai";
import { adminDb } from "@/lib/firebase-admin";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  parts: Array<Record<string, unknown>>;
  createdAt: string;
};

/**
 * Recursively removes/normalizes undefined values so Firestore
 * never receives unsupported undefined fields.
 */
function sanitizeValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, childValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      result[key] = sanitizeValue(childValue);
    }

    return result;
  }

  return value;
}

function sanitizeParts(
  parts: UIMessage["parts"]
): Array<Record<string, unknown>> {
  return parts.map((part) => {
    const sanitized = sanitizeValue(part);

    if (
      sanitized &&
      typeof sanitized === "object" &&
      !Array.isArray(sanitized)
    ) {
      return sanitized as Record<string, unknown>;
    }

    return {
      type: "unknown",
      value: sanitized,
    };
  });
}

function chatsRef(userId: string) {
  return adminDb.collection("users").doc(userId).collection("chats");
}

function messagesRef(userId: string, chatId: string) {
  return chatsRef(userId).doc(chatId).collection("messages");
}

export async function createChat(
  userId: string,
  title = "New conversation"
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const chat = {
    id,
    userId,
    title: title.slice(0, 80),
    createdAt: now,
    updatedAt: now,
  };

  await chatsRef(userId).doc(id).set(chat);

  return chat;
}

export async function listChats(userId: string) {
  const snapshot = await chatsRef(userId).get();

  return snapshot.docs
    .map((doc) => doc.data())
    .filter((chat) => !chat.archivedAt)
    .sort((a, b) =>
      String(b.updatedAt).localeCompare(String(a.updatedAt))
    )
    .slice(0, 50)
    .map((chat) => ({
      id: String(chat.id),
      title: String(chat.title),
      createdAt: String(chat.createdAt),
      updatedAt: String(chat.updatedAt),
    }));
}

export async function getChat(userId: string, chatId: string) {
  const snapshot = await chatsRef(userId).doc(chatId).get();

  return snapshot.exists && !snapshot.data()?.archivedAt
    ? snapshot.data()
    : null;
}

export async function getChatMessages(
  userId: string,
  chatId: string
) {
  const chat = await getChat(userId, chatId);

  if (!chat) return null;

  const snapshot = await messagesRef(userId, chatId).get();

  const messages = snapshot.docs
    .map((doc) => doc.data() as StoredMessage)
    .sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );

  return {
    chat,
    messages,
  };
}

export async function saveMessage(
  userId: string,
  chatId: string,
  message: UIMessage
) {
  if (!(await getChat(userId, chatId))) {
    throw new Error("Chat not found");
  }

  const createdAt = new Date().toISOString();

  await messagesRef(userId, chatId)
    .doc(message.id)
    .set({
      id: message.id,
      role: message.role,
      parts: sanitizeParts(message.parts),
      createdAt,
    });

  await chatsRef(userId)
    .doc(chatId)
    .update({
      updatedAt: new Date().toISOString(),
    });
}

export async function saveChatMessages(
  userId: string,
  chatId: string,
  messages: UIMessage[]
) {
  if (!(await getChat(userId, chatId))) {
    throw new Error("Chat not found");
  }

  const batch = adminDb.batch();

  for (const message of messages) {
    const createdAt = new Date().toISOString();

    batch.set(
      messagesRef(userId, chatId).doc(message.id),
      {
        id: message.id,
        role: message.role,
        parts: sanitizeParts(message.parts),
        createdAt,
      }
    );
  }

  batch.update(
    chatsRef(userId).doc(chatId),
    {
      updatedAt: new Date().toISOString(),
    }
  );

  await batch.commit();
}

export async function renameChat(
  userId: string,
  chatId: string,
  title: string
) {
  if (!(await getChat(userId, chatId))) {
    throw new Error("Chat not found");
  }

  await chatsRef(userId)
    .doc(chatId)
    .update({
      title: title.slice(0, 80),
      updatedAt: new Date().toISOString(),
    });
}

export async function archiveChat(
  userId: string,
  chatId: string
) {
  if (!(await getChat(userId, chatId))) {
    return;
  }

  await chatsRef(userId)
    .doc(chatId)
    .update({
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
}

export async function createDemoBooking(
  userId: string,
  booking: Record<string, unknown>
) {
  const id = `IGB-DEMO-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  const sanitizedBooking = sanitizeValue(booking) as Record<
    string,
    unknown
  >;

  await adminDb
    .collection("demoBookings")
    .doc(id)
    .set({
      id,
      userId,
      ...sanitizedBooking,
      createdAt: FieldValue.serverTimestamp(),
    });

  return id;
}