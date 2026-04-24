import type { Server } from "http";

export async function setupLiveActivitySocket(server: Server) {
  const { WebSocketServer } = await import("ws");
  const wss = new WebSocketServer({ server, path: "/ws/live-activities" });
  const liveActivityClients = new Set<import("ws").WebSocket>();

  wss.on("connection", (ws) => {
    liveActivityClients.add(ws);
    console.log("Live activity client connected");

    ws.on("close", () => {
      liveActivityClients.delete(ws);
      console.log("Live activity client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      liveActivityClients.delete(ws);
    });
  });

  (globalThis as typeof globalThis & { broadcastLiveActivity?: (activity: unknown) => void }).broadcastLiveActivity = (activity: unknown) => {
    const message = JSON.stringify({ type: "new_activity", data: activity });
    liveActivityClients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  };
}
