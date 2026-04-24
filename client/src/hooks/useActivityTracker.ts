import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from './useAuth';

interface LogActivityParams {
  activityType: string;
  details?: Record<string, any>;
  duration?: number;
  score?: number;
}

/**
 * Hook to track user activity throughout the application
 * Automatically logs page views and provides manual activity logging
 */
export function useActivityTracker() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const lastLocation = useRef<string>(location);

  // Mutation for logging activity
  const logActivityMutation = useMutation({
    mutationFn: async (params: LogActivityParams) => {
      return apiRequest('POST', '/api/user-activity/log', params);
    },
    onError: (error) => {
      // Silently fail - don't disrupt user experience for tracking failures
      console.debug('Activity tracking failed:', error);
    }
  });

  // Auto-track page views
  useEffect(() => {
    if (!isAuthenticated) return;

    // Log previous page duration when location changes
    if (lastLocation.current !== location) {
      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
      
      if (duration > 1) { // Only log if stayed more than 1 second
        logActivityMutation.mutate({
          activityType: 'page_view',
          details: { page: lastLocation.current },
          duration
        });
      }

      // Reset for new page
      pageStartTime.current = Date.now();
      lastLocation.current = location;
    }
  }, [location, isAuthenticated]);

  // Log when user leaves the page
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
      
      if (duration > 1) {
        // Use sendBeacon with Blob for proper JSON content-type
        const data = JSON.stringify({
          activityType: 'page_view',
          details: { page: location },
          duration
        });

        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon('/api/user-activity/log', blob);
        } else {
          // Fallback to fetch with keepalive
          fetch('/api/user-activity/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true
          }).catch(() => {
            // Silently fail - page is unloading anyway
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location, isAuthenticated]);

  /**
   * Manually log an activity
   * @example
   * logActivity({
   *   activityType: 'test_started',
   *   details: { testId: '123', testType: 'toefl_reading' }
   * })
   */
  const logActivity = (params: LogActivityParams) => {
    if (!isAuthenticated) return;
    logActivityMutation.mutate(params);
  };

  /**
   * Log test start
   */
  const logTestStart = (testType: string, testId: string) => {
    logActivity({
      activityType: 'test_started',
      details: { testType, testId }
    });
  };

  /**
   * Log test completion
   */
  const logTestComplete = (testType: string, testId: string, score: number, duration: number) => {
    logActivity({
      activityType: 'test_completed',
      details: { testType, testId },
      score,
      duration
    });
  };

  /**
   * Log AI feature usage
   */
  const logAIUsage = (feature: string, details?: Record<string, any>) => {
    logActivity({
      activityType: 'ai_used',
      details: { feature, ...details }
    });
  };

  /**
   * Log video watch
   */
  const logVideoWatch = (videoId: string, duration: number, completion: number) => {
    logActivity({
      activityType: 'video_watched',
      details: { videoId, completion },
      duration
    });
  };

  return {
    logActivity,
    logTestStart,
    logTestComplete,
    logAIUsage,
    logVideoWatch,
    isLogging: logActivityMutation.isPending
  };
}
