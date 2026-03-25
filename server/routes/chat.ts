import { Router, Response } from 'express';
import db from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/matches/:matchId/messages
router.get('/:matchId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;

  let query = 'SELECT * FROM messages WHERE match_id = ?';
  const params: any[] = [matchId];

  if (before) {
    query += ' AND created_at < ?';
    params.push(before);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(query).all(...params);
  res.json((messages as any[]).reverse());
});

// POST /api/matches/:matchId/messages
router.post('/:matchId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const { content, type } = req.body;

  if (!content) return res.status(400).json({ error: 'Content required' });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO messages (id, match_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)').run(id, matchId, req.userId, content, type || 'text');

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.status(201).json(message);
});

// PATCH /api/matches/:matchId/read
router.patch('/:matchId/read', authMiddleware, (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE messages SET read = 1 WHERE match_id = ? AND sender_id != ?').run(req.params.matchId, req.userId);
  res.json({ ok: true });
});

export default router;
