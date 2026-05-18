import { useState } from "react";

const symbols = [
  { id: "seven", icon: "7", label: "Lucky Seven", multiplier: 20 },
  { id: "diamond", icon: "◆", label: "Diamond", multiplier: 12 },
  { id: "bell", icon: "BELL", label: "Bell", multiplier: 8 },
  { id: "cherry", icon: "CH", label: "Cherry", multiplier: 5 },
  { id: "bar", icon: "BAR", label: "Bar", multiplier: 3 },
];

const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function makeGrid() {
  return Array.from({ length: 9 }, randomSymbol);
}

function cleanBet(value, max) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.min(Math.floor(amount), max));
}

function scoreSpin(grid, bet) {
  return lines.reduce(
    (result, line) => {
      const [first, second, third] = line.map((index) => grid[index]);
      if (first.id === second.id && second.id === third.id) {
        const win = bet * first.multiplier;
        return {
          payout: result.payout + win,
          wins: [...result.wins, `${first.label} line pays ${win}`],
        };
      }
      return result;
    },
    { payout: 0, wins: [] }
  );
}

export default function Slots({ wallet }) {
  const [bet, setBet] = useState(50);
  const [grid, setGrid] = useState(makeGrid);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("Match any row or diagonal to win.");

  function spin() {
    const wager = cleanBet(bet, wallet.chips);
    if (!wallet.chargeBet(wager)) return;

    setSpinning(true);
    setMessage("Reels spinning...");

    window.setTimeout(() => {
      const nextGrid = makeGrid();
      const result = scoreSpin(nextGrid, wager);
      const nextMessage =
        result.payout > 0
          ? `Slots paid ${result.payout} chips. ${result.wins.join(" ")}`
          : "No line hit this spin.";

      setGrid(nextGrid);
      setSpinning(false);
      setMessage(nextMessage);
      wallet.settleGame(result.payout, {
        profit: result.payout - wager,
        game: "Slots",
        message: nextMessage,
      });
    }, 700);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-[#101c18] p-5 shadow-xl shadow-black/25">
        <label htmlFor="slots-bet" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          Spin Bet
        </label>
        <input
          id="slots-bet"
          type="number"
          min="1"
          step="10"
          value={bet}
          disabled={spinning}
          onChange={(event) => setBet(cleanBet(event.target.value, 100000))}
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[25, 50, 100, wallet.chips].map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={spinning}
              onClick={() => setBet(cleanBet(amount, wallet.chips))}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-yellow-300 hover:text-yellow-200"
            >
              {amount === wallet.chips ? "Max" : amount}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={spin}
          disabled={spinning || wallet.chips <= 0}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-fuchsia-400 to-rose-500 px-4 py-3 font-black text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
        >
          Spin Reels
        </button>
        <p className="mt-4 rounded-lg border border-fuchsia-300/20 bg-fuchsia-950/25 p-4 text-sm leading-6 text-fuchsia-100">
          {message}
        </p>
      </div>

      <div className="rounded-lg border border-fuchsia-300/20 bg-[linear-gradient(135deg,#231034,#120816)] p-5 shadow-2xl shadow-black/30">
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-3">
          {grid.map((symbol, index) => (
            <div
              key={`${symbol.id}${index}`}
              className={`slot-reel grid aspect-square place-items-center rounded-lg border border-white/10 bg-black/35 text-center shadow-inner ${
                spinning ? "spinning" : ""
              }`}
            >
              <span className="text-3xl font-black text-white sm:text-5xl">{symbol.icon}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {symbols.map((symbol) => (
            <div key={symbol.id} className="rounded-lg border border-white/10 bg-white/[0.05] p-3 text-center">
              <div className="text-lg font-black text-white">{symbol.icon}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{symbol.multiplier}x</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
