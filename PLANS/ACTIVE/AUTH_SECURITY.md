# Auth security

**Updated:** 2026-08-27  
Source: spokenword security checkup 2026-08-19.

Passwords stay 6 digits (elderly users). Do not mix password hashing work with Auth.js 5 in one deploy. Do not touch Prisma 7 here.

## Shipped

- Password stripped from JWT/session; rate limits; FIGMA token handling
- Upload-service auth via next-auth cookie (nginx bypasses Next.js, so `x-user-*` headers are not set)
- bcrypt hashes in DB; login still accepts leftover plaintext and rewrites it to a hash
- Magic links: HMAC(`userId` + `exp` + `tokenVersion`), 1 year; password change bumps `tokenVersion`
- Registration JSON still returns the password once (only time the user sees it)
- `requireUser` / `requireStaff` / `requireAdmin` on API routes
- `/api/stream-status?key=` allows `/^[a-z0-9_-]+$/i` only
- JWT callback reloads only `role` and `accessUntil` from DB

## Remaining

**Auth.js 5 — separate deploy** after login / register / magic links have sat on production:

- Package `next-auth@5`, `auth()` instead of `getServerSession`
- Touch `lib/auth.ts`, `app/api/auth/[...nextauth]`, `proxy.ts`, and the thin wrapper `lib/require-auth.ts`
- Other routes already go through that helper

## Out of scope

Clerk / Auth0. Longer passwords. Cancelling 6-digit PINs. Prisma 7.
