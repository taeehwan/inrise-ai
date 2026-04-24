import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import type { User } from '@shared/schema';

// In production, env.ts already enforces SESSION_SECRET >=32 chars.
// In dev, fall back to a per-process random secret (sessions invalidate on restart, which is fine for dev).
function resolveSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  SESSION_SECRET not set — using a random per-process secret. Sessions will invalidate on restart.');
  return generated;
}

// Configure session middleware
export function configureSession(): RequestHandler {
  const PgSession = connectPgSimple(session);
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = resolveSessionSecret();

  console.log('🍪 Session Configuration:', {
    isProduction,
    nodeEnv: process.env.NODE_ENV,
    secure: isProduction,
    sameSite: 'lax',
    databaseConfigured: !!process.env.DATABASE_URL
  });

  return session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      ttl: 30 * 24 * 60 * 60, // 30 days in seconds
      pruneSessionInterval: 60 * 60, // 1h — prevent unbounded session table growth
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'inrise.sid', // Shorter session name
    proxy: true, // Trust reverse proxy (required for Replit)
    cookie: {
      secure: isProduction, // Explicitly set secure: true for production HTTPS, false for dev HTTP
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax', // Use 'lax' for same-site cookies (works for custom domains)
      domain: isProduction ? (process.env.COOKIE_DOMAIN || undefined) : undefined, // Only set domain in production
      path: '/',
    }
  });
}

// Configure passport strategies
export function configureAuth(app: Express) {
  app.use(configureSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Google ID
        let user = await storage.getUserByProviderId('google', profile.id);
        
        if (!user) {
          // Check if user exists with same email
          const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
          
          if (existingUser) {
            // Link Google account to existing user
            user = await storage.updateUser(existingUser.id, {
              provider: 'google',
              providerId: profile.id,
              profileImageUrl: profile.photos?.[0]?.value,
              lastLoginAt: new Date(),
            });
          } else {
            // Create new user
            user = await storage.createUser({
              email: profile.emails?.[0]?.value || '',
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              profileImageUrl: profile.photos?.[0]?.value,
              provider: 'google',
              providerId: profile.id,
              lastLoginAt: new Date(),
            });
          }
        } else {
          // Update last login
          user = await storage.updateUser(user.id, { lastLoginAt: new Date() });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  // Kakao Strategy
  if (process.env.KAKAO_CLIENT_ID) {
    passport.use(new KakaoStrategy({
      clientID: process.env.KAKAO_CLIENT_ID,
      callbackURL: "/api/auth/kakao/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await storage.getUserByProviderId('kakao', profile.id);
        
        if (!user) {
          const existingUser = await storage.getUserByEmail(profile._json?.kakao_account?.email || '');
          
          if (existingUser) {
            user = await storage.updateUser(existingUser.id, {
              provider: 'kakao',
              providerId: profile.id,
              profileImageUrl: profile._json?.kakao_account?.profile?.profile_image_url,
              lastLoginAt: new Date(),
            });
          } else {
            user = await storage.createUser({
              email: profile._json?.kakao_account?.email || '',
              firstName: profile.displayName,
              profileImageUrl: profile._json?.kakao_account?.profile?.profile_image_url,
              provider: 'kakao',
              providerId: profile.id,
              lastLoginAt: new Date(),
            });
          }
        } else {
          user = await storage.updateUser(user.id, { lastLoginAt: new Date() });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  // Serialize/deserialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      // console.log('Deserializing user - ID:', id, 'User found:', !!user, 'Role:', user?.role);
      done(null, user);
    } catch (error) {
      console.error('Deserialize error:', error);
      done(error);
    }
  });
}

// Authentication middleware
export const requireAuth: RequestHandler = (req, res, next) => {
  console.log('Auth check - isAuthenticated:', req.isAuthenticated(), 'user:', !!req.user);
  if (req.isAuthenticated() && req.user) {
    // Refresh session on each authenticated request
    req.session.touch();
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Simple authentication check middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  console.log('isAuthenticated check - isAuth:', req.isAuthenticated(), 'user:', !!req.user);
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Admin authentication middleware
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user as User)?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}