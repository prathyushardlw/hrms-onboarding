# HRMS Onboarding — Frontend

Next.js frontend application. All API calls are proxied to the backend via `next.config.ts` rewrites.

## Setup

```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
npm run dev   # starts on http://localhost:3000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend server URL | `http://localhost:3001` |

## How API Calls Work

All `/api/*` requests made by the frontend are automatically proxied to the backend via Next.js rewrites:

```
Browser → Frontend (3000) /api/templates → Backend (3001) /api/templates
```

This means:
- No CORS issues in development
- Frontend code uses relative `/api/...` URLs (no changes needed)
- In production, set `NEXT_PUBLIC_API_URL` to your deployed backend URL

## Running Both Services

```bash
# Terminal 1 — Backend
cd backend && npm run dev   # http://localhost:3001

# Terminal 2 — Frontend  
cd frontend && npm run dev  # http://localhost:3000
```

## Pages

| Path | Description |
|------|-------------|
| `/login` | Login page |
| `/dashboard` | Main dashboard |
| `/dashboard/onboarding` | Onboarding list |
| `/dashboard/onboarding/:id` | Onboarding detail |
| `/dashboard/jobs` | Recruitment / jobs |
| `/dashboard/jobs/:id/candidates` | Candidates for a job |
| `/dashboard/employees` | Employee list |
| `/dashboard/templates` | Template list |
| `/dashboard/templates/:id/design` | Template field designer |
| `/dashboard/settings` | Document rules settings |
| `/dashboard/admin` | Admin panel (super_admin only) |
| `/onboard/:token` | Candidate onboarding portal |
