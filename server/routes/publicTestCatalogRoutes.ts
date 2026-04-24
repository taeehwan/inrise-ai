import type { Express } from "express";
import { storage } from "../storage";

export function registerPublicTestCatalogRoutes(app: Express) {
  app.get("/api/new-toefl/reading", async (_req, res) => {
    try {
      const [aiTests, manualTests] = await Promise.all([
        storage.getActiveTestsBySection("new-toefl", "reading"),
        storage.getNewToeflReadingTests(),
      ]);

      const manualMapped = manualTests
        .filter((test: any) => test.isActive !== false)
        .map((test: any) => ({
          id: test.id,
          title: test.title,
          difficulty: test.difficulty || "medium",
          isActive: test.isActive !== false,
          moduleNumber: test.moduleNumber || 1,
          source: "manual",
          createdAt: test.createdAt,
        }));

      res.json([
        ...aiTests.map((test: any) => ({ ...test, moduleNumber: test.moduleNumber || 1 })),
        ...manualMapped,
      ]);
    } catch (error) {
      console.error("Error fetching new TOEFL reading tests:", error);
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  app.get("/api/new-toefl/listening", async (_req, res) => {
    try {
      const [aiTests, manualTests] = await Promise.all([
        storage.getActiveTestsBySection("new-toefl", "listening"),
        storage.getNewToeflListeningTests(),
      ]);

      const manualMapped = manualTests
        .filter((test: any) => test.isActive !== false)
        .map((test: any) => {
          const lcCount = Array.isArray(test.listenAndChoose) ? test.listenAndChoose.length : 0;
          const convCount = Array.isArray(test.conversations) ? test.conversations.length : 0;
          const annCount = Array.isArray(test.announcements) ? test.announcements.length : 0;
          const talkCount = Array.isArray(test.academicTalks) ? test.academicTalks.length : 0;

          return {
            id: test.id,
            title: test.title || "",
            difficulty: test.difficulty || "medium",
            isActive: test.isActive !== false,
            testType: "new-toefl",
            section: "listening",
            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
            questionCount: lcCount + convCount + annCount + talkCount,
            source: "manual",
          };
        });

      const seen = new Set<string>();
      const uniqueTests = [...aiTests, ...manualMapped]
        .filter((test: any) => {
          if (seen.has(test.id)) return false;
          seen.add(test.id);
          return true;
        })
        .sort((a: any, b: any) => {
          const numA = parseInt((a.title || "").match(/[0-9]+/)?.[0] || "9999");
          const numB = parseInt((b.title || "").match(/[0-9]+/)?.[0] || "9999");
          if (numA !== numB) return numA - numB;

          const subA = parseInt((a.title || "").match(/-([0-9]+)/)?.[1] || "0");
          const subB = parseInt((b.title || "").match(/-([0-9]+)/)?.[1] || "0");
          return subA - subB;
        });

      res.json(uniqueTests);
    } catch (error) {
      console.error("Error fetching new TOEFL listening tests:", error);
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  app.get("/api/new-toefl/speaking", async (_req, res) => {
    try {
      const tests = await storage.getActiveTestsBySection("new-toefl", "speaking");
      res.json(tests);
    } catch (error) {
      console.error("Error fetching new TOEFL speaking tests:", error);
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  app.get("/api/new-toefl/writing", async (_req, res) => {
    try {
      const tests = await storage.getActiveTestsBySection("new-toefl", "writing");
      res.json(tests);
    } catch (error) {
      console.error("Error fetching new TOEFL writing tests:", error);
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  app.get("/api/sat/reading-writing", async (_req, res) => {
    try {
      const tests = await storage.getActiveTestsBySection("sat", "reading-writing");
      res.json(tests);
    } catch (error) {
      console.error("Error fetching SAT reading-writing tests:", error);
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  app.get("/api/sat/math", async (_req, res) => {
    try {
      const tests = await storage.getActiveTestsBySection("sat", "math");
      res.json(tests);
    } catch (error) {
      console.error("Error fetching SAT math tests:", error);
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  app.get("/api/sat/math/:testId", async (req, res) => {
    try {
      const testData = await storage.getAIGeneratedTest(req.params.testId);
      if (!testData) {
        return res.status(404).json({ message: "테스트를 찾을 수 없습니다" });
      }
      res.json(testData);
    } catch (error) {
      console.error("Error fetching SAT math test:", error);
      res.status(500).json({ message: "Failed to fetch test" });
    }
  });

  app.get("/api/sat/reading-writing/:testId", async (req, res) => {
    try {
      const testData = await storage.getAIGeneratedTest(req.params.testId);
      if (!testData) {
        return res.status(404).json({ message: "테스트를 찾을 수 없습니다" });
      }
      res.json(testData);
    } catch (error) {
      console.error("Error fetching SAT reading-writing test:", error);
      res.status(500).json({ message: "Failed to fetch test" });
    }
  });
}
