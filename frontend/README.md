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
  Blackjack.jsx    Blackjack rules and hand rendering
  Baccarat.jsx     Baccarat rules, multi-bet slip, and card rendering
  Roulette.jsx     Roulette rules, multi-bet slip, and number board
  Slots.jsx        Slot symbols, spin scoring, and reel rendering
  ResultBurst.jsx  Shared win/loss/push result overlay
  index.css        Global styles, table animations, card dealing, reels, wheel
```

## Game State

The player profile is stored in `localStorage` under `casino-royale-profile-v1`. It tracks chips, XP, level, cash-ins, games played, best win, and total chips cashed out.

The wallet API is created in `App.jsx` and passed into each game:

- `wallet.chips`
- `wallet.chargeBet(amount)`
- `wallet.settleGame(payout, result)`
- `wallet.setNotice(message)`

## Multiple Bets

Roulette and Baccarat support active bet slips. Players can add several bets before spinning or dealing, remove individual bets, clear the slip, and settle the whole slip against one result.

Blackjack remains a single-hand table. Adding multiple simultaneous Blackjack bets should be treated as a larger feature because it usually requires split hands, doubled side bets, or multi-seat play.

## Animation Notes

Card games use keyed rounds so cards remount and replay the dealing animation each hand. `ResultBurst.jsx` renders a shared overlay for win, loss, and push states, while `index.css` controls the table glow, message pulse, and reduced-motion behavior.
