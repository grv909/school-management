# RCA: Teacher dashboard API calls return 403 after switching accounts without a page refresh

## Summary

When a teacher logs out and a different teacher logs in within the same browser
session (no full page reload), API calls made from the dashboard (and other
teacher pages) could fail with `403 Forbidden`, even though the access token in
the request was valid and correctly identified the new teacher. Refreshing the
browser after login always fixed the problem.

**Example observed in backend logs:**

```
GET /api/classes -> authenticated as user=teacher_meera role=TEACHER schoolId=1   status=200
GET /api/attendance/trend?sectionId=2&days=14 -> authenticated as user=teacher_meera ...  status=403
```

`sectionId=2` belongs to the *previous* logged-in teacher (`teacher_rajesh`), not
to `teacher_meera` — the frontend was requesting data scoped to the wrong
teacher.

## Impact

- Any teacher who logs in on a browser/tab where a *different* teacher was
  previously logged in (without a full page reload in between) could see
  dashboard widgets fail to load, with `403` errors on section-scoped
  endpoints (`/api/attendance/trend`, and potentially other section/class/
  subject-scoped calls driven by the same cache).
- Not visible to a teacher's first login of a session, or after a hard
  refresh — which made this easy to miss in normal manual testing and
  initially look like a backend authorization bug.

## Root cause

`TeacherScopeService` (`src/app/core/auth/teacher-scope.service.ts`) resolves
which classes/sections/subjects the *currently logged-in* teacher may access,
based on their `TeacherAssignment` rows, and is used by teacher-facing pages
(dashboard, students, marks entry, attendance) instead of calling the raw
class/section/subject APIs directly.

It is registered as `providedIn: 'root'`, so **one instance lives for the
entire SPA session** — it is not recreated when the user navigates from
`/teacher/dashboard` to `/login` and logs in again; only a full browser reload
recreates it.

To avoid refetching `/api/teacher-assignments` on every page navigation, the
service caches its results as instance fields:

```ts
private loadRequest: Observable<TeacherAssignment[]> | null = null;
private readonly sectionsByClassCache = new Map<number, Observable<Section[]>>();

load(): Observable<TeacherAssignment[]> {
  if (!this.loadRequest) {
    const username = this.auth.session()?.username ?? '';
    this.loadRequest = this.assignmentApi.listForTeacherUsername(username).pipe(
      tap(rows => this._assignments.set(rows)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }
  return this.loadRequest;
}
```

This cache was **never invalidated on login or logout**. Sequence of events:

1. `teacher_rajesh` logs in. Some page calls `scope.load()`. `loadRequest` is
   `null`, so it fetches Rajesh's assignments (e.g. `sectionId=2`), caches the
   completed observable, and populates `_assignments`.
2. `teacher_rajesh` logs out. `AuthService.logout()` clears the auth session
   signal and `localStorage`, but does not touch `TeacherScopeService`.
3. `teacher_meera` logs in (same SPA instance — no page reload). The
   dashboard calls `scope.load()` again. Since `this.loadRequest` is still
   set from step 1, the cached, already-resolved observable is returned
   immediately via `shareReplay` — **Rajesh's assignments, not Meera's**.
4. The dashboard reads `sectionId=2` out of the (stale) assignments and calls
   `GET /api/attendance/trend?sectionId=2`, authenticated as `teacher_meera`.
   The backend correctly rejects this: section 2 is not one of Meera's
   assigned sections, hence `403`.
5. A full browser refresh recreates the Angular application (and therefore a
   fresh `TeacherScopeService` instance with `loadRequest = null`), so the
   very next `load()` correctly fetches Meera's real assignments — matching
   what was observed ("refresh fixes it").

The `403` was not a backend bug: the backend was correctly enforcing that
Meera cannot access Rajesh's section. The frontend was sending a request for
the wrong section because of the stale, unscoped cache.

### Contributing factor

`AuthService.login()` / `AuthService.logout()` had no concept of clearing
other services' per-user caches — there was no established pattern for
"reset state that must not outlive a session" in this codebase, so this
cache was simply never wired into the login/logout lifecycle.

## Fix

1. Added `TeacherScopeService.reset()` to clear all per-teacher cached state:
   `loadRequest`, `_assignments`, and `sectionsByClassCache`.
2. Called `reset()` from `AuthService.login()` (before the new session is
   written) and `AuthService.logout()`, so every login starts with a clean
   scope cache regardless of who was previously logged in.
3. `TeacherScopeService` is resolved lazily via `Injector.get()` inside
   `AuthService` rather than constructor-injected, because
   `TeacherScopeService` itself injects `AuthService` — a direct constructor
   injection the other way would create a circular dependency.

```ts
// teacher-scope.service.ts
reset(): void {
  this.loadRequest = null;
  this._assignments.set([]);
  this.sectionsByClassCache.clear();
}
```

```ts
// auth.service.ts
login(username, password) {
  ...
  this.injector.get(TeacherScopeService).reset();
  ...
}

logout(): void {
  ...
  this.injector.get(TeacherScopeService).reset();
  ...
}
```

## Verification

- `tsc --noEmit` and `ng build` pass cleanly with the fix.
- Manual repro: log in as `teacher_rajesh`, visit dashboard (data loads for
  Rajesh's sections), log out, log in as `teacher_meera` without a page
  reload — dashboard now correctly fetches and displays Meera's own
  sections/assignments with no `403`s.

## Follow-ups / prevention

- Audit other `providedIn: 'root'` services for per-user in-memory caches
  that aren't cleared on login/logout (grepped for `shareReplay` across
  `core`/`features` — `TeacherScopeService` was the only offender at the time
  of this fix, but this class of bug can recur if a new cached service is
  added without going through a shared "session reset" hook).
- Consider introducing a single `AuthService` hook (e.g. an `Subject`/event)
  that per-session-scoped services can subscribe to, so future caches don't
  need `AuthService` to know about them individually.
