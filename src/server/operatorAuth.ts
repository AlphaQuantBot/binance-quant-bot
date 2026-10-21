import { Router } from 'express';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
export function passwordHash(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

/** Single operator, one process. Not a multi-user account system. */
export function createOperatorAuth(options: { passwordHash?: string; appUrl?: string; production?: boolean; now?: () => number }) {
  const router = Router();
  const now = options.now || Date.now;
  const sessions = new Map<string, number>();
  const ttl = 8 * 60 * 60 * 1000;
  const configured = /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(options.passwordHash || '');
  let failures = 0;
  let resetAt = 0;
  let activeChecks = 0;
  const cookieName = options.production ? '__Host-aq_session' : 'aq_session';
  const cookieOptions = { httpOnly: true, secure: !!options.production, sameSite: 'strict' as const, path: '/' };
  const tokenKey = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
  const getToken = (cookie = '') => cookie.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
  function isAuthenticated(cookie?: string) {
    const token = getToken(cookie);
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    const key = tokenKey(token);
    const expires = sessions.get(key);
    if (!expires || expires <= now()) { sessions.delete(key); return false; }
    return true;
  }
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/auth/session', (req, res) => res.json({ configured, authenticated: configured && isAuthenticated(req.headers.cookie) }));
  router.use((req, res, next) => {
    if (!configured) return res.status(503).json({ success: false, code: 'AUTH_NOT_CONFIGURED', error: 'Sunucu operatör parolası yapılandırılmamış.' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      let expected: string;
      try { expected = options.appUrl ? new URL(options.appUrl).origin : (!options.production ? `${req.protocol}://${req.get('host')}` : ''); }
      catch { expected = ''; }
      if (!expected || req.get('origin') !== expected) return res.status(403).json({ success: false, code: 'ORIGIN_REJECTED' });
    }
    next();
  });
  router.post('/auth/login', async (req, res) => {
    if (now() >= resetAt) { failures = 0; resetAt = now() + 60_000; }
    if (failures >= 5 || activeChecks >= 2) return res.status(429).json({ success: false, code: 'LOGIN_RATE_LIMITED' });
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
      failures++;
      return res.status(401).json({ success: false, code: 'INVALID_LOGIN' });
    }
    activeChecks++;
    try {
      const [salt, hash] = options.passwordHash!.split(':');
      const actual = await scrypt(password, salt, 64) as Buffer;
      if (!crypto.timingSafeEqual(actual, Buffer.from(hash, 'hex'))) {
        failures++;
        return res.status(401).json({ success: false, code: 'INVALID_LOGIN' });
      }
      for (const [key, expiry] of sessions) if (expiry <= now()) sessions.delete(key);
      if (sessions.size >= 100) return res.status(429).json({ success: false, code: 'SESSION_LIMIT' });
      const old = getToken(req.headers.cookie); if (old) sessions.delete(tokenKey(old));
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(tokenKey(token), now() + ttl);
      res.cookie(cookieName, token, { ...cookieOptions, maxAge: ttl });
      return res.json({ success: true });
    } catch { return res.status(503).json({ success: false, code: 'AUTH_UNAVAILABLE' }); }
    finally { activeChecks--; }
  });
  router.use((req, res, next) => {
    if (!isAuthenticated(req.headers.cookie)) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
    next();
  });
  router.post('/auth/logout', (req, res) => {
    sessions.delete(tokenKey(getToken(req.headers.cookie)));
    res.clearCookie(cookieName, cookieOptions);
    return res.json({ success: true });
  });
  return router;
}
