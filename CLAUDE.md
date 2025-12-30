# spokenword — CLAUDE

## Brief
Next.js application with Express.js microservice for large file uploads and BullMQ worker for background video compression via FFmpeg. All processes managed by PM2.

## Goals & Stack
- MVP-focused, minimal layers
- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind/shadcn/ui for UI
- Prisma + SQLite, Redis (ioredis), BullMQ
- FFmpeg/FFprobe for video processing
- Express.js microservice for file uploads

## Important Directories
- `app/` — Next.js pages and API
- `components/` — UI components
- `lib/` — Prisma, Redis, video queue
- `upload-service/` — 🆕 Express.js microservice for file uploads
  - `routes/` — conference.ts (archive), packages.ts (paid content)
  - `workers/` — compression-worker.ts (BullMQ worker)
  - `queue/` — videoQueue.ts (BullMQ queue)
  - `utils/` — video.ts (FFprobe utilities)
- `workers/` — 🗄️ OLD video-worker (deprecated, kept as reference)
- `scripts/` — deployment/support scripts
- `prisma/` — schema, migrations, data

## Codebase Rules
- Functional components only, no classes or service layers
- Destructure props inline
- Logic without side-effects on import; workers run via explicit entrypoints
- Production-oriented: graceful shutdown, predictable startup commands
- Environment settings via `.env`/`.env.production`

---

## 🏗️ ARCHITECTURE (Current)

### File Upload Flow

```
Client (Browser)
    ↓ POST /api/conf-archive/upload or /api/admin/packages/upload
Nginx (port 443)
    ↓ proxy to localhost:3006
Express Upload Service (port 3006)
    ↓ saves temp file, checks codec via FFprobe
BullMQ Queue (Redis)
    ↓ job added
Compression Worker (separate PM2 process)
    ↓ FFmpeg compression (or copy if H.264/HEVC)
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
     - `/upload/packages` — paid content uploads
     - `/test/upload` — test endpoint (no auth)
     - `/job-status/:jobId` — get BullMQ job status (for progress tracking)
   
3. **spokenword-compression-worker** — `upload-service/workers/compression-worker.ts`
   - BullMQ worker for video compression
   - Processes jobs from `video-compression` queue
   - Uses FFmpeg for compression
   - Smart codec detection:
     - H.264/HEVC → copy (already compressed)
     - Other codecs → re-encode to H.264
   - Saves to database after compression

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

**Benefits:**
- ✅ Users see exact progress
- ✅ No confusion during long operations
- ✅ Better UX for large files
- ✅ Clear feedback on each stage

---

## 🗂️ Database Models

### ConferenceFile

Conference archive videos (uploaded via `/upload` page).

```prisma
model ConferenceFile {
  id           Int      @id @default(autoincrement())
  displayName  String   // User-provided title
  originalName String   // Original filename
  systemName   String   // Unique filename on disk
  uploadedBy   Int      // User ID
  size         Int      // File size in bytes
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [uploadedBy], references: [id])
}
```

### PackageItem

Paid content items (uploaded via `/admin/packages/[id]/items`).

```prisma
model PackageItem {
  id             Int      @id @default(autoincrement())
  packageId      Int
  title          String
  fileName       String   // Compressed filename
  originalName   String   // Original filename
  filePath       String
  duration       Int      // Video duration in seconds
  orderIndex     Int
  originalSize   Int      // Original file size
  compressedSize Int      // Compressed file size
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  package        Package  @relation(fields: [packageId], references: [id], onDelete: Cascade)
}
```

---

## 📁 File Storage Paths

### Conference Archive

- **Temp files:** `public/conf-archive/temp/temp_*.mp4`
- **Final files:** `public/conf-archive/[systemName].mp4`
- **Served as:** `/conf-archive/[systemName]` or `/watch-conf/[systemName]`

### Paid Content Packages

- **Temp files:** `paid-content/packages/package_[id]/temp_*.mp4`
- **Final files:** `paid-content/packages/package_[id]/[timestamp]_[random]_compressed.mp4`
- **Served via:** API route with authentication

---

## 🔐 Authentication & Authorization

### Upload Permissions

**Conference Archive (`/upload`):**
- Roles: `MODERATOR`, `ADMIN`, `SUPER`
- Checked in Next.js middleware → passed to Nginx → forwarded to upload service

**Paid Content (`/admin/packages/[id]/items`):**
- Roles: `ADMIN`, `SUPER`
- Checked in Next.js middleware → passed to Nginx → forwarded to upload service

### How It Works

1. User sends request to `/api/conf-archive/upload`
2. Next.js middleware checks JWT token
3. Middleware adds headers: `x-user-id`, `x-user-role`
4. Nginx proxies request to upload service (port 3006)
5. Upload service reads headers for authorization

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
npm run upload-service:dev

# Terminal 3: Compression worker (optional)
cd upload-service
tsx workers/compression-worker.ts
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
5. Run Prisma migrations
6. Build Next.js
7. Reload PM2 processes:
   - `spokenword` (Next.js)
   - `spokenword-upload` (Express)
   - `spokenword-compression-worker` (BullMQ worker)

### Manual PM2 Commands

```bash
ssh amster_app
source ~/.nvm/nvm.sh && nvm use --lts

# View processes
pm2 list

# View logs
pm2 logs spokenword
pm2 logs spokenword-upload
pm2 logs spokenword-compression-worker

# Restart specific process
pm2 restart spokenword-upload

# Stop old worker (if needed)
pm2 delete spokenword-video-worker

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

### Health Checks

```bash
# Upload service health
curl http://localhost:3006/health
# Response: {"status":"ok","service":"upload-service","port":"3006"}

# Redis connection (via upload service)
ssh amster_app "redis-cli ping"
# Response: PONG
```

---

## 🐛 Troubleshooting

### Upload fails with "Upload service unavailable"

**Cause:** Nginx cannot reach upload service.

**Fix:**
```bash
ssh amster_app
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
ssh amster
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
- [x] Remove old video-worker from PM2
- [ ] Add progress tracking for uploads (WebSocket or polling)
- [ ] Add compression status UI (show job progress)
- [ ] Add retry mechanism for failed compressions
- [ ] Add automatic cleanup of temp files (cron job)
- [ ] Add video thumbnail generation
- [ ] Add HLS streaming for large videos

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

- `next@16.0.10` — React framework
- `@prisma/client` — Database ORM
- `next-auth` — Authentication
- `bullmq` — Job queue (unused in main app, only in upload-service)

### Upload Service

- `express@^4.18.2` — Web framework
- `busboy@^1.6.0` — Multipart/form-data parser
- `bullmq@^5.0.0` — Job queue client
- `redis@^4.6.0` — Redis client
- `tsx@^4.20.6` — TypeScript executor

### System Dependencies

- `ffmpeg` — Video compression
- `ffprobe` — Video metadata extraction
- `redis-server` — Job queue backend
- `nginx` — Reverse proxy

---

## 📞 Support & Maintenance

**Server:** Ubuntu 22.04, 8 CPU, 10GB RAM, 120GB NVMe  
**Location:** Qupra DC2 (Amsterdam)  
**SSH:** `ssh amster_app`  
**Nginx config:** `/etc/nginx/sites-available/spoken-word.ru`  
**PM2 config:** `ecosystem.config.cjs`  
**Logs:** `/home/appuser/logs/`

**Production URL:** https://www.spoken-word.ru

---

_Last updated: 2025-12-29_
