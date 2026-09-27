import { createChat, listChats } from "@/lib/chat-store";
import { requireUser } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return Response.json({ chats: await listChats(user.uid) });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    let title = "New conversation";
    try {
      const body = (await request.json()) as { title?: string };
      if (typeof body.title === "string" && body.title.trim()) title = body.title.trim().slice(0, 80);
    } catch {}
    return Response.json({ chat: await createChat(user.uid, title) }, { status: 201 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
