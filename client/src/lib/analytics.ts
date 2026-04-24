let sessionId: string;
try {
  sessionId = sessionStorage.getItem('_inrise_sid') || crypto.randomUUID();
  sessionStorage.setItem('_inrise_sid', sessionId);
} catch {
  sessionId = Math.random().toString(36).slice(2);
}

export function trackEvent(eventType: string, eventData?: Record<string, any>) {
  try {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, eventData: eventData || null, sessionId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silent fail - never interrupt user experience
  }
}
