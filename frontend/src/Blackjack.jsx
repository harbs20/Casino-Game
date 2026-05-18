import { useState } from "react";

const suits = ["♠", "♥", "♦", "♣"];
const ranks = [
  { rank: "A", value: 11 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 10 },
  { rank: "Q", value: 10 },
  { rank: "K", value: 10 },
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
  let value = hand.reduce((sum, card) => sum + card.value, 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
}

function isNatural(hand) {
  return hand.length === 2 && handValue(hand) === 21;
}

function cleanBet(value, max) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.min(Math.floor(amount), max));
}

export default function Blackjack({ wallet }) {
  const [bet, setBet] = useState(100);
  const [roundBet, setRoundBet] = useState(0);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [phase, setPhase] = useState("betting");
  const [message, setMessage] = useState("Set a bet and deal into the shoe.");

  const canAct = phase === "playing";
  const playerScore = handValue(player);
  const dealerScore = handValue(dealer);

  function settleRound(payout, nextMessage, nextDeck, nextPlayer, nextDealer, wager = roundBet) {
    wallet.settleGame(payout, {
      profit: payout - wager,
      game: "Blackjack",
      message: nextMessage,
    });
    setDeck(nextDeck);
    setPlayer(nextPlayer);
    setDealer(nextDealer);
    setMessage(nextMessage);
    setPhase("roundover");
  }

  function resolveDealer(nextDeck, nextPlayer, nextDealer, wager) {
    const dealerHand = [...nextDealer];
    const shoe = [...nextDeck];
    while (handValue(dealerHand) < 17) {
      dealerHand.push(shoe.pop());
    }

    const finalPlayerScore = handValue(nextPlayer);
    const finalDealerScore = handValue(dealerHand);
    let payout = 0;
    let nextMessage = "Dealer wins the hand.";

    if (finalDealerScore > 21 || finalPlayerScore > finalDealerScore) {
      payout = wager * 2;
      nextMessage = `You win ${wager} chips.`;
    } else if (finalPlayerScore === finalDealerScore) {
      payout = wager;
      nextMessage = "Push. Your bet is returned.";
    }

    settleRound(payout, nextMessage, shoe, nextPlayer, dealerHand, wager);
  }

  function deal() {
    const wager = cleanBet(bet, wallet.chips);
    if (!wallet.chargeBet(wager)) return;

    const shoe = shuffle(createDeck());
    const nextPlayer = [shoe.pop(), shoe.pop()];
    const nextDealer = [shoe.pop(), shoe.pop()];
    const playerBlackjack = isNatural(nextPlayer);
    const dealerBlackjack = isNatural(nextDealer);

    setRoundBet(wager);
    setDeck(shoe);
    setPlayer(nextPlayer);
    setDealer(nextDealer);

    if (playerBlackjack || dealerBlackjack) {
      if (playerBlackjack && dealerBlackjack) {
        settleRound(wager, "Both hands have blackjack. Push.", shoe, nextPlayer, nextDealer, wager);
      } else if (playerBlackjack) {
        const payout = Math.floor(wager * 2.5);
        settleRound(payout, `Blackjack pays ${payout - wager} chips.`, shoe, nextPlayer, nextDealer, wager);
      } else {
        settleRound(0, "Dealer has blackjack.", shoe, nextPlayer, nextDealer, wager);
      }
      return;
    }

    setMessage("Your move. Hit, stand, or double down.");
    setPhase("playing");
  }

  function hit() {
    if (!canAct) return;
    const shoe = [...deck];
    const nextPlayer = [...player, shoe.pop()];
    setDeck(shoe);
    setPlayer(nextPlayer);

    if (handValue(nextPlayer) > 21) {
      settleRound(0, "You busted. Dealer takes the bet.", shoe, nextPlayer, dealer);
    }
  }

  function stand() {
    if (!canAct) return;
    resolveDealer(deck, player, dealer, roundBet);
  }

  function doubleDown() {
    if (!canAct || player.length !== 2) return;
    if (!wallet.chargeBet(roundBet)) return;

    const doubledBet = roundBet * 2;
    const shoe = [...deck];
    const nextPlayer = [...player, shoe.pop()];
    setRoundBet(doubledBet);
    setDeck(shoe);
    setPlayer(nextPlayer);

    if (handValue(nextPlayer) > 21) {
      settleRound(0, "Double down drew a bust card.", shoe, nextPlayer, dealer, doubledBet);
      return;
    }

    resolveDealer(shoe, nextPlayer, dealer, doubledBet);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-[#101c18] p-5 shadow-xl shadow-black/25">
        <label htmlFor="blackjack-bet" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          Bet Amount
        </label>
        <div className="mt-3 flex rounded-lg border border-white/10 bg-black/30">
          <span className="grid w-12 place-items-center text-emerald-300">$</span>
          <input
            id="blackjack-bet"
            type="number"
            min="10"
            step="10"
            value={bet}
            disabled={phase === "playing"}
            onChange={(event) => setBet(cleanBet(event.target.value, 100000))}
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-white outline-none"
          />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {[25, 100, 250, wallet.chips].map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={phase === "playing"}
              onClick={() => setBet(cleanBet(amount, wallet.chips))}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-yellow-300 hover:text-yellow-200"
            >
              {amount === wallet.chips ? "Max" : amount}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={deal}
          disabled={phase === "playing" || wallet.chips <= 0}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-yellow-300 to-amber-500 px-4 py-3 font-black text-emerald-950 shadow-lg shadow-yellow-500/20 transition hover:brightness-110"
        >
          Deal Cards
        </button>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Round Bet</div>
          <div className="mt-1 text-2xl font-black text-white">{roundBet} chips</div>
        </div>

        <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-950/30 p-4 text-sm leading-6 text-emerald-100">
          {message}
        </p>
      </div>

      <div className="rounded-lg border border-emerald-300/20 bg-[linear-gradient(135deg,#0c3b2e,#071b16)] p-5 shadow-2xl shadow-black/30">
        <TableRow
          label="Dealer"
          score={phase === "playing" ? "?" : dealerScore}
          cards={dealer}
          hideSecond={phase === "playing"}
        />

        <div className="my-6 h-px bg-white/10" />

        <TableRow label="You" score={playerScore} cards={player} />

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            disabled={!canAct}
            onClick={hit}
            className="rounded-lg bg-slate-100 px-6 py-3 font-black text-slate-950 transition hover:bg-white"
          >
            Hit
          </button>
          <button
            type="button"
            disabled={!canAct}
            onClick={stand}
            className="rounded-lg bg-emerald-400 px-6 py-3 font-black text-emerald-950 transition hover:bg-emerald-300"
          >
            Stand
          </button>
          <button
            type="button"
            disabled={!canAct || player.length !== 2 || wallet.chips < roundBet}
            onClick={doubleDown}
            className="rounded-lg bg-yellow-300 px-6 py-3 font-black text-emerald-950 transition hover:bg-yellow-200"
          >
            Double
          </button>
        </div>
      </div>
    </section>
  );
}

function TableRow({ label, score, cards, hideSecond = false }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-[0.22em] text-slate-200">{label}</h2>
        <span className="rounded-full border border-white/10 px-4 py-1 text-sm font-black text-emerald-200">
          {score}
        </span>
      </div>
      <div className="flex min-h-32 flex-wrap items-center justify-center gap-3">
        {cards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/20 px-5 py-10 text-slate-400">
            Waiting for deal
          </div>
        ) : (
          cards.map((card, index) => (
            <PlayingCard key={`${card.rank}${card.suit}${index}`} card={card} hidden={hideSecond && index === 1} />
          ))
        )}
      </div>
    </div>
  );
}

function PlayingCard({ card, hidden }) {
  if (hidden) {
    return (
      <div className="playing-card grid h-28 w-20 place-items-center rounded-lg border-2 border-slate-200 bg-[#111827] shadow-xl">
        <div className="grid h-12 w-12 place-items-center rounded-full border border-white/40 text-2xl text-slate-200">
          ♠
        </div>
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div className="playing-card flex h-28 w-20 flex-col justify-between rounded-lg border-2 border-yellow-300 bg-white p-2 font-black text-slate-950 shadow-xl">
      <div className={isRed ? "text-red-500" : "text-slate-950"}>{card.rank}</div>
      <div className={`self-center text-4xl ${isRed ? "text-red-500" : "text-slate-950"}`}>{card.suit}</div>
      <div className={`self-end ${isRed ? "text-red-500" : "text-slate-950"}`}>{card.rank}</div>
    </div>
  );
}
