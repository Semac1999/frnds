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

export default router;
