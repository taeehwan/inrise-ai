import type { Express } from "express";
import { insertReviewSchema } from "@shared/schema";
import { storage } from "../storage";
import { requireAdmin, requireAuth } from "../middleware/auth";

export function registerReviewStudyRoutes(app: Express) {
  app.get("/api/reviews", async (req, res) => {
    try {
      const { examType } = req.query;
      let reviews;

      if (examType && ["toefl", "gre"].includes(examType as string)) {
        reviews = await storage.getReviewsByExamType(examType as "toefl" | "gre");
        reviews = reviews.filter((review) => review.isApproved);
      } else {
        reviews = await storage.getApprovedReviews();
      }

      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reviews/user", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const reviews = await storage.getUserReviews(userId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reviews/stats", async (_req, res) => {
    try {
      const averageRating = await storage.getAverageRating();
      const totalReviews = await storage.getTotalReviews();
      res.json({ averageRating, totalReviews });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/reviews", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const validatedData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(userId, validatedData);
      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/reviews", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/reviews/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    try {
      const review = await storage.approveReview(req.params.id);
      res.json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/reviews/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/study-plans", async (req, res) => {
    try {
      const { examType } = req.query;
      const plans =
        examType && ["toefl", "gre"].includes(examType as string)
          ? await storage.getStudyPlansByExamType(examType as "toefl" | "gre")
          : await storage.getStudyPlans();

      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
