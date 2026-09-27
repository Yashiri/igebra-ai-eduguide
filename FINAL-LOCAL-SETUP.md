# EduGuide — Final Local Setup

This is the complete feature build. Nothing important is disabled:

- Firebase Google + email/password authentication
- Firestore chat history and bookings
- Groq text + image AI
- Hybrid RAG
- `searchCourses`
- `scheduleDemo`
- Real Google Calendar availability checking
- Real Google Calendar event creation
- Parent attendee invitation
- Google Meet conference request
- Markdown + math rendering
- Server-side Firebase ID-token verification
- Rate limiting and request validation

## 1. Requirements

Use Node.js 22 or newer.

## 2. Install

```powershell
npm install
```

## 3. Create environment file

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and replace all placeholders.

The six `NEXT_PUBLIC_FIREBASE_*` values must all come from the **same Firebase Web App**.

## 4. Firebase Admin credential

Create the Firebase Admin SDK private key and put it here:

```text
secrets/firebase-service-account.json
```

Do not rename the file unless you also change `FIREBASE_SERVICE_ACCOUNT_PATH`.

Never commit or share this file.

## 5. Firebase setup

Enable:

- Authentication → Google
- Authentication → Email/Password
- Cloud Firestore

## 6. Google Calendar + Meet setup

Enable Google Calendar API in Google Cloud.

Share the demo calendar with the `client_email` from the Firebase service-account JSON and grant permission to make changes to events.

Set:

```env
DEMO_CALENDAR_ID=your_calendar_id
DEMO_TIMEZONE=Asia/Kolkata
DEMO_TIMEZONE_OFFSET=+05:30
DEMO_DURATION_MINUTES=30
```

The service account used by Firebase Admin is also used for Calendar access.

## 7. Verify before starting

```powershell
npm run check:env
npm run typecheck
npm run build
```

Only after those pass:

```powershell
npm run dev
```

Then open:

```text
http://localhost:3000
```

## 8. Test checklist

### Authentication

- Google sign-in
- Email/password sign-up
- Email/password sign-in
- Sign-out

### AI

```text
What courses do you offer?
```

```text
I have a 10-year-old beginner interested in AI. Which course is suitable?
```

```text
Solve 2x + 5 = 15
```

### Image AI

Upload a handwritten math problem and ask:

```text
Solve this problem.
```

### Course tool

```text
Show me beginner courses for a Grade 7 student interested in AI.
```

### Calendar / Meet

```text
I want to schedule a free demo.
```

Provide the requested student/parent details and a future slot. The assistant should check the real calendar, reject an overlapping slot, create a real event, invite the parent and request a Google Meet link.

## Important

Do not test with a fake Firebase API key or a service-account placeholder. If either credential is missing, the environment check intentionally stops before the application starts so that the application does not fail later with a confusing Firebase error.
