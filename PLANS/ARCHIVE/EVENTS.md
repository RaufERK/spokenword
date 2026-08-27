# Events: access to recordings

**Status:** shipped (archived 2026-08-27)

Each conference/class video belongs to an event. A regular user can list and play a file only if:

1. the file is public (`isPublic`);
2. they have ACTIVE `UserEventAccess` for that event;
3. access has not expired (`computeAccessUntil(paymentDate, event.startDate, accessDays)`).

Staff (`MODERATOR` / `ADMIN` / `SUPER`) sees everything, including hidden files.

User-level `accessUntil` is the max across payments (gates `/watch-conf`, `/watch-class`, live). List and stream still check the specific event.

Repeat grant on the same event updates the same row (`@@unique([userId, eventId])`).

Upload requires `eventId`. Admin can reassign a file’s event, see payment history, and revoke a single payment. Orphan files were bound to the nearest event by migration.
