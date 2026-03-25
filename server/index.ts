import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

import db, { seedDemoUsers } from './lib/database';
import { JWT_SECRET } from './middleware/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import matchRoutes from './routes/matches';
import chatRoutes from './routes/chat';
import storyRoutes from './routes/stories';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*' },
});

const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/swipes', matchRoutes); // POST /api/swipes for swiping
app.use('/api/matches', matchRoutes); // GET /api/matches for match list
app.use('/api/matches', chatRoutes);  // GET/POST /api/matches/:matchId/messages
app.use('/api/stories', storyRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    name: 'frnds API',
  });
});

// Seed endpoint — available in non-production, or with SEED_SECRET
app.post('/api/seed', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const seedSecret = process.env.SEED_SECRET;

  if (isProduction && seedSecret) {
    const provided = req.headers['x-seed-secret'] || req.body?.secret;
    if (provided !== seedSecret) {
      return res.status(403).json({ error: 'Forbidden: invalid seed secret' });
    }
  } else if (isProduction && !seedSecret) {
    return res.status(403).json({ error: 'Forbidden: seed endpoint disabled in production without SEED_SECRET' });
  }

  const result = seedDemoUsers();
  res.json(result);
});

// ===== SOCKET.IO =====
const onlineUsers = new Map<string, string>(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (socket as any).userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  onlineUsers.set(userId, socket.id);

  // Update online status
  db.prepare('UPDATE users SET is_online = 1 WHERE id = ?').run(userId);
  io.emit('user:online', { userId });

  console.log(`User connected: ${userId}`);

  // Handle new message
  socket.on('message:send', (data: { matchId: string; content: string; type?: string }) => {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO messages (id, match_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)').run(
      id, data.matchId, userId, data.content, data.type || 'text'
    );
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

    // Find the other user in the match
    const match: any = db.prepare('SELECT * FROM matches WHERE id = ?').get(data.matchId);
    if (match) {
      const otherId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const otherSocket = onlineUsers.get(otherId);
      if (otherSocket) {
        io.to(otherSocket).emit('message:new', { matchId: data.matchId, message });
      }
    }

    socket.emit('message:sent', { matchId: data.matchId, message });
  });

  // Typing indicators
  socket.on('typing:start', (data: { matchId: string }) => {
    const match: any = db.prepare('SELECT * FROM matches WHERE id = ?').get(data.matchId);
    if (match) {
      const otherId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const otherSocket = onlineUsers.get(otherId);
      if (otherSocket) io.to(otherSocket).emit('typing:start', { matchId: data.matchId, userId });
    }
  });

  socket.on('typing:stop', (data: { matchId: string }) => {
    const match: any = db.prepare('SELECT * FROM matches WHERE id = ?').get(data.matchId);
    if (match) {
      const otherId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const otherSocket = onlineUsers.get(otherId);
      if (otherSocket) io.to(otherSocket).emit('typing:stop', { matchId: data.matchId, userId });
    }
  });

  // Mark messages read
  socket.on('message:read', (data: { matchId: string }) => {
    db.prepare('UPDATE messages SET read = 1 WHERE match_id = ? AND sender_id != ?').run(data.matchId, userId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    db.prepare('UPDATE users SET is_online = 0, last_seen = datetime("now") WHERE id = ?').run(userId);
    io.emit('user:offline', { userId });
    console.log(`User disconnected: ${userId}`);
  });
});

// ===== AUTO-SEED ON STARTUP =====
try {
  const result = seedDemoUsers();
  if (result.seeded) {
    console.log(`[startup] Auto-seeded ${result.count} demo users`);
  } else {
    console.log(`[startup] Database already has ${result.count} users, skipping seed`);
  }
} catch (err) {
  console.error('[startup] Seed failed:', err);
}

// ===== START SERVER =====
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  frnds API running on http://0.0.0.0:${PORT}`);
  console.log(`  Socket.io ready\n`);
});
