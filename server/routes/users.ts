import { Router, Response } from 'express';
import { query, queryOne, run, formatUser } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/users/discover — get profiles to browse, optionally filtered by country
router.get('/discover', authMiddleware, (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const scope = (req.query.scope as string) || 'world'; // 'world' | 'country'
  const countryParam = (req.query.country as string) || '';

  // Determine country to filter on: explicit param, or current user's country if scope=country
  let countryFilter = '';
  if (scope === 'country') {
    if (countryParam) {
      countryFilter = countryParam;
    } else {
      const me: any = queryOne('SELECT country FROM users WHERE id = ?', [req.userId]);
      countryFilter = me?.country || '';
    }
  }

  // Exclude users I already have a pending request with (sent or received)
  const baseSql = `
    SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_premium, is_online
    FROM users
    WHERE id != ?
      AND id NOT IN (
        SELECT recipient_id FROM message_requests WHERE sender_id = ? AND status IN ('pending', 'accepted')
      )
      AND id NOT IN (
        SELECT sender_id FROM message_requests WHERE recipient_id = ? AND status IN ('pending', 'accepted')
      )
      AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
      AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
  `;

  let sql = baseSql;
  const params: any[] = [req.userId, req.userId, req.userId, req.userId, req.userId];
  if (countryFilter) {
    sql += ' AND country = ?';
    params.push(countryFilter);
  }
  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(limit);

  const users = query(sql, params);
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
  const user = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_premium, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(user));
});

// POST /api/users/me/premium — mock premium upgrade
// In production this would verify an App Store / Play Store / Stripe receipt.
// For now it just flips the flag so the paywall flow works end-to-end.
router.post('/me/premium', authMiddleware, (req: AuthRequest, res: Response) => {
  run('UPDATE users SET is_premium = 1 WHERE id = ?', [req.userId]);
  const user = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_premium, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(user));
});

// POST /api/users/me/photos — add gallery photo (supports edited base64 with stickers/text)
router.post('/me/photos', authMiddleware, (req: AuthRequest, res: Response) => {
  const { photo } = req.body;
  if (!photo) return res.status(400).json({ error: 'Photo required' });
  if (photo.length > 4_000_000) {
    return res.status(413).json({ error: 'Photo too large (max 3MB)' });
  }

  const user: any = queryOne('SELECT photos FROM users WHERE id = ?', [req.userId]);
  const photos = JSON.parse(user?.photos || '[]');
  if (photos.length >= 6) {
    return res.status(400).json({ error: 'Maximum 6 photos allowed' });
  }
  photos.push(photo);
  run('UPDATE users SET photos = ? WHERE id = ?', [JSON.stringify(photos), req.userId]);

  const updated = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_premium, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(updated));
});

// DELETE /api/users/me/photos/:index — remove photo at given index
router.delete('/me/photos/:index', authMiddleware, (req: AuthRequest, res: Response) => {
  const idx = parseInt(req.params.index, 10);
  if (Number.isNaN(idx) || idx < 0) return res.status(400).json({ error: 'Invalid index' });

  const user: any = queryOne('SELECT photos FROM users WHERE id = ?', [req.userId]);
  const photos = JSON.parse(user?.photos || '[]');
  if (idx >= photos.length) return res.status(404).json({ error: 'Photo not found' });

  photos.splice(idx, 1);
  run('UPDATE users SET photos = ? WHERE id = ?', [JSON.stringify(photos), req.userId]);

  const updated = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_premium, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(updated));
});

// GET /api/users/:id
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user: any = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_premium, is_online FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(formatUser(user));
});

// PATCH /api/users/me
router.patch('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const { bio, interests, displayName, avatar, country } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  if (displayName !== undefined) { updates.push('display_name = ?'); values.push(displayName); }
  if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
  if (interests !== undefined) { updates.push('interests = ?'); values.push(JSON.stringify(interests)); }
  if (country !== undefined) { updates.push('country = ?'); values.push(country); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.userId);
  run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

  const user: any = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, country, is_premium, is_online FROM users WHERE id = ?', [req.userId]);
  res.json(formatUser(user));
});

export default router;
