import { Router, Response } from 'express';
import { query, queryOne, run } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/users/discover — get unswiped profiles
router.get('/discover', authMiddleware, (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const users = query(`
    SELECT id, username, display_name, avatar, bio, age, interests, is_online
    FROM users
    WHERE id != ?
      AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = ?)
    ORDER BY RANDOM()
    LIMIT ?
  `, [req.userId, req.userId, limit]);

  const parsed = users.map((u: any) => ({ ...u, interests: JSON.parse(u.interests || '[]') }));
  res.json(parsed);
});

// GET /api/users/:id
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user: any = queryOne('SELECT id, username, display_name, avatar, bio, age, interests, is_online FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, interests: JSON.parse(user.interests || '[]') });
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

  const user: any = queryOne('SELECT id, username, display_name, avatar, bio, age, interests, is_online FROM users WHERE id = ?', [req.userId]);
  res.json({ ...user, interests: JSON.parse(user.interests || '[]') });
});

export default router;
