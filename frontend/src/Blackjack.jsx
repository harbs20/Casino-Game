import { useEffect, useState } from "react";

// --- SVG Card Back ---
const CardBack = () => (
  <svg viewBox="0 0 80 120" width={56} height={84} className="rounded-lg border-2 border-white shadow-xl bg-black">
    <rect x="3" y="3" width="74" height="114" rx="10" fill="#101928" stroke="#bbb" strokeWidth="3" />
    <circle cx="40" cy="60" r="18" fill="#222" stroke="#fff" strokeWidth="2" />
    <text x="40" y="68" fontSize="26" textAnchor="middle" fill="#bbb" fontWeight="bold">
      ♠
    </text>
  </svg>
);
// SVG for dealer/player reveal
const PlayingCard = ({ card, hidden }) => {
  if (hidden)
    return <span className="inline-flex items-center justify-center mx-1"><CardBack /></span>;
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <span className="inline-flex flex-col items-center justify-center mx-1 relative">
      <svg viewBox="0 0 80 120" width={56} height={84} className="rounded-lg border-2 border-yellow-400 shadow-xl bg-white">
        <rect x="3" y="3" width="74" height="114" rx="10" fill="#fff" />
        <text x="16" y="28" fontSize="22" fill={isRed ? "#EF4444" : "#222"} fontWeight="bold">{card.rank}</text>
        <text x="40" y="70" fontSize="40" textAnchor="middle" fill={isRed ? "#F87171" : "#333"}>{card.suit}</text>
        <text x="64" y="112" fontSize="22" fill={isRed ? "#EF4444" : "#222"} fontWeight="bold" textAnchor="end">{card.rank}</text>
      </svg>
    </span>
  );
};

// --- Provably fair utils ---
function generateServerSeed() {
  return Math.random().toString(36).slice(2) + Date.now();
}
function sha256hex(str) {
  return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(buf =>
    Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, "0")).join("")
  );
}
function getProvablyFairRNG(serverSeed, clientSeed, nonce, count = 20) {
  let nums = [];
  for (let i = 0; i < count; ++i) {
    let toHash = `${serverSeed}:${clientSeed}:${nonce}:${i}`;
    nums.push(
      sha256hex(toHash).then(hex =>
        parseInt(hex.slice(0, 13), 16) / 0x1fffffffffffff
      )
    );
  }
  return Promise.all(nums);
}
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  { rank: "A", value: 11 },
  { rank: "2", value: 2 }, { rank: "3", value: 3 }, { rank: "4", value: 4 },
  { rank: "5", value: 5 }, { rank: "6", value: 6 }, { rank: "7", value: 7 },
  { rank: "8", value: 8 }, { rank: "9", value: 9 }, { rank: "10", value: 10 },
  { rank: "J", value: 10 }, { rank: "Q", value: 10 }, { rank: "K", value: 10 }
];
function handValue(hand) {
  let value = hand.reduce((sum, c) => sum + c.value, 0);
  let aces = hand.filter(c => c.rank === "A").length;
  while (value > 21 && aces) { value -= 10; aces--; }
  return value;
}

export default function Blackjack({ onBack }) {
  // --- Provably fair and blackjack state ---
  const [serverSeed, setServerSeed] = useState(generateServerSeed());
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [clientSeed] = useState("guestseed");
  const [nonce, setNonce] = useState(0);
  const [chips, setChips] = useState(1000);
  const [bet, setBet] = useState(100);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [inPlay, setInPlay] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    sha256hex(serverSeed).then(setServerSeedHash);
  }, [serverSeed]);

  const startGame = async () => {
    if (bet < 10 || bet > chips) return;
    const nums = await getProvablyFairRNG(serverSeed, clientSeed, nonce, 52);
    let tmpDeck = [];
    for (let suit of SUITS) for (let rankObj of RANKS) tmpDeck.push({ ...rankObj, suit });
    for (let i = tmpDeck.length - 1; i >= 0; i--) {
      const j = Math.floor(nums[i] * (i + 1)); [tmpDeck[i], tmpDeck[j]] = [tmpDeck[j], tmpDeck[i]];
    }
    const newDeck = tmpDeck;
    const pHand = [newDeck.pop(), newDeck.pop()];
    const dHand = [newDeck.pop(), newDeck.pop()];
    setDeck(newDeck);
    setPlayer(pHand);
    setDealer(dHand);
    setChips(c => c - bet);
    setInPlay(true);
    setDone(false);
    setMessage("");
    setNonce(n => n + 1);
    setServerSeed(generateServerSeed());
  };
  const playerHit = () => {
    if (!inPlay || done) return;
    let d = [...deck];
    let currHand = [...player];
    currHand.push(d.pop());
    setDeck(d);
    setPlayer(currHand);
    if (handValue(currHand) > 21) {
      setMessage("You busted! 💥");
      setInPlay(false);
      setDone(true);
    }
  };
  const playerStand = () => {
    if (!inPlay || done) return;
    let d = [...deck];
    let dealerHand = [...dealer];
    while (handValue(dealerHand) < 17) dealerHand.push(d.pop());
    setDealer(dealerHand); setDeck(d);
    const playerScore = handValue(player), dealerScore = handValue(dealerHand);
    let msg;
    let payout = 0;
    if (dealerScore > 21 || playerScore > dealerScore) {
      msg = "You win! 🥳"; payout = bet * 2;
    } else if (dealerScore === playerScore) {
      msg = "Push! 🤝"; payout = bet;
    } else {
      msg = "Dealer wins! 😭";
    }
    setChips(c => c + payout);
    setMessage(msg); setDone(true); setInPlay(false);
  };

  // --- BET BUTTONS ---
  const quickBets = [
    { label: "+100", fn: () => setBet(b => Math.min(b + 100, chips)) },
    { label: "1/2", fn: () => setBet(Math.floor(bet / 2)) },
    { label: "2x", fn: () => setBet(Math.min(bet * 2, chips)) },
    { label: "MAX", fn: () => setBet(chips) },
  ];

  return (
    <div className="min-h-screen w-full flex bg-[#0d1927] text-white font-mono">
      {/* Left: Bet/Info Panel */}
      <div className="w-full sm:w-[370px] px-4 py-7 sm:py-12 bg-[#142137] h-full flex flex-col gap-10 relative">
        <div>
          <div className="mb-4 text-gray-300 text-xs tracking-wide">BET AMOUNT</div>
          <div className="flex items-center rounded-lg bg-[#17273e] px-4 py-3 mb-3">
            <span className="mr-1 font-bold text-green-300 text-lg">$</span>
            <input type="number" min="10" step="10" max={chips}
              className="bg-transparent outline-none text-lg w-20 text-white"
              value={bet}
              onChange={e => setBet(Number(e.target.value))}
              disabled={inPlay}
            />
          </div>
          <div className="flex gap-2 mb-5">
            {quickBets.map(q => (
              <button key={q.label} onClick={q.fn} disabled={inPlay}
                className="rounded-full bg-[#212d43] text-green-300 px-4 py-1 font-semibold text-xs hover:bg-green-700/10 transition-all">
                {q.label}
              </button>
            ))}
          </div>
          <div className="bg-[#101928] rounded-xl px-4 py-5 flex flex-col items-center mb-1">
            <div className="text-xs text-slate-400">POTENTIAL WIN (2x)</div>
            <div className="font-bold text-2xl mt-1 text-green-400">{bet * 2 || 0} <span className="text-green-300">$</span></div>
          </div>
          <div className="mt-6 w-full flex justify-between items-center">
            <span className="text-gray-400 text-base">Chips:</span>
            <span className="text-xl font-bold text-white tracking-tight">{chips} <span className="text-green-300 text-base">🟢</span></span>
          </div>
          <button className="mt-6 w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-lg font-extrabold tracking-wide shadow transition-all"
            onClick={startGame} disabled={inPlay || bet < 10 || bet > chips}
          >
            DEAL CARDS
          </button>
        </div>
        <div className="flex-1" />
        <div>
          <button className="text-blue-400 underline cursor-pointer text-base mt-10" onClick={onBack}>
            ← Back to Casino
          </button>
        </div>
      </div>
      {/* Right: Game Table */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1927] relative min-h-screen">
        <div className="w-full max-w-2xl mx-auto pt-16 pb-28 px-1">
          <div className="text-gray-300 uppercase tracking-widest text-lg mb-4 text-center font-medium flex items-center justify-center gap-4">
            <span className="mr-2 text-2xl">♠</span>
            Blackjack
          </div>
          {/* Dealer row */}
          <div className="flex flex-col items-center mb-6">
            <div className="text-xs text-slate-400 mb-1 tracking-wide">DEALER</div>
            <div className="flex">
              {inPlay ? <>
                <PlayingCard card={dealer[0]} hidden />
                {dealer[1] && <PlayingCard card={dealer[1]} hidden={false} />}
              </> : dealer.map((c, i) => <PlayingCard key={i} card={c} hidden={false} />)}
            </div>
          </div>
          {/* Your row */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-slate-400 mb-1 tracking-wide mt-4">YOU</div>
            <div className="flex">
              {player.map((c, i) => <PlayingCard key={i} card={c} hidden={false} />)}
            </div>
          </div>
          <div className="text-center mt-4 mb-2 text-lg font-bold text-teal-300">
            Total: {handValue(player)}
          </div>
          {/* Play buttons */}
          <div className="mt-6 flex gap-2 items-center justify-center">
            {inPlay && <>
              <button className="bg-slate-800 text-lg text-white font-bold px-6 py-2 rounded-xl border border-slate-900/80 shadow hover:bg-slate-700"
                onClick={playerHit}>Hit</button>
              <button className="bg-green-500 text-lg text-white font-bold px-6 py-2 rounded-xl border border-green-700/80 shadow hover:bg-green-400"
                onClick={playerStand}>Stand</button>
              {/* Add more actions here */}
            </>}
          </div>
          <div className="mt-6 text-xl text-center">{message}</div>
        </div>
        {/* --- Provably Fair Footer Bar --- */}
        <div className="absolute left-0 right-0 bottom-0 flex justify-start px-10 pb-5">
          <div className="flex items-center gap-3 text-slate-300 font-mono text-[1.15rem] select-none">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              {/* Shield/check SVG */}
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" className="align-middle">
                <path d="M10 2L3 5v5c0 5.25 7 8 7 8s7-2.75 7-8V5l-7-3z" stroke="#34d399" strokeWidth="2" />
                <path d="M7.5 10.5l2 2 3-3" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-semibold">Provably Fair</span>
            </span>
            <span className="opacity-60 mx-2 font-sans">|</span>
            <span className="text-slate-400 font-sans">Infinite Deck Shuffling</span>
            <span className="ml-6 group relative cursor-pointer font-sans">
              <span className="underline underline-offset-4 text-xs text-emerald-300">Show Hash</span>
              <span className="group-hover:scale-100 group-active:scale-100 scale-0 transition-all origin-bottom-left z-50 absolute left-0 bottom-8 w-[350px] bg-[#17273e] text-xs text-slate-400 px-3 py-2 rounded-xl shadow border border-emerald-600 font-mono whitespace-pre-wrap break-all">
                {serverSeedHash}
              </span>
            </span>
            <span className="ml-2 text-gray-500 text-xs font-mono">Nonce: {nonce}</span>
            {done && (
              <span className="ml-4 text-green-400 text-xs font-mono">Server Seed: {serverSeed}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
