import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/matches/:matchId/messages
router.get('/:matchId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;

  let sql = 'SELECT * FROM messages WHERE match_id = ?';
  const params: any[] = [matchId];

  if (before) {
    sql += ' AND created_at < ?';
    params.push(before);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const messages = query(sql, params);
  res.json(messages.reverse());
});

// POST /api/matches/:matchId/messages
router.post('/:matchId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const { content, type } = req.body;

  if (!content) return res.status(400).json({ error: 'Content required' });

  const id = crypto.randomUUID();
  run('INSERT INTO messages (id, match_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)', [id, matchId, req.userId, content, type || 'text']);

  const message = queryOne('SELECT * FROM messages WHERE id = ?', [id]);
  res.status(201).json(message);
});

// PATCH /api/matches/:matchId/read
router.patch('/:matchId/read', authMiddleware, (req: AuthRequest, res: Response) => {
  run('UPDATE messages SET read = 1 WHERE match_id = ? AND sender_id != ?', [req.params.matchId, req.userId]);
  res.json({ ok: true });
});

export default router;
