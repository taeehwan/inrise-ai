import { db } from "../db";
import { liveActivities as liveActivitiesTable } from "@shared/schema";
import { lt } from "drizzle-orm";

export async function deleteExpiredLiveActivitiesRecord(): Promise<void> {
  try {
    const now = new Date();
    await db.delete(liveActivitiesTable).where(lt(liveActivitiesTable.expiresAt, now));
  } catch (error) {
    console.error("Failed to delete expired live activities:", error);
  }
}
