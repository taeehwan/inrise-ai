import type { Express } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { storage } from "../storage";

function buildUserContactMap(users: Array<{ id: string; username?: string | null; email?: string | null }>) {
  return Object.fromEntries(
    users.map((user) => [user.id, { username: user.username || "", email: user.email || "" }]),
  );
}

type UserActivitySummary = {
  userId: string;
  username: string | null;
  email: string;
  totalActivities: number;
  activityTypes: Record<string, number>;
  lastActivity: Date | null;
  mostRecentActivity: string | null;
  totalDuration: number;
};

export function registerAdminOperationsRoutes(app: Express) {
  app.get("/api/success-stories", async (req, res) => {
    try {
      const stories = await storage.getSuccessStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching success stories:", error);
      res.status(500).json({ error: "Failed to fetch success stories" });
    }
  });

  app.get("/api/success-stats", async (req, res) => {
    try {
      const stats = await storage.getSuccessStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching success stats:", error);
      res.status(500).json({ error: "Failed to fetch success stats" });
    }
  });

  app.get("/api/admin/success-stories", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stories = await storage.getSuccessStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching success stories:", error);
      res.status(500).json({ error: "Failed to fetch success stories" });
    }
  });

  app.post("/api/admin/success-stories", requireAuth, requireAdmin, async (req, res) => {
    try {
      const story = await storage.createSuccessStory(req.body);
      res.json(story);
    } catch (error) {
      console.error("Error creating success story:", error);
      res.status(500).json({ error: "Failed to create success story" });
    }
  });

  app.put("/api/admin/success-stories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const story = await storage.updateSuccessStory(req.params.id, req.body);
      res.json(story);
    } catch (error) {
      console.error("Error updating success story:", error);
      res.status(500).json({ error: "Failed to update success story" });
    }
  });

  app.delete("/api/admin/success-stories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteSuccessStory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting success story:", error);
      res.status(500).json({ error: "Failed to delete success story" });
    }
  });

  app.put("/api/admin/success-stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.updateSuccessStats(req.body);
      res.json(stats);
    } catch (error) {
      console.error("Error updating success stats:", error);
      res.status(500).json({ error: "Failed to update success stats" });
    }
  });

  app.get("/api/admin/ai-usage-stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAiUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching AI usage stats:", error);
      res.status(500).json({ error: "Failed to fetch AI usage stats" });
    }
  });

  app.get("/api/admin/user-ai-usage/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserAiUsageStats(req.params.userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user AI usage stats:", error);
      res.status(500).json({ error: "Failed to fetch user AI usage stats" });
    }
  });

  app.get("/api/admin/programs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const programs = await storage.getPrograms();
      res.json(programs);
    } catch (error) {
      console.error("Error fetching programs:", error);
      res.status(500).json({ error: "Failed to fetch programs" });
    }
  });

  app.post("/api/admin/programs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const program = await storage.createProgram(req.body);
      res.json(program);
    } catch (error) {
      console.error("Error creating program:", error);
      res.status(500).json({ error: "Failed to create program" });
    }
  });

  app.put("/api/admin/programs/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const program = await storage.updateProgram(req.params.id, req.body);
      res.json(program);
    } catch (error) {
      console.error("Error updating program:", error);
      res.status(500).json({ error: "Failed to update program" });
    }
  });

  app.delete("/api/admin/programs/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProgram(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting program:", error);
      res.status(500).json({ error: "Failed to delete program" });
    }
  });

  app.get("/api/admin/user-program-access/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const access = await storage.getUserProgramAccess(req.params.userId);
      res.json(access);
    } catch (error) {
      console.error("Error fetching user program access:", error);
      res.status(500).json({ error: "Failed to fetch user program access" });
    }
  });

  app.post("/api/admin/grant-program-access", requireAuth, requireAdmin, async (req, res) => {
    try {
      const access = await storage.grantProgramAccess({
        ...req.body,
        grantedBy: (req.user as any)?.id,
      });
      res.json(access);
    } catch (error) {
      console.error("Error granting program access:", error);
      res.status(500).json({ error: "Failed to grant program access" });
    }
  });

  app.delete("/api/admin/revoke-program-access/:userId/:programId", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.revokeProgramAccess(req.params.userId, req.params.programId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking program access:", error);
      res.status(500).json({ error: "Failed to revoke program access" });
    }
  });

  app.get("/api/admin/activity-stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getActivityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching activity stats:", error);
      res.status(500).json({ error: "Failed to fetch activity stats" });
    }
  });

  app.get("/api/admin/user-activity/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const activities = await storage.getUserActivity(req.params.userId, startDate, endDate);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ error: "Failed to fetch user activity" });
    }
  });

  app.get("/api/admin/all-activities", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const activityType = (req.query.activityType as string) || undefined;
      const [allActivities, allUsers] = await Promise.all([
        storage.getAllUserActivities(limit, activityType),
        storage.getAllUsers(),
      ]);
      const relevantUserIds = new Set(allActivities.map((activity) => activity.userId));
      const usersMap = buildUserContactMap(allUsers.filter((user) => relevantUserIds.has(user.id)));

      const enrichedActivities = allActivities.map((activity) => ({
        ...activity,
        userName: usersMap[activity.userId]?.username || "Unknown",
        userEmail: usersMap[activity.userId]?.email || "",
      }));

      res.json(enrichedActivities);
    } catch (error) {
      console.error("Error fetching all activities:", error);
      res.status(500).json({ error: "Failed to fetch all activities" });
    }
  });

  app.get("/api/admin/activity-by-user", requireAuth, requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string, 10) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const allUsers = await storage.getAllUsers();
      const activityByUser = (
        await Promise.all(
          allUsers.slice(0, 50).map(async (user): Promise<UserActivitySummary | null> => {
            const activities = await storage.getUserActivity(user.id, startDate);
            if (activities.length === 0) {
              return null;
            }

            const typeCounts: Record<string, number> = {};
            activities.forEach((activity) => {
              typeCounts[activity.activityType] = (typeCounts[activity.activityType] || 0) + 1;
            });

            return {
              userId: user.id,
              username: user.username,
              email: user.email || "",
              totalActivities: activities.length,
              activityTypes: typeCounts,
              lastActivity: activities[0]?.createdAt || null,
              mostRecentActivity: activities[0]?.activityType || null,
              totalDuration: activities.reduce((sum, activity) => sum + (activity.duration || 0), 0),
            };
          }),
        )
      ).filter(
        (userActivity): userActivity is UserActivitySummary => userActivity !== null,
      );

      activityByUser.sort((a, b) => b.totalActivities - a.totalActivities);
      res.json(activityByUser);
    } catch (error) {
      console.error("Error fetching activity by user:", error);
      res.status(500).json({ error: "Failed to fetch activity by user" });
    }
  });

  app.get("/api/admin/users-with-stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allActivities = await storage.getAllUserActivities(5000);
      const activityMap: Record<string, { counts: Record<string, number>; lastActivity: Date | null; totalActivities: number }> = {};

      for (const act of allActivities) {
        if (!activityMap[act.userId]) {
          activityMap[act.userId] = { counts: {}, lastActivity: null, totalActivities: 0 };
        }
        const entry = activityMap[act.userId];
        entry.counts[act.activityType] = (entry.counts[act.activityType] || 0) + 1;
        entry.totalActivities++;
        const actDate = act.createdAt ? new Date(act.createdAt) : null;
        if (actDate && (!entry.lastActivity || actDate > entry.lastActivity)) {
          entry.lastActivity = actDate;
        }
      }

      const usersWithStats = allUsers
        .filter((user: any) => user.role !== "admin")
        .map((user: any) => {
          const actEntry = activityMap[user.id] || { counts: {}, lastActivity: null, totalActivities: 0 };
          return {
            id: user.id,
            username: user.username,
            email: user.email || "",
            membershipTier: user.membershipTier || "guest",
            subscriptionStatus: user.subscriptionStatus || "inactive",
            createdAt: user.createdAt,
            lastActivity: actEntry.lastActivity,
            totalActivities: actEntry.totalActivities,
            featureStats: {
              ai_feedback_reading: actEntry.counts.ai_feedback_reading || 0,
              ai_feedback_listening: actEntry.counts.ai_feedback_listening || 0,
              ai_feedback_speaking: actEntry.counts.ai_feedback_speaking || 0,
              ai_feedback_writing: actEntry.counts.ai_feedback_writing || 0,
              full_test_complete: actEntry.counts.full_test_complete || 0,
              test_start: actEntry.counts.test_start || 0,
              login: actEntry.counts.login || 0,
            },
          };
        })
        .sort((a: any, b: any) => b.totalActivities - a.totalActivities);

      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching users with stats:", error);
      res.status(500).json({ error: "Failed to fetch users with stats" });
    }
  });

  app.get("/api/admin/user-activity/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string, 10) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const activities = await storage.getUserActivity(userId, startDate);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activity timeline:", error);
      res.status(500).json({ error: "Failed to fetch user activity" });
    }
  });
}
