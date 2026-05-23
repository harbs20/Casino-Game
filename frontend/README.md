# Casino Royale Frontend

This is the React + Vite client for Casino Royale.

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS 4
- ESLint

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Source Map

```text
src/
  App.jsx          Lobby, wallet, cashier, XP, and table routing
  casinoProgress.js Progression, profiles, stats, achievements, dailies
  Blackjack.jsx    Blackjack rules and hand rendering
  Baccarat.jsx     Baccarat rules, multi-bet slip, and card rendering
  Roulette.jsx     Roulette rules, multi-bet slip, and number board
  Slots.jsx        Slot symbols, spin scoring, and reel rendering
  ResultBurst.jsx  Shared win/loss/push result overlay
  index.css        Global styles, table animations, card dealing, reels, wheel
netlify/functions/
  leaderboard.mjs  Global leaderboard endpoint
  promo-code.mjs   Promo code badge redemption endpoint
```

## Game State

The profile store is saved in `localStorage` under `casino-royale-store-v2`. Older `casino-royale-profile-v1` saves are migrated automatically.

Each profile tracks chips, redeemable winnings, XP, level, rescue cash-ins, games played, best win, win streaks, total chips cashed out, game history, ledger entries, achievements, promo badges, daily challenges, sound preference, backend ledger sync preference, and selected VIP theme.

The wallet API is created in `App.jsx` and passed into each game:

- `wallet.chips`
- `wallet.chargeBet(amount, detail)`
- `wallet.settleGame(payout, result)`
- `wallet.setNotice(message)`

## Multiple Bets

Roulette and Baccarat support active bet slips. Players can add several bets before spinning or dealing, remove individual bets, clear the slip, and settle the whole slip against one result.

Blackjack remains a single-hand table but includes a pair side bet. Slots includes a seven bonus side bet.

Current side bets:

- Blackjack: Pair and suited pair from a six-deck shoe.
- Slots: One 7 returns the bonus bet; two-or-more 7s pay 3:1.
- Baccarat: Player Pair and Banker Pair.
- Roulette: Dozens and columns, plus the original outside and number bets.

## Progression

`casinoProgress.js` owns:

- Save slot creation and normalization.
- VIP tiers and unlockable table themes.
- Daily challenge templates and claim logic.
- Achievement definitions and unlock checks.
- History and ledger entry helpers.
- Derived stats for the dashboard.
- Rescue cash-in eligibility, cash-out limits, and level XP requirements.

## Backend Ledger Sync

The frontend always records a local ledger. In local development, `Ledger Sync` posts new entries to `http://127.0.0.1:8787/ledger`. Deployed static sites can set `VITE_LEDGER_API_URL` to point at a compatible backend; otherwise ledger sync stays local-only.

## Global Leaderboard

The Netlify deploy exposes `/.netlify/functions/leaderboard`, backed by Netlify Blobs through `@netlify/blobs`. The lobby posts profile snapshots after play and ranks players by total XP banked, then level, net profit, and chips. Local Vite development falls back to a browser-cached leaderboard unless you run the site with Netlify Dev.

## Promo Codes

The Netlify deploy exposes `/.netlify/functions/promo-code`. Promo codes return badge definitions to the frontend, and each local profile records redeemed codes so the same save cannot redeem a code twice.

Set `PROMO_CODES_JSON` in Netlify to define private codes:

```json
[
  {
    "code": "YOUR-CODE",
    "badge": {
      "id": "your-badge",
      "title": "Your Badge",
      "description": "Exclusive promo badge.",
      "accent": "yellow"
    },
    "rewardChips": 0
  }
]
```

## Animation Notes

Card games use keyed rounds so cards remount and replay the dealing animation each hand. `ResultBurst.jsx` renders a shared overlay for win, loss, and push states, while `index.css` controls the table glow, message pulse, chip burst, VIP theme accents, and reduced-motion behavior.
