import type { Achievement, InsertAchievement } from "@shared/schema";
import { achievements as achievementsTable } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";

type AchievementInsert = typeof achievementsTable.$inferInsert;

export async function getAllAchievementsRecord(): Promise<Achievement[]> {
  try {
    return await db.select().from(achievementsTable);
  } catch (error) {
    console.error("Failed to get all achievements:", error);
    return [];
  }
}

export async function getActiveAchievementsRecord(): Promise<Achievement[]> {
  try {
    return await db
      .select()
      .from(achievementsTable)
      .where(and(eq(achievementsTable.isActive, true), eq(achievementsTable.isDisplayed, true)))
      .orderBy(achievementsTable.displayOrder);
  } catch (error) {
    console.error("Failed to get active achievements:", error);
    return [];
  }
}

export async function getAchievementRecord(id: string): Promise<Achievement | undefined> {
  try {
    const [achievement] = await db.select().from(achievementsTable).where(eq(achievementsTable.id, id)).limit(1);
    return achievement;
  } catch (error) {
    console.error("Failed to get achievement:", error);
    return undefined;
  }
}

export async function createAchievementRecord(achievement: InsertAchievement): Promise<Achievement> {
  const achievementRecord: AchievementInsert = {
    ...achievement,
    examType: achievement.examType as AchievementInsert["examType"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const [created] = await db
    .insert(achievementsTable)
    .values(achievementRecord)
    .returning();
  return created;
}

export async function updateAchievementRecord(id: string, achievement: Partial<InsertAchievement>): Promise<Achievement> {
  const achievementUpdate: Partial<AchievementInsert> = {
    ...achievement,
    examType: achievement.examType as AchievementInsert["examType"] | undefined,
    updatedAt: new Date(),
  };
  const [updated] = await db
    .update(achievementsTable)
    .set(achievementUpdate)
    .where(eq(achievementsTable.id, id))
    .returning();
  return updated;
}

export async function deleteAchievementRecord(id: string): Promise<void> {
  await db.delete(achievementsTable).where(eq(achievementsTable.id, id));
}
