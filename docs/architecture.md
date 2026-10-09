# Arena Work — Architecture Decision Record

## 1. Product architecture

Arena Work is an internal, authenticated competition platform. The first sport is Ping Pong, but sport, season, match, side and participant are modeled separately so future modalities can evolve without replacing the core model.

The application is a Next.js App Router frontend/server layer deployed to Vercel. Supabase owns PostgreSQL, Auth, RLS and transactional domain functions. React components render UI; feature-domain modules own deterministic rules; feature-server modules own reads; Server Actions orchestrate mutations; PostgreSQL RPC functions own critical state transitions.

No separate custom API/backend is introduced in the MVP because it would duplicate capabilities Supabase already provides. A dedicated service can be added later behind the same domain contracts if scale or integrations require it.

## 2. Chosen stack

- Next.js 16.4 / App Router
- React 19.3
- TypeScript strict
- Tailwind CSS 4
- React Hook Form + Zod
- Lucide React
- Supabase Postgres + Auth + RLS
- Vitest
- Vercel + Supabase deployment target

shadcn/ui is intentionally not installed wholesale. Components will be copied in only when a concrete UI need justifies them. Framer Motion is also postponed until ranking/podium transitions need it; CSS handles the current interactions and `prefers-reduced-motion` remains authoritative.

## 3. Data model

### Core tables

- `profiles`: employee application profile and role, linked 1:1 to `auth.users`.
- `sports`: modality configuration and rule metadata.
- `seasons`: monthly or future non-monthly competitive windows per sport.
- `matches`: match event/state machine, creator, timestamps and idempotency key.
- `match_sides`: the two competing sides and their score.
- `match_participants`: one or more profiles attached to each side.
- `match_disputes`: dispute reason and audited resolution metadata.
- `season_results`: immutable final standings snapshot after season close.
- `notifications`: in-app user notifications.
- `audit_logs`: append-only administrative audit trail.

### Future tables

`challenges`, `achievements`, `user_achievements`, tournament/bracket entities and richer event types should be separate migrations after the MVP behavior is stable.

### Why sides + participants instead of player1/player2

Chosen model: `matches -> match_sides -> match_participants`.

A `match` is the event and state machine. `match_sides` stores score per side. `match_participants` attaches one or more profiles to a side. Ping Pong singles uses one participant on each side. The same structure can later represent doubles or teams without duplicating a score for every player.

Trade-off: two extra joins versus `player1_id/player2_id`. At the expected company scale the join cost is negligible; the migration flexibility is substantially better.

## 4. Ranking strategy

Live standings are dynamically derived from `confirmed` matches. There is no editable `points` field on profiles and no client-writable standings table.

Reason: at company scale this is cheap, transparent and removes synchronization/race bugs caused by incrementally mutating a cached ranking. If usage grows enough to justify caching, the domain contract can later be backed by a materialized view without changing UI consumers.

Final season results are persisted to `season_results` as immutable snapshots when a season closes. Hall of Fame and historical podiums read those snapshots rather than recomputing old seasons forever.

MVP ordering:

1. wins (equivalent to points while a win is fixed at 3 points);
2. win rate;
3. direct confrontation;
4. fewer losses;
5. deterministic technical fallback.

For two tied players, direct confrontation is literal head-to-head. For 3+ players tied on wins and win rate, a mini-table counting wins only among the tied group is used. This avoids a non-transitive sort such as A > B, B > C and C > A. Any exceptional administrative ordering belongs only to an audited final-season snapshot, never hidden inside live standings.

## 5. Authentication and authorization

Supabase Auth establishes identity. The MVP uses email/password with public self-sign-up disabled; employees are invited/created by an admin. Corporate SSO can be added later without changing the `profiles` identity model.

Server code verifies the authenticated JWT and then loads `profiles`. Authorization is derived from persisted profile role/state; a role supplied by the browser is never trusted.

Roles start as `employee` and `admin`. The PostgreSQL enum can be migrated when a real third role exists; speculative roles are deliberately avoided now.

## 6. RLS strategy

RLS is enabled on every application table and direct grants are intentionally narrow.

- `anon`: no application-table access.
- active employees: internal profile/sport/season data, confirmed matches, matches they participate in, their own notifications and historical results.
- admins: additional dispute/audit visibility.
- service role: server-only Auth Admin operations such as employee invitations; never exposed to Client Components.

Competitive tables do not grant normal authenticated users direct insert/update/delete. Critical mutations are exposed through narrow `SECURITY DEFINER` RPC functions that re-check identity, active status, participation, role, valid score and state transition.

RLS is therefore defense-in-depth, not the only authorization layer: Server Actions validate input/auth, RPCs enforce domain transitions, constraints enforce invariants.

## 7. Folder structure

```text
src/
  app/
    (auth)/
    (app)/
  components/
    brand/
    layout/
  features/
    auth/
    matches/
      actions/
      components/
      domain/
      schemas/
    ranking/
      domain/
      server/
  lib/
    auth/
    env/
    logging/
    supabase/
  types/
supabase/
  migrations/
scripts/
tests/
  unit/
docs/
```

The rule is feature-first for business behavior and shared infrastructure only in `lib`. UI components are not allowed to own ranking or authorization rules.

## 8. Match registration / confirmation flow

1. Authenticated player opens `/matches/new`.
2. UI defaults player 1 to the current user and asks only for opponent + set score.
3. React Hook Form/Zod rejects invalid shape immediately.
4. Server Action re-validates input and calls `register_match`.
5. PostgreSQL verifies current user, active opponent, active Ping Pong season, non-self match and legal 2×0/2×1 result.
6. A client-generated `request_id` makes retries idempotent; accidental double-submit returns the same match.
7. Match is inserted as `pending_confirmation`; sides/participants and opponent notification are inserted in the same transaction.
8. The opponent can call `confirm_match` or `dispute_match`.
9. The RPC locks the match row with `FOR UPDATE`, verifies the caller is the non-creator participant, then performs one state transition.
10. `confirmed` immediately becomes eligible for live ranking. `disputed` waits for an admin resolution; `cancelled` never contributes.

The creator never submits `winner_id`; winner is derived from trusted scores.

## 9. Consistency and race-condition strategy

- partial unique index: one `active` season per sport;
- unique `(created_by, request_id)`: idempotent match registration;
- `FOR UPDATE`: single-winner confirmation/dispute/admin transitions;
- check constraints: state metadata consistency and basic score storage bounds;
- restrictive table grants: no direct score/ranking mutation path for normal users;
- season close will be one transactional RPC that refuses unresolved matches, writes final snapshots and moves the season to `finished` atomically;
- UTC `timestamptz` storage; business boundaries/display use `America/Sao_Paulo`.

A heuristic such as “same two players within five minutes = duplicate” is deliberately not used because two legitimate rematches can happen quickly. Idempotency keys solve duplicate requests without suppressing valid games.

## 10. Main engineering changes from the original sketch

1. **Generic side/participant model instead of `player1/player2`.** Required for doubles/teams and future sports without destructive schema changes.
2. **No mutable live standings table in the MVP.** Ranking is derived; only final season snapshots are stored.
3. **Critical writes are database transactions/RPCs.** Server Actions alone are not enough protection against concurrent requests or alternate clients.
4. **Direct confrontation for multi-way ties is a mini-table.** A raw pairwise sort comparator can be mathematically non-transitive.
5. **Admin fallback does not silently alter live ranking.** If ever used, it is explicit, audited and part of the final snapshot.
6. **Achievements/challenges are postponed to dedicated migrations.** The core schema remains compatible without carrying unused complexity.
7. **shadcn/ui and Framer Motion are on-demand dependencies.** They are not installed until they solve a concrete UI problem.

## 11. Roadmap

### Stage 1 — foundation (current increment)

- project/tooling setup;
- Supabase SSR foundation;
- design tokens + Arena Work mark;
- initial schema, indexes, constraints and RLS;
- transactional registration/confirmation/dispute RPCs;
- login and protected shell;
- live ranking domain + unit tests;
- initial dashboard/ranking/registration UI;
- development seed and documentation.

### Stage 2 — complete match loop

- pending-confirmation inbox/cards;
- confirm/contest UI and dispute reason;
- recent feed and paginated history;
- friendly domain-error mapping/toasts;
- integration tests for state transitions and RLS.

### Stage 3 — players and history

- player profile statistics;
- head-to-head screens;
- current/best streak details;
- historical placement queries.

### Stage 4 — season lifecycle and Hall of Fame

- create/start/finish season admin flows;
- transactional close + immutable ranking snapshot;
- unresolved-match guard;
- Hall of Fame and historical aggregate statistics.

### Stage 5 — admin

- employee invite/activate/deactivate;
- seasons UI;
- match/dispute resolution UI;
- audit viewer.

### Stage 6 — product polish

- notification center/realtime refresh where useful;
- accessibility pass;
- motion/podium polish respecting reduced motion;
- responsive QA;
- production logging/Sentry adapter;
- final Vercel/Supabase deployment hardening.

Only after the MVP is stable: challenges, achievements, push, reactions, tournament brackets, doubles/team UX and additional sports.
