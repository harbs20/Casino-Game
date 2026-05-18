import { useState } from "react";

const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const betOptions = [
  { id: "red", label: "Red", detail: "1:1" },
  { id: "black", label: "Black", detail: "1:1" },
  { id: "even", label: "Even", detail: "1:1" },
  { id: "odd", label: "Odd", detail: "1:1" },
  { id: "low", label: "1-18", detail: "1:1" },
  { id: "high", label: "19-36", detail: "1:1" },
  { id: "number", label: "Number", detail: "35:1" },
];

function colorForNumber(number) {
  if (number === 0) return "green";
  return redNumbers.has(number) ? "red" : "black";
}

function cleanBet(value, max) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.min(Math.floor(amount), max));
}

function isWinningBet(betType, selectedNumber, result) {
  if (betType === "number") return result.number === selectedNumber;
  if (betType === "red" || betType === "black") return result.color === betType;
  if (betType === "even") return result.number !== 0 && result.number % 2 === 0;
  if (betType === "odd") return result.number % 2 === 1;
  if (betType === "low") return result.number >= 1 && result.number <= 18;
  if (betType === "high") return result.number >= 19 && result.number <= 36;
  return false;
}

function numberClass(number) {
  const color = colorForNumber(number);
  if (color === "green") return "bg-emerald-500 text-emerald-950";
  if (color === "red") return "bg-red-600 text-white";
  return "bg-slate-950 text-white";
}

export default function Roulette({ wallet }) {
  const [bet, setBet] = useState(50);
  const [betType, setBetType] = useState("red");
  const [selectedNumber, setSelectedNumber] = useState(7);
  const [result, setResult] = useState({ number: 0, color: "green" });
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("Choose a bet, then spin the wheel.");

  function spin() {
    const wager = cleanBet(bet, wallet.chips);
    if (!wallet.chargeBet(wager)) return;

    setSpinning(true);
    setMessage("Wheel spinning...");

    window.setTimeout(() => {
      const number = Math.floor(Math.random() * 37);
      const nextResult = { number, color: colorForNumber(number) };
      const won = isWinningBet(betType, selectedNumber, nextResult);
      const payout = won ? wager * (betType === "number" ? 36 : 2) : 0;
      const nextMessage = won
        ? `Roulette landed ${number}. You won ${payout - wager} chips.`
        : `Roulette landed ${number}. The table takes this one.`;

      setResult(nextResult);
      setSpinning(false);
      setMessage(nextMessage);
      wallet.settleGame(payout, {
        profit: payout - wager,
        game: "Roulette",
        message: nextMessage,
      });
    }, 900);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-[#101c18] p-5 shadow-xl shadow-black/25">
        <label htmlFor="roulette-bet" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          Table Bet
        </label>
        <input
          id="roulette-bet"
          type="number"
          min="1"
          step="10"
          value={bet}
          disabled={spinning}
          onChange={(event) => setBet(cleanBet(event.target.value, 100000))}
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          {betOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={spinning}
              onClick={() => setBetType(option.id)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                betType === option.id
                  ? "border-yellow-300 bg-yellow-300 text-emerald-950"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-yellow-300/70"
              }`}
            >
              <span className="block font-black">{option.label}</span>
              <span className="text-xs uppercase tracking-[0.18em] opacity-70">{option.detail}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning || wallet.chips <= 0}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-red-500 to-emerald-400 px-4 py-3 font-black text-white shadow-lg shadow-red-500/20 transition hover:brightness-110"
        >
          Spin Wheel
        </button>

        <p className="mt-4 rounded-lg border border-red-300/20 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
          {message}
        </p>
      </div>

      <div className="rounded-lg border border-emerald-300/20 bg-[linear-gradient(135deg,#10241d,#080b0b)] p-5 shadow-2xl shadow-black/30">
        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center">
            <div
              className={`roulette-wheel grid h-56 w-56 place-items-center rounded-full border-[14px] border-yellow-300 shadow-2xl shadow-black/40 ${
                spinning ? "is-spinning" : ""
              }`}
            >
              <div className={`grid h-28 w-28 place-items-center rounded-full text-5xl font-black ${numberClass(result.number)}`}>
                {result.number}
              </div>
            </div>
            <div className="mt-4 text-sm uppercase tracking-[0.22em] text-slate-400">
              {result.color} result
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Number Board</h2>
              <span className="text-sm text-slate-400">Selected: {selectedNumber}</span>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
              {Array.from({ length: 37 }, (_, number) => (
                <button
                  key={number}
                  type="button"
                  disabled={spinning}
                  onClick={() => {
                    setSelectedNumber(number);
                    setBetType("number");
                  }}
                  className={`aspect-square rounded-lg text-sm font-black transition ${numberClass(number)} ${
                    betType === "number" && selectedNumber === number ? "ring-2 ring-yellow-300 ring-offset-2 ring-offset-[#10241d]" : ""
                  }`}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
