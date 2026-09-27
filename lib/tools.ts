import { tool } from "ai";
import { z } from "zod";
import { createDemoBooking } from "@/lib/chat-store";
import { createGoogleCalendarDemo, isCalendarIntegrationConfigured } from "@/lib/google-calendar";
import { searchPrograms } from "@/lib/rag";

const gradeSchema = z.string().trim().regex(/^([1-9]|1[0-2])$/, "Grade must be a number from 1 to 12.");

export function createTools(userId: string) {
  const searchCourses = tool({
    description: "Search the assignment knowledge base for suitable igebra.ai / AI Ready School programs by grade, age, interest or a natural-language learning goal.",
    inputSchema: z.object({
      grade: gradeSchema.optional(),
      age: z.number().int().min(6).max(18).optional(),
      interest: z.string().trim().max(120).optional(),
      query: z.string().trim().max(240).optional(),
    }),
    execute: async ({ grade, age, interest, query }) => {
      const results = await searchPrograms({ grade, age, interest, query });
      return {
        type: "course_search",
        filters: { grade: grade ?? null, age: age ?? null, interest: interest ?? null, query: query ?? null },
        count: results.length,
        results: results.map(({ program, score }) => ({
          id: program.id,
          name: program.name,
          score,
          description: program.short_description,
          level: program.level,
          ages: `${program.min_age}-${program.max_age}`,
          grades: program.grades,
          delivery: program.delivery,
          focus: program.focus.slice(0, 5),
          outcomes: program.outcomes.slice(0, 3),
        })),
      };
    },
  });

  const scheduleDemo = tool({
    description: "Schedule a real free 1-on-1 trial/demo. Validate the requested future slot, check the configured Google Calendar for conflicts, create a Google Calendar event with a Google Meet link, invite the parent by email, and persist the booking in Firestore. If Calendar integration is not configured, persist the request as pending instead of pretending a real event was created.",
    inputSchema: z.object({
      studentName: z.string().trim().min(2).max(80),
      parentEmail: z.string().trim().email().max(160),
      studentGrade: gradeSchema,
      preferredDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
      preferredTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      interest: z.string().trim().min(2).max(120),
      notes: z.string().trim().max(300).optional(),
    }),
    execute: async ({ studentName, parentEmail, studentGrade, preferredDate, preferredTime, interest, notes }) => {
      if (isCalendarIntegrationConfigured()) {
        try {
          const calendar = await createGoogleCalendarDemo({ studentName, parentEmail, studentGrade, preferredDate, preferredTime, interest, notes: notes ?? null });
          const confirmationId = await createDemoBooking(userId, {
            studentName, parentEmail, studentGrade, preferredDate, preferredTime, interest, notes: notes ?? null,
            status: "confirmed", integration: "google_calendar", calendarEventId: calendar.eventId,
            calendarUrl: calendar.htmlLink, meetLink: calendar.meetLink, timezone: process.env.DEMO_TIMEZONE || "Asia/Kolkata",
          });
          return {
            type: "demo_booking", status: "confirmed", confirmationId, studentName, parentEmail, studentGrade,
            preferredDate, preferredTime, interest, notes: notes ?? null, mode: "Online 1-on-1",
            calendarEventId: calendar.eventId, calendarUrl: calendar.htmlLink, meetLink: calendar.meetLink,
            message: calendar.meetLink
              ? "Your demo is booked. A Google Calendar invitation was created and a Google Meet link is ready."
              : "Your demo is booked. A Google Calendar invitation was created and sent to the parent email.",
          };
        } catch (error) {
          console.error("Real demo scheduling failed", error);
          throw new Error(error instanceof Error ? error.message : "The requested demo slot could not be booked.");
        }
      }

      const confirmationId = await createDemoBooking(userId, {
        studentName, parentEmail, studentGrade, preferredDate, preferredTime, interest, notes: notes ?? null,
        status: "pending_calendar_setup", integration: "firestore_pending",
      });
      return {
        type: "demo_booking", status: "pending", confirmationId, studentName, parentEmail, studentGrade,
        preferredDate, preferredTime, interest, notes: notes ?? null, mode: "Online 1-on-1",
        message: "Your demo request was saved. Google Calendar integration is not configured on this deployment yet, so no calendar event was falsely marked as confirmed.",
      };
    },
  });

  return { searchCourses, scheduleDemo };
}
