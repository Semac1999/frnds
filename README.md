# frnds — meet your people

A social discovery app combining the best of Tinder's swipe mechanics, Snapchat's stories and snaps, and Wizz's friend-finding. Built with Expo React Native + Express.

## Tech Stack

### Frontend
- **Expo** (React Native) with Expo Router
- **React Native Reanimated** — swipe card animations
- **React Native Gesture Handler** — pan gestures
- **Zustand** — state management
- **Socket.io Client** — real-time chat

### Backend
- **Express** — REST API
- **Socket.io** — WebSocket server for real-time chat
- **better-sqlite3** — embedded database
- **JWT** — authentication
- **bcryptjs** — password hashing

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the backend
```bash
npm run server
```
Server runs on `http://localhost:3001`

### 3. Start the Expo app
```bash
npm start
```
Scan the QR code with Expo Go on your phone, or press `w` for web.

## Project Structure
```
app/                  # Expo Router screens
  (auth)/             # Login, signup, onboarding
  (tabs)/             # Main app tabs
    chat/             # Chat list + conversations
    discover/         # Swipe cards + stories
    profile/          # Profile + settings
  stories/            # Story viewer (modal)
components/           # Reusable UI components
constants/            # Design tokens (colors, layout)
lib/                  # API client, stores, mock data
server/               # Express backend
  routes/             # API endpoints
  middleware/         # Auth middleware
  lib/                # Database setup
types/                # TypeScript interfaces
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users/discover` | Get swipe feed |
| POST | `/api/swipes` | Record swipe |
| GET | `/api/matches` | Get matches |
| GET | `/api/matches/:id/messages` | Get chat messages |
| POST | `/api/matches/:id/messages` | Send message |
| GET | `/api/stories` | Get stories |
| POST | `/api/stories` | Create story |
