import { useState } from "react";
import ResultBurst from "./ResultBurst";

const suits = ["♠", "♥", "♦", "♣"];
const ranks = [
  { rank: "A", value: 1 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 0 },
  { rank: "J", value: 0 },
  { rank: "Q", value: 0 },
  { rank: "K", value: 0 },
];

const wagerOptions = [
  { id: "player", label: "Player", detail: "1:1" },
  { id: "banker", label: "Banker", detail: "0.95:1" },
  { id: "tie", label: "Tie", detail: "8:1" },
];

const defaultBets = [{ id: 1, type: "banker", amount: 50 }];

function createDeck() {
  return suits.flatMap((suit) => ranks.map((rank) => ({ ...rank, suit })));
}

function shuffle(deck) {
  const nextDeck = [...deck];
  for (let index = nextDeck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextDeck[index], nextDeck[swapIndex]] = [nextDeck[swapIndex], nextDeck[index]];
  }
  return nextDeck;
}

function handValue(hand) {
  return hand.reduce((sum, card) => sum + card.value, 0) % 10;
}

function cleanBet(value, max) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.min(Math.floor(amount), max));
}

function resultToneFor(payout, wager) {
  if (payout > wager) return "win";
  if (payout === wager) return "push";
  return "loss";
}

function payoutForBet(bet, winner) {
  if (winner === "tie" && bet.type !== "tie") return bet.amount;
  if (winner === bet.type && winner === "player") return bet.amount * 2;
  if (winner === bet.type && winner === "banker") return Math.floor(bet.amount * 1.95);
  if (winner === bet.type && winner === "tie") return bet.amount * 9;
  return 0;
}

function outcomeForBet(bet, winner) {
  if (winner === "tie" && bet.type !== "tie") return "push";
  if (winner === bet.type) return "win";
  return "loss";
}

export default function Baccarat({ wallet }) {
  const [bet, setBet] = useState(50);
  const [wagerOn, setWagerOn] = useState("banker");
  const [playerHand, setPlayerHand] = useState([]);
  const [bankerHand, setBankerHand] = useState([]);
  const [message, setMessage] = useState("Back player, banker, or tie. Closest to 9 wins.");
  const [roundId, setRoundId] = useState(0);
  const [resultTone, setResultTone] = useState(null);
  const [winner, setWinner] = useState(null);
  const [activeBets, setActiveBets] = useState(defaultBets);
  const [nextBetId, setNextBetId] = useState(2);

  const totalBet = activeBets.reduce((sum, activeBet) => sum + activeBet.amount, 0);

  function addBet() {
    const amount = cleanBet(bet, wallet.chips);
    if (amount <= 0) {
      setMessage("Choose at least 1 chip before adding a baccarat bet.");
      return;
    }

    const nextBet = { id: nextBetId, type: wagerOn, amount };
    setActiveBets((current) => [...current, nextBet]);
    setNextBetId((current) => current + 1);
    setMessage(`Added ${amount} chips on ${winnerLabel(wagerOn)}.`);
  }

  function removeBet(id) {
    setActiveBets((current) => current.filter((activeBet) => activeBet.id !== id));
  }

  function clearBets() {
    setActiveBets([]);
    setMessage("Baccarat bets cleared.");
  }

  function deal() {
    const placedBets = [...activeBets];
    const totalWager = placedBets.reduce((sum, activeBet) => sum + activeBet.amount, 0);
    if (totalWager <= 0) {
      setMessage("Add at least one baccarat bet before dealing.");
      return;
    }
    if (!wallet.chargeBet(totalWager)) return;

    const shoe = shuffle(createDeck());
    const nextPlayer = [shoe.pop(), shoe.pop()];
    const nextBanker = [shoe.pop(), shoe.pop()];

    if (handValue(nextPlayer) <= 5) nextPlayer.push(shoe.pop());
    if (handValue(nextBanker) <= 5) nextBanker.push(shoe.pop());

    const playerScore = handValue(nextPlayer);
    const bankerScore = handValue(nextBanker);
    let winner = "tie";
    if (playerScore > bankerScore) winner = "player";
    if (bankerScore > playerScore) winner = "banker";

    const settledBets = placedBets.map((activeBet) => ({
      ...activeBet,
      outcome: outcomeForBet(activeBet, winner),
      payout: payoutForBet(activeBet, winner),
    }));
    const payout = settledBets.reduce((sum, activeBet) => sum + activeBet.payout, 0);
    const wins = settledBets.filter((activeBet) => activeBet.outcome === "win");
    const pushes = settledBets.filter((activeBet) => activeBet.outcome === "push");
    const net = payout - totalWager;
    const netText = net >= 0 ? `+${net}` : `${net}`;
    const nextMessage =
      wins.length > 0 || pushes.length > 0
        ? `${winnerLabel(winner)} wins. ${wins.length} win${wins.length === 1 ? "" : "s"}, ${pushes.length} push${pushes.length === 1 ? "" : "es"}; paid ${payout} chips (${netText} net).`
        : `${winnerLabel(winner)} wins. All ${placedBets.length} bet${placedBets.length === 1 ? "" : "s"} missed.`;

    setPlayerHand(nextPlayer);
    setBankerHand(nextBanker);
    setMessage(nextMessage);
    setRoundId((current) => current + 1);
    setResultTone(resultToneFor(payout, totalWager));
    setWinner(winner);
    wallet.settleGame(payout, {
      profit: net,
      game: "Baccarat",
      message: nextMessage,
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-[#101c18] p-5 shadow-xl shadow-black/25">
        <label htmlFor="baccarat-bet" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          Chip Amount
        </label>
        <input
          id="baccarat-bet"
          type="number"
          min="1"
          step="10"
          value={bet}
          onChange={(event) => setBet(cleanBet(event.target.value, 100000))}
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />

        <div className="mt-4 grid gap-2">
          {wagerOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setWagerOn(option.id)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                wagerOn === option.id
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-300/70"
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
            disabled={wallet.chips <= 0}
            className="rounded-lg bg-cyan-300 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-200"
          >
            Add Bet
          </button>
          <button
            type="button"
            onClick={clearBets}
            disabled={activeBets.length === 0}
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
                No baccarat bets placed.
              </div>
            ) : (
              activeBets.map((activeBet) => (
                <div
                  key={activeBet.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                >
                  <span className="font-bold text-slate-100">{winnerLabel(activeBet.type)}</span>
                  <span className="text-slate-300">{activeBet.amount}</span>
                  <button
                    type="button"
                    onClick={() => removeBet(activeBet.id)}
                    className="rounded-md border border-white/10 px-2 py-1 text-xs font-bold text-slate-300 transition hover:border-red-300 hover:text-red-200"
                    aria-label={`Remove ${winnerLabel(activeBet.type)} bet`}
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
          onClick={deal}
          disabled={totalBet <= 0 || wallet.chips < totalBet}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-sky-300 to-cyan-500 px-4 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
        >
          Deal {totalBet > 0 ? `${totalBet} Chips` : "Baccarat"}
        </button>

        <p className={`result-message mt-4 rounded-lg border border-cyan-300/20 bg-cyan-950/25 p-4 text-sm leading-6 text-cyan-100 ${resultTone ? `is-${resultTone}` : ""}`}>
          {message}
        </p>
      </div>

      <div className={`result-stage rounded-lg border border-cyan-300/20 bg-[linear-gradient(135deg,#0f2f3b,#071419)] p-5 shadow-2xl shadow-black/30 ${resultTone ? `is-${resultTone}` : ""}`}>
        <ResultBurst tone={resultTone} resultKey={roundId} delay="720ms" />
        <BaccaratHand
          label="Player"
          hand={playerHand}
          score={handValue(playerHand)}
          roundId={roundId}
          dealOffset={0}
          isWinningHand={winner === "player" || winner === "tie"}
        />
        <div className="my-6 h-px bg-white/10" />
        <BaccaratHand
          label="Banker"
          hand={bankerHand}
          score={handValue(bankerHand)}
          roundId={roundId}
          dealOffset={1}
          isWinningHand={winner === "banker" || winner === "tie"}
        />
      </div>
    </section>
  );
}

function winnerLabel(winner) {
  if (winner === "player") return "Player";
  if (winner === "banker") return "Banker";
  return "Tie";
}

function BaccaratHand({ label, hand, score, roundId, dealOffset = 0, isWinningHand = false }) {
  return (
    <div className={`hand-row ${isWinningHand ? "is-winning" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-[0.22em] text-slate-200">{label}</h2>
        <span className="rounded-full border border-white/10 px-4 py-1 text-sm font-black text-cyan-200">
          {score}
        </span>
      </div>
      <div className="flex min-h-32 flex-wrap items-center justify-center gap-3">
        {hand.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/20 px-5 py-10 text-slate-400">
            Waiting for deal
          </div>
        ) : (
          hand.map((card, index) => (
            <BaccaratCard
              key={`${roundId}-${card.rank}${card.suit}${index}`}
              card={card}
              dealIndex={dealOffset + index * 2}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BaccaratCard({ card, dealIndex }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div
      className="playing-card card-face flex h-28 w-20 flex-col justify-between rounded-lg border-2 border-cyan-200 bg-white p-2 font-black text-slate-950 shadow-xl"
      style={{ "--deal-delay": `${dealIndex * 90}ms` }}
    >
      <div className={isRed ? "text-red-500" : "text-slate-950"}>{card.rank}</div>
      <div className={`self-center text-4xl ${isRed ? "text-red-500" : "text-slate-950"}`}>{card.suit}</div>
      <div className={`self-end ${isRed ? "text-red-500" : "text-slate-950"}`}>{card.rank}</div>
    </div>
  );
}
