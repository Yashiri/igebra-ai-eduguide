import { archiveChat, getChatMessages } from "@/lib/chat-store";
import { requireUser } from "@/lib/server-auth";

export const runtime = "nodejs";

type Context = { params: { id: string } };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const result = await getChatMessages(user.uid, context.params.id);
    if (!result) return Response.json({ error: "Chat not found" }, { status: 404 });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    await archiveChat(user.uid, context.params.id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
