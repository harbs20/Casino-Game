import { useState } from "react";
import ResultBurst from "./ResultBurst";

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

const defaultBets = [{ id: 1, type: "red", number: null, amount: 50 }];

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

function labelForBet(bet) {
  if (bet.type === "number") return `Number ${bet.number}`;
  return betOptions.find((option) => option.id === bet.type)?.label || bet.type;
}

function payoutForBet(bet, result) {
  if (!isWinningBet(bet.type, bet.number, result)) return 0;
  return bet.amount * (bet.type === "number" ? 36 : 2);
}

function resultToneFor(payout, wager) {
  if (payout > wager) return "win";
  if (payout === wager) return "push";
  return "loss";
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
  const [spinId, setSpinId] = useState(0);
  const [resultTone, setResultTone] = useState(null);
  const [activeBets, setActiveBets] = useState(defaultBets);
  const [nextBetId, setNextBetId] = useState(2);

  const totalBet = activeBets.reduce((sum, activeBet) => sum + activeBet.amount, 0);

  function addBet() {
    const amount = cleanBet(bet, wallet.chips);
    if (amount <= 0) {
      setMessage("Choose at least 1 chip before adding a bet.");
      return;
    }

    const nextBet = {
      id: nextBetId,
      type: betType,
      number: betType === "number" ? selectedNumber : null,
      amount,
    };

    setActiveBets((current) => [...current, nextBet]);
    setNextBetId((current) => current + 1);
    setMessage(`Added ${amount} chips on ${labelForBet(nextBet)}.`);
  }

  function removeBet(id) {
    setActiveBets((current) => current.filter((activeBet) => activeBet.id !== id));
  }

  function clearBets() {
    setActiveBets([]);
    setMessage("Roulette bets cleared.");
  }

  function spin() {
    const placedBets = [...activeBets];
    const totalWager = placedBets.reduce((sum, activeBet) => sum + activeBet.amount, 0);
    if (totalWager <= 0) {
      setMessage("Add at least one roulette bet before spinning.");
      return;
    }
    if (!wallet.chargeBet(totalWager)) return;

    setSpinning(true);
    setSpinId((current) => current + 1);
    setResultTone(null);
    setMessage("Wheel spinning...");

    window.setTimeout(() => {
      const number = Math.floor(Math.random() * 37);
      const nextResult = { number, color: colorForNumber(number) };
      const settledBets = placedBets.map((activeBet) => ({
        ...activeBet,
        payout: payoutForBet(activeBet, nextResult),
      }));
      const payout = settledBets.reduce((sum, activeBet) => sum + activeBet.payout, 0);
      const winners = settledBets.filter((activeBet) => activeBet.payout > 0);
      const net = payout - totalWager;
      const netText = net >= 0 ? `+${net}` : `${net}`;
      const nextMessage =
        winners.length > 0
          ? `Roulette landed ${number}. ${winners.length} bet${winners.length === 1 ? "" : "s"} paid ${payout} chips (${netText} net).`
          : `Roulette landed ${number}. All ${placedBets.length} bet${placedBets.length === 1 ? "" : "s"} missed.`;

      setResult(nextResult);
      setSpinning(false);
      setMessage(nextMessage);
      setResultTone(resultToneFor(payout, totalWager));
      wallet.settleGame(payout, {
        profit: net,
        game: "Roulette",
        message: nextMessage,
      });
    }, 900);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-[#101c18] p-5 shadow-xl shadow-black/25">
        <label htmlFor="roulette-bet" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          Chip Amount
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

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={addBet}
            disabled={spinning || wallet.chips <= 0}
            className="rounded-lg bg-yellow-300 px-4 py-3 font-black text-emerald-950 transition hover:bg-yellow-200"
          >
            Add Bet
          </button>
          <button
            type="button"
            onClick={clearBets}
            disabled={spinning || activeBets.length === 0}
            className="rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:border-red-300 hover:text-red-200"
          >
            Clear
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Active Bets</div>
            <div className="font-black text-white">{totalBet} chips</div>
          </div>
          <div className="mt-3 grid gap-2">
            {activeBets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 px-3 py-3 text-sm text-slate-400">
                No bets on the felt.
              </div>
            ) : (
              activeBets.map((activeBet) => (
                <div
                  key={activeBet.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                >
                  <span className="font-bold text-slate-100">{labelForBet(activeBet)}</span>
                  <span className="text-slate-300">{activeBet.amount}</span>
                  <button
                    type="button"
                    onClick={() => removeBet(activeBet.id)}
                    disabled={spinning}
                    className="rounded-md border border-white/10 px-2 py-1 text-xs font-bold text-slate-300 transition hover:border-red-300 hover:text-red-200"
                    aria-label={`Remove ${labelForBet(activeBet)} bet`}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning || totalBet <= 0 || wallet.chips < totalBet}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-red-500 to-emerald-400 px-4 py-3 font-black text-white shadow-lg shadow-red-500/20 transition hover:brightness-110"
        >
          Spin {totalBet > 0 ? `${totalBet} Chips` : "Wheel"}
        </button>

        <p className={`result-message mt-4 rounded-lg border border-red-300/20 bg-red-950/20 p-4 text-sm leading-6 text-red-100 ${resultTone ? `is-${resultTone}` : ""}`}>
          {message}
        </p>
      </div>

      <div className={`result-stage rounded-lg border border-emerald-300/20 bg-[linear-gradient(135deg,#10241d,#080b0b)] p-5 shadow-2xl shadow-black/30 ${resultTone ? `is-${resultTone}` : ""}`}>
        <ResultBurst tone={resultTone} resultKey={spinId} />
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
