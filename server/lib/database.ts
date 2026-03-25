import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';

// Use DB_PATH env var, fallback to /tmp/frnds.db for cloud or ./frnds.db for local
function resolveDbPath(): string {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }
  if (process.env.NODE_ENV === 'production') {
    return '/tmp/frnds.db';
  }
  return path.join(__dirname, '..', '..', 'frnds.db');
}

const DB_PATH = resolveDbPath();
console.log(`[database] Using SQLite at: ${DB_PATH}`);

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    age INTEGER NOT NULL CHECK (age >= 13),
    interests TEXT DEFAULT '[]',
    is_online INTEGER DEFAULT 0,
    last_seen TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

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
`);

// ===== DEMO SEED DATA =====
const DEMO_USERS = [
  { username: 'emma_j', displayName: 'Emma Johnson', age: 21, bio: 'Art student who loves coffee shops and spontaneous road trips. Always down for a museum day.', interests: ['art', 'coffee', 'travel', 'photography'] },
  { username: 'liam_chen', displayName: 'Liam Chen', age: 20, bio: 'CS major by day, bedroom DJ by night. Looking for people to grab ramen with.', interests: ['music', 'coding', 'ramen', 'gaming'] },
  { username: 'sofia_r', displayName: 'Sofia Rodriguez', age: 22, bio: 'Dance team captain. If you can keep up with my energy, we will get along great.', interests: ['dance', 'fitness', 'cooking', 'netflix'] },
  { username: 'noah_w', displayName: 'Noah Williams', age: 19, bio: 'Freshman trying to find my people. I like hiking, board games, and deep conversations at 2am.', interests: ['hiking', 'board games', 'philosophy', 'nature'] },
  { username: 'ava_patel', displayName: 'Ava Patel', age: 23, bio: 'Med school survivor. My love language is sharing memes and bringing you snacks while you study.', interests: ['medicine', 'memes', 'yoga', 'dogs'] },
  { username: 'mason_k', displayName: 'Mason Kim', age: 20, bio: 'Film student with strong opinions about cinematography. Let me recommend you a movie.', interests: ['film', 'cinema', 'photography', 'writing'] },
  { username: 'zoe_b', displayName: 'Zoe Brooks', age: 21, bio: 'Environmental science major. I compost, I thrift, and I will judge your recycling habits (lovingly).', interests: ['environment', 'thrifting', 'plants', 'sustainability'] },
  { username: 'ethan_m', displayName: 'Ethan Murphy', age: 24, bio: 'Grad student and amateur chef. I make a mean pasta carbonara and even better playlists.', interests: ['cooking', 'music', 'running', 'podcasts'] },
  { username: 'chloe_t', displayName: 'Chloe Taylor', age: 19, bio: 'Theatre kid turned college student. If you quote Vine, we are already friends.', interests: ['theatre', 'singing', 'comedy', 'fashion'] },
  { username: 'jayden_o', displayName: 'Jayden Ortiz', age: 22, bio: 'Basketball player with a secret love for baking. Yes, I will make you cookies.', interests: ['basketball', 'baking', 'sneakers', 'anime'] },
  { username: 'lily_n', displayName: 'Lily Nguyen', age: 20, bio: 'Graphic design major who spends too much time on Pinterest. Let me design your playlist cover.', interests: ['design', 'art', 'music', 'skateboarding'] },
  { username: 'caleb_d', displayName: 'Caleb Davis', age: 23, bio: 'Engineering student and rock climbing addict. Always looking for new climbing buddies.', interests: ['climbing', 'engineering', 'camping', 'coffee'] },
  { username: 'mia_foster', displayName: 'Mia Foster', age: 18, bio: 'Freshman vibes. I play guitar badly and make friendship bracelets really well.', interests: ['guitar', 'crafts', 'concerts', 'reading'] },
];

export function seedDemoUsers(): { seeded: boolean; count: number } {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (userCount.count > 0) {
    return { seeded: false, count: userCount.count };
  }

  console.log('[database] Seeding demo users...');
  const passwordHash = bcrypt.hashSync('demo1234', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, username, display_name, avatar, bio, age, interests, is_online)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const insertMany = db.transaction((users: typeof DEMO_USERS) => {
    for (const u of users) {
      const id = crypto.randomUUID();
      const avatar = u.displayName.substring(0, 2).toUpperCase();
      const email = `${u.username}@demo.frnds.app`;
      insertUser.run(id, email, passwordHash, u.username, u.displayName, avatar, u.bio, u.age, JSON.stringify(u.interests));
    }
  });

  insertMany(DEMO_USERS);
  console.log(`[database] Seeded ${DEMO_USERS.length} demo users`);
  return { seeded: true, count: DEMO_USERS.length };
}

export default db;
