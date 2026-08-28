# spokenword — CLAUDE

## Brief
Next.js application with Express.js microservice for large file uploads and BullMQ worker for background video compression via FFmpeg. All processes managed by PM2.

## Goals & Stack
- MVP-focused, minimal layers
- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind/shadcn/ui for UI
- Prisma + PostgreSQL, Redis (ioredis), BullMQ
- FFmpeg/FFprobe for video and audio
- Express.js microservice for file uploads

## Important Directories
- `app/` — Next.js pages and API routes
- `components/` — React UI components
- `lib/` — Prisma, Redis, auth, `audio-library.ts` (paths), `audio-playable.ts` (speech MP3), `audio-broadcast.ts` (slots / public now-playing)
- `upload-service/` — Express.js microservice for file uploads
  - `routes/` — conference.ts, class.ts, packages.ts, audio-library.ts, job-status.ts
  - `workers/` — compression-worker.ts (BullMQ), audio-broadcast-watcher.ts (Icecast)
  - `queue/` — videoQueue.ts (BullMQ queue)
  - `utils/` — video.ts (FFprobe), auth.ts (next-auth cookie)
- `scripts/` — database backup/restore; audio hash + playable MP3 backfill (also run on deploy)
- `prisma/` — schema, migrations, seed
- `PLANS/` — model-facing plans (English). Active = unfinished only

## Codebase Rules
- Functional components only, no classes or service layers
- Destructure props inline
- Logic without side-effects on import; workers run via explicit entrypoints
- Production-oriented: graceful shutdown, predictable startup commands
- Environment settings via `.env`/`.env.production`
- Default workflow for user-requested changes in this repository: complete the full flow `implement -> commit -> push -> deploy` unless the user explicitly says to stop earlier or keep the change local only.

## Repo Boundaries
- Work only inside this `spokenword` repository unless the user explicitly instructs otherwise.
- It is allowed to inspect and read `spoken-bot` and `audo-word` when needed for context.
- Do not modify, commit, push, deploy, or otherwise change `spoken-bot` or `audo-word` without an explicit user directive.
- If a task seems to involve the site and the bot or the radio player, treat `spokenword` as the only allowed scope until the user clearly expands it.

---

## 🏗️ ARCHITECTURE (Current)

### File Upload Flow

```
Client (Browser)
    ↓ POST /api/conf-archive/upload, /api/class/upload, /api/admin/packages/upload, or /api/audio-library/upload
Nginx (port 443)
    ↓ proxy to localhost:3006 (bypasses Next.js)
Express Upload Service (port 3006)
    ↓ auth via next-auth cookie; save file; FFprobe duration/codec
    ↓ video: BullMQ compression worker
    ↓ audio library: write original + SHA-256; inline speech MP3; delete original if a smaller playable exists; Prisma row points at the kept file
Final file saved to disk
    ↓
Database updated (Prisma)
```

### PM2 Processes

1. **spokenword** — `next start -p 3005`
   - Main Next.js application
   - UI, API routes, authentication
   
2. **spokenword-upload** — `upload-service/index.ts`
   - Express.js microservice (port 3006)
   - Handles large file uploads (up to 5GB)
   - Bypasses Next.js 10MB body limit
   - Routes:
     - `/health` — health check
     - `/upload/conference` — conference archive uploads
     - `/upload/class` — class recordings
     - `/upload/packages` — paid content uploads
     - `/upload/audio-library` — audio lectures (no BullMQ; SHA-256 on upload bytes; inline 64k; drop fat original)
     - `/test/upload` — test endpoint (no auth, non-production)
     - `/job-status/:jobId` — get BullMQ job status (for progress tracking)
   
3. **spokenword-compression-worker** — `upload-service/workers/compression-worker.ts`
   - BullMQ worker for video compression
   - Processes jobs from `video-compression` queue
   - Uses FFmpeg for compression
   - Smart codec detection:
     - H.264/HEVC → copy (already compressed)
     - Other codecs → re-encode to H.264
   - Saves to database after compression

4. **spokenword-audio-broadcast** — `upload-service/workers/audio-broadcast-watcher.ts`
   - Polls scheduled `AudioBroadcastSlot` every 20s
   - `ffmpeg -re` on the **kept** speech file (`playableSystemName` or `systemName`) → Icecast `127.0.0.1:8000/main`. MP3 is copied (`-c:a copy`), not upsampled to 128k stereo
   - If `/main` already has a source → slot `SKIPPED_LIVE`

### Nginx Configuration

Nginx proxies upload requests directly to upload service:

```nginx
# /etc/nginx/sites-available/spoken-word.ru

location /api/conf-archive/upload {
    proxy_pass http://127.0.0.1:3006/upload/conference;
    # Streaming, no buffering, 1h timeouts
}

location /api/admin/packages/upload {
    proxy_pass http://127.0.0.1:3006/upload/packages;
    # Streaming, no buffering, 1h timeouts
}

location /api/audio-library/upload {
    proxy_pass http://127.0.0.1:3006/upload/audio-library;
    # Streaming, no buffering, 1h timeouts
}

# All other requests → Next.js (port 3005)
location / {
    proxy_pass http://127.0.0.1:3005;
}
```

### Compression Logic

1. **Upload** — File saved to temp directory
2. **Codec Detection** — FFprobe checks video codec
3. **Decision:**
   - `h264` or `hevc` → Copy with optimizations (`-c:v copy`)
   - Other codecs → Re-encode to H.264 (`libx264`, CRF 28, 720p)
4. **Queue** — Job added to BullMQ `video-compression` queue
5. **Worker** — Processes job asynchronously
6. **Result** — Updates database with compressed size

### Upload Progress Tracking

**Real-time status updates for users:**

1. **Upload Progress (0-100%)**
   - Uses `XMLHttpRequest.upload.onprogress` for tracking
   - Visual progress bar on `/upload` page
   - Shows file size and current percentage

2. **Compression Status**
   - API endpoint: `/api/job-status/:jobId`
   - Polls BullMQ job status every 2 seconds
   - States: `waiting` → `active` → `completed` / `failed`
   - Shows compression progress (0-100%)

3. **Status Flow:**
   ```
   Uploading... (0-100%) → Processing... → Compressing... (0-100%) → Done!
   ```

4. **Parallel Uploads:**
   - ✅ Multiple files can be uploaded simultaneously
   - ✅ Upload service handles requests in parallel
   - ✅ Compression worker processes 1 job at a time (queue)
   - ✅ User can upload next file while previous is compressing

5. **Auto-refresh:**
   - Page automatically refreshes when upload completes
   - New items appear in the list without manual reload
   - Implemented via `useEffect` watching upload status

**Benefits:**
- ✅ Users see exact progress
- ✅ No confusion during long operations
- ✅ Better UX for large files
- ✅ Clear feedback on each stage
- ✅ Auto-refresh shows new items immediately

---

## 🗂️ Database Models

### ConferenceFile

Conference archive videos (uploaded via `/upload` page).

```prisma
model ConferenceFile {
  id           Int      @id @default(autoincrement())
  displayName  String   // User-provided title
  originalName String   // Original filename
  systemName   String   @unique // Unique filename on disk
  uploadedAt   DateTime @default(now())
  uploadedBy   Int      // User ID
  size         BigInt   // File size in bytes (BigInt for >2GB)
  views        Int      @default(0)
  duration     Int?     // Duration in seconds
  isPublic     Boolean  @default(false) // Visibility for regular users
}
```

### PackageItem

Paid content items (uploaded via `/admin/packages/[id]/items`).

```prisma
model PackageItem {
  id             Int            @id @default(autoincrement())
  packageId      Int
  title          String
  fileName       String         // Compressed filename
  originalName   String         // Original filename
  filePath       String
  duration       Int?           // Duration in seconds
  orderIndex     Int
  originalSize   BigInt         // Original file size (BigInt for >2GB)
  compressedSize BigInt         // Compressed file size (BigInt for >2GB)
  createdAt      DateTime       @default(now())
  package        ContentPackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
}
```

### ContentPackage

Paid content packages (collections of items).

```prisma
model ContentPackage {
  id          Int      @id @default(autoincrement())
  title       String   // "Meditation Course - 13 lectures"
  description String?
  price       Decimal
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  uploadedBy  Int      // Admin ID
  items       PackageItem[]
}
```

### AudioLecture

Audio warehouse for `audio.spoken-word.ru/library`. Default visible. Hide/delete is staff-only.

```prisma
model AudioLecture {
  id                 Int      @id @default(autoincrement())
  title              String
  year               Int?
  description        String?
  originalName       String
  fileName           String
  systemName         String   @unique // kept file on disk (usually `{stem}_64k.mp3`)
  playableSystemName String?  @unique // catalog `src`; same as systemName after encode
  contentHash        String?  @unique // SHA-256 of the uploaded bytes (may no longer be on disk)
  mimeType           String           // kept file
  size               BigInt           // kept file
  playableSize       BigInt?          // kept file
  durationSec        Int?
  isPublished        Boolean  @default(true)
  uploadedBy         Int
  uploadedAt         DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

Related: `AudioCategory`, `AudioBroadcastSlot` (`announcement` text for the radio page; statuses `SCHEDULED` | `PLAYING` | `DONE` | `SKIPPED_LIVE` | `FAILED`).

Public APIs for `audio.spoken-word.ru` (CORS origin that host only):

- `GET /api/audio-library` — catalog. Shape `{ success, data: [{ id, title, durationMinutes, src }] }`. `src` is `/media/library/{playableSystemName}` (the kept speech file). Field names frozen.
- `GET /api/audio-library/broadcast` — `{ current, next }` announcement objects (or `null`). Radio page only; Icecast status stays on the audio host.

---

## 📁 File Storage Paths

### Conference Archive

- **Temp files:** `public/conf-archive/temp/temp_*.mp4`
- **Final files:** `public/conf-archive/[systemName].mp4`
- **Served as:** `/conf-archive/[systemName]` or `/watch-conf/[systemName]`

### News Mirror Media

- **Production storage:** `/home/appuser/apps/spokenword/shared/public/news-media`
- **Local storage:** `public/news-media`
- **Served as:** `/news-media/[fileName]` via nginx static alias

### Paid Content Packages

- **Temp files:** `paid-content/packages/package_[id]/temp_*.mp4`
- **Final files:** `paid-content/packages/package_[id]/[timestamp]_[random]_compressed.mp4`
- **Served via:** API route with authentication

### Audio Library

- **Production:** `/home/appuser/apps/spokenword/shared/public/audio-library`
- **Local:** `public/audio-library`
- **Original upload:** written, hashed, encoded, then **deleted** if a smaller `{stem}_64k.mp3` was produced
- **Kept file:** `{stem}_64k.mp3` (or the original if it was already speech-sized). Icecast, catalog, and staff `GET /api/admin/audio-library/[id]/file` (Range) all use this
- **Public file URL (audio domain):** `/media/library/[playableSystemName]` via nginx alias
- **Encode (inline in upload, not video BullMQ):** `ffmpeg -vn -ac 1 -ar 22050 -c:a libmp3lame -b:a 64k`. Skip if already mono ≤ ~80 kbps or 64k would not be smaller. Encode failure → no published row; delete orphan playable. Do not delete the original unless the playable is on disk and smaller

---

## 🔐 Authentication & Authorization

### Upload Permissions

**Conference Archive (`/upload`) and Audio Library (`/admin/audio-library`):**
- Roles: `MODERATOR`, `ADMIN`, `SUPER`

**Paid Content (`/admin/packages/[id]/items`):**
- Roles: `ADMIN`, `SUPER`

### How It Works

Nginx proxies upload paths **directly** to port 3006. Next.js middleware never sees the body, so `x-user-id` / `x-user-role` are not set.

1. Browser `POST` with next-auth session cookie
2. Nginx → `spokenword-upload` `:3006`
3. Upload service `decode()`s `__Secure-next-auth.session-token` / `next-auth.session-token` (`NEXTAUTH_SECRET` from parent `.env`)
4. Role check in `upload-service/utils/auth.ts`

---

## 🧪 Testing

### Test Upload Endpoint

**No authentication required** (for automated testing):

```bash
curl -X POST http://localhost:3006/test/upload \
  -F "file=@/path/to/video.mp4" \
  -F "displayName=Test Video"
```

### Production Upload

**Via UI:**
- Conference: https://www.spoken-word.ru/upload
- Packages: https://www.spoken-word.ru/admin/packages/[id]/items
- Audio library: https://www.spoken-word.ru/admin/audio-library

**Via curl (with auth cookie):**

```bash
curl -X POST https://www.spoken-word.ru/api/conf-archive/upload \
  -H "Cookie: next-auth.session-token=..." \
  -F "file=@video.mp4" \
  -F "displayName=My Video"
```

---

## 🚀 Deployment

### Local Development

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Upload service
npm run dev:upload

# Terminal 3: Compression worker (optional)
cd upload-service
tsx workers/compression-worker.ts

# Terminal 4: Audio broadcast watcher (optional)
cd upload-service
tsx workers/audio-broadcast-watcher.ts
```

### Production Deployment

```bash
npm run deploy
```

This will:
1. Push to GitHub
2. SSH to server
3. Pull latest code
4. Install dependencies (`npm ci` + `cd upload-service && npm ci`)
5. Run Prisma migrations, audio hash backfill, then playable MP3 backfill (`scripts/backfill-audio-lecture-playable.ts`)
6. Build Next.js
7. Reload PM2 processes:
   - `spokenword` (Next.js)
   - `spokenword-upload` (Express)
   - `spokenword-compression-worker` (BullMQ worker)
   - `spokenword-audio-broadcast` (Icecast slot watcher)

Reloading `spokenword-audio-broadcast` kills in-progress scheduled ffmpeg.

### Manual PM2 Commands

```bash
ssh app
export PATH="$HOME/bin:$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"

# View processes
pm2 list

# View logs
pm2 logs spokenword
pm2 logs spokenword-upload
pm2 logs spokenword-compression-worker
pm2 logs spokenword-audio-broadcast

# Restart specific process
pm2 restart spokenword-upload

# Save PM2 state
pm2 save
```

---

## 📊 Monitoring & Logs

### Log Files

- **Next.js:**
  - `/home/appuser/logs/spokenword-out.log`
  - `/home/appuser/logs/spokenword-error.log`
  
- **Upload Service:**
  - `/home/appuser/logs/upload-service-out.log`
  - `/home/appuser/logs/upload-service-error.log`
  
- **Compression Worker:**
  - `/home/appuser/logs/compression-worker-out.log`
  - `/home/appuser/logs/compression-worker-error.log`

- **Audio broadcast watcher:**
  - `/home/appuser/logs/audio-broadcast-out.log`
  - `/home/appuser/logs/audio-broadcast-error.log`

### Health Checks

```bash
# Upload service health
curl http://localhost:3006/health
# Response: {"status":"ok","service":"upload-service","port":"3006"}

# Redis
ssh app "redis-cli ping"
# Response: PONG
```

---

## 🐛 Troubleshooting

### Upload fails with "Upload service unavailable"

**Cause:** Nginx cannot reach upload service.

**Fix:**
```bash
ssh app
pm2 list | grep upload
pm2 restart spokenword-upload
```

### Compression not working

**Cause:** Worker not running or Redis connection issue.

**Fix:**
```bash
pm2 logs spokenword-compression-worker
pm2 restart spokenword-compression-worker
redis-cli ping  # Should return PONG
```

### Files > 10MB fail to upload

**Cause:** Nginx `client_max_body_size` too small.

**Fix:**
```bash
sudo nano /etc/nginx/sites-available/spoken-word.ru
# Ensure: client_max_body_size 8G;
sudo nginx -t && sudo systemctl reload nginx
```

### FFmpeg not found

**Cause:** FFmpeg not installed on server.

**Fix:**
```bash
ssh sw
sudo apt update && sudo apt install -y ffmpeg
ffmpeg -version
```

---

## 📝 TODO / Future Improvements

- [x] Fix 10MB upload limit (Next.js issue)
- [x] Create Express microservice for uploads
- [x] Integrate Nginx proxy
- [x] Add video compression for conference archive
- [x] Add video compression for paid content
- [x] Add progress tracking for uploads (polling)
- [x] Add compression status UI (show job progress)
- [x] Remove deprecated workers/ and lib/videoQueue.ts
- [x] Clean up unused streaming code and scripts
- [x] Audio library upload, public catalog, scheduled Icecast `/main`
- [x] SHA-256 duplicate rejection for audio lectures
- [x] Speech playable MP3 (64k mono) for library and Icecast; fat original deleted after encode
- [x] Broadcast slot `announcement` + `GET /api/audio-library/broadcast` for the radio page
- [ ] Add retry mechanism for failed compressions
- [ ] Add automatic cleanup of temp files (cron job)
- [ ] Add video thumbnail generation
- [ ] Admin inline edit of lecture title / year / description

---

## 🛠️ Technical Decisions & History

### Why Express Microservice?

**Problem:** Next.js 15-16 has a hardcoded 10MB body limit for `req.formData()` in App Router that **cannot be bypassed**.

**Solution:** Separate Express.js microservice that:
- Runs on different port (3006)
- Handles raw multipart/form-data streams via `busboy`
- No body size limit (configured up to 5GB)
- Nginx proxies upload requests directly to it

**Benefits:**
- ✅ No Next.js limitations
- ✅ Streaming uploads (memory efficient)
- ✅ Separate concerns (upload vs. UI)
- ✅ Can scale independently

### Why BullMQ Worker?

**Problem:** Video compression is CPU-intensive and blocks event loop.

**Solution:** Separate worker process that:
- Runs independently from web server
- Processes jobs from Redis queue
- Can be scaled to multiple instances
- Automatic retries on failure
- Progress tracking

**Benefits:**
- ✅ Non-blocking uploads
- ✅ Better user experience (instant response)
- ✅ Resource isolation
- ✅ Failure recovery

### Why one kept speech file (delete the fat original)?

**Problem:** Library listeners already got 64k mono; Icecast re-encoded the 100MB original to 128k stereo anyway. Storing both wasted disk and did not improve on-air quality.

**Solution:** After a smaller playable exists, delete the original. `systemName` / `size` / catalog / Icecast all point at the kept file. Icecast uses `ffmpeg -re -c:a copy` for MP3 (do not upsample 64k to 128k stereo). `contentHash` still fingerprints the **uploaded** bytes so a re-upload of the same original still 409s. This is a one-way door: a better encode later needs a new upload.

### Why Nginx Proxy Instead of Next.js Middleware?

**Problem:** Next.js middleware runs in Edge Runtime which cannot `fetch('localhost:...')`.

**Solution:** Nginx handles proxying at infrastructure level.

**Benefits:**
- ✅ No Edge Runtime limitations
- ✅ Better performance (native proxy)
- ✅ Standard production pattern
- ✅ Easier debugging

---

## 📚 Key Dependencies

### Main Project

- `next@^16` — React framework (App Router)
- `react@^19` — UI library
- `@prisma/client@^6` — Database ORM
- `next-auth@^4` — Authentication
- `bullmq@^5` — Job queue (used in upload-service)
- `ioredis@^5` — Redis client
- `tailwindcss@^4` — CSS framework

### Upload Service

- `express@^4` — Web framework
- `busboy@^1` — Multipart/form-data parser
- `bullmq@^5` — Job queue client
- `tsx@^4` — TypeScript executor

### System Dependencies

- `ffmpeg` — Video compression; audio-library speech encode; Icecast `ffmpeg -re`
- `ffprobe` — Duration / codec (video) and audio probe (channels, bitrate)
- `redis-server` — Job queue backend
- `nginx` — Reverse proxy
- `node@>=24` — JavaScript runtime

## 📜 NPM Scripts

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run dev:upload   # Upload service dev
npm run build        # Production build
npm run deploy       # Deploy to production (PM2)
npm run dblist       # Open Prisma Studio
npm run logs         # Watch server logs
npm run logs:errors  # Watch error logs only
npm run db:backup    # Backup database
npm run db:restore   # Restore database
```

---

## 📞 Support & Maintenance

**Server:** Ubuntu 24.04, Moscow VPS `155.212.174.133` (`ssh app` / `ssh sw`)  
**Amsterdam (legacy EU):** `185.200.178.73` — `ssh amster` / `ssh amster_app`. Code deploys with `ecosystem.config.cjs` production, not `ecosystem.config.eu.cjs`.  
**Nginx config:** `/etc/nginx/sites-available/spoken-word.ru`  
**PM2 config:** `ecosystem.config.cjs`  
**Logs:** `/home/appuser/logs/`

**Production URL:** https://www.spoken-word.ru  
**Radio / on-demand library:** https://audio.spoken-word.ru/

---

_Last updated: 2026-08-28_
