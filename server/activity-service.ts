import { db } from "./db";
import { activityEvents } from "@shared/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { storage } from "./storage";
import type { Response } from "express";

// SSE client registry
const sseClients = new Map<string, Response>();

export function addSSEClient(id: string, res: Response) {
  sseClients.set(id, res);
}

export function removeSSEClient(id: string) {
  sseClients.delete(id);
}

function broadcastActivity(event: any) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const [id, res] of sseClients.entries()) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(id);
    }
  }
}

function maskName(name: string): string {
  if (!name) return "익명";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  if (parts[0].length <= 2) return parts[0];
  return `${parts[0].slice(0, -1)}*`;
}

interface ActivityEventData {
  userId: string;
  displayName: string;
  eventType: "test_complete" | "full_test_complete" | "personal_best" | "streak" | "first_test";
  section?: string;
  score?: number;
  streakDays?: number;
  isHighlight?: boolean;
}

export async function createActivityEvent(data: ActivityEventData): Promise<void> {
  try {
    const maskedName = maskName(data.displayName);

    const [event] = await db.insert(activityEvents).values({
      userId: data.userId,
      eventType: data.eventType,
      section: data.section,
      score: data.score,
      streakDays: data.streakDays,
      displayName: maskedName,
      isHighlight: data.isHighlight ?? (data.eventType === "personal_best" || data.eventType === "first_test" || (data.eventType === "streak" && (data.streakDays ?? 0) >= 7)),
    }).returning();

    // Award +2 credits (credit_transactions에 기록 남김)
    try {
      await storage.addCredits(
        data.userId,
        2,
        'bonus',
        '실시간 활동 공유 보상',
        'bonus'
      );
    } catch {
      // credits optional
    }

    // SSE broadcast
    broadcastActivity({ ...event, maskedName });
  } catch (err) {
    console.error("[ActivityService] createActivityEvent error (non-blocking):", err);
  }
}

export async function getRecentActivity(limit = 20) {
  return db.select().from(activityEvents).orderBy(desc(activityEvents.createdAt)).limit(limit);
}

export async function getHighlights() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return db.select().from(activityEvents)
    .where(and(eq(activityEvents.isHighlight, true), gte(activityEvents.createdAt, since)))
    .orderBy(desc(activityEvents.createdAt))
    .limit(3);
}
