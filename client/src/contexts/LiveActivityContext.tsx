import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";

interface LiveActivity {
  id: string;
  type: "score" | "milestone" | "daily" | "streak";
  title: string;
  description: string;
  displayName: string;
  avatarUrl?: string;
  scoreValue?: number;
  section?: string;
  examType?: string;
  isHighlight?: boolean;
  createdAt: string;
}

interface LiveActivityContextType {
  activities: LiveActivity[];
  newActivity: LiveActivity | null;
  isConnected: boolean;
  refetch: () => void;
}

const LiveActivityContext = createContext<LiveActivityContextType | null>(null);

export function useLiveActivity(): LiveActivityContextType | null {
  return useContext(LiveActivityContext);
}

interface LiveActivityProviderProps {
  children: ReactNode;
}

export function LiveActivityProvider({ children }: LiveActivityProviderProps) {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [newActivity, setNewActivity] = useState<LiveActivity | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const newActivityTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch("/api/live-activities");
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/live-activities`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("Live activity WebSocket connected (shared)");
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "new_activity") {
            const activity = message.data as LiveActivity;
            setActivities((prev) => [activity, ...prev.slice(0, 19)]);
            setNewActivity(activity);
            if (newActivityTimeoutRef.current) {
              clearTimeout(newActivityTimeoutRef.current);
            }
            newActivityTimeoutRef.current = window.setTimeout(() => {
              setNewActivity(null);
              newActivityTimeoutRef.current = null;
            }, 100);
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      wsRef.current.onclose = () => {
        console.log("Live activity WebSocket disconnected");
        setIsConnected(false);
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      if (isMountedRef.current) {
        reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchActivities();
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (newActivityTimeoutRef.current) {
        clearTimeout(newActivityTimeoutRef.current);
        newActivityTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, fetchActivities]);

  return (
    <LiveActivityContext.Provider
      value={{ activities, newActivity, isConnected, refetch: fetchActivities }}
    >
      {children}
    </LiveActivityContext.Provider>
  );
}
