import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

export function ActivityTrackerProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const lastLocation = useRef<string>(location);
  const hasLoggedSession = useRef(false);

  const logActivity = async (activityType: string, details?: Record<string, any>, duration?: number, score?: number) => {
    if (!isAuthenticated) return;
    
    try {
      await apiRequest('POST', '/api/user-activity/log', {
        activityType,
        details,
        duration,
        score
      });
    } catch (error) {
      console.debug('Activity tracking failed:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !hasLoggedSession.current) {
      logActivity('session_start', { 
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      });
      hasLoggedSession.current = true;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (lastLocation.current !== location) {
      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
      
      if (duration > 1) {
        logActivity('page_view', { page: lastLocation.current }, duration);
      }

      pageStartTime.current = Date.now();
      lastLocation.current = location;
    }
  }, [location, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
      
      if (duration > 1) {
        const data = JSON.stringify({
          activityType: 'page_view',
          details: { page: location },
          duration
        });

        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon('/api/user-activity/log', blob);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location, isAuthenticated]);

  return <>{children}</>;
}
