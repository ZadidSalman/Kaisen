# Deep Performance Fix Report

## Scope and constraints

- Audited all `app` routes and `app/api` handlers for route-switch and data-load latency.
- Inventory size: **24 pages** and **62 API route files**.
- Hard constraint preserved: search in `app/api/search/route.ts` remains **regex-based**.

## Executive diagnosis

The current slowness is mostly a compound effect of:

1. dynamic server rendering on critical routes,
2. client-side API fan-out after mount,
3. expensive query shapes in hot endpoints (`$regex`, `$sample`, broad `$or`, heavy joins),
4. in-request third-party AniList sync in user flows,
5. realtime quiz write amplification (`heartbeat`, round transitions, event fan-out).

## Route inventory and deep fixes (all pages)

### Home and discovery

- `/` (`app/page.tsx`) - **High**
  - Bottlenecks: multi-query fan-out (`seasonal`, `popular`, `banner-covers`, `friends-activity`), random-cover backend cost.
  - Deep fixes:
    - Build one **home aggregator endpoint** (or server-composed payload) to reduce client fan-out from 4 calls to 1.
    - Cache homepage modules separately (short TTL for social/live blocks, longer for seasonal/popular).
    - Shift random banner generation to a precomputed rotating pool (cron/materialized set), no per-request `$sample`.

- `/search` (`app/search/page.tsx`) - **High**
  - Bottlenecks: aggressive request cadence during typing + regex-heavy backend.
  - Deep fixes:
    - Increase debounce and add request cancellation on keystroke.
    - Add staged search execution (fast prefix regex phase, then broader regex fallback) while preserving regex semantics.
    - Add query-length gates and per-user rate shaping to prevent regex storm.

- `/theme/[slug]` (`app/theme/[slug]/page.tsx`) - **High**
  - Bottlenecks: dynamic page render + multiple post-mount calls (`rate`, `history/check`, `similar`, optional playlist).
  - Deep fixes:
    - Pre-compose initial payload server-side for theme details + rating + watched state.
    - Cache `similar` results by `(slug, topN)` with invalidation on theme metadata changes.
    - Split media-heavy widgets behind progressive boundaries (above-the-fold first, secondary panels deferred).

- `/anime/[id]` (`app/anime/[id]/page.tsx`) - **Medium**
  - Bottlenecks: large theme sets rendered at once.
  - Deep fixes:
    - Add pagination or chunked sections for long theme lists.
    - Send lean DTO shape first, hydrate secondary fields lazily.

- `/artist/[slug]` (`app/artist/[slug]/page.tsx`) - **Medium**
  - Bottlenecks: unbounded theme payload and rich card rendering.
  - Deep fixes:
    - Move to paginated/cursor fetch for artist themes.
    - Precompute artist page aggregates (counts, top themes) in cache docs.

- `/season/[season]/[year]` (`app/season/[season]/[year]/page.tsx`) - **Medium**
  - Bottlenecks: client-only page with long infinite list rendering.
  - Deep fixes:
    - Add list virtualization.
    - Add route-level `loading.tsx` and shallow prefetch hints.

### Library, favorites, playlists

- `/library` (`app/library/page.tsx`) - **High**
  - Bottlenecks: parallel streams + optional AniList sync path.
  - Deep fixes:
    - Replace in-request AniList sync with stale-while-revalidate background job.
    - Introduce `librarySnapshot` document per user for fast read path.
    - Keep writes async; reads always from cached/local snapshot.

- `/library/view-all/[mode]` (`app/library/view-all/[mode]/page.tsx`) - **Medium**
  - Bottlenecks: repeated authenticated pagination and heavy DOM growth.
  - Deep fixes:
    - Cursor pagination + virtualization.
    - Add optimistic prefetch of next page on near-scroll.

- `/favorites` (`app/favorites/page.tsx`) - **Medium**
  - Bottlenecks: large fetch (`limit=100`) and animation overhead.
  - Deep fixes:
    - Cursor pagination with server-side filters/sort.
    - Animate only visible window rows.

- `/playlists` (`app/playlists/page.tsx`) - **Low**
  - Deep fixes:
    - Add lightweight cache and ETag for list response.
    - Return summary stats only in list view.

- `/playlists/[id]` (`app/playlists/[id]/page.tsx`) - **Medium**
  - Bottlenecks: full `themes` population.
  - Deep fixes:
    - Replace full populate with paginated projection query.
    - Lazy-load nonessential metadata after first paint.

### User/social/rank

- `/user/[username]` (`app/user/[username]/page.tsx`) - **High**
  - Bottlenecks: dynamic render + 4 API fan-out (`activity`, `history`, `ratings`, `rank`).
  - Deep fixes:
    - Create profile bootstrap endpoint returning all tab summaries in one response.
    - Defer heavy history merge until history tab activation.
    - Cache public profile bundles and invalidate on writes.

- `/user/[username]/network` (`app/user/[username]/network/page.tsx`) - **Medium**
  - Bottlenecks: dynamic lookup + social feed calls.
  - Deep fixes:
    - Unify friend/network response shape and cache counts separately.
    - Incremental load for large follower/following sets.

- `/social` (`app/social/page.tsx`) - **Medium**
  - Bottlenecks: expensive backend composition across multiple collections.
  - Deep fixes:
    - Materialize friend activity stream entries on write (watch/rate events), then read from feed collection.
    - Keep “latest feed” endpoint strictly index-driven.

- `/leaderboard` (`app/leaderboard/page.tsx`) - **Medium**
  - Bottlenecks: runtime aggregate + lookup join.
  - Deep fixes:
    - Precompute leaderboard snapshots every N minutes.
    - Serve cached snapshot + delta patch for current user rank.

- `/notifications` (`app/notifications/page.tsx`) - **Medium**
  - Bottlenecks: bulk read + populated actor refs.
  - Deep fixes:
    - Read actor projection from denormalized notification payload.
    - Cursor paginate with unread-first ordering.

### Auth/settings and quiz

- `/login` (`app/login/page.tsx`) - **Low**
  - Deep fixes:
    - Trim noncritical media bytes and avoid heavy priority assets.

- `/register` (`app/register/page.tsx`) - **Low**
  - Deep fixes:
    - Same as login; keep form boot path minimal.

- `/settings` (`app/settings/page.tsx`) - **Low**
  - Deep fixes:
    - Keep as is; ensure settings responses use compact payloads.

- `/settings/profile` (`app/settings/profile/page.tsx`) - **Low**
  - Deep fixes:
    - Add image-processing offload and async avatar pipeline if upload latency grows.

- `/quiz` (`app/quiz/page.tsx`) - **Medium**
  - Bottlenecks: library count and media-heavy entry cards.
  - Deep fixes:
    - Precompute quiz eligibility counters per user.
    - Defer heavy card assets until interaction.

- `/quiz/play` (`app/quiz/play/page.tsx`) - **High**
  - Bottlenecks: repeated question fetches and timing-sensitive media loading.
  - Deep fixes:
    - Prefetch next question in background as soon as current round starts.
    - Use buffered media proxy responses and deterministic fallback strategy.

- `/quiz/multiplayer` (`app/quiz/multiplayer/page.tsx`) - **Medium**
  - Bottlenecks: create/join/public flow chatter.
  - Deep fixes:
    - Consolidate room boot APIs into one idempotent match-or-create action.

- `/quiz/room/[roomId]` (`app/quiz/room/[roomId]/page.tsx`) - **High**
  - Bottlenecks: dynamic auth+room checks + realtime heartbeat/write pressure.
  - Deep fixes:
    - Move transient room state to in-memory store (Redis) and persist checkpoints asynchronously.
    - Convert heartbeat to lightweight TTL touch without full room reload/save path.
    - Batch room events and reduce duplicate broadcast patterns.

## API inventory and deep fixes (all handlers grouped by domain)

### Auth/session

- `app/api/auth/login/route.ts`, `register`, `refresh`, `logout`, `anilist/url`, `anilist/callback`  
  - Deep fixes:
    - Standardize session extraction (single helper path) and memoize per-request auth object.
    - For AniList callback, move expensive profile enrichment to async worker after token exchange.

### Users/profile/history/social/follow

- `app/api/users/me/route.ts`, `users/[username]/route.ts`, `activity`, `history`, `ratings`, `friends`, `network`, `stats`
- `app/api/follow/[username]/route.ts`
- `app/api/social/friends-activity/route.ts`
- `app/api/notifications/route.ts`
- `app/api/history/route.ts`, `history/check/route.ts`
- `app/api/user/library/count/route.ts`

Deep fixes:

- Replace read-time feed joins with write-time denormalized activity feed documents.
- Move AniList merge from request path to scheduled/background refresh with freshness stamp.
- Merge duplicate endpoints (`friends` vs `network`) to one canonical implementation.
- Introduce endpoint-level cache strategy:
  - profile summaries: short TTL,
  - social feeds: very short TTL + cursor,
  - stats/rank snapshots: periodic materialization.

### Themes/content/search/anime

- `app/api/themes/library/route.ts`
- `app/api/themes/popular/route.ts`, `seasonal`, `random`, `banner-covers`, `favorites`
- `app/api/themes/[slug]/route.ts`, `comments`, `rate`, `similar`
- `app/api/search/route.ts`
- `app/api/anime/[id]/related/route.ts`

Deep fixes:

- `themes/library`: convert to snapshot-based reads, async AniList refresh, strict projections.
- `random`/`banner-covers`: eliminate hot-path `$sample`; read from precomputed random pools.
- `similar`: cache by slug and precompute candidate sets for popular themes.
- `favorites/comments/rate`: keep hooks but cap payload sizes and use projection to avoid over-fetching.
- `search`: keep regex, optimize with bounded patterns and index-aware pipeline (detailed below).

### Quiz/realtime

- `app/api/quiz/question/route.ts`, `submit`, `leaderboard`
- `app/api/quiz/room/create`, `public`, `join`, `start`, `next`, `answer`, `ready`, `leave`, `heartbeat`, `settings`, `update-settings`, `timer-end`, `timeout`
- `app/api/quiz/invite/send`, `invite/respond`
- `app/api/pusher/auth/route.ts`

Deep fixes:

- Move room state hot path to Redis + Lua/atomic operations; persist to Mongo on round boundaries.
- Replace per-event full-room writes with diff updates.
- Reduce heartbeat frequency and payload, use passive expiry model.
- Pre-generate question candidate sets for room mode to avoid repeated expensive random aggregation.
- Perform rank/RP finalization async; return room result immediately and push rank update when done.

### Leaderboard/rank/stats/playlists/media/admin/cron

- `app/api/leaderboard/route.ts`
- `app/api/rank/me/route.ts`, `rank/[userId]/route.ts`
- `app/api/stats/live/route.ts`, `stats/top-artists/route.ts`
- `app/api/playlists/route.ts`, `playlists/[id]/route.ts`
- `app/api/media/proxy/route.ts`, `download/route.ts`
- `app/api/cron/season-reset/route.ts`, `admin/seed-popular/route.ts`

Deep fixes:

- Precompute leaderboard and top-artists snapshots.
- Serve stats from rolling cache window.
- For media proxy/download: isolate heavy work to worker queue and enforce concurrency/rate limits.
- Keep admin/cron endpoints off user-serving capacity pool (dedicated worker/runtime).

## Regex-preserving deep redesign for `app/api/search/route.ts`

The requirement is to keep regex; this plan keeps regex and still makes it faster.

### 1) Regex query shaping (no semantic change)

- Escape user input safely, normalize to lowercase canonical field.
- Use bounded regex strategies:
  - phase A: anchored/prefix regex for fast candidates,
  - phase B: broader contains regex only on limited candidate IDs.
- Hard limits:
  - min query length for broad regex,
  - max regex length/complexity guard,
  - cap candidate set before phase B.

### 2) Index strategy for regex compatibility

- Add normalized searchable fields (`titleNorm`, `artistNorm`, `animeNorm`, `aliasesNorm`).
- Add compound indexes aligned with filters + sort order used in search route.
- Maintain per-collection selective indexes to support prefix regex scans efficiently.

### 3) Two-phase retrieval plan

- Phase 1: fetch lightweight candidate IDs from the most selective fields/collections.
- Phase 2: run broader regex only against candidate subset, then hydrate final docs via projection.
- Return deterministic ordering with a score tuple (exact > prefix > contains).

### 4) Operational controls

- Cache hot query pages (`q`, `page`, `limit`, `filters`) for short TTL.
- Add per-IP/user token bucket for burst protection.
- Add search observability:
  - regex pattern class,
  - scanned docs estimate,
  - p50/p95/p99 latency and timeout count.

## Cross-cutting architecture fixes

### Rendering and route transition

- Add `loading.tsx` to heavy route segments:
  - `app/theme/[slug]/loading.tsx`
  - `app/user/[username]/loading.tsx`
  - `app/library/loading.tsx`
  - `app/search/loading.tsx`
  - `app/quiz/room/[roomId]/loading.tsx`
- Remove `force-dynamic` where not required by auth-sensitive data.
- Shift more first-paint data to server composition for single-fetch hydration.

### Data-fetch fan-out reduction

- Introduce bootstrap endpoints for:
  - home,
  - profile,
  - theme detail.
- Consolidate repetitive calls and avoid tab data until activated.

### DB and model-layer improvements

- Use strict projections everywhere in list APIs.
- Replace full-populate in large lists with projection and paginated join lookups.
- Audit hooks in `lib/models/index.ts` for write amplification; move heavy post-save effects to queue.

### Realtime and third-party integration

- Use asynchronous AniList sync pipeline (webhook/cron/queue model).
- Rework quiz room state for high-concurrency in-memory ops and periodic durable snapshots.

## Prioritized execution roadmap

### Phase 1 (1-2 days, highest immediate UX gain)

1. Add route `loading.tsx` for heavy segments.
2. Cache `leaderboard`, `themes/popular`, `themes/seasonal`, `themes/[slug]/similar`.
3. Raise search debounce and add request cancellation.
4. Cap payload sizes and enforce projection in top list endpoints.

### Phase 2 (3-7 days, core bottleneck removal)

1. Implement bootstrap endpoints (home/profile/theme).
2. Move AniList sync off critical request path.
3. Implement regex two-phase search in `app/api/search/route.ts`.
4. Replace random `$sample` hot path with precomputed random pools.

### Phase 3 (1-2 weeks, structural hardening)

1. Redis-backed quiz room state + async persistence.
2. Materialized social feed and leaderboard snapshots.
3. Queue-based heavy media/download jobs and RP finalization.
4. Full observability dashboard and SLO alerts for route/API latency.

## Validation, KPIs, and rollout guardrails

### Target KPIs

- Route transition (client nav): p95 < 900ms for core pages.
- API latency:
  - p95 < 300ms for common reads,
  - p95 < 600ms for complex reads,
  - p99 budget tracked per endpoint group.
- Error rate: < 1% for user-facing APIs.

### Verification checklist

1. Baseline current p50/p95/p99 for top 20 endpoints.
2. Ship Phase 1 under feature flags.
3. Compare before/after route timings (`/`, `/library`, `/theme/[slug]`, `/user/[username]`, `/search`, `/quiz/room/[roomId]`).
4. Run load tests for quiz room concurrency and search burst traffic.
5. Validate no relevance regression in regex search result quality.

### Rollout safety

- Feature flags per optimization domain (search, quiz, profile bootstrap, caching).
- Canary by traffic slice and geography.
- Automatic rollback triggers on p95/p99 or error threshold breaches.

## Recommended file-first implementation order

1. `app/api/search/route.ts`
2. `app/api/themes/library/route.ts`
3. `app/api/users/[username]/history/route.ts`
4. `app/api/social/friends-activity/route.ts`
5. `app/api/quiz/room/heartbeat/route.ts`
6. `app/api/quiz/room/start/route.ts`
7. `app/api/quiz/room/next/route.ts`
8. `app/api/leaderboard/route.ts`
9. `app/theme/[slug]/page.tsx`
10. `app/user/[username]/page.tsx`
11. `app/library/page.tsx`
12. `app/search/page.tsx`

This sequence gives the best balance of immediate user-visible improvements and long-term scalability.
