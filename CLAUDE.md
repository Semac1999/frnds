# frnds — repo notes for Claude

## User preferences

- **Always commit and push when changes are complete.** Don't ask first — just commit with a descriptive message, then `git push origin main`. The user has confirmed they want this default behavior.

## Project basics

- Expo SDK 54 React Native app + Express backend
- Backend deployed on Render: https://frnds-o4wf.onrender.com (free tier — in-memory SQLite resets on sleep/redeploy)
- User tests on iPhone via Expo Go (bundle ID `host.exp.Exponent` for OAuth clients)

## Conventions

- snake_case API responses → camelCase frontend via `normalizeUser()` in `lib/store.ts`
- Photo gallery items can be raw images OR `frnds:photo:v1:` JSON-encoded edited photos with sticker overlays
- Country codes are ISO 3166-1 alpha-2 (`constants/countries.ts`)
- DM request flow replaces classic swipe: send message → recipient accepts/declines via Requests sub-tab in Chat

## OAuth

- Google client IDs live in `.env` (gitignored). Server-side `GOOGLE_CLIENT_ID` on Render is comma-separated trusted audiences (web + ios + android).
- For Expo Go testing, iOS OAuth client must use bundle ID `host.exp.Exponent` (case-sensitive).
