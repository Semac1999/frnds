import { Gradients } from '../constants/colors';
import type { SwipeProfile, ChatPreview, StoryGroup, Message } from '../types';

const NAMES = ['Alex', 'Jordan', 'Riley', 'Taylor', 'Morgan', 'Casey', 'Avery', 'Quinn', 'Skyler', 'Dakota', 'Phoenix', 'Sage', 'Reese', 'Jamie', 'Charlie', 'Sam', 'Blake', 'Drew', 'Finley', 'River'];
const BIOS = [
  'living my best life', 'music is my therapy', 'adventure seeker', 'just vibing',
  'photography nerd', 'send me memes', 'coffee addict', 'gym + gaming = life',
  'artist at heart', 'night owl', 'dog parent', 'travel junkie',
  'foodie', 'thrill seeker', 'sunset chaser', 'creative soul',
];
const INTERESTS = ['music', 'gaming', 'sports', 'art', 'travel', 'food', 'movies', 'fitness', 'tech', 'fashion', 'photography', 'animals'];
const AVATARS = ['AX', 'JD', 'RI', 'TY', 'MG', 'CS', 'AV', 'QN', 'SK', 'DK', 'PX', 'SG', 'RE', 'JM', 'CH', 'SM', 'BK', 'DW', 'FN', 'RV'];
const GRADIENTS = [Gradients.card1, Gradients.card2, Gradients.card3, Gradients.card4, Gradients.card5];
const MESSAGES = [
  'hey! how are you?', 'what are you up to?', "that's so cool!",
  'haha no way', 'we should totally hang out', 'have you seen that new movie?',
  'send me a snap!', 'nice vibes', "you're funny",
  'where are you from?', 'what music do you listen to?', "let's play together sometime",
];

const STORY_CONTENTS: { content: string; type: 'text'; background: readonly [string, string] }[] = [
  { type: 'text', content: 'Having the best day ever!', background: Gradients.story1 },
  { type: 'text', content: 'Who wants to hang out?', background: Gradients.story2 },
  { type: 'text', content: 'New song on repeat', background: Gradients.story3 },
  { type: 'text', content: 'POV: you found your people', background: Gradients.story4 },
  { type: 'text', content: 'Late night thoughts...', background: Gradients.story5 },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateProfiles(count = 20): SwipeProfile[] {
  return NAMES.slice(0, count).map((name, i) => ({
    id: `user-${i}`,
    username: name.toLowerCase(),
    displayName: name,
    avatar: AVATARS[i] || name.substring(0, 2).toUpperCase(),
    bio: pick(BIOS),
    age: 18 + Math.floor(Math.random() * 8),
    interests: shuffle(INTERESTS).slice(0, 2 + Math.floor(Math.random() * 3)),
    isOnline: Math.random() > 0.4,
    lastSeen: new Date().toISOString(),
    gradient: GRADIENTS[i % GRADIENTS.length],
  }));
}

export function generateChats(profiles: SwipeProfile[]): ChatPreview[] {
  const count = 3 + Math.floor(Math.random() * 4);
  return profiles.slice(-count).map((user) => ({
    matchId: `match-${user.id}`,
    user,
    lastMessage: pick(MESSAGES),
    lastMessageTime: `${1 + Math.floor(Math.random() * 12)}h`,
    unreadCount: Math.random() > 0.5 ? 1 + Math.floor(Math.random() * 3) : 0,
  }));
}

export function generateMessages(count = 6): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    matchId: '',
    senderId: Math.random() > 0.5 ? 'me' : 'them',
    content: pick(MESSAGES),
    type: 'text' as const,
    read: true,
    createdAt: new Date(Date.now() - (count - i) * 60000 * 5).toISOString(),
  }));
}

export function generateStories(profiles: SwipeProfile[]): StoryGroup[] {
  return profiles.slice(0, 5).map((p) => ({
    userId: p.id,
    userName: p.displayName,
    userAvatar: p.avatar,
    stories: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, (_, i) => ({
      id: `story-${p.id}-${i}`,
      ...pick(STORY_CONTENTS),
      time: `${1 + Math.floor(Math.random() * 12)}h ago`,
    })),
    seen: false,
  }));
}

export function getRandomReply(): string {
  return pick(MESSAGES);
}
