import { aiGeneratedTests } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";

type AIGeneratedTestData = Record<string, any>;

function asAIGeneratedTestData(value: unknown): AIGeneratedTestData {
  return value && typeof value === "object" ? (value as AIGeneratedTestData) : {};
}

export async function saveAIGeneratedTestRecord(
  testId: string,
  testData: any,
  options?: { activateImmediately?: boolean },
): Promise<void> {
  const testType = testData.examType || "toefl";
  const section = testData.section || "reading";
  const title = testData.title || `AI Generated ${testType.toUpperCase()} ${section} Test`;
  const description = testData.description || `AI-generated test for ${testType.toUpperCase()} ${section} practice`;
  const difficulty = testData.difficulty || "medium";
  const isActive = options?.activateImmediately === true;

  const updateSet: any = {
    testData,
    title,
    description,
    difficulty: difficulty as "easy" | "medium" | "hard",
    updatedAt: new Date(),
  };
  if (isActive) updateSet.isActive = true;

  await db
    .insert(aiGeneratedTests)
    .values({
      id: testId,
      testType: testType as "toefl" | "gre",
      section,
      title,
      description,
      difficulty: difficulty as "easy" | "medium" | "hard",
      testData,
      isActive,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({ target: aiGeneratedTests.id, set: updateSet });
}

export async function updateAIGeneratedTestRecord(testId: string, updates: any): Promise<void> {
  const result = await db.execute(sql`
    SELECT * FROM ai_generated_tests
    WHERE id = ${testId} OR test_data->>'testId' = ${testId}
    LIMIT 1
  `);

  const rows = result.rows as any[];
  if (rows.length === 0) {
    throw new Error(`AI test ${testId} not found`);
  }

  const current = rows[0];
  const existingTestData = current.test_data || {};
  const mergedTestData = {
    ...existingTestData,
    title: updates.title ?? existingTestData.title,
    description: updates.description ?? existingTestData.description,
    duration: updates.duration ?? existingTestData.duration,
    scripts: updates.scripts ?? existingTestData.scripts,
    questions: updates.questions ?? existingTestData.questions,
    passages: updates.passages ?? existingTestData.passages,
  };

  await db
    .update(aiGeneratedTests)
    .set({
      title: updates.title ?? current.title,
      description: updates.description ?? current.description,
      testData: mergedTestData,
      isActive: updates.isActive ?? current.is_active,
      updatedAt: new Date(),
    })
    .where(eq(aiGeneratedTests.id, current.id));
}

export async function getAIGeneratedTestsByCreatorRecord(creatorId: string): Promise<any[]> {
  try {
    const tests = await db.select().from(aiGeneratedTests);
    return tests
      .filter((test) => asAIGeneratedTestData(test.testData).createdBy === creatorId)
      .map((test) => {
        const data = asAIGeneratedTestData(test.testData);
        return {
          id: test.id,
          title: data.title || test.title,
          examType: test.testType || data.examType,
          section: test.section || data.section,
          description: data.description,
          difficulty: data.difficulty,
          questionCount: data.questions?.length || 0,
          isActive: test.isActive,
          createdAt: test.createdAt,
          ...data,
        };
      });
  } catch (error) {
    console.error(`Failed to get AI tests for creator ${creatorId}:`, error);
    return [];
  }
}

export async function getAIGeneratedTestRecord(testId: string): Promise<any | undefined> {
  try {
    const [test] = await db.select().from(aiGeneratedTests).where(eq(aiGeneratedTests.id, testId)).limit(1);
    return test ? asAIGeneratedTestData(test.testData) : undefined;
  } catch (error) {
    console.error(`Failed to get AI test ${testId}:`, error);
    return undefined;
  }
}

export async function getAIGeneratedTestByIdRecord(testId: string): Promise<any | undefined> {
  try {
    const [test] = await db.select().from(aiGeneratedTests).where(eq(aiGeneratedTests.id, testId)).limit(1);
    if (!test) return undefined;
    const data = asAIGeneratedTestData(test.testData);
    const isActiveNormalized = test.isActive === true || (test.isActive as any) === "t" || (test.isActive as any) === "true" || (test.isActive as any) === 1;
    return {
      id: test.id,
      title: data.title || test.title,
      examType: data.examType,
      section: data.section,
      description: data.description,
      difficulty: data.difficulty,
      duration: data.duration || data.timeLimit,
      questionCount: data.questionCount || data.questions?.length || 0,
      questions: data.questions || [],
      isActive: isActiveNormalized,
      createdAt: test.createdAt,
      ...data,
    };
  } catch (error) {
    console.error(`Failed to get AI test by ID ${testId}:`, error);
    return undefined;
  }
}

export async function getAllAIGeneratedTestsRecord(): Promise<any[]> {
  try {
    const tests = await db.select().from(aiGeneratedTests).where(eq(aiGeneratedTests.isActive, true));
    return tests.map((test) => asAIGeneratedTestData(test.testData));
  } catch (error) {
    console.error("Failed to get all AI tests:", error);
    return [];
  }
}

export async function getAllAIGeneratedTestsMetadataRecord(): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        COALESCE(title, test_data->>'title', '') as title,
        COALESCE(test_type, test_data->>'examType', 'toefl') as "testType",
        COALESCE(section, test_data->>'section', 'reading') as section,
        COALESCE(description, test_data->>'description', '') as description,
        COALESCE(difficulty, test_data->>'difficulty', 'medium') as difficulty,
        is_active as "isActive",
        created_at as "createdAt",
        COALESCE(test_data->>'createdBy', '') as "createdBy",
        COALESCE(test_type, test_data->>'examType', 'toefl') as "examType",
        COALESCE((test_data->>'totalQuestions')::int, jsonb_array_length(COALESCE(test_data->'questions', '[]'::jsonb)), 0) as "questionCount",
        COALESCE((test_data->>'duration')::int, (test_data->>'timeLimit')::int, 60) as duration
      FROM ai_generated_tests
      ORDER BY created_at DESC
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title || "",
      examType: row.examType || row.testType || "toefl",
      section: row.section || "reading",
      description: row.description || "",
      difficulty: row.difficulty || "medium",
      duration: row.duration || 60,
      questionCount: row.questionCount || 0,
      isActive: row.isActive === true || row.isActive === "t" || row.isActive === "true" || row.isActive === 1,
      createdAt: row.createdAt,
      createdBy: row.createdBy || null,
      isAIGenerated: true,
    }));
  } catch (error) {
    console.error("Failed to get AI tests metadata:", error);
    return [];
  }
}

export async function deleteAIGeneratedTestRecord(testId: string): Promise<{ dbId?: string; memoryKeys: string[] }> {
  const result = await db.execute(sql`
    SELECT id, test_data->>'testId' as "testDataId"
    FROM ai_generated_tests
    WHERE id = ${testId} OR test_data->>'testId' = ${testId}
    LIMIT 1
  `);

  const rows = result.rows as Array<{ id: string; testDataId: string | null }>;
  if (rows.length === 0) {
    return { memoryKeys: [testId] };
  }

  const record = rows[0];
  await db.delete(aiGeneratedTests).where(eq(aiGeneratedTests.id, record.id));

  const memoryKeys = [record.testDataId || testId, testId, record.id].filter((value, index, arr) => value && arr.indexOf(value) === index);
  return { dbId: record.id, memoryKeys };
}

export async function updateAITestStatusRecord(testId: string, isActive: boolean): Promise<void> {
  await db.update(aiGeneratedTests).set({ isActive, updatedAt: new Date() }).where(eq(aiGeneratedTests.id, testId));
}

export async function getAllAIGeneratedTestsAdminRecord(): Promise<any[]> {
  try {
    return await db.select().from(aiGeneratedTests);
  } catch (error) {
    console.error("Failed to get all AI tests for admin:", error);
    return [];
  }
}

export async function getActiveTestsBySectionRecord(examType: string, section: string): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        COALESCE(title, test_data->>'title', '') as title,
        COALESCE(difficulty, test_data->>'difficulty', 'medium') as difficulty,
        is_active as "isActive",
        test_type as "testType",
        section,
        created_at as "createdAt",
        updated_at as "updatedAt",
        COALESCE(
          (test_data->>'questionCount')::int,
          jsonb_array_length(COALESCE(test_data->'questions', '[]'::jsonb)),
          0
        ) as "questionCount"
      FROM ai_generated_tests
      WHERE (is_active = true OR is_active IS NULL)
        AND (test_type = ${examType} OR test_data->>'examType' = ${examType})
        AND (section = ${section} OR test_data->>'section' = ${section})
      ORDER BY
        CAST(NULLIF(substring(COALESCE(title, test_data->>'title', '') FROM '([0-9]+)'), '') AS INTEGER) ASC NULLS LAST,
        COALESCE(CAST(NULLIF(substring(COALESCE(title, test_data->>'title', '') FROM '-([0-9]+)'), '') AS INTEGER), 0) ASC,
        title ASC
    `);
    return result.rows as any[];
  } catch (error) {
    console.error(`Failed to get active ${examType} ${section} tests:`, error);
    return [];
  }
}

export async function getAllAIGeneratedTestsAdminMetadataRecord(): Promise<any[]> {
  try {
    const tests = await db
      .select({
        id: aiGeneratedTests.id,
        title: aiGeneratedTests.title,
        testType: aiGeneratedTests.testType,
        section: aiGeneratedTests.section,
        description: aiGeneratedTests.description,
        difficulty: aiGeneratedTests.difficulty,
        isActive: aiGeneratedTests.isActive,
        createdAt: aiGeneratedTests.createdAt,
        testData: aiGeneratedTests.testData,
      })
      .from(aiGeneratedTests);

    return tests.map((test) => {
      const data = asAIGeneratedTestData(test.testData);
      return {
        id: test.id,
        title: test.title || data.title,
        examType: test.testType || data.examType,
        section: test.section || data.section,
        description: test.description || data.description,
        difficulty: test.difficulty || data.difficulty,
        duration: data.duration || data.timeLimit || 60,
        questionCount: data.questionCount || data.questions?.length || 0,
        isActive: test.isActive,
        createdAt: test.createdAt,
        isAIGenerated: true,
      };
    });
  } catch (error) {
    console.error("Failed to get admin AI tests metadata:", error);
    return [];
  }
}
