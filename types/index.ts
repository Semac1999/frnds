export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  photo?: string | null;
  photos?: string[];
  bio: string;
  age: number;
  interests: string[];
  country?: string;
  isOnline: boolean;
  lastSeen: string;
  location?: string;
}

export interface MessageRequest {
  id: string;
  sender: User;
  content: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Match {
  id: string;
  user: User;
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'snap';
  read: boolean;
  createdAt: string;
}

export interface ChatPreview {
  matchId: string;
  user: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Story {
  id: string;
  content: string;
  type: 'text' | 'image';
  background: readonly [string, string];
  time: string;
}

export interface StoryGroup {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
  seen: boolean;
}

export interface SwipeProfile extends User {
  gradient: readonly [string, string];
}
