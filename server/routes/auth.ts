import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../lib/database';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

function randomId() {
  return crypto.randomUUID();
}

// POST /api/auth/signup
router.post('/signup', (req: AuthRequest, res: Response) => {
  const { email, password, username, displayName, age, interests } = req.body;

  if (!email || !password || !username || !displayName || !age) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (age < 13) {
    return res.status(400).json({ error: 'Must be at least 13 years old' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already taken' });
  }

  const id = randomId();
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatar = displayName.substring(0, 2).toUpperCase();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, username, display_name, avatar, age, interests, is_online)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, email, passwordHash, username, displayName, avatar, age, JSON.stringify(interests || []));

  const token = generateToken(id);
  const user = db.prepare('SELECT id, username, display_name, avatar, bio, age, interests, is_online, created_at FROM users WHERE id = ?').get(id);

  res.status(201).json({ token, user: { ...user as any, interests: JSON.parse((user as any).interests || '[]') } });
});

// POST /api/auth/login
router.post('/login', (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user: any = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email, email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  db.prepare('UPDATE users SET is_online = 1 WHERE id = ?').run(user.id);
  const token = generateToken(user.id);

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: { ...safeUser, interests: JSON.parse(safeUser.interests || '[]') } });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user: any = db.prepare('SELECT id, username, display_name, avatar, bio, age, interests, is_online, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, interests: JSON.parse(user.interests || '[]') });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE users SET is_online = 0, last_seen = datetime("now") WHERE id = ?').run(req.userId);
  res.json({ ok: true });
});

export default router;
