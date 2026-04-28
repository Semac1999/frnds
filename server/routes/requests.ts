import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run, formatUser } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/requests — send a DM request
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { recipientId, content } = req.body;
  if (!recipientId || !content) {
    return res.status(400).json({ error: 'recipientId and content required' });
  }
  if (recipientId === req.userId) {
    return res.status(400).json({ error: 'Cannot send request to yourself' });
  }
  if (typeof content !== 'string' || content.length > 500) {
    return res.status(400).json({ error: 'Content must be 1-500 chars' });
  }

  // Check if recipient exists
  const recipient = queryOne('SELECT id FROM users WHERE id = ?', [recipientId]);
  if (!recipient) return res.status(404).json({ error: 'User not found' });

  // Check for blocks
  const blocked: any = queryOne(
    'SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [recipientId, req.userId, req.userId, recipientId]
  );
  if (blocked) return res.status(403).json({ error: 'Cannot send request to this user' });

  // Check for existing match (already friends)
  const [u1, u2] = [req.userId!, recipientId].sort();
  const existingMatch: any = queryOne('SELECT id FROM matches WHERE user1_id = ? AND user2_id = ?', [u1, u2]);
  if (existingMatch) {
    return res.status(409).json({ error: 'Already matched', matchId: existingMatch.id });
  }

  // Check for existing pending request from this user
  const existingFromMe: any = queryOne(
    'SELECT id, status FROM message_requests WHERE sender_id = ? AND recipient_id = ?',
    [req.userId, recipientId]
  );
  if (existingFromMe && existingFromMe.status === 'pending') {
    return res.status(409).json({ error: 'Request already sent' });
  }

  // Check if other user already sent us a pending request → auto-accept (mutual)
  const existingFromThem: any = queryOne(
    'SELECT id, content FROM message_requests WHERE sender_id = ? AND recipient_id = ? AND status = ?',
    [recipientId, req.userId, 'pending']
  );
  if (existingFromThem) {
    // Auto-accept: create match, mark accepted
    const matchId = crypto.randomUUID();
    run('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)', [matchId, u1, u2]);
    run('UPDATE message_requests SET status = ? WHERE id = ?', ['accepted', existingFromThem.id]);

    // Save both messages into the new match
    const m1 = crypto.randomUUID();
    run('INSERT INTO messages (id, match_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)', [m1, matchId, recipientId, existingFromThem.content, 'text']);
    const m2 = crypto.randomUUID();
    run('INSERT INTO messages (id, match_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)', [m2, matchId, req.userId, content, 'text']);

    return res.json({ matched: true, matchId });
  }

  // Otherwise create or replace pending request
  const id = existingFromMe?.id || crypto.randomUUID();
  if (existingFromMe) {
    run('UPDATE message_requests SET content = ?, status = ?, created_at = datetime(\'now\') WHERE id = ?', [content, 'pending', id]);
  } else {
    run('INSERT INTO message_requests (id, sender_id, recipient_id, content, status) VALUES (?, ?, ?, ?, ?)', [id, req.userId, recipientId, content, 'pending']);
  }

  res.status(201).json({ id, status: 'pending' });
});

// GET /api/requests — list incoming pending requests
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const requests = query(
    `SELECT mr.id, mr.content, mr.status, mr.created_at,
       u.id as sender_id, u.username, u.display_name, u.avatar, u.photos, u.bio, u.age, u.interests, u.is_online, u.country
     FROM message_requests mr
     JOIN users u ON u.id = mr.sender_id
     WHERE mr.recipient_id = ? AND mr.status = 'pending'
     ORDER BY mr.created_at DESC`,
    [req.userId]
  );

  const result = requests.map((r: any) => ({
    id: r.id,
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
    sender: formatUser({
      id: r.sender_id,
      username: r.username,
      display_name: r.display_name,
      avatar: r.avatar,
      photos: r.photos,
      bio: r.bio,
      age: r.age,
      interests: r.interests,
      is_online: r.is_online,
      country: r.country,
    }),
  }));

  res.json(result);
});

// GET /api/requests/sent — list outgoing pending requests
router.get('/sent', authMiddleware, (req: AuthRequest, res: Response) => {
  const requests = query(
    `SELECT mr.id, mr.content, mr.status, mr.created_at,
       u.id as recipient_id, u.username, u.display_name, u.avatar, u.photos, u.bio, u.age, u.interests, u.is_online, u.country
     FROM message_requests mr
     JOIN users u ON u.id = mr.recipient_id
     WHERE mr.sender_id = ? AND mr.status = 'pending'
     ORDER BY mr.created_at DESC`,
    [req.userId]
  );

  const result = requests.map((r: any) => ({
    id: r.id,
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
    recipient: formatUser({
      id: r.recipient_id,
      username: r.username,
      display_name: r.display_name,
      avatar: r.avatar,
      photos: r.photos,
      bio: r.bio,
      age: r.age,
      interests: r.interests,
      is_online: r.is_online,
      country: r.country,
    }),
  }));

  res.json(result);
});

// POST /api/requests/:id/accept — accept request, create match + initial message
router.post('/:id/accept', authMiddleware, (req: AuthRequest, res: Response) => {
  const reqRow: any = queryOne('SELECT * FROM message_requests WHERE id = ?', [req.params.id]);
  if (!reqRow) return res.status(404).json({ error: 'Request not found' });
  if (reqRow.recipient_id !== req.userId) return res.status(403).json({ error: 'Not your request' });
  if (reqRow.status !== 'pending') return res.status(400).json({ error: 'Already handled' });

  const [u1, u2] = [reqRow.sender_id, reqRow.recipient_id].sort();
  let matchId: string;
  const existing: any = queryOne('SELECT id FROM matches WHERE user1_id = ? AND user2_id = ?', [u1, u2]);
  if (existing) {
    matchId = existing.id;
  } else {
    matchId = crypto.randomUUID();
    run('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)', [matchId, u1, u2]);
  }

  // Save the original request as the first message
  const msgId = crypto.randomUUID();
  run('INSERT INTO messages (id, match_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)', [
    msgId, matchId, reqRow.sender_id, reqRow.content, 'text'
  ]);

  run('UPDATE message_requests SET status = ? WHERE id = ?', ['accepted', req.params.id]);

  res.json({ matchId });
});

// POST /api/requests/:id/decline — decline a request
router.post('/:id/decline', authMiddleware, (req: AuthRequest, res: Response) => {
  const reqRow: any = queryOne('SELECT * FROM message_requests WHERE id = ?', [req.params.id]);
  if (!reqRow) return res.status(404).json({ error: 'Request not found' });
  if (reqRow.recipient_id !== req.userId) return res.status(403).json({ error: 'Not your request' });
  if (reqRow.status !== 'pending') return res.status(400).json({ error: 'Already handled' });

  run('UPDATE message_requests SET status = ? WHERE id = ?', ['declined', req.params.id]);
  res.json({ ok: true });
});

// DELETE /api/requests/:id — sender cancels their own pending request
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const reqRow: any = queryOne('SELECT * FROM message_requests WHERE id = ?', [req.params.id]);
  if (!reqRow) return res.status(404).json({ error: 'Request not found' });
  if (reqRow.sender_id !== req.userId) return res.status(403).json({ error: 'Not your request' });

  run('DELETE FROM message_requests WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
