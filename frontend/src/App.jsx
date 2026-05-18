import { useEffect, useState } from "react";
import Baccarat from "./Baccarat";
import Blackjack from "./Blackjack";
import Roulette from "./Roulette";
import Slots from "./Slots";

const PROFILE_KEY = "casino-royale-profile-v1";

const defaultProfile = {
  username: "Guest Player",
  level: 1,
  xp: 0,
  chips: 1000,
  cashIns: 0,
  gamesPlayed: 0,
  biggestWin: 0,
  totalCashedOut: 0,
};

const games = [
  {
    id: "blackjack",
    name: "Blackjack",
    icon: "A",
    accent: "from-amber-300 to-yellow-500",
    description: "Hit, stand, or double down against the dealer.",
    detail: "Dealer stands on 17",
    component: Blackjack,
  },
  {
    id: "slots",
    name: "Slots",
    icon: "7",
    accent: "from-fuchsia-400 to-rose-500",
    description: "Spin three rows and chase center-line payouts.",
    detail: "Five win lines",
    component: Slots,
  },
  {
    id: "roulette",
    name: "Roulette",
    icon: "0",
    accent: "from-red-500 to-emerald-400",
    description: "Pick colors, odds, ranges, or one lucky number.",
    detail: "0-36 wheel",
    component: Roulette,
  },
  {
    id: "baccarat",
    name: "Baccarat",
    icon: "9",
    accent: "from-sky-300 to-cyan-500",
    description: "Back player, banker, or tie. Closest to 9 wins.",
    detail: "Simple third-card draw",
    component: Baccarat,
  },
];

function loadProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? { ...defaultProfile, ...JSON.parse(stored) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

function formatChips(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function cleanAmount(value, fallback = 0) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return Math.max(0, Math.floor(amount));
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [screen, setScreen] = useState("lobby");
  const [cashOutAmount, setCashOutAmount] = useState(250);
  const [notice, setNotice] = useState("Cash in chips, play the tables, then cash out chips for XP.");

  const activeGame = games.find((game) => game.id === screen);
  const ActiveGame = activeGame?.component;
  const cashInAmount = profile.level * 500;
  const xpPercent = Math.min(100, (profile.xp / 1000) * 100);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  function cashIn() {
    setProfile((current) => ({
      ...current,
      chips: current.chips + current.level * 500,
      cashIns: current.cashIns + 1,
    }));
    setNotice(`Cashier issued ${formatChips(cashInAmount)} chips for Level ${profile.level}.`);
  }

  function cashOut() {
    const amount = Math.min(cleanAmount(cashOutAmount), profile.chips);
    if (amount <= 0) {
      setNotice("Choose how many chips you want to cash out first.");
      return;
    }

    const totalXp = profile.xp + amount;
    const levelsGained = Math.floor(totalXp / 1000);

    setProfile((current) => {
      const safeAmount = Math.min(amount, current.chips);
      const nextTotalXp = current.xp + safeAmount;
      return {
        ...current,
        chips: current.chips - safeAmount,
        xp: nextTotalXp % 1000,
        level: current.level + Math.floor(nextTotalXp / 1000),
        totalCashedOut: current.totalCashedOut + safeAmount,
      };
    });

    setNotice(
      levelsGained > 0
        ? `Cashed out ${formatChips(amount)} chips for XP. Level ${profile.level + levelsGained} unlocked.`
        : `Cashed out ${formatChips(amount)} chips for ${formatChips(amount)} XP.`
    );
    setCashOutAmount(0);
  }

  function chargeBet(amount) {
    const wager = cleanAmount(amount);
    if (wager <= 0) {
      setNotice("Bets need to be at least 1 chip.");
      return false;
    }
    if (wager > profile.chips) {
      setNotice("Not enough chips for that bet. Cash in or lower the wager.");
      return false;
    }
    setProfile((current) => ({ ...current, chips: current.chips - wager }));
    return true;
  }

  function settleGame(payout, result = {}) {
    const safePayout = cleanAmount(payout);
    const profit = cleanAmount(result.profit);
    setProfile((current) => ({
      ...current,
      chips: current.chips + safePayout,
      gamesPlayed: current.gamesPlayed + 1,
      biggestWin: Math.max(current.biggestWin, profit),
    }));
    if (result.message) setNotice(result.message);
  }

  const wallet = {
    chips: profile.chips,
    chargeBet,
    settleGame,
    setNotice,
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#06130f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_32rem),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_34rem)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Header profile={profile} xpPercent={xpPercent} onLobby={() => setScreen("lobby")} />

        {screen === "lobby" ? (
          <main className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="flex min-h-[560px] flex-col justify-center">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                  Level-based casino bank
                </p>
                <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">
                  Casino Royale
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Cash in for chips based on your level, play the tables, then cash out winnings for XP.
                  Every 1000 XP raises your level and makes the cashier more generous.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {games.map((game) => (
                  <GameTile key={game.id} game={game} onPlay={() => setScreen(game.id)} />
                ))}
              </div>
            </section>

            <CashierPanel
              profile={profile}
              notice={notice}
              cashInAmount={cashInAmount}
              cashOutAmount={cashOutAmount}
              xpPercent={xpPercent}
              onCashIn={cashIn}
              onCashOut={cashOut}
              onCashOutAmount={setCashOutAmount}
            />
          </main>
        ) : (
          <main className="flex-1 py-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen("lobby")}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-emerald-200"
                >
                  Back to lobby
                </button>
                <h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">{activeGame.name}</h1>
                <p className="mt-2 text-slate-300">{activeGame.description}</p>
              </div>
              <div className="rounded-lg border border-emerald-300/30 bg-emerald-950/50 px-4 py-3 text-left shadow-2xl shadow-black/20">
                <div className="text-xs uppercase tracking-[0.22em] text-emerald-300">Live Wallet</div>
                <div className="mt-1 text-2xl font-black text-white">{formatChips(profile.chips)} chips</div>
              </div>
            </div>

            {ActiveGame && <ActiveGame wallet={wallet} />}
          </main>
        )}
      </div>
    </div>
  );
}

function Header({ profile, xpPercent, onLobby }) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onLobby} className="flex items-center gap-3 text-left">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-yellow-300 to-amber-500 text-xl font-black text-emerald-950 shadow-lg shadow-yellow-500/20">
          CR
        </span>
        <span>
          <span className="block text-lg font-black text-white">Casino Royale</span>
          <span className="block text-sm text-slate-400">{profile.username}</span>
        </span>
      </button>

      <div className="grid gap-3 sm:grid-cols-3 sm:items-center">
        <Stat label="Chips" value={formatChips(profile.chips)} />
        <Stat label="Level" value={profile.level} />
        <div className="min-w-52 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
          <div className="flex justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
            <span>XP</span>
            <span>{profile.xp}/1000</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-yellow-300 transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function GameTile({ game, onPlay }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group min-h-48 rounded-lg border border-white/10 bg-white/[0.06] p-5 text-left shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-yellow-300/70 hover:bg-white/[0.09]"
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`grid h-14 w-14 place-items-center rounded-lg bg-gradient-to-br ${game.accent} text-2xl font-black text-slate-950 shadow-lg`}
        >
          {game.icon}
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          {game.detail}
        </span>
      </div>
      <h2 className="mt-6 text-2xl font-black text-white">{game.name}</h2>
      <p className="mt-2 leading-6 text-slate-300">{game.description}</p>
      <span className="mt-5 inline-flex text-sm font-bold text-yellow-300 transition group-hover:text-yellow-200">
        Play table
      </span>
    </button>
  );
}

function CashierPanel({
  profile,
  notice,
  cashInAmount,
  cashOutAmount,
  xpPercent,
  onCashIn,
  onCashOut,
  onCashOutAmount,
}) {
  const quickAmounts = [
    { label: "25%", value: Math.floor(profile.chips * 0.25) },
    { label: "50%", value: Math.floor(profile.chips * 0.5) },
    { label: "Max", value: profile.chips },
  ];

  return (
    <aside className="self-start rounded-lg border border-yellow-300/25 bg-[#111c18]/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Cashier</h2>
          <p className="mt-1 text-sm text-slate-400">Chips in, XP out.</p>
        </div>
        <div className="rounded-lg bg-yellow-300 px-3 py-2 text-right text-emerald-950">
          <div className="text-xs font-bold uppercase">Cash In</div>
          <div className="text-lg font-black">+{formatChips(cashInAmount)}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCashIn}
        className="mt-5 w-full rounded-lg bg-gradient-to-r from-yellow-300 to-amber-500 px-4 py-3 font-black text-emerald-950 shadow-lg shadow-yellow-500/20 transition hover:brightness-110"
      >
        Cash In Level {profile.level} Chips
      </button>

      <div className="mt-6 border-t border-white/10 pt-6">
        <label htmlFor="cash-out" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          Cash Out For XP
        </label>
        <div className="mt-3 flex overflow-hidden rounded-lg border border-white/10 bg-black/30">
          <input
            id="cash-out"
            type="number"
            min="0"
            max={profile.chips}
            value={cashOutAmount}
            onChange={(event) => onCashOutAmount(cleanAmount(event.target.value))}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
          />
          <button
            type="button"
            onClick={onCashOut}
            className="bg-emerald-400 px-4 py-3 font-black text-emerald-950 transition hover:bg-emerald-300"
          >
            Convert
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {quickAmounts.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onCashOutAmount(item.value)}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-emerald-300 hover:text-emerald-200"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-black/25 p-4">
        <div className="flex justify-between text-sm text-slate-300">
          <span>Level progress</span>
          <span>{profile.xp}/1000 XP</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-yellow-300 transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-950/35 p-4 text-sm leading-6 text-emerald-100">
        {notice}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <SummaryItem label="Games" value={profile.gamesPlayed} />
        <SummaryItem label="Cash Ins" value={profile.cashIns} />
        <SummaryItem label="Best Win" value={formatChips(profile.biggestWin)} />
        <SummaryItem label="XP Banked" value={formatChips(profile.totalCashedOut)} />
      </dl>
    </aside>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3">
      <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="mt-1 font-black text-white">{value}</dd>
    </div>
  );
}
