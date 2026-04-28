import initSqlJs, { Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

let db: Database | null = null;

// Helper: run a query that returns rows
export function query(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a query that returns a single row or undefined
export function queryOne(sql: string, params: any[] = []): any | undefined {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

// Helper: run a statement (INSERT, UPDATE, DELETE) that doesn't return rows
export function run(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
}

// Helper: execute DDL or multi-statement SQL
export function exec(sql: string): void {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ===== SCHEMA =====
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    photos TEXT DEFAULT '[]',
    bio TEXT DEFAULT '',
    age INTEGER NOT NULL CHECK (age >= 13),
    interests TEXT DEFAULT '[]',
    country TEXT DEFAULT '',
    is_premium INTEGER DEFAULT 0,
    is_online INTEGER DEFAULT 0,
    last_seen TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS message_requests (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id),
    recipient_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(sender_id, recipient_id)
  );

  CREATE INDEX IF NOT EXISTS idx_requests_recipient ON message_requests(recipient_id, status);
  CREATE INDEX IF NOT EXISTS idx_requests_sender ON message_requests(sender_id, status);

  CREATE TABLE IF NOT EXISTS swipes (
    id TEXT PRIMARY KEY,
    swiper_id TEXT NOT NULL REFERENCES users(id),
    swiped_id TEXT NOT NULL REFERENCES users(id),
    direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(swiper_id, swiped_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL REFERENCES users(id),
    user2_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user1_id, user2_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'snap')),
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image')),
    background TEXT DEFAULT '#6C5CE7,#fd79a8',
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT DEFAULT (datetime('now', '+24 hours'))
  );

  CREATE TABLE IF NOT EXISTS story_views (
    story_id TEXT NOT NULL REFERENCES stories(id),
    viewer_id TEXT NOT NULL REFERENCES users(id),
    viewed_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (story_id, viewer_id)
  );

  CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
  CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
  CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
  CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
  CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id, expires_at);

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id),
    reported_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS blocks (
    blocker_id TEXT NOT NULL REFERENCES users(id),
    blocked_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (blocker_id, blocked_id)
  );
`;

// ===== DEMO SEED DATA =====
const DEMO_USERS = [
  { username: 'emma_j', displayName: 'Emma Johnson', age: 21, country: 'US', bio: 'Art student who loves coffee shops and spontaneous road trips. Always down for a museum day.', interests: ['art', 'coffee', 'travel', 'photography'] },
  { username: 'liam_chen', displayName: 'Liam Chen', age: 20, country: 'US', bio: 'CS major by day, bedroom DJ by night. Looking for people to grab ramen with.', interests: ['music', 'coding', 'ramen', 'gaming'] },
  { username: 'sofia_r', displayName: 'Sofia Rodriguez', age: 22, country: 'ES', bio: 'Dance team captain. If you can keep up with my energy, we will get along great.', interests: ['dance', 'fitness', 'cooking', 'netflix'] },
  { username: 'noah_w', displayName: 'Noah Williams', age: 19, country: 'GB', bio: 'Freshman trying to find my people. I like hiking, board games, and deep conversations at 2am.', interests: ['hiking', 'board games', 'philosophy', 'nature'] },
  { username: 'ava_patel', displayName: 'Ava Patel', age: 23, country: 'IN', bio: 'Med school survivor. My love language is sharing memes and bringing you snacks while you study.', interests: ['medicine', 'memes', 'yoga', 'dogs'] },
  { username: 'mason_k', displayName: 'Mason Kim', age: 20, country: 'KR', bio: 'Film student with strong opinions about cinematography. Let me recommend you a movie.', interests: ['film', 'cinema', 'photography', 'writing'] },
  { username: 'zoe_b', displayName: 'Zoe Brooks', age: 21, country: 'CA', bio: 'Environmental science major. I compost, I thrift, and I will judge your recycling habits (lovingly).', interests: ['environment', 'thrifting', 'plants', 'sustainability'] },
  { username: 'ethan_m', displayName: 'Ethan Murphy', age: 24, country: 'IE', bio: 'Grad student and amateur chef. I make a mean pasta carbonara and even better playlists.', interests: ['cooking', 'music', 'running', 'podcasts'] },
  { username: 'chloe_t', displayName: 'Chloe Taylor', age: 19, country: 'AU', bio: 'Theatre kid turned college student. If you quote Vine, we are already friends.', interests: ['theatre', 'singing', 'comedy', 'fashion'] },
  { username: 'jayden_o', displayName: 'Jayden Ortiz', age: 22, country: 'US', bio: 'Basketball player with a secret love for baking. Yes, I will make you cookies.', interests: ['basketball', 'baking', 'sneakers', 'anime'] },
  { username: 'lily_n', displayName: 'Lily Nguyen', age: 20, country: 'VN', bio: 'Graphic design major who spends too much time on Pinterest. Let me design your playlist cover.', interests: ['design', 'art', 'music', 'skateboarding'] },
  { username: 'caleb_d', displayName: 'Caleb Davis', age: 23, country: 'US', bio: 'Engineering student and rock climbing addict. Always looking for new climbing buddies.', interests: ['climbing', 'engineering', 'camping', 'coffee'] },
  { username: 'mia_foster', displayName: 'Mia Foster', age: 18, country: 'BE', bio: 'Freshman vibes. I play guitar badly and make friendship bracelets really well.', interests: ['guitar', 'crafts', 'concerts', 'reading'] },
];

export function seedDemoUsers(): { seeded: boolean; count: number } {
  const row = queryOne('SELECT COUNT(*) as count FROM users');
  const userCount = row?.count ?? 0;

  if (userCount > 0) {
    return { seeded: false, count: userCount };
  }

  console.log('[database] Seeding demo users...');
  const passwordHash = bcrypt.hashSync('demo1234', 10);

  for (const u of DEMO_USERS) {
    const id = crypto.randomUUID();
    const avatar = u.displayName.substring(0, 2).toUpperCase();
    const email = `${u.username}@demo.frnds.app`;
    run(
      `INSERT INTO users (id, email, password_hash, username, display_name, avatar, bio, age, interests, country, is_online) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, email, passwordHash, u.username, u.displayName, avatar, u.bio, u.age, JSON.stringify(u.interests), u.country || '']
    );
  }

  console.log(`[database] Seeded ${DEMO_USERS.length} demo users`);
  return { seeded: true, count: DEMO_USERS.length };
}

export function formatUser(row: any): any {
  if (!row) return null;
  const avatarRaw = row.avatar || '';
  const isPhotoAvatar = avatarRaw.startsWith('data:') || avatarRaw.startsWith('http');
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: isPhotoAvatar ? (row.display_name || '??').substring(0, 2).toUpperCase() : avatarRaw,
    photo: isPhotoAvatar ? avatarRaw : null,
    bio: row.bio || '',
    age: row.age,
    interests: typeof row.interests === 'string' ? JSON.parse(row.interests || '[]') : (row.interests || []),
    photos: typeof row.photos === 'string' ? JSON.parse(row.photos || '[]') : (row.photos || []),
    country: row.country || '',
    isPremium: !!row.is_premium,
    isOnline: !!row.is_online,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
}

export async function initDatabase(): Promise<void> {
  console.log('[database] Initializing sql.js (in-memory SQLite via WASM)...');
  const SQL = await initSqlJs();
  db = new SQL.Database();
  exec(SCHEMA);
  console.log('[database] Schema created');
}
