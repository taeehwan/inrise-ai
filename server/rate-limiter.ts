interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, LoginAttempt>();

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000;
const ATTEMPT_WINDOW = 30 * 60 * 1000;

export function checkLoginAttempts(email: string): { 
  allowed: boolean; 
  remainingAttempts: number; 
  retryAfter?: number; 
} {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const attempt = loginAttempts.get(normalizedEmail);

  if (!attempt) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    const retryAfter = Math.ceil((attempt.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfter };
  }

  if (attempt.lockedUntil && now >= attempt.lockedUntil) {
    loginAttempts.delete(normalizedEmail);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (now - attempt.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.delete(normalizedEmail);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - attempt.count);
  return { allowed: remainingAttempts > 0, remainingAttempts };
}

export function recordFailedLogin(email: string): { 
  remainingAttempts: number; 
  locked: boolean; 
  retryAfter?: number; 
} {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const attempt = loginAttempts.get(normalizedEmail);

  if (!attempt) {
    loginAttempts.set(normalizedEmail, {
      count: 1,
      lastAttempt: now,
      lockedUntil: null
    });
    return { remainingAttempts: MAX_ATTEMPTS - 1, locked: false };
  }

  if (now - attempt.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.set(normalizedEmail, {
      count: 1,
      lastAttempt: now,
      lockedUntil: null
    });
    return { remainingAttempts: MAX_ATTEMPTS - 1, locked: false };
  }

  attempt.count += 1;
  attempt.lastAttempt = now;

  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockedUntil = now + LOCK_DURATION;
    const retryAfter = Math.ceil(LOCK_DURATION / 1000);
    console.log(`🔒 Account locked for ${email} due to too many failed attempts`);
    return { remainingAttempts: 0, locked: true, retryAfter };
  }

  return { remainingAttempts: MAX_ATTEMPTS - attempt.count, locked: false };
}

export function recordSuccessfulLogin(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  loginAttempts.delete(normalizedEmail);
}

export function cleanupOldAttempts(): void {
  const now = Date.now();
  const entries = Array.from(loginAttempts.entries());
  for (let i = 0; i < entries.length; i++) {
    const [email, attempt] = entries[i];
    if (now - attempt.lastAttempt > ATTEMPT_WINDOW && 
        (!attempt.lockedUntil || now >= attempt.lockedUntil)) {
      loginAttempts.delete(email);
    }
  }
}

setInterval(cleanupOldAttempts, 60 * 60 * 1000);
