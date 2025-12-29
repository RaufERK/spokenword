# spokenword — CLAUDE

## Brief
Next.js application with BullMQ queues for background video compression via FFmpeg. App and worker run as separate processes managed by PM2.

## Goals & Stack
- MVP-focused, minimal layers
- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind/shadcn/ui for UI
- Prisma + SQLite, Redis (ioredis), BullMQ
- FFmpeg/FFprobe for video processing

## Important Directories
- `app/` — Next.js pages and API
- `components/` — UI components
- `lib/` — Prisma, Redis, video queue
- `workers/` — background workers (`video-worker.ts` — entrypoint)
- `upload-service/` — 🆕 **NEW**: Express.js microservice for file uploads
- `scripts/` — deployment/support scripts
- `prisma/` — schema, migrations, data

## Codebase Rules
- Functional components only, no classes or service layers
- Destructure props inline
- Logic without side-effects on import; workers run via explicit entrypoints
- Production-oriented: graceful shutdown, predictable startup commands
- Environment settings via `.env`/`.env.production`

## Launch Architecture
- Web: `spokenword` — `next start -p 3005` (PM2)
- Worker: `spokenword-video-worker` — `workers/video-worker.ts` (BullMQ queue `video-compression`, FFmpeg)
- Upload Service: `spokenword-upload` — 🆕 `upload-service/index.ts` (Express.js on port 3006)
- All processes described in `ecosystem.config.cjs`; can run locally (`npm run dev`, `npm run worker`) and under PM2 (`pm2 startOrReload ecosystem.config.cjs`)

## Naming/Conventions
- Compression queue: `video-compression`
- Temp files cleaned inside job handler
- Worker and app logs separated in PM2 (`spokenword` / `spokenword-video-worker` / `spokenword-upload`)

---

## 🆕 UPLOAD SERVICE MICROSERVICE

### Problem
Next.js 15-16 has a **hardcoded 10MB body limit** that **cannot be bypassed** in App Router or Pages Router. This broke file uploads after Next.js/React upgrade.

### Solution: Express.js Microservice
Create a separate lightweight Express.js service to handle large file uploads (up to 5GB+).

### Architecture
```
Client (Browser)
    ↓
Next.js (port 3005) - middleware proxy
    ↓
Express Upload Service (port 3006, internal only)
    ↓
Saves to disk + Prisma DB
```

### Implementation Plan

#### Phase 1: Basic File Upload (Current)
**Goal:** Successfully upload files of any size to conference archive

**Scope:**
- `/upload/conference` endpoint
- Streams files to `public/conf-archive/`
- Saves metadata to `ConferenceFile` table in DB
- No compression yet
- Test endpoint for automated testing via curl

**Technical:**
- TypeScript
- Express.js + busboy (multipart parsing)
- Shared Prisma client
- Streaming upload (memory efficient)
- Auth via JWT token from Next.js

**Files to create:**
- `upload-service/index.ts` - main Express server
- `upload-service/routes/conference.ts` - conference upload route
- `upload-service/routes/test.ts` - test endpoint for automated uploads
- `upload-service/package.json` - dependencies
- `upload-service/tsconfig.json` - TypeScript config
- Update `ecosystem.config.cjs` - add upload service process
- Update `middleware.ts` - proxy `/api/conf-archive/upload` → `localhost:3006`

#### Phase 2: Paid Content Upload
**Goal:** Add paid content upload endpoint

**Scope:**
- `/upload/packages` endpoint
- Streams files to `paid-content/packages/package_*/`
- Saves metadata to `PackageItem` table
- Still no compression

#### Phase 3: Video Compression
**Goal:** Add FFmpeg compression (optional, based on codec)

**Scope:**
- Check video codec (H.264 already compressed → skip)
- Queue compression job to BullMQ if needed
- Keep existing `video-worker.ts` or integrate into upload service

#### Phase 4: Cleanup & Migration
**Goal:** Remove legacy code once everything works

**Scope:**
- Remove Pages Router upload endpoints (degraded routing)
- Restore App Router fully (remove legacy workarounds)
- Clean up old upload code
- Update documentation

### Current Status
- ❌ Next.js has 10MB limit (unfixable in Next.js 15-16)
- ⏳ Creating Express microservice
- 📝 Planning documented in CLAUDE.md

### Testing Strategy
1. Test endpoint: `POST /test/upload` (no auth, for curl testing)
2. Use sample files:
   - Small: `lecture_05_original.mp4` (8MB) - should work
   - Large: `lecture_04_original.mp4` (16MB) - currently fails, should work after fix
3. Monitor logs: `/home/appuser/logs/upload-service-*.log`
4. Verify files appear in:
   - Disk: `public/conf-archive/`
   - UI: https://www.spoken-word.ru/conf-arch

### Success Criteria
- ✅ Upload files up to 5GB
- ✅ No "Request body exceeded 10MB" errors
- ✅ Streaming (low memory usage)
- ✅ Same auth/permissions as before
- ✅ Files appear in UI immediately

### Future Considerations
- This microservice may eventually replace `video-worker.ts`
- Compression logic will be added later
- Keep services separated for now (single responsibility)

---

## Notes
- Production server: Ubuntu 22.04, 8 CPU, 10GB RAM, 120GB NVMe
- Nginx handles SSL and proxies to Next.js (port 3005)
- PM2 manages all processes with auto-restart
- Deploy via: `npm run deploy` (PM2 deploy + build)
