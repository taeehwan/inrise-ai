import type { Express } from "express";
import { insertTestSetSchema } from "@shared/schema";
import { isAuthenticated } from "../auth";
import { buildAiListeningView, buildAiTestSetPayload } from "../lib/testPayloads";
import type { AuthenticatedRequest } from "../middleware/auth";
import { optionalAuth, requireAdmin, requireAuth } from "../middleware/auth";
import { storage } from "../storage";

function buildTestLookup(tests: Array<{ id: string }>) {
  return new Map(tests.map((test) => [test.id, test]));
}

async function getTestSetComponentsWithTests(
  testSetId: string,
  testLookup?: Map<string, any>,
) {
  const components = await storage.getTestSetComponents(testSetId);
  return Promise.all(
    components.map(async (component) => ({
      ...component,
      test: testLookup?.get(component.testId) || (await storage.getTest(component.testId)),
    })),
  );
}

export function registerTestSetRoutes(app: Express) {
  app.get("/api/test-sets", optionalAuth, async (req, res) => {
    try {
      const examType = req.query.examType as "toefl" | "gre" | undefined;
      const [testSets, tests] = await Promise.all([storage.getTestSets(examType), storage.getTests()]);
      const testLookup = buildTestLookup(tests);
      const testSetsWithDetails = await Promise.all(
        testSets.map(async (testSet) => ({
          ...testSet,
          components: await getTestSetComponentsWithTests(testSet.id, testLookup),
        })),
      );
      res.json(testSetsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/test-sets/:id", optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const isAITest =
        id.startsWith("ai-") || id.startsWith("gre-quant-set-") || id.startsWith("gre-verbal-set-") || isUUID;

      if (isAITest) {
        const aiTestData = await storage.getAIGeneratedTest(id);
        if (aiTestData) {
          console.log(`Found AI generated test: ${id}`);
          return res.json(buildAiTestSetPayload(id, aiTestData));
        }
      }

      const testSet = await storage.getTestSet(id);
      if (!testSet) {
        return res.status(404).json({ message: "테스트 세트를 찾을 수 없습니다" });
      }

      res.json({
        ...testSet,
        components: await getTestSetComponentsWithTests(testSet.id),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/test-set-components/:testSetId", optionalAuth, async (req, res) => {
    try {
      res.json(await getTestSetComponentsWithTests(req.params.testSetId));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/test-sets", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("Creating test set:", req.body);
      console.log("Authenticated user:", req.user);
      console.log("Session data:", req.session);

      const sectionData = req.body._sectionData;
      console.log("Storing section data:", sectionData ? "Present" : "Not present");

      const validatedData = insertTestSetSchema.parse(req.body);
      console.log("Validated data:", validatedData);

      const testSet = await storage.createTestSet({ ...validatedData, _sectionData: sectionData });
      console.log("Test set created:", testSet);
      res.status(201).json(testSet);
    } catch (error: any) {
      console.error("Test set creation error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/test-sets/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const testSet = await storage.updateTestSet(req.params.id, req.body);
      res.json(testSet);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/user/ai-tests", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tests = await storage.getAIGeneratedTestsByCreator(userId);
      res.json(tests);
    } catch (error: any) {
      console.error("Error fetching user AI tests:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ai-tests/:testId", async (req, res) => {
    try {
      const testId = req.params.testId;
      console.log(`Fetching AI test data for: ${testId}`);

      const testData = await storage.getAIGeneratedTest(testId);
      if (!testData) {
        return res.status(404).json({ message: "테스트를 찾을 수 없습니다" });
      }

      console.log("Raw test data:", {
        testId,
        hasScripts: !!testData.scripts,
        hasAudioFiles: !!testData.audioFiles,
        hasQuestions: !!testData.questions,
        section: testData.section,
        testTitle: testData.testTitle || testData.title,
        actualDataStructure: Object.keys(testData),
      });

      if (testData.section === "listening") {
        const formattedData = buildAiListeningView(testData);
        console.log("Formatted listening test data:", {
          scriptsCount: formattedData.scripts.length,
          questionsCount: formattedData.questions.length,
          totalDuration: formattedData.totalDuration,
          hasAudioUrls: formattedData.scripts.some((script: any) => script.audioUrl),
          sampleScript: formattedData.scripts[0],
          sampleQuestion: formattedData.questions[0],
          questionsPreview: formattedData.questions.map((question: any) => question.question),
        });
        return res.json(formattedData);
      }

      res.json(testData);
    } catch (error: any) {
      console.error(`Error fetching AI test ${req.params.testId}:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/test-sets/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTestSet(req.params.id);
      res.json({ message: "풀테스트가 성공적으로 삭제되었습니다" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}
