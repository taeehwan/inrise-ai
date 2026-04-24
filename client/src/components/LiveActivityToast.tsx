import { useEffect, useCallback, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLiveActivity } from "@/contexts/LiveActivityContext";
import { Trophy, Star, Target, Flame } from "lucide-react";

interface LiveActivity {
  id: string;
  type: "score" | "milestone" | "daily" | "streak";
  title: string;
  description: string;
  displayName: string;
  scoreValue?: number;
  section?: string;
  examType?: string;
  createdAt: string;
}

const activityConfig = {
  score: {
    icon: Star,
    label: "점수 달성",
    bgClass: "bg-gradient-to-r from-emerald-500/90 to-teal-600/90",
  },
  milestone: {
    icon: Trophy,
    label: "마일스톤 달성",
    bgClass: "bg-gradient-to-r from-amber-500/90 to-orange-600/90",
  },
  daily: {
    icon: Target,
    label: "오늘의 활동",
    bgClass: "bg-gradient-to-r from-cyan-500/90 to-blue-600/90",
  },
  streak: {
    icon: Flame,
    label: "연속 학습",
    bgClass: "bg-gradient-to-r from-purple-500/90 to-pink-600/90",
  },
};

function useFallbackWebSocket(enabled: boolean, onActivity: (activity: LiveActivity) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/live-activities`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("Live activity toast WebSocket connected (fallback)");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "new_activity") {
            const activity = message.data as LiveActivity;
            if (activity.type === 'score' || activity.type === 'milestone') {
              onActivity(activity);
            }
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      wsRef.current.onclose = () => {
        console.log("Live activity toast WebSocket disconnected");
        if (isMountedRef.current && enabled) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      if (isMountedRef.current && enabled) {
        reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
      }
    }
  }, [enabled, onActivity]);

  useEffect(() => {
    if (!enabled) return;
    
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled]);
}

export function LiveActivityToast() {
  const { toast } = useToast();
  const context = useLiveActivity();
  const newActivity = context?.newActivity ?? null;
  const shownActivitiesRef = useRef<Set<string>>(new Set());
  const usesFallback = !context;

  const showActivityToast = useCallback((activity: LiveActivity) => {
    if (shownActivitiesRef.current.has(activity.id)) {
      return;
    }
    shownActivitiesRef.current.add(activity.id);

    const config = activityConfig[activity.type];
    const Icon = config.icon;

    toast({
      duration: 3000,
      className: `${config.bgClass} border-none text-white shadow-2xl`,
      title: (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-bold">{activity.displayName}</span>
        </div>
      ) as any,
      description: (
        <div className="mt-1">
          <p className="text-white/90 text-sm">{activity.title}</p>
          {activity.scoreValue && (
            <p className="text-white font-bold text-lg mt-1">
              {activity.scoreValue.toFixed(1)}점
            </p>
          )}
        </div>
      ) as any,
    });

    setTimeout(() => {
      shownActivitiesRef.current.delete(activity.id);
    }, 10000);
  }, [toast]);

  useFallbackWebSocket(usesFallback, showActivityToast);

  useEffect(() => {
    if (newActivity && (newActivity.type === 'score' || newActivity.type === 'milestone')) {
      showActivityToast(newActivity);
    }
  }, [newActivity, showActivityToast]);

  return null;
}

export default LiveActivityToast;
