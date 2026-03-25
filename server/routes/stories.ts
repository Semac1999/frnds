import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/stories — get active stories from matches
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  // Get stories from matched users that haven't expired
  const stories = query(`
    SELECT s.*, u.display_name, u.avatar, u.username,
      CASE WHEN sv.viewer_id IS NOT NULL THEN 1 ELSE 0 END as seen
    FROM stories s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN story_views sv ON s.id = sv.story_id AND sv.viewer_id = ?
    WHERE s.expires_at > datetime('now')
      AND (s.user_id = ? OR s.user_id IN (
        SELECT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END
        FROM matches WHERE user1_id = ? OR user2_id = ?
      ))
    ORDER BY s.user_id, s.created_at
  `, [req.userId, req.userId, req.userId, req.userId, req.userId]);

  // Group by user
  const groups: Record<string, any> = {};
  for (const s of stories as any[]) {
    if (!groups[s.user_id]) {
      groups[s.user_id] = {
        userId: s.user_id,
        userName: s.display_name,
        userAvatar: s.avatar,
        stories: [],
        seen: true,
      };
    }
    groups[s.user_id].stories.push({
      id: s.id,
      content: s.content,
      type: s.type,
      background: s.background.split(','),
      time: s.created_at,
    });
    if (!s.seen) groups[s.user_id].seen = false;
  }

  res.json(Object.values(groups));
});

// POST /api/stories
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { content, type, background } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  const id = crypto.randomUUID();
  run('INSERT INTO stories (id, user_id, content, type, background) VALUES (?, ?, ?, ?, ?)', [
    id, req.userId, content, type || 'text', background || '#6C5CE7,#fd79a8'
  ]);

  const story = queryOne('SELECT * FROM stories WHERE id = ?', [id]);
  res.status(201).json(story);
});

// POST /api/stories/:id/view
router.post('/:id/view', authMiddleware, (req: AuthRequest, res: Response) => {
  run('INSERT OR IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)', [req.params.id, req.userId]);
  res.json({ ok: true });
});

export default router;
