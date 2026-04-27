import { Router, Response } from 'express';
import { query, queryOne, run, formatUser } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/users/discover — get unswiped profiles
router.get('/discover', authMiddleware, (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const users = query(`
    SELECT id, username, display_name, avatar, photos, bio, age, interests, is_online
    FROM users
    WHERE id != ?
      AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = ?)
      AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
      AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
    ORDER BY RANDOM()
    LIMIT ?
  `, [req.userId, req.userId, req.userId, req.userId, limit]);

  res.json(users.map(formatUser));
});

// POST /api/users/me/photo — upload profile photo
router.post('/me/photo', authMiddleware, (req: AuthRequest, res: Response) => {
  const { photo } = req.body; // base64 string
  if (!photo) return res.status(400).json({ error: 'Photo required' });

  // Limit to ~2MB base64
  if (photo.length > 2_800_000) {
    return res.status(413).json({ error: 'Photo too large (max 2MB)' });
  }

  run('UPDATE users SET avatar = ? WHERE id = ?', [photo, req.userId]);
  const user = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(user));
});

// POST /api/users/me/photos — add gallery photo
router.post('/me/photos', authMiddleware, (req: AuthRequest, res: Response) => {
  const { photo } = req.body;
  if (!photo) return res.status(400).json({ error: 'Photo required' });
  if (photo.length > 2_800_000) {
    return res.status(413).json({ error: 'Photo too large (max 2MB)' });
  }

  const user: any = queryOne('SELECT photos FROM users WHERE id = ?', [req.userId]);
  const photos = JSON.parse(user?.photos || '[]');
  if (photos.length >= 6) {
    return res.status(400).json({ error: 'Maximum 6 photos allowed' });
  }
  photos.push(photo);
  run('UPDATE users SET photos = ? WHERE id = ?', [JSON.stringify(photos), req.userId]);

  const updated = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(updated));
});

// GET /api/users/:id
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user: any = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, is_online FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(formatUser(user));
});

// PATCH /api/users/me
router.patch('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const { bio, interests, displayName, avatar } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  if (displayName !== undefined) { updates.push('display_name = ?'); values.push(displayName); }
  if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
  if (interests !== undefined) { updates.push('interests = ?'); values.push(JSON.stringify(interests)); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.userId);
  run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

  const user: any = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(user));
});

export default router;
