# Casino Royale

Casino Royale is a browser-based casino prototype built with React and Vite. It includes a lobby, a persistent chip wallet, level/XP progression, and playable Blackjack, Slots, Roulette, and Baccarat tables.

## Current Features

- Level-based cashier: cash in chips based on player level, then cash chips out for XP.
- Local profile persistence through `localStorage`.
- Blackjack with hit, stand, double down, blackjack payouts, pushes, and bust handling.
- Slots with five win lines and animated reel feedback.
- Roulette with stacked active bets for colors, parity, ranges, and straight numbers.
- Baccarat with stacked active bets for Player, Banker, and Tie.
- Card dealing animations and win/loss/push result animations.

## Project Structure

```text
Casino-Game/
  backend/       Placeholder for future server-side code
  frontend/      React + Vite casino client
```

The app currently runs entirely in the frontend. The backend folder is intentionally empty except for documentation.

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server usually starts at `http://127.0.0.1:5173/`.

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

## Backend Scope

For the current prototype, a backend is not required because the wallet, game state, and profile all live in the browser. A backend becomes useful when the app needs accounts, persistent profiles across devices, leaderboards, server-authoritative game results, fraud prevention, or real-money style audit trails.

If this ever becomes more than a local demo, the backend should own the authoritative chip ledger and random outcomes. The frontend should only request actions and render results, because browser-side game logic can be inspected and changed by players.

See [backend/README.md](backend/README.md) for a more detailed backend plan.
