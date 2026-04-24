import type { Express } from "express";
import { storage } from "../storage";
import { requireAdmin, requireAuth, type AuthenticatedRequest } from "../middleware/auth";

export function registerAdminDashboardAnalyticsRoutes(app: Express) {
  app.get("/api/admin/listening-tests", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const tests = await storage.getTests();
      res.json(tests.filter((test) => test.examType === "toefl" && test.section === "listening"));
    } catch (error) {
      console.error("Error fetching listening tests:", error);
      res.status(500).json({ message: "Failed to fetch listening tests" });
    }
  });

  app.get("/api/admin/writing-tests", requireAuth, requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getWritingTests());
    } catch (error) {
      console.error("Error fetching writing tests:", error);
      res.status(500).json({ message: "Failed to fetch writing tests" });
    }
  });

  app.get("/api/admin/dashboard", requireAuth, requireAdmin, async (req, res) => {
    try {
      const [users, tests, attempts] = await Promise.all([
        storage.getAllUsers(),
        storage.getTests(),
        storage.getAllAttempts(),
      ]);

      res.json({
        message: "관리자 대시보드에 오신 것을 환영합니다!",
        stats: {
          users: users.length,
          tests: tests.length,
          attempts: attempts.length,
          adminInfo: {
            id: (req as AuthenticatedRequest).user?.id,
            email: (req as AuthenticatedRequest).user?.email,
            accessTime: new Date().toISOString(),
          },
        },
      });
    } catch (error: any) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/statistics", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const [users, tests, attempts, reviews] = await Promise.all([
        storage.getAllUsers(),
        storage.getTests(),
        storage.getAllAttempts(),
        storage.getReviews(),
      ]);

      const activeUsers = users.filter((user) => user.isActive !== false);
      const adminUsers = users.filter((user) => user.role === "admin");
      const toeflTests = tests.filter((test) => test.examType === "toefl");
      const greTests = tests.filter((test) => test.examType === "gre");
      const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
      const thisWeekAttempts = attempts.filter((attempt) => {
        const attemptDate = new Date(attempt.completedAt || attempt.startedAt);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return attemptDate >= oneWeekAgo;
      });

      const averageRating =
        reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

      res.json({
        users: {
          total: users.length,
          active: activeUsers.length,
          admins: adminUsers.length,
          recentSignups: users.filter((user) => {
            const signupDate = new Date(user.createdAt);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return signupDate >= oneWeekAgo;
          }).length,
        },
        tests: {
          total: tests.length,
          toefl: toeflTests.length,
          gre: greTests.length,
          active: tests.filter((test) => test.isActive !== false).length,
        },
        attempts: {
          total: attempts.length,
          completed: completedAttempts.length,
          inProgress: attempts.filter((attempt) => attempt.status === "in_progress").length,
          thisWeek: thisWeekAttempts.length,
        },
        reviews: {
          total: reviews.length,
          averageRating,
        },
      });
    } catch (error: any) {
      console.error("Admin statistics error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/:period?", requireAuth, requireAdmin, async (req, res) => {
    try {
      const period = (req.params.period as "today" | "weekly" | "monthly") || "today";
      if (!["today", "weekly", "monthly"].includes(period)) {
        return res.status(400).json({ message: "Invalid period. Use 'today', 'weekly', or 'monthly'" });
      }

      res.json(await storage.getAnalyticsData(period));
    } catch (error: any) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/analytics/track", async (req, res) => {
    try {
      const { eventType, eventData, sessionId } = req.body;
      if (!eventType) return res.json({ ok: true });
      const uaStr = (req.headers["user-agent"] || "") as string;
      if (/bot|crawler|spider|headless|googlebot|bingbot/i.test(uaStr)) {
        return res.json({ ok: true });
      }

      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
        (req.headers["x-real-ip"] as string) ||
        req.ip ||
        "";

      await storage.createAnalyticsEvent({
        userId: req.user?.id || null,
        eventType,
        eventData: eventData || null,
        sessionId: sessionId || null,
        ipAddress,
        userAgent: uaStr || null,
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  app.get("/api/admin/analytics/events/summary", requireAuth, requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      res.json(await storage.getAnalyticsEventsSummary(days));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/events/trend", requireAuth, requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      res.json(await storage.getAnalyticsEventsDailyTrend(days));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/visitor-log", async (req, res) => {
    try {
      const { sessionId, page, action, referrer, userAgent, metadata } = req.body;
      const userId = req.user?.id;
      const ipAddress =
        (req.headers["x-forwarded-for"] as string) ||
        (req.headers["x-real-ip"] as string) ||
        req.connection?.remoteAddress ||
        req.ip;

      const log = await storage.createVisitorLog({
        sessionId,
        userId,
        ipAddress,
        userAgent,
        referrer,
        page,
        action,
        metadata,
      });

      res.status(201).json(log);
    } catch (error: any) {
      console.error("Visitor log error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
