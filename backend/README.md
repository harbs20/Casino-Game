# Casino Royale Backend

The backend is an optional local ledger server. The app still works as a frontend-only prototype, but when the frontend's `Ledger Sync` toggle is enabled, new ledger events are posted here.

## Run It

```bash
npm run dev
```

The server listens at `http://127.0.0.1:8787/`.

## Current Endpoints

```text
GET    /health
GET    /ledger
POST   /ledger
DELETE /ledger
```

Ledger data is stored in `backend/data/ledger.json`, which is created automatically.

## What Belongs In The Backend?

As the app grows, use the backend for anything that must be trusted, shared across devices, or audited:

- User accounts and authentication.
- Persistent player profiles and saved wallet balances.
- Server-authoritative chip ledger.
- Server-authoritative random game outcomes.
- Leaderboards, achievements, and match history.
- Admin tools, analytics, and support views.
- Anti-cheat checks and rate limiting.

Do not rely on frontend-only logic for real-money or competitive balances. Players can inspect and modify browser code, local storage, and network calls.

## Suggested Future API

```text
POST /auth/session
GET  /players/me
POST /wallet/cash-in
POST /wallet/cash-out
POST /games/blackjack/rounds
POST /games/blackjack/rounds/:id/actions
POST /games/roulette/spins
POST /games/baccarat/rounds
POST /games/slots/spins
GET  /history
```

## Suggested Data Ownership

The backend should own:

- Current chip balance.
- Cash-in and cash-out history.
- Every wager charged.
- Every payout settled.
- Random seeds or result records.
- Game history and audit metadata.

The frontend should own:

- Form state.
- Visual animations.
- Optimistic UI where appropriate.
- Rendering cards, reels, wheels, tables, and notices.

## Good First Backend Milestone

The first milestone is now started: a local ledger server exists. The next milestone should add profile persistence:

1. Store player profiles and ledger entries in SQLite.
2. Replace `localStorage` profile loading with API calls.
3. Keep the current frontend game rules until server-authoritative game rounds are ready.
4. Move random outcomes and chip settlement to the server when trust matters.
