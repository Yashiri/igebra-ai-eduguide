"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { authClient, authenticatedFetch } from "@/lib/auth-client";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  Image as ImageIcon,
  LogOut,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { getIdToken as getTokenForTransport } from "@/lib/firebase-client";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGES = 2;

type ChatSummary = { id: string; title: string; createdAt: string; updatedAt: string };
type StoredMessage = { id: string; role: "user" | "assistant"; parts: Array<Record<string, unknown>>; createdAt: string };

function formatPartValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function ToolCard({ part }: { part: any }) {
  const toolName = part.toolName as string;
  const output = part.output as any;
  const isRunning = part.state !== "output-available" && part.state !== "output-error";

  if (toolName === "searchCourses") {
    if (isRunning) return <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">🔎 Finding a suitable program…</div>;
    const results = output?.results ?? [];
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/70 px-4 py-3"><div className="flex items-center gap-2"><Search className="h-4 w-4 text-blue-600" /><div><p className="text-sm font-bold text-slate-900">Programs found</p><p className="text-[11px] text-slate-500">Retrieved from the EduGuide knowledge base</p></div></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-blue-700">{results.length}</span></div>
        <div className="grid gap-3 p-4">{results.length === 0 ? <p className="text-sm text-slate-600">No matching programs were found.</p> : results.map((course: any) => <article key={course.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><BookOpen className="h-4 w-4" /></div><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-950">{course.name}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{course.description}</p></div></div><div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600"><span className="rounded-full bg-white px-2.5 py-1">Ages {course.ages}</span><span className="rounded-full bg-white px-2.5 py-1">Grades {course.grades?.join(", ")}</span><span className="rounded-full bg-white px-2.5 py-1">{course.level}</span></div></article>)}</div>
      </div>
    );
  }

  if (toolName === "scheduleDemo") {
    if (isRunning) return <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-semibold text-violet-900">📅 Preparing the demo request…</div>;
    if (part.state === "output-error") return <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Demo booking failed: {part.errorText}</div>;
    const confirmed = output?.status === "confirmed";
    return <div className={`mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm ${confirmed ? "border-emerald-200" : "border-amber-200"}`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${confirmed ? "bg-emerald-50" : "bg-amber-50"}`}>
        <CheckCircle2 className={`h-5 w-5 ${confirmed ? "text-emerald-600" : "text-amber-600"}`} />
        <div><p className={`text-sm font-bold ${confirmed ? "text-emerald-950" : "text-amber-950"}`}>{confirmed ? "Demo booked successfully" : "Demo request saved"}</p><p className={`text-xs ${confirmed ? "text-emerald-700" : "text-amber-700"}`}>{output?.message}</p></div>
      </div>
      <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] uppercase text-slate-400">Confirmation</p><p className="mt-1 font-bold">{output?.confirmationId}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] uppercase text-slate-400">Student</p><p className="mt-1 font-bold">{output?.studentName}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] uppercase text-slate-400">Slot</p><p className="mt-1 font-bold">{output?.preferredDate} at {output?.preferredTime}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] uppercase text-slate-400">Mode</p><p className="mt-1 font-bold">{output?.mode}</p></div>
        {output?.meetLink && <a href={output.meetLink} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-50 p-3 font-bold text-blue-700 hover:bg-blue-100">Join Google Meet →</a>}
        {output?.calendarUrl && <a href={output.calendarUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 p-3 font-bold text-slate-700 hover:bg-slate-200">Open Calendar event →</a>}
      </div>
    </div>;
  }

  return <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><summary className="cursor-pointer font-semibold">Tool: {toolName}</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-slate-600">{formatPartValue(output ?? part.input)}</pre></details>;
}

function AuthGate() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setBusy(true);
    const result = mode === "signin"
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ email, password, name });
    setBusy(false);
    if (result.error) setError(result.error.message || "Authentication failed.");
  };

  return <main className="min-h-screen bg-slate-950 px-4 py-12"><div className="mx-auto max-w-md rounded-3xl bg-white p-7 shadow-2xl"><div className="mb-6 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"><Sparkles /></div><h1 className="text-2xl font-black text-slate-950">EduGuide</h1><p className="mt-2 text-sm text-slate-500">Sign in to keep your AI learning conversations and history.</p></div><button type="button" disabled={busy} onClick={async () => { setError(null); setBusy(true); const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" }); if (result.error) { setError(result.error.message || "Google sign-in is not configured."); setBusy(false); } }} className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-blue-600 shadow-sm">G</span> Continue with Google</button><div className="mb-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>or</span><span className="h-px flex-1 bg-slate-200" /></div><form onSubmit={submit} className="space-y-3">{mode === "signup" && <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Your name" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500" />}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Password (8+ characters)" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500" />{error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}<button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button></form><button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }} className="mt-4 w-full text-sm font-semibold text-blue-600">{mode === "signin" ? "Create a new account" : "Already have an account? Sign in"}</button></div></main>;
}

export default function Page() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  if (sessionPending) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading secure session…</div>;
  if (!session?.user) return <AuthGate />;
  return <AuthenticatedChat userName={session.user.name || session.user.email} />;
}

function AuthenticatedChat({ userName }: { userName: string }) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transport = new DefaultChatTransport({ api: "/api/chat", headers: async () => ({ Authorization: `Bearer ${await getTokenForTransport()}` }) });
  const { messages, setMessages, sendMessage, status, stop } = useChat({ transport: transport as any });
  const isBusy = status === "submitted" || status === "streaming";

  const refreshChats = async () => {
    const response = await authenticatedFetch("/api/chats");
    if (!response.ok) return;
    const data = await response.json() as { chats: ChatSummary[] };
    setChats(data.chats);
  };

  useEffect(() => { void refreshChats(); }, []);

  const newChat = () => { setChatId(null); setMessages([]); setInput(""); setFiles([]); setError(null); };

  const openChat = async (id: string) => {
    setError(null);
    const response = await authenticatedFetch(`/api/chats/${id}`);
    if (!response.ok) { setError("Could not load that conversation."); return; }
    const data = await response.json() as { messages: StoredMessage[] };
    setChatId(id);
    setMessages(data.messages.map((message) => ({ id: message.id, role: message.role, parts: message.parts as any, createdAt: new Date(message.createdAt) })) as any);
  };

  const deleteChat = async (id: string) => {
    const response = await authenticatedFetch(`/api/chats/${id}`, { method: "DELETE" });
    if (!response.ok) { setError("Could not delete that conversation."); return; }
    if (chatId === id) newChat();
    await refreshChats();
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (!file.type.startsWith("image/")) { setError("Only image files are supported."); continue; }
      if (file.size > MAX_FILE_SIZE) { setError(`${file.name} is larger than 2 MB.`); continue; }
      if (next.length >= MAX_IMAGES) { setError("You can attach up to 2 images per message."); break; }
      next.push(file);
    }
    setFiles(next);
  };

  const fileToDataUrl = (file: File): Promise<FileUIPart> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ type: "file", mediaType: file.type, url: String(reader.result), filename: file.name }); reader.onerror = () => reject(new Error(`Could not read ${file.name}`)); reader.readAsDataURL(file); });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!input.trim() && files.length === 0) || isBusy) return;
    setError(null);
    try {
      let activeChatId = chatId;
      if (!activeChatId) {
        const response = await authenticatedFetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: input.trim().slice(0, 70) || "Image homework" }) });
        if (!response.ok) throw new Error("Could not create the conversation.");
        const data = await response.json() as { chat: ChatSummary };
        activeChatId = data.chat.id;
        setChatId(activeChatId);
      }
      const attachments = files.length ? await Promise.all(files.map(fileToDataUrl)) : undefined;
      const text = input.trim();
      setInput(""); setFiles([]);
      await sendMessage({ text, files: attachments as any }, { body: { chatId: activeChatId } });
      await refreshChats();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not send your message.");
    }
  };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0edff,transparent_36%),radial-gradient(circle_at_bottom_right,#ede9fe,transparent_30%)] p-3 sm:p-6"><div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-2xl sm:min-h-[calc(100vh-3rem)]"><aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-50/80 md:flex md:flex-col"><div className="flex items-center justify-between border-b border-slate-200 p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">EduGuide</p><p className="mt-1 truncate text-sm font-bold text-slate-900">{userName}</p></div><button onClick={() => authClient.signOut()} className="rounded-xl p-2 text-slate-500 hover:bg-white" title="Sign out"><LogOut className="h-4 w-4" /></button></div><button onClick={newChat} className="m-4 flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white"><Plus className="h-4 w-4" /> New chat</button><div className="flex-1 overflow-y-auto px-3 pb-4">{chats.length === 0 ? <p className="px-2 py-6 text-center text-xs text-slate-400">Your saved conversations will appear here.</p> : chats.map((chat) => <div key={chat.id} className={`group mb-1 flex items-center gap-1 rounded-xl ${chatId === chat.id ? "bg-white shadow-sm" : "hover:bg-white"}`}><button onClick={() => void openChat(chat.id)} className="min-w-0 flex-1 px-3 py-3 text-left"><p className="truncate text-xs font-semibold text-slate-700">{chat.title}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(chat.updatedAt).toLocaleDateString()}</p></button><button onClick={() => void deleteChat(chat.id)} className="mr-2 hidden rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:block" title="Delete chat"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div></aside><section className="flex min-w-0 flex-1 flex-col"><header className="border-b border-slate-200 px-4 py-4 sm:px-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><Sparkles className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h1 className="text-lg font-extrabold text-slate-950">EduGuide</h1><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Production RAG</span></div><p className="text-xs text-slate-500">Multimodal learning assistant with persistent user history</p></div></div><div className="flex items-center gap-1 md:hidden"><button onClick={newChat} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" title="New chat"><Plus className="h-4 w-4" /></button><button onClick={() => authClient.signOut()} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" title="Sign out"><LogOut className="h-4 w-4" /></button></div></div></header><section className="chat-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-8">{messages.length === 0 ? <div className="mx-auto max-w-3xl py-12 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg"><Bot className="h-8 w-8" /></div><h2 className="text-3xl font-black tracking-tight text-slate-950">Learn by asking, showing and building.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Your conversations are now tied to your account and can be reopened later.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{["Which program fits a Grade 7 student interested in AI?", "Explain this math problem from my uploaded image.", "I want to book a free trial demo for my child."].map((item) => <button key={item} type="button" onClick={() => setInput(item)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">{item}</button>)}</div></div> : <div className="mx-auto max-w-3xl space-y-6">{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>{message.role !== "user" && <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><Bot className="h-4 w-4" /></div>}<div className={`max-w-[92%] rounded-3xl px-4 py-3 sm:max-w-[82%] ${message.role === "user" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>{message.parts.map((part: any, index: number) => { if (part.type === "text") return message.role === "user" ? <div key={index} className="whitespace-pre-wrap text-sm leading-6">{part.text}</div> : <MarkdownMessage key={index} content={part.text} />; if (part.type === "file") return <div key={index} className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><ImageIcon className="mr-2 inline h-4 w-4" />{part.filename || "Image attachment"}</div>; if (part.type === "tool-searchCourses" || part.type === "tool-scheduleDemo" || part.type === "dynamic-tool") return <ToolCard key={part.toolCallId ?? index} part={part} />; return null; })}</div>{message.role === "user" && <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><User className="h-4 w-4" /></div>}</div>)}{isBusy && <div className="flex items-center gap-3 text-xs text-slate-500"><div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" /> EduGuide is thinking…</div>}</div>}</section><footer className="border-t border-slate-200 bg-white/95 p-3 sm:p-5"><div className="mx-auto max-w-3xl">{error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}{files.length > 0 && <div className="mb-3 flex flex-wrap gap-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><ImageIcon className="h-4 w-4 text-blue-600" /><span className="max-w-44 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button></div>)}</div>}<form onSubmit={submit} className="rounded-2xl border border-slate-300 bg-slate-50 p-2 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(event); } }} placeholder="Ask about AI, coding, math, courses, or upload homework…" rows={2} className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400" /><div className="flex items-center justify-between gap-2 px-2 pb-1"><div className="flex items-center gap-1"><input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} /><button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"><Paperclip className="h-4 w-4" /> Attach image</button><span className="hidden text-[11px] text-slate-400 sm:inline">PNG/JPG/WebP • max 2 MB each</span></div>{isBusy ? <button type="button" onClick={() => stop()} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Stop</button> : <button type="submit" disabled={!input.trim() && files.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" /> Send</button>}</div></form><p className="mt-2 text-center text-[10px] text-slate-400">Account-scoped history • Hybrid RAG • Groq Vision • Rate limited • Do not submit sensitive personal information.</p></div></footer></section></div></main>;
}
