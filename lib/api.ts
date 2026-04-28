import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://frnds-o4wf.onrender.com';

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
  clearTimeout(timeout);
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
  signup: (body: { email: string; password: string; username: string; displayName: string; age: number; interests: string[]; country?: string; photo?: string }) =>
    request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  uploadPhoto: (base64: string) =>
    request('/api/users/me/photo', { method: 'POST', body: JSON.stringify({ photo: base64 }) }),
  login: (body: { email: string; password: string }) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Users
  discover: (opts: { limit?: number; scope?: 'world' | 'country'; country?: string } = {}) => {
    const params = new URLSearchParams();
    params.set('limit', String(opts.limit ?? 20));
    if (opts.scope) params.set('scope', opts.scope);
    if (opts.country) params.set('country', opts.country);
    return request(`/api/users/discover?${params.toString()}`);
  },
  getUser: (id: string) => request(`/api/users/${id}`),
  updateProfile: (body: Record<string, any>) => request('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  addPhoto: (base64: string) =>
    request('/api/users/me/photos', { method: 'POST', body: JSON.stringify({ photo: base64 }) }),
  deletePhoto: (index: number) =>
    request(`/api/users/me/photos/${index}`, { method: 'DELETE' }),

  // Message Requests (replaces swipe flow)
  sendRequest: (recipientId: string, content: string) =>
    request('/api/requests', { method: 'POST', body: JSON.stringify({ recipientId, content }) }),
  getRequests: () => request('/api/requests'),
  getSentRequests: () => request('/api/requests/sent'),
  acceptRequest: (id: string) => request(`/api/requests/${id}/accept`, { method: 'POST' }),
  declineRequest: (id: string) => request(`/api/requests/${id}/decline`, { method: 'POST' }),
  cancelRequest: (id: string) => request(`/api/requests/${id}`, { method: 'DELETE' }),

  // Matches
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

  // Reports & Blocks
  report: (reportedId: string, reason: string, details?: string) =>
    request('/api/users/report', { method: 'POST', body: JSON.stringify({ reportedId, reason, details }) }),
  block: (blockedId: string) =>
    request('/api/users/block', { method: 'POST', body: JSON.stringify({ blockedId }) }),
  unblock: (userId: string) =>
    request(`/api/users/block/${userId}`, { method: 'DELETE' }),
};
