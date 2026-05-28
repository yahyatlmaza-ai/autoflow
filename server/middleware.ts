/**
 * server/middleware.ts — Auth, security, rate limiting, input sanitization
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[security] ⚠️  JWT_SECRET not set! Using insecure default.');
  }
  return 'INSECURE_DEFAULT_CHANGE_IMMEDIATELY_' + Math.random().toString(36);
})();

// ── Extended request type ─────────────────────────────────────────────────────
export interface AuthRequest extends Request {
  authUser?: {
    id: string; email: string; tenant_id?: string;
    role?: string; isDemo?: boolean;
  };
}

// ── JWT auth middleware ───────────────────────────────────────────────────────
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    // Fallback: X-User-Id header (legacy) or demo shortcut
    const uid = (req.headers['x-user-id'] as string) || (req.query.user_id as string) || '';
    if (uid === 'demo') {
      req.authUser = { id: 'demo', email: 'demo@autoflow.dz', isDemo: true, role: 'viewer' };
      return next();
    }
    return res.status(401).json({ error: 'Authorization required. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.authUser = {
      id: decoded.id, email: decoded.email,
      tenant_id: decoded.tenant_id, role: decoded.role,
      isDemo: decoded.isDemo ?? false,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Admin-only middleware ─────────────────────────────────────────────────────
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.authUser) return res.status(401).json({ error: 'Unauthorized' });
  // Demo mode is NEVER admin in production
  const isDemoAdmin = req.authUser.isDemo && process.env.ENABLE_DEMO_MODE === 'true';
  if (req.authUser.role !== 'admin' && !isDemoAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── Rate Limiters ─────────────────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 60_000, max: 12,
  message: { error: 'Too many auth attempts. Please wait a minute.' },
  standardHeaders: true, legacyHeaders: false,
});

export const globalLimiter = rateLimit({
  windowMs: 60_000, max: 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true, legacyHeaders: false,
  skip: (req) => req.path === '/health',
});

export const apiLimiter = rateLimit({
  windowMs: 60_000, max: 60,
  message: { error: 'API rate limit exceeded.' },
  standardHeaders: true, legacyHeaders: false,
});

// ── Input sanitization ────────────────────────────────────────────────────────
export function sanitizeString(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[<>]/g, '').replace(/\0/g, '').trim().slice(0, 2000);
}

export function sanitizeEmail(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.trim().toLowerCase().slice(0, 254);
}

export function sanitizeNumber(val: unknown, fallback = 0): number {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isValidPhone(phone: string): boolean {
  return /^[+]?[0-9\s\-()]{7,20}$/.test(phone);
}

// ── Async error wrapper ───────────────────────────────────────────────────────
export function asyncHandler(
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };
}

// ── Global error handler ──────────────────────────────────────────────────────
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[server error]', err?.message || err);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}
