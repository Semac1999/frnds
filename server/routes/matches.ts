import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run, formatUser } from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/swipes — record a swipe, detect match
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { swipedId, direction } = req.body;
  if (!swipedId || !direction) {
    return res.status(400).json({ error: 'swipedId and direction required' });
  }

  const id = crypto.randomUUID();
  run('INSERT OR REPLACE INTO swipes (id, swiper_id, swiped_id, direction) VALUES (?, ?, ?, ?)', [id, req.userId, swipedId, direction]);

  let matched = false;
  let matchId = null;

  if (direction === 'like') {
    // Check if the other user also liked us
    const mutual: any = queryOne('SELECT id FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND direction = ?', [swipedId, req.userId, 'like']);
    if (mutual) {
      // Create match (ensure consistent ordering)
      const [u1, u2] = [req.userId!, swipedId].sort();
      const existing: any = queryOne('SELECT id FROM matches WHERE user1_id = ? AND user2_id = ?', [u1, u2]);
      if (!existing) {
        matchId = crypto.randomUUID();
        run('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)', [matchId, u1, u2]);
        matched = true;
      }
    }
  }

  res.json({ matched, matchId });
});

// GET /api/matches — get all matches with user info + last message
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const matches = query(`
    SELECT m.id as match_id, m.created_at,
      CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END as other_user_id
    FROM matches m
    WHERE m.user1_id = ? OR m.user2_id = ?
    ORDER BY m.created_at DESC
  `, [req.userId, req.userId, req.userId]);

  const result = matches.map((match: any) => {
    const user: any = queryOne('SELECT id, username, display_name, avatar, photos, bio, age, interests, is_online FROM users WHERE id = ?', [match.other_user_id]);
    const lastMsg: any = queryOne('SELECT content, created_at FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1', [match.match_id]);
    const unread: any = queryOne('SELECT COUNT(*) as count FROM messages WHERE match_id = ? AND sender_id != ? AND read = 0', [match.match_id, req.userId]);

    return {
      matchId: match.match_id,
      user: formatUser(user),
      lastMessage: lastMsg?.content || 'You matched! Say hi',
      lastMessageTime: lastMsg?.created_at || match.created_at,
      unreadCount: unread?.count || 0,
    };
  });

  res.json(result);
});

export default router;
