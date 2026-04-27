import { Router, Response } from 'express';
import crypto from 'crypto';
import { queryOne, run } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/users/report — report a user
router.post('/report', authMiddleware, (req: AuthRequest, res: Response) => {
  const { reportedId, reason, details } = req.body;
  if (!reportedId || !reason) {
    return res.status(400).json({ error: 'reportedId and reason required' });
  }

  const reported = queryOne('SELECT id FROM users WHERE id = ?', [reportedId]);
  if (!reported) {
    return res.status(404).json({ error: 'User not found' });
  }

  const id = crypto.randomUUID();
  run(
    'INSERT INTO reports (id, reporter_id, reported_id, reason, details) VALUES (?, ?, ?, ?, ?)',
    [id, req.userId, reportedId, reason, details || '']
  );

  res.json({ ok: true, reportId: id });
});

// POST /api/users/block — block a user
router.post('/block', authMiddleware, (req: AuthRequest, res: Response) => {
  const { blockedId } = req.body;
  if (!blockedId) {
    return res.status(400).json({ error: 'blockedId required' });
  }

  const blocked = queryOne('SELECT id FROM users WHERE id = ?', [blockedId]);
  if (!blocked) {
    return res.status(404).json({ error: 'User not found' });
  }

  run(
    'INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
    [req.userId, blockedId]
  );

  res.json({ ok: true });
});

// DELETE /api/users/block/:userId — unblock a user
router.delete('/block/:userId', authMiddleware, (req: AuthRequest, res: Response) => {
  run(
    'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
    [req.userId, req.params.userId]
  );

  res.json({ ok: true });
});

export default router;
