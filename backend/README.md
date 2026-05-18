# Casino Royale Backend

The backend is currently a placeholder. The app works as a frontend-only prototype, with game logic and profile persistence handled in the browser.

## What Belongs In The Backend?

Use the backend for anything that must be trusted, shared across devices, or audited:

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

Start with profile persistence and wallet history:

1. Add a small Node/Express or Fastify API.
2. Store player profiles and ledger entries in SQLite.
3. Replace `localStorage` profile loading with API calls.
4. Keep the current frontend game rules until server-authoritative game rounds are ready.
