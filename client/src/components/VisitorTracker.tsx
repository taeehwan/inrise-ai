import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

function generateSessionId(): string {
  const stored = sessionStorage.getItem('visitor_session_id');
  if (stored) return stored;
  
  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem('visitor_session_id', newId);
  return newId;
}

async function logVisit(
  page: string, 
  action: 'visit' | 'login' | 'logout' | 'test_start' | 'test_complete' | 'signup',
  metadata?: Record<string, any>
) {
  try {
    const sessionId = generateSessionId();
    await fetch('/api/visitor-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sessionId,
        page,
        action,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
        metadata
      })
    });
  } catch (error) {
    console.debug('Visitor log error:', error);
  }
}

export function trackActivity(
  action: 'login' | 'logout' | 'test_start' | 'test_complete' | 'signup',
  metadata?: Record<string, any>
) {
  const page = window.location.pathname;
  logVisit(page, action, metadata);
}

export default function VisitorTracker() {
  const [location] = useLocation();
  const { user } = useAuth();
  const lastPath = useRef<string>('');
  const pageLoadTime = useRef<number>(Date.now());

  useEffect(() => {
    if (location !== lastPath.current) {
      if (lastPath.current) {
        const timeSpent = Math.round((Date.now() - pageLoadTime.current) / 1000);
        logVisit(lastPath.current, 'visit', { 
          timeSpent,
          exitTo: location 
        });
      }
      
      lastPath.current = location;
      pageLoadTime.current = Date.now();
      
      logVisit(location, 'visit', {
        userId: user?.id,
        userName: user?.firstName || user?.email,
        timestamp: new Date().toISOString()
      });
    }
  }, [location, user]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - pageLoadTime.current) / 1000);
      const sessionId = generateSessionId();
      
      const data = JSON.stringify({
        sessionId,
        page: location,
        action: 'visit',
        userAgent: navigator.userAgent,
        metadata: { timeSpent, isExit: true }
      });
      
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon('/api/visitor-log', blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);

  return null;
}
