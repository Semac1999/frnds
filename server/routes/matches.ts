import { Router, Response } from 'express';
import db from '../lib/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/swipes — record a swipe, detect match
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { swipedId, direction } = req.body;
  if (!swipedId || !direction) {
    return res.status(400).json({ error: 'swipedId and direction required' });
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT OR REPLACE INTO swipes (id, swiper_id, swiped_id, direction) VALUES (?, ?, ?, ?)').run(id, req.userId, swipedId, direction);

  let matched = false;
  let matchId = null;

  if (direction === 'like') {
    // Check if the other user also liked us
    const mutual: any = db.prepare('SELECT id FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND direction = ?').get(swipedId, req.userId, 'like');
    if (mutual) {
      // Create match (ensure consistent ordering)
      const [u1, u2] = [req.userId!, swipedId].sort();
      const existing: any = db.prepare('SELECT id FROM matches WHERE user1_id = ? AND user2_id = ?').get(u1, u2);
      if (!existing) {
        matchId = crypto.randomUUID();
        db.prepare('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)').run(matchId, u1, u2);
        matched = true;
      }
    }
  }

  res.json({ matched, matchId });
});

// GET /api/matches — get all matches with user info + last message
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const matches = db.prepare(`
    SELECT m.id as match_id, m.created_at,
      CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END as other_user_id
    FROM matches m
    WHERE m.user1_id = ? OR m.user2_id = ?
    ORDER BY m.created_at DESC
  `).all(req.userId, req.userId, req.userId);

  const result = (matches as any[]).map((match) => {
    const user: any = db.prepare('SELECT id, username, display_name, avatar, bio, age, interests, is_online FROM users WHERE id = ?').get(match.other_user_id);
    const lastMsg: any = db.prepare('SELECT content, created_at FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1').get(match.match_id);
    const unread: any = db.prepare('SELECT COUNT(*) as count FROM messages WHERE match_id = ? AND sender_id != ? AND read = 0').get(match.match_id, req.userId);

    return {
      matchId: match.match_id,
      user: user ? { ...user, interests: JSON.parse(user.interests || '[]') } : null,
      lastMessage: lastMsg?.content || 'You matched! Say hi',
      lastMessageTime: lastMsg?.created_at || match.created_at,
      unreadCount: unread?.count || 0,
    };
  });

  res.json(result);
});

export default router;
