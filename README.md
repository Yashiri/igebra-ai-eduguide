# EduGuide — igebra.ai Multimodal RAG + Real Demo Scheduling

A production-oriented **Next.js 14 + TypeScript** AI learning assistant for the igebra.ai AI Intern assignment.

## What it demonstrates

- Multimodal chat: text + homework images
- Groq-powered responses through the Vercel AI SDK
- Hybrid RAG over `data/edtech_knowledge_base.json`
- Semantic retrieval with Hugging Face embeddings, with deterministic lexical fallback
- Tool calling:
  - `searchCourses` — finds suitable programs from the assignment knowledge base
  - `scheduleDemo` — validates a requested slot, checks Google Calendar availability, creates a real Calendar event, invites the parent, creates Google Meet when available, and persists the booking in Firestore
- Markdown, GitHub-flavored tables and KaTeX math rendering
- Firebase Authentication:
  - Google Sign-In
  - Email/password
- Firebase Cloud Firestore:
  - account-scoped chat history
  - tool results persist across reloads
  - demo bookings
  - per-user rate limiting
- Server-side Firebase ID-token verification
- Request validation, size limits and security headers
- Vercel-ready Next.js App Router architecture

## Architecture

```text
Browser
  │
  ├── Firebase Authentication
  │     ├── Google
  │     └── Email / Password
  │
  ▼
Next.js 14 App Router
  │
  └── /api/chat
        ├── Firebase ID-token verification
        ├── Firestore rate limit
        ├── Course-intent detection
        ├── Hybrid RAG
        │    ├── lexical retrieval
        │    └── Hugging Face semantic retrieval
        ├── Groq multimodal model
        └── AI SDK tools
             ├── searchCourses
             └── scheduleDemo
                  ├── Google Calendar availability check
                  ├── Google Calendar event creation
                  ├── attendee invitation email
                  ├── Google Meet conference
                  └── Firestore booking record
```

Firebase Authentication provides the user identity, and the server verifies the Firebase ID token before accessing user-scoped data. Google Calendar's Events API supports creating timed events and attendees; invitations can be sent with `sendUpdates=all`. urlFirebase Authentication docshttps://firebase.google.com/docs/auth/web/start urlFirebase ID token verification docshttps://firebase.google.com/docs/auth/admin/verify-id-tokens urlGoogle Calendar create-events docshttps://developers.google.com/workspace/calendar/api/guides/create-events

## Requirements

- Node.js 22+
- npm
- A Firebase project
- Groq API key
- Hugging Face token is optional; without it, lexical RAG still works
- Google Cloud project with the **Google Calendar API enabled** for real demo scheduling

## Local-first setup

This project keeps the complete feature set: Firebase Authentication, Firestore, Groq multimodal AI, RAG, course search, real Google Calendar scheduling and Google Meet creation. The recommended workflow is to make the application work locally first; deployment can be done later.

## 1. Create Firebase project

In Firebase Console:

1. Create a project.
2. Add a Web App.
3. Copy its web configuration into `.env.local`.
4. Enable **Authentication → Sign-in method**:
   - Google
   - Email/Password
5. Create a **Cloud Firestore** database.
6. Generate a Firebase service account from Project Settings → Service Accounts.

For local development, download the Firebase Admin SDK private key and place it at:

```text
secrets/firebase-service-account.json
```

Then use `FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json`. The file is ignored by Git. Never commit or share it.

## 2. Configure real demo scheduling

The final version uses the Google Calendar REST API directly from the server, so no extra calendar SDK is required.

### A. Enable Google Calendar API

In Google Cloud Console, select the same project used for the service account and enable **Google Calendar API**.

### B. Create or choose a demo calendar

Use a dedicated calendar for the assignment, for example:

```text
EduGuide Demo Sessions
```

Open the calendar's sharing settings and share it with the **service-account email** from the Firebase service-account JSON. Give it permission to **make changes to events**.

The app creates events on this shared calendar. It does not pretend to write to a user's private calendar.

### C. Configure the calendar environment variables

```env
DEMO_CALENDAR_ID=your-calendar-id@group.calendar.google.com
DEMO_TIMEZONE=Asia/Kolkata
DEMO_TIMEZONE_OFFSET=+05:30
DEMO_DURATION_MINUTES=30
```

Google Calendar supports event attendees and invitation notifications; the app uses `sendUpdates=all` so the parent receives the invitation when the event is created. urlGoogle Calendar attendee invitationshttps://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events

### D. Google Meet

The app requests a Google Meet conference when creating the event. If Google Calendar returns a Meet entry point, EduGuide displays a **Join Google Meet** button in the tool result.

## 3. Environment configuration

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` and fill in the real values from the **same Firebase Web App**. Do not mix values from different Firebase projects. Also place the Admin SDK JSON at `secrets/firebase-service-account.json`.

Required AI variables:

```env
GROQ_API_KEY=...
GROQ_MODEL=qwen/qwen3.8-27b
```

Firebase Web variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Server credentials:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={...}
```

Real scheduling:

```env
DEMO_CALENDAR_ID=...
DEMO_TIMEZONE=Asia/Kolkata
DEMO_TIMEZONE_OFFSET=+05:30
DEMO_DURATION_MINUTES=30
```

Optional semantic RAG:

```env
HF_TOKEN=hf_...
HF_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
```

## 4. Install and verify

```powershell
npm install
npm run check:env
npm run typecheck
npm run build
```

Then:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## 5. What happens when a user books a demo?

The assistant collects:

- Student name
- Parent email
- Student grade
- Preferred date
- Preferred time
- Learning interest
- Optional notes

Then `scheduleDemo`:

1. Validates the booking input.
2. Confirms the date/time is in the future.
3. Checks the configured Google Calendar for overlapping events.
4. Rejects the request if the slot is already occupied.
5. Creates a 30-minute Google Calendar event.
6. Adds the parent as an attendee.
7. Requests a Google Meet conference.
8. Sends the calendar invitation through Google Calendar.
9. Saves the booking and event ID in Firestore.
10. Returns a confirmation card with the confirmation ID, Calendar event link and Meet link when available.

If Calendar integration is not configured, the app **does not fake a confirmation**. It stores the request with `pending_calendar_setup` status and tells the user that no real event was created.

## 6. Firestore security

The repository includes `firebase.rules` with a deny-by-default policy. The application accesses Firestore through the Firebase Admin SDK only after verifying the user's Firebase ID token.

This means the browser never receives Admin credentials.

## 7. Vercel deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add every variable from `.env.local` to Vercel Project Settings → Environment Variables.
4. Deploy.
5. In Firebase Authentication → Settings → Authorized domains, add your Vercel domain.
6. Confirm the Google Calendar API is enabled in the Google Cloud project.
7. Confirm the demo calendar is shared with the service-account email.
8. Test Google login, email login, chat history, image homework, course search and real demo scheduling.

## Security

- Never commit `.env.local`.
- Never commit Firebase service-account JSON files.
- Firebase web configuration is not treated as a secret; Admin credentials are.
- Every server API request requires a verified Firebase ID token.
- Chat documents are scoped under the authenticated Firebase UID.
- Images are sent to the AI request as transient data URLs and are not stored as raw image bytes in Firestore.
- Rate limiting is enforced server-side per Firebase UID.
- Request size and message-count limits are enforced before model execution.
- Calendar credentials remain server-side.

## RAG design

The knowledge base is `data/edtech_knowledge_base.json`.

The retrieval pipeline combines:

1. normalized lexical matching
2. optional Hugging Face embeddings
3. score fusion / reranking
4. concise context injection into the model

If `HF_TOKEN` is unavailable, the application remains usable using lexical retrieval.

## Tool behavior

### `searchCourses`

Searches only the assignment knowledge base for program recommendations. This prevents the model from inventing program-specific details.

### `scheduleDemo`

This is a real integration when the Google Calendar variables are configured. It checks availability, creates the event, invites the parent and requests a Google Meet link.

## Chat persistence

The application stores UI messages after a completed AI stream. This includes tool calls/results, so course cards and demo confirmation cards remain available when a saved chat is reopened.

## Assignment test cases

Try these after signing in:

```text
Show me the available AI learning programs.
```

```text
My 10-year-old has never written code before but is curious about artificial intelligence. What learning option would be appropriate?
```

```text
Solve 2x + 5 = 15 for a 10-year-old.
```

Then upload a handwritten image containing a math equation and ask EduGuide to solve it.

For course tool calling:

```text
Which program fits a Grade 7 student interested in AI?
```

For the real scheduling workflow:

```text
I want to book a free trial demo for my child.
```

The assistant should ask for missing booking details before calling the tool. Once all details are available, it should check the configured calendar and create the event.

## Project structure

```text
app/
  api/
    chat/route.ts
    chats/route.ts
    chats/[id]/route.ts
    health/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  MarkdownMessage.tsx
data/
  edtech_knowledge_base.json
lib/
  auth-client.ts
  firebase-admin.ts
  firebase-client.ts
  server-auth.ts
  chat-store.ts
  google-calendar.ts
  rate-limit.ts
  tools.ts
  rag/
    chunks.ts
    embeddings.ts
    index.ts
    lexical.ts
    normalize.ts
    reranker.ts
    types.ts
    vector-store.ts
scripts/
  check-env.mjs
firebase.rules
firebase.indexes.json
```

## Final verification checklist

Before posting to GitHub:

- [ ] `npm install`
- [ ] `npm run check:env`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Google login works
- [ ] Email/password login works
- [ ] Chat history survives refresh
- [ ] Image homework works
- [ ] RAG course search works
- [ ] Calendar availability check works
- [ ] Demo event is created in Google Calendar
- [ ] Parent receives calendar invitation
- [ ] Google Meet link appears when available
- [ ] `.env.local` is not committed
- [ ] Firebase service-account JSON is not committed

## Firebase local-development note

The Firebase browser SDK is initialized lazily in the browser. This prevents Next.js server-side rendering from calling `getAuth()` during SSR, which can otherwise surface `auth/invalid-api-key` before the browser loads the Firebase configuration.

For local Admin SDK credentials on Windows, prefer:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json
```

Keep the JSON file under `secrets/`; the repository `.gitignore` excludes it. Vercel deployments can use `FIREBASE_SERVICE_ACCOUNT_JSON` instead.

Before starting the app, run `npm run check:env`. The script loads `.env.local` automatically on Node 22+.
