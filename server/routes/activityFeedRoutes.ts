import type { Express } from "express";
import { addSSEClient, removeSSEClient, getRecentActivity, getHighlights } from "../activity-service";

export function registerActivityFeedRoutes(app: Express) {
  app.get("/api/activity/recent", async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "20"), 50);
      const events = await getRecentActivity(limit);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/activity/highlights", async (_req, res) => {
    try {
      const events = await getHighlights();
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/activity/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const clientId = `sse-${Date.now()}-${Math.random()}`;
    addSSEClient(clientId, res);
    res.write(`data: {"type":"connected"}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeSSEClient(clientId);
    });
  });
}
