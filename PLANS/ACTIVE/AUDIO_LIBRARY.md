# Audio library and scheduled broadcast

**Status:** in production  
**Updated:** 2026-08-28  
**Owner:** this repository (`spoken-word`)  
**Neighbor:** `audo-word` — public player only. Do not edit it from here.

## Boundary

| Repo | Domain | Role |
|------|--------|------|
| **this** `spoken-word` | `spoken-word.ru` | DB, roles, admin, upload-service, ffmpeg watcher, public catalog JSON |
| **neighbor** `audo-word` | `audio.spoken-word.ru` | Static radio + `/library`. No DB, no uploads |

Staff: `https://spoken-word.ru/admin/audio-library` (nav label: Library).  
Listeners: `https://audio.spoken-word.ru/` (live) and `/library` (on-demand).

## Current system (do not rebuild)

- Prisma: `AudioCategory`, `AudioLecture` (`contentHash` unique SHA-256 of the **uploaded** bytes even after the fat file is deleted; `systemName` / `playableSystemName` / `size` all refer to the **kept** speech file), `AudioBroadcastSlot`, enum `AudioBroadcastStatus`
- Public catalog: `GET /api/audio-library`, CORS origin `https://audio.spoken-word.ru` only. `src` is `/media/library/{playableSystemName}`
- Admin: dropzone upload with progress, hide/show, delete, categories, per-row `<audio>` of the kept file, Moscow slot list
- Upload: nginx `POST /api/audio-library/upload` → `:3006/upload/audio-library`. Auth is the next-auth cookie. mp3/m4a/ogg/wav, ≤500MB. Duplicate uploaded bytes → 409. Inline ffmpeg speech encode (not BullMQ). After a smaller playable exists, the original is deleted. Encode failure → no row, originals/playable orphans removed
- Files: `/home/appuser/apps/spokenword/shared/public/audio-library/` — one kept file per `AudioLecture` row (`{stem}_64k.mp3` when encode shrinks). Catalog (`GET /api/audio-library`) lists only `isPublished: true`. A hidden row still has a file on disk. A `.mp3` with no matching `systemName` / `playableSystemName` is an orphan (not in the library UI); delete it, do not invent a catalog row. Re-upload via admin if the talk is needed again.
- Playable encode: `ffmpeg -y -i <original> -vn -ac 1 -ar 22050 -c:a libmp3lame -b:a 64k`. Skip / keep original if already mono ≤ ~80 kbps, or if 64k would not be smaller (never inflate)
- Watcher PM2 `spokenword-audio-broadcast`: poll 20s, `ffmpeg -re` on the **kept** file → Icecast `127.0.0.1:8000/main`. MP3 uses `-c:a copy` (no 128k stereo upsample). Live source on `/main` → slot `SKIPPED_LIVE`
- Password: `ICECAST_SOURCE_PASSWORD` or `ICECAST_SOURCE_PASSWORD_FILE` (prod: `/home/appuser/apps/spokenword/shared/icecast-source-password`). PM2 does not inherit extra unix groups, so `/etc/audio-word/icecast-source-password` is not readable by the watcher
- Helpers: `lib/audio-playable.ts` (`makeSpeechPlayable`, `dropOriginalAfterPlayable`), `scripts/backfill-audio-lecture-playable.ts` (encode if needed, then drop leftover originals; idempotent; runs on deploy after hash backfill)
- Staff stream: `GET /api/admin/audio-library/:id/file` (Range)

Public catalog contract (`audo-word/public/library.js` depends on this):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Title",
      "durationMinutes": 45,
      "src": "/media/library/20260826120000_abc123_64k.mp3"
    }
  ]
}
```

`src` is a path on the **audio** domain, not spoken-word.ru. It is the kept speech file. Only `isPublished: true` **and** `playableSystemName` set. Playback resume is browser `localStorage` only. Do not change catalog field names. Icecast reads the same kept file (`playableSystemName` or `systemName`). Fat originals are not stored after a successful encode.

Slot rules already in code: overlap 409, cancel only `SCHEDULED`, delete lecture 409 if `SCHEDULED`/`PLAYING`.
Slot create stores `announcement` (default: lecture title / filename without extension).

Public now-playing contract for `audo-word` (`GET /api/audio-library/broadcast`, CORS origin `https://audio.spoken-word.ru` only):

```json
{
  "success": true,
  "data": {
    "current": {
      "announcement": "Lecture title",
      "status": "PLAYING",
      "startsAt": "2026-08-27T17:00:00.000Z",
      "endsAt": "2026-08-27T18:15:00.000Z",
      "lectureId": 1
    },
    "next": null
  }
}
```

`current` is the `PLAYING` slot, or a `SCHEDULED` slot whose time window includes now. `next` is the soonest future `SCHEDULED` slot. Both may be `null`. Do not change `GET /api/audio-library`.

## Remaining in this repo

1. **Inline metadata edit** — PATCH already updates title / year / description. Admin cards still have no fields for that (hide/delete/categories only).

Do not change `GET /api/audio-library` field names. `src` is `/media/library/{playableSystemName}`. Do not edit `audo-word` from this repo.

## Known limits (not a build task unless asked)

- `npm run deploy` reloads the watcher and kills in-progress ffmpeg (`FAILED` / “ffmpeg process lost”).
- Icecast password copy under `shared/` can drift from `/etc/audio-word/icecast-source-password`.
- SHA-256 does not catch a re-encoded copy of the same talk. After the fat original is deleted, the hash still matches a **new upload of those original bytes**.
- No second Icecast mount / Liquidsoap fallback: if live RTMP holds `/main`, the slot skips.

## Out of scope

Playback speed on `/library`, sticky radio player, paid library, multi-file playlist in one slot, React on `audio.spoken-word.ru`, a second upload service.
