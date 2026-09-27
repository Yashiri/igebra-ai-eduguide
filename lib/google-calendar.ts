import "server-only";
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type DemoCalendarInput = {
  studentName: string;
  parentEmail: string;
  studentGrade: string;
  preferredDate: string;
  preferredTime: string;
  interest: string;
  notes?: string | null;
};

export type DemoCalendarResult = {
  eventId: string;
  htmlLink: string | null;
  meetLink: string | null;
  calendarId: string;
  start: string;
  end: string;
};

function getServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const parsed = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };
    if (parsed.client_email && parsed.private_key) return parsed;
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { project_id?: string; client_email?: string; private_key?: string };
    if (parsed.client_email && parsed.private_key) return parsed;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey) return { client_email: clientEmail, private_key: privateKey };
  throw new Error("Calendar credentials are missing. Configure FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH, or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const account = getServiceAccount();
  const privateKey = account.private_key;
  if (!privateKey) throw new Error("Firebase service-account private key is missing.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: CALENDAR_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(privateKey))}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed (${response.status}).`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Google OAuth token response did not contain an access token.");
  return data.access_token;
}

function calendarConfig() {
  const calendarId = process.env.DEMO_CALENDAR_ID;
  const timezone = process.env.DEMO_TIMEZONE || "Asia/Kolkata";
  const offset = process.env.DEMO_TIMEZONE_OFFSET || "+05:30";
  if (!calendarId) throw new Error("DEMO_CALENDAR_ID is not configured.");
  return { calendarId, timezone, offset };
}

function toDateTime(date: string, time: string, offset: string) {
  return `${date}T${time}:00${offset}`;
}

function addMinutes(date: string, time: string, minutes: number, offset: string) {
  const start = new Date(toDateTime(date, time, offset));
  if (Number.isNaN(start.getTime())) throw new Error("Invalid demo date/time.");
  return new Date(start.getTime() + minutes * 60_000).toISOString();
}

export function isCalendarIntegrationConfigured() {
  try {
    calendarConfig();
    getServiceAccount();
    return true;
  } catch {
    return false;
  }
}

export async function createGoogleCalendarDemo(input: DemoCalendarInput): Promise<DemoCalendarResult> {
  const { calendarId, timezone, offset } = calendarConfig();
  const duration = Math.min(Math.max(Number(process.env.DEMO_DURATION_MINUTES || "30"), 15), 120);
  const start = toDateTime(input.preferredDate, input.preferredTime, offset);
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) throw new Error("The requested demo date or time is invalid.");
  if (startDate.getTime() <= Date.now() + 5 * 60_000) throw new Error("Please choose a future demo slot at least 5 minutes from now.");
  const end = addMinutes(input.preferredDate, input.preferredTime, duration, offset);
  const endDate = new Date(end);

  const accessToken = await getAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  const conflictsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  conflictsUrl.searchParams.set("timeMin", startDate.toISOString());
  conflictsUrl.searchParams.set("timeMax", endDate.toISOString());
  conflictsUrl.searchParams.set("singleEvents", "true");
  conflictsUrl.searchParams.set("orderBy", "startTime");
  conflictsUrl.searchParams.set("maxResults", "20");
  const conflictsResponse = await fetch(conflictsUrl, { headers, cache: "no-store" });
  if (!conflictsResponse.ok) throw new Error(`Google Calendar availability check failed (${conflictsResponse.status}).`);
  const conflicts = await conflictsResponse.json() as { items?: Array<{ status?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }> };
  const hasConflict = (conflicts.items || []).some((event) => {
    if (event.status === "cancelled") return false;
    const eventStart = event.start?.dateTime ? new Date(event.start.dateTime).getTime() : NaN;
    const eventEnd = event.end?.dateTime ? new Date(event.end.dateTime).getTime() : NaN;
    return Number.isFinite(eventStart) && Number.isFinite(eventEnd) && eventStart < endDate.getTime() && eventEnd > startDate.getTime();
  });
  if (hasConflict) throw new Error("That demo slot is already booked. Please choose another time.");

  const eventId = `eduguide-${crypto.randomUUID().replaceAll("-", "").slice(0, 32)}`;
  const conferenceRequestId = crypto.randomUUID();
  const body = {
    id: eventId,
    summary: `EduGuide Free Trial — ${input.studentName}`,
    description: [
      "EduGuide free trial / discovery session.",
      `Student: ${input.studentName}`,
      `Grade: ${input.studentGrade}`,
      `Interest: ${input.interest}`,
      input.notes ? `Notes: ${input.notes}` : null,
      "Booked through the igebra.ai EduGuide assistant.",
    ].filter(Boolean).join("\n"),
    start: { dateTime: start, timeZone: timezone },
    end: { dateTime: end, timeZone: timezone },
    attendees: [{ email: input.parentEmail, displayName: input.studentName }],
    conferenceData: {
      createRequest: {
        requestId: conferenceRequestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: true },
  };

  const createUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  createUrl.searchParams.set("sendUpdates", "all");
  createUrl.searchParams.set("conferenceDataVersion", "1");
  const response = await fetch(createUrl, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Google Calendar event creation failed", detail);
    throw new Error(`Google Calendar could not create the demo event (${response.status}).`);
  }
  const event = await response.json() as {
    id?: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  };
  const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri || null;
  if (!event.id) throw new Error("Google Calendar created the event but returned no event ID.");
  return { eventId: event.id, htmlLink: event.htmlLink || null, meetLink, calendarId, start, end };
}
