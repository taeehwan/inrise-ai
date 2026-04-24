import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLiveActivity } from "@/contexts/LiveActivityContext";
import { 
  Trophy, 
  Star, 
  Target, 
  Flame, 
  BookOpen,
  Headphones,
  Mic,
  PenTool,
  RefreshCw,
  Radio,
  X,
  Sparkles
} from "lucide-react";

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

const activityConfig = {
  score: {
    icon: Star,
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    bgGlow: "from-emerald-500/10 to-transparent",
    label: "점수 달성"
  },
  milestone: {
    icon: Trophy,
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    bgGlow: "from-amber-500/10 to-transparent",
    label: "마일스톤"
  },
  daily: {
    icon: Target,
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    bgGlow: "from-cyan-500/10 to-transparent",
    label: "오늘의 활동"
  },
  streak: {
    icon: Flame,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    bgGlow: "from-purple-500/10 to-transparent",
    label: "연속 학습"
  }
};

const sectionIcons: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: PenTool
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.floor(diffHours / 24)}일 전`;
}

interface ActivityItemProps {
  activity: LiveActivity;
  isNew?: boolean;
}

function ActivityItem({ activity, isNew }: ActivityItemProps) {
  const config = activityConfig[activity.type];
  const Icon = config.icon;
  const SectionIcon = activity.section ? sectionIcons[activity.section] : null;

  return (
    <div 
      className={`
        relative p-3 rounded-xl border transition-all duration-500
        ${config.color}
        ${isNew ? 'animate-slide-in scale-100' : ''}
        ${activity.isHighlight ? 'ring-2 ring-yellow-400/50' : ''}
        hover:scale-[1.02] hover:shadow-lg
      `}
      data-testid={`activity-item-${activity.id}`}
    >
      {activity.isHighlight && (
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${config.bgGlow}`}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm truncate">
              {activity.displayName}
            </span>
            {SectionIcon && (
              <SectionIcon className="h-3 w-3 text-gray-400" />
            )}
          </div>
          
          <p className="text-sm text-gray-300 leading-snug">
            {activity.title}
          </p>
          
          {activity.scoreValue && (
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="outline" className="text-xs bg-white/5 border-white/10">
                {activity.scoreValue.toFixed(1)}점
              </Badge>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-1">
            {formatRelativeTime(activity.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface LiveActivityPanelProps {
  className?: string;
  isCollapsible?: boolean;
  maxHeight?: string;
  layout?: 'vertical' | 'horizontal';
}

function useFallbackWebSocket(enabled: boolean, onActivity: (activity: LiveActivity) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/live-activities`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("Live activity panel WebSocket connected (fallback)");
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "new_activity") {
            onActivity(message.data as LiveActivity);
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      wsRef.current.onclose = () => {
        console.log("Live activity panel WebSocket disconnected");
        setIsConnected(false);
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

  return isConnected;
}

export function LiveActivityPanel({ 
  className = "", 
  isCollapsible = true,
  maxHeight = "400px",
  layout = "vertical"
}: LiveActivityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const [isRefetching, setIsRefetching] = useState(false);
  const [fallbackActivities, setFallbackActivities] = useState<LiveActivity[]>([]);
  const highlightTimeoutsRef = useRef<Map<string, number>>(new Map());
  const isMountedRef = useRef<boolean>(true);
  
  const context = useLiveActivity();
  const usesFallback = !context;

  const { data: queriedActivities = [], refetch } = useQuery<LiveActivity[]>({
    queryKey: ['/api/live-activities'],
    refetchInterval: usesFallback ? 30000 : false,
    enabled: usesFallback,
  });

  const handleNewActivity = useCallback((activity: LiveActivity) => {
    if (!isMountedRef.current) return;
    
    setFallbackActivities(prev => [activity, ...prev.slice(0, 19)]);
    setNewActivityIds(prev => new Set([...Array.from(prev), activity.id]));
    
    if (highlightTimeoutsRef.current.has(activity.id)) {
      clearTimeout(highlightTimeoutsRef.current.get(activity.id));
    }
    
    const timeoutId = window.setTimeout(() => {
      highlightTimeoutsRef.current.delete(activity.id);
      if (isMountedRef.current) {
        setNewActivityIds(prev => {
          const next = new Set(prev);
          next.delete(activity.id);
          return next;
        });
      }
    }, 3000);
    
    highlightTimeoutsRef.current.set(activity.id, timeoutId);
  }, []);

  const fallbackConnected = useFallbackWebSocket(usesFallback, handleNewActivity);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      highlightTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      highlightTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (usesFallback && queriedActivities.length > 0) {
      setFallbackActivities(queriedActivities);
    }
  }, [usesFallback, queriedActivities]);

  const activities = context?.activities ?? fallbackActivities;
  const newActivity = context?.newActivity ?? null;
  const isConnected = context?.isConnected ?? fallbackConnected;

  useEffect(() => {
    if (newActivity && context) {
      setNewActivityIds(prev => new Set([...Array.from(prev), newActivity.id]));
      const timeout = setTimeout(() => {
        setNewActivityIds(prev => {
          const next = new Set(prev);
          next.delete(newActivity.id);
          return next;
        });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [newActivity, context]);

  const handleRefresh = async () => {
    setIsRefetching(true);
    if (context?.refetch) {
      await context.refetch();
    } else {
      await refetch();
    }
    setIsRefetching(false);
  };

  if (!isExpanded && isCollapsible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="fixed right-4 bottom-4 z-40 bg-[#1e293b]/90 border-white/10 text-white hover:bg-[#1e293b] hover:border-white/20"
        data-testid="button-expand-activity-panel"
      >
        <Radio className="h-4 w-4 mr-2 text-green-400 animate-pulse" />
        실시간 활동
      </Button>
    );
  }

  return (
    <Card className={`border border-white/10 bg-[#1e293b]/80 backdrop-blur-md shadow-2xl ${className}`}>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className={`h-4 w-4 ${isConnected ? 'text-green-400' : 'text-gray-400'}`} />
              {isConnected && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-400 rounded-full animate-ping" />
              )}
            </div>
            <CardTitle className="text-base text-white font-semibold">
              실시간 활동
            </CardTitle>
            <Badge variant="outline" className={`text-xs ${isConnected ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
              data-testid="button-refresh-activities"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            {isCollapsible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                data-testid="button-collapse-activity-panel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 pt-0">
        {layout === 'horizontal' ? (
          <div className="overflow-x-auto">
            {activities.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">아직 활동이 없습니다</p>
              </div>
            ) : (
              <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                {activities.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="w-64 flex-shrink-0">
                    <ActivityItem 
                      activity={activity}
                      isNew={newActivityIds.has(activity.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="pr-2" style={{ maxHeight }}>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">아직 활동이 없습니다</p>
                <p className="text-xs mt-1">테스트를 완료하면 여기에 표시됩니다!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <ActivityItem 
                    key={activity.id} 
                    activity={activity}
                    isNew={newActivityIds.has(activity.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function FloatingLiveActivityPanel() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed right-4 bottom-4 z-40 bg-[#1e293b]/90 border-white/10 text-white hover:bg-[#1e293b] hover:border-white/20 shadow-lg"
        data-testid="button-show-activity-panel"
      >
        <Radio className="h-4 w-4 mr-2 text-green-400 animate-pulse" />
        활동 보기
      </Button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 w-80">
      <LiveActivityPanel 
        isCollapsible={true}
        maxHeight="350px"
      />
    </div>
  );
}

export default LiveActivityPanel;
