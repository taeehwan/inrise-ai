import type { Express } from "express";
import { insertUserSchema } from "@shared/schema";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { extractSectionFromTitle } from "../lib/routeTransforms";

export function registerCoreUserTestRoutes(app: Express) {
  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tests", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { examType, section } = req.query;
      const isAdmin = req.user?.role === "admin";
      const needsFullData = section === "writing" || section === "speaking";

      const [tests, testSets, aiGeneratedTests] = await Promise.all([
        storage.getTests(),
        storage.getTestSets(),
        needsFullData
          ? storage.getAllAIGeneratedTests()
          : isAdmin
            ? storage.getAllAIGeneratedTestsAdminMetadata()
            : storage.getAllAIGeneratedTestsMetadata(),
      ]);

      const testSetsAsTests = testSets.map((testSet: any) => ({
        id: `testset-${testSet.id}`,
        title: testSet.title,
        description: testSet.description || "",
        examType: testSet.examType as "toefl" | "gre",
        section: extractSectionFromTitle(testSet.title),
        difficulty: "medium" as const,
        duration: testSet.totalDuration || 60,
        questionCount: 10,
        isActive: testSet.isActive !== false,
        createdAt: testSet.createdAt || new Date().toISOString(),
        type: testSet.examType as "toefl" | "gre",
      }));

      const aiTestsAsTests = aiGeneratedTests.map((aiTest: any) => ({
        ...aiTest,
        type: aiTest.examType as "toefl" | "gre",
      }));

      if (section === "listening" || section === "speaking") {
        console.log(`🔍 ${section} tests debug:`);
        console.log("- Total AI tests:", aiGeneratedTests.length);
        console.log(`- AI ${section} tests:`, aiGeneratedTests.filter((test: any) => test.section === section).length);
      }

      let filteredTests = [...tests, ...testSetsAsTests, ...aiTestsAsTests];

      if (examType && ["toefl", "gre", "new-toefl", "sat"].includes(examType as string)) {
        filteredTests = filteredTests.filter((test: any) => test.examType === examType);
      }

      if (section && section !== "all") {
        filteredTests = filteredTests.filter((test: any) => test.section === section);
      }

      res.json(filteredTests);
    } catch (error: any) {
      console.error("Tests API error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
