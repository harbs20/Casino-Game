# Casino Royale

Casino Royale is a browser-based casino prototype built with React and Vite. It includes a lobby, persistent profile slots, a chip wallet, level/XP progression, playable Blackjack, Slots, Roulette, and Baccarat tables, plus an optional local backend ledger server.

## Current Features

- Limited rescue cashier: cash in only when your bankroll is low, then convert net redeemable winnings into XP.
- Multiple local save slots through `localStorage`.
- Game history, stats dashboard, achievements, daily challenges, and claimable rewards.
- Global leaderboard for deployed Netlify sites, backed by a serverless function and Netlify Blobs.
- VIP tiers with unlockable table themes.
- Optional sound effects and chip movement animations.
- Blackjack with hit, stand, double down, blackjack payouts, pushes, bust handling, and pair side bets.
- Slots with five win lines, animated reel feedback, and a seven bonus side bet.
- Roulette with stacked active bets for colors, parity, ranges, dozens, columns, and straight numbers.
- Baccarat with stacked active bets for Player, Banker, Tie, Player Pair, and Banker Pair.
- Card dealing animations and win/loss/push result animations.
- Optional backend ledger sync to a dependency-free Node server.

## Project Structure

```text
Casino-Game/
  backend/       Optional Node ledger server
  frontend/      React + Vite casino client
```

The app can still run entirely in the frontend. The backend is optional and currently records ledger events when the frontend's ledger sync toggle is enabled.

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server usually starts at `http://127.0.0.1:5173/`.

To run the optional ledger server:

```bash
cd backend
npm run dev
```

The backend listens at `http://127.0.0.1:8787/`.

## Useful Commands

Run the local development server:

```bash
cd frontend
npm run dev
```

Build the production bundle:

```bash
cd frontend
npm run build
```

Run lint checks:

```bash
cd frontend
npm run lint
```

## Netlify Deploy

This repo includes a root `netlify.toml` for the Vite frontend:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node version: `22`

The global leaderboard uses `frontend/netlify/functions/leaderboard.mjs` and Netlify Blobs. The optional backend ledger server is local-only for now. The Netlify deploy runs as a frontend app with local profile saves in the browser and shared leaderboard scores on Netlify.

To sync ledger entries to a deployed backend later, add a `VITE_LEDGER_API_URL` environment variable in Netlify that points to the backend origin.

Run the backend ledger server:

```bash
cd backend
npm run dev
```

## Backend Scope

For the current prototype, the frontend owns the playable game state and local profiles. The optional backend records ledger entries for cash-ins, cash-outs, wagers, settlements, and daily rewards.

If this ever becomes more than a local demo, the backend should own the authoritative chip ledger and random outcomes. The frontend should only request actions and render results, because browser-side game logic can be inspected and changed by players.

See [backend/README.md](backend/README.md) for a more detailed backend plan.
