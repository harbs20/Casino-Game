import { useState } from "react";

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

export default function Baccarat({ wallet }) {
  const [bet, setBet] = useState(50);
  const [wagerOn, setWagerOn] = useState("banker");
  const [playerHand, setPlayerHand] = useState([]);
  const [bankerHand, setBankerHand] = useState([]);
  const [message, setMessage] = useState("Back player, banker, or tie. Closest to 9 wins.");

  function deal() {
    const wager = cleanBet(bet, wallet.chips);
    if (!wallet.chargeBet(wager)) return;

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

    let payout = 0;
    if (winner === "tie" && wagerOn !== "tie") payout = wager;
    if (winner === wagerOn && winner === "player") payout = wager * 2;
    if (winner === wagerOn && winner === "banker") payout = Math.floor(wager * 1.95);
    if (winner === wagerOn && winner === "tie") payout = wager * 9;

    const nextMessage =
      payout > 0
        ? `${winnerLabel(winner)} wins. Baccarat paid ${payout} chips.`
        : `${winnerLabel(winner)} wins. Your ${winnerLabel(wagerOn).toLowerCase()} bet missed.`;

    setPlayerHand(nextPlayer);
    setBankerHand(nextBanker);
    setMessage(nextMessage);
    wallet.settleGame(payout, {
      profit: payout - wager,
      game: "Baccarat",
      message: nextMessage,
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-[#101c18] p-5 shadow-xl shadow-black/25">
        <label htmlFor="baccarat-bet" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          Baccarat Bet
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

        <button
          type="button"
          onClick={deal}
          disabled={wallet.chips <= 0}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-sky-300 to-cyan-500 px-4 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
        >
          Deal Baccarat
        </button>

        <p className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-950/25 p-4 text-sm leading-6 text-cyan-100">
          {message}
        </p>
      </div>

      <div className="rounded-lg border border-cyan-300/20 bg-[linear-gradient(135deg,#0f2f3b,#071419)] p-5 shadow-2xl shadow-black/30">
        <BaccaratHand label="Player" hand={playerHand} score={handValue(playerHand)} />
        <div className="my-6 h-px bg-white/10" />
        <BaccaratHand label="Banker" hand={bankerHand} score={handValue(bankerHand)} />
      </div>
    </section>
  );
}

function winnerLabel(winner) {
  if (winner === "player") return "Player";
  if (winner === "banker") return "Banker";
  return "Tie";
}

function BaccaratHand({ label, hand, score }) {
  return (
    <div>
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
          hand.map((card, index) => <BaccaratCard key={`${card.rank}${card.suit}${index}`} card={card} />)
        )}
      </div>
    </div>
  );
}

function BaccaratCard({ card }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div className="playing-card flex h-28 w-20 flex-col justify-between rounded-lg border-2 border-cyan-200 bg-white p-2 font-black text-slate-950 shadow-xl">
      <div className={isRed ? "text-red-500" : "text-slate-950"}>{card.rank}</div>
      <div className={`self-center text-4xl ${isRed ? "text-red-500" : "text-slate-950"}`}>{card.suit}</div>
      <div className={`self-end ${isRed ? "text-red-500" : "text-slate-950"}`}>{card.rank}</div>
    </div>
  );
}
