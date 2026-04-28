import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, queryOne, run, formatUser } from '../lib/database';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

function randomId() {
  return crypto.randomUUID();
}

// POST /api/auth/signup
router.post('/signup', (req: AuthRequest, res: Response) => {
  const { email, password, username, displayName, age, interests, country } = req.body;

  if (!email || !password || !username || !displayName || !age) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (age < 13) {
    return res.status(400).json({ error: 'Must be at least 13 years old' });
  }

  const existing = queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already taken' });
  }

  const id = randomId();
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatar = displayName.substring(0, 2).toUpperCase();

  run(`
    INSERT INTO users (id, email, password_hash, username, display_name, avatar, age, interests, country, is_online)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [id, email, passwordHash, username, displayName, avatar, age, JSON.stringify(interests || []), country || '']);

  const token = generateToken(id);
  const user = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_online, created_at FROM users WHERE id = ?', [id]);

  res.status(201).json({ token, user: formatUser(user) });
});

// POST /api/auth/login
router.post('/login', (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user: any = queryOne('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  run('UPDATE users SET is_online = 1 WHERE id = ?', [user.id]);
  const token = generateToken(user.id);

  res.json({ token, user: formatUser(user) });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user: any = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_online, created_at FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(formatUser(user));
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  run('UPDATE users SET is_online = 0, last_seen = datetime("now") WHERE id = ?', [req.userId]);
  res.json({ ok: true });
});

// POST /api/auth/google
// Body: { idToken: string, age?: number, country?: string, interests?: string[] }
// Verifies token with Google, finds-or-creates user, returns app JWT.
router.post('/google', async (req: AuthRequest, res: Response) => {
  const { idToken, age, country, interests } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  // Verify token with Google's tokeninfo endpoint (works server-side without extra deps)
  let payload: any;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!r.ok) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    payload = await r.json();
  } catch (e) {
    return res.status(502).json({ error: 'Could not verify with Google' });
  }

  const expectedAud = process.env.GOOGLE_CLIENT_ID;
  if (expectedAud && payload.aud && payload.aud !== expectedAud) {
    // Allow multiple audiences (web/ios/android) by treating as comma-separated
    const allowed = expectedAud.split(',').map((s) => s.trim());
    if (!allowed.includes(payload.aud)) {
      return res.status(401).json({ error: 'Token audience mismatch' });
    }
  }

  const googleSub = payload.sub;
  const email = (payload.email || '').toLowerCase();
  const displayName = payload.name || (email ? email.split('@')[0] : 'New User');
  const picture = payload.picture || null;
  if (!googleSub || !email) {
    return res.status(400).json({ error: 'Token missing required claims' });
  }

  // Find existing user by email
  let user: any = queryOne('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    // Create a new user. Username: email local-part (de-duplicated).
    const baseUsername = email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user';
    let username = baseUsername;
    let n = 0;
    while (queryOne('SELECT id FROM users WHERE username = ?', [username])) {
      n += 1;
      username = `${baseUsername}${n}`;
    }
    const id = randomId();
    // Random password (Google users don't need it, but the schema requires one)
    const passwordHash = bcrypt.hashSync(crypto.randomUUID(), 10);
    const avatar = displayName.substring(0, 2).toUpperCase();
    const safeAge = Math.max(13, parseInt(age, 10) || 18);
    run(`
      INSERT INTO users (id, email, password_hash, username, display_name, avatar, age, interests, country, is_online)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [id, email, passwordHash, username, displayName, picture || avatar, safeAge, JSON.stringify(interests || []), country || '']);
    user = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_online, created_at FROM users WHERE id = ?', [id]);
  } else {
    // Existing user — mark online
    run('UPDATE users SET is_online = 1 WHERE id = ?', [user.id]);
  }

  const token = generateToken(user.id);
  res.json({ token, user: formatUser(user), googleSub });
});

export default router;
