import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // Environment variables may already be supplied by the shell/CI.
}

const required = [
  "GROQ_API_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "DEMO_CALENDAR_ID",
  "DEMO_TIMEZONE",
  "DEMO_TIMEZONE_OFFSET",
  "DEMO_DURATION_MINUTES",
];

const missing = required.filter((key) => !process.env[key]?.trim());

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
const hasParts = Boolean(
  process.env.FIREBASE_PROJECT_ID?.trim() &&
  process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
  process.env.FIREBASE_PRIVATE_KEY?.trim(),
);

let credentialMode = "";
if (serviceAccountPath) {
  if (!existsSync(serviceAccountPath)) {
    missing.push(`Firebase service-account file: ${serviceAccountPath}`);
  } else {
    try {
      const account = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      if (!account.client_email || !account.private_key || !account.project_id) {
        missing.push(`Valid Firebase service-account JSON fields in ${serviceAccountPath}`);
      } else {
        credentialMode = "service-account file";
      }
    } catch {
      missing.push(`Valid JSON in ${serviceAccountPath}`);
    }
  }
} else if (serviceAccountJson) {
  try {
    const account = JSON.parse(serviceAccountJson);
    if (!account.client_email || !account.private_key || !account.project_id) {
      missing.push("Valid Firebase service-account JSON fields");
    } else {
      credentialMode = "service-account JSON";
    }
  } catch {
    missing.push("Valid FIREBASE_SERVICE_ACCOUNT_JSON");
  }
} else if (hasParts) {
  credentialMode = "individual Firebase Admin variables";
} else {
  missing.push("FIREBASE_SERVICE_ACCOUNT_PATH (or FIREBASE_SERVICE_ACCOUNT_JSON)");
}

const duration = Number(process.env.DEMO_DURATION_MINUTES);
if (!Number.isInteger(duration) || duration < 15 || duration > 120) {
  missing.push("DEMO_DURATION_MINUTES between 15 and 120");
}

if (missing.length) {
  console.error("\nEduGuide environment check failed.\n");
  for (const item of missing) console.error(`- ${item}`);
  console.error("\nCreate .env.local from .env.example and add your real credentials.");
  console.error("Do not paste or share your Firebase private key in chat.\n");
  process.exit(1);
}

console.log("EduGuide environment check passed.");
console.log(`Firebase Admin: ${credentialMode}`);
console.log(`Semantic RAG: ${process.env.HF_TOKEN ? "enabled" : "lexical fallback"}`);
console.log(`Groq model: ${process.env.GROQ_MODEL || "qwen/qwen3.8-27b"}`);
console.log(`Calendar: ${process.env.DEMO_CALENDAR_ID}`);
console.log(`Timezone: ${process.env.DEMO_TIMEZONE}`);
