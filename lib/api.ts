import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken() {
  return authToken;
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Socket.io connection management
let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (socket?.connected) return socket;
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const api = {
  // Auth
  signup: (body: { email: string; password: string; username: string; displayName: string; age: number; interests: string[] }) =>
    request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Users
  discover: (limit = 20) => request(`/api/users/discover?limit=${limit}`),
  getUser: (id: string) => request(`/api/users/${id}`),
  updateProfile: (body: Record<string, any>) => request('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // Swipes & Matches
  swipe: (swipedId: string, direction: 'like' | 'pass') =>
    request('/api/swipes', { method: 'POST', body: JSON.stringify({ swipedId, direction }) }),
  getMatches: () => request('/api/matches'),

  // Chat
  getMessages: (matchId: string, limit = 50, before?: string) =>
    request(`/api/matches/${matchId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`),
  sendMessage: (matchId: string, content: string, type = 'text') =>
    request(`/api/matches/${matchId}/messages`, { method: 'POST', body: JSON.stringify({ content, type }) }),
  markRead: (matchId: string) =>
    request(`/api/matches/${matchId}/read`, { method: 'PATCH' }),

  // Stories
  getStories: () => request('/api/stories'),
  createStory: (body: { content: string; type: string; background: string }) =>
    request('/api/stories', { method: 'POST', body: JSON.stringify(body) }),
  viewStory: (id: string) => request(`/api/stories/${id}/view`, { method: 'POST' }),
};
