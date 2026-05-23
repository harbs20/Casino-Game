import { useEffect, useRef, useState } from "react";
import Baccarat from "./Baccarat";
import Blackjack from "./Blackjack";
import Roulette from "./Roulette";
import Slots from "./Slots";
import {
  achievementDefinitions,
  addHistoryEntry,
  addLedgerEntry,
  calculateStats,
  CASH_IN_LOW_CHIP_LIMIT,
  CASH_IN_ROUND_COOLDOWN,
  claimDailyChallenge,
  createProfile,
  dailyChallengeTemplates,
  getCashInAmount,
  getCashInEligibility,
  getCashOutAvailable,
  getUnlockedThemes,
  getXpRequirement,
  getVipTier,
  loadCasinoStore,
  makeId,
  normalizeProfile,
  normalizeStore,
  PROFILE_STORE_KEY,
  unlockAchievements,
  updateDailyProgress,
} from "./casinoProgress";

const games = [
  {
    id: "blackjack",
    name: "Blackjack",
    icon: "A",
    accent: "from-amber-300 to-yellow-500",
    description: "Hit, stand, double down, or chase a pair side bet.",
    detail: "Pair side bet",
    component: Blackjack,
  },
  {
    id: "slots",
    name: "Slots",
    icon: "7",
    accent: "from-fuchsia-400 to-rose-500",
    description: "Spin five lines and back a bonus symbol.",
    detail: "Bonus bet",
    component: Slots,
  },
  {
    id: "roulette",
    name: "Roulette",
    icon: "0",
    accent: "from-red-500 to-emerald-400",
    description: "Stack color, dozen, column, range, parity, and number bets.",
    detail: "Multi-bet felt",
    component: Roulette,
  },
  {
    id: "baccarat",
    name: "Baccarat",
    icon: "9",
    accent: "from-sky-300 to-cyan-500",
    description: "Back player, banker, tie, or pair side bets.",
    detail: "Pair side bets",
    component: Baccarat,
  },
];
const LEDGER_API_URL = normalizeApiUrl(
  import.meta.env.VITE_LEDGER_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8787" : "")
);
const LEADERBOARD_API_ORIGIN = normalizeApiUrl(import.meta.env.VITE_LEADERBOARD_API_URL || "");
const LEADERBOARD_ENDPOINT = `${LEADERBOARD_API_ORIGIN}/.netlify/functions/leaderboard`;
const LEADERBOARD_CACHE_KEY = "casino-royale-leaderboard-cache-v1";
const MAX_LEADERBOARD_ENTRIES = 25;

function formatChips(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatSigned(value) {
  if (value > 0) return `+${formatChips(value)}`;
  return formatChips(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function cleanAmount(value, fallback = 0) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return Math.max(0, Math.floor(amount));
}

function cleanSignedAmount(value, fallback = 0) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return Math.trunc(amount);
}

function normalizeApiUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function syncLedgerEntry(entry) {
  if (!LEDGER_API_URL) return;

  fetch(`${LEDGER_API_URL}/ledger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

function makeLeaderboardEntry(profile, stats) {
  return {
    profileId: profile.id,
    username: profile.username,
    level: profile.level,
    xp: profile.xp,
    chips: profile.chips,
    totalCashedOut: profile.totalCashedOut,
    gamesPlayed: profile.gamesPlayed,
    biggestWin: profile.biggestWin,
    netProfit: stats.profit,
    winRate: stats.winRate,
    updatedAt: new Date().toISOString(),
  };
}

function rankLeaderboard(entries) {
  return entries
    .filter(Boolean)
    .sort((first, second) => {
      if (second.totalCashedOut !== first.totalCashedOut) return second.totalCashedOut - first.totalCashedOut;
      if (second.level !== first.level) return second.level - first.level;
      if (second.netProfit !== first.netProfit) return second.netProfit - first.netProfit;
      if (second.chips !== first.chips) return second.chips - first.chips;
      return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
    })
    .slice(0, MAX_LEADERBOARD_ENTRIES)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function readCachedLeaderboard() {
  try {
    const cached = JSON.parse(localStorage.getItem(LEADERBOARD_CACHE_KEY) || "[]");
    return rankLeaderboard(Array.isArray(cached) ? cached : []);
  } catch {
    return [];
  }
}

function cacheLeaderboard(entries) {
  const leaderboard = rankLeaderboard(entries);
  localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(leaderboard));
  return leaderboard;
}

function cacheLocalScore(entry) {
  const cached = readCachedLeaderboard().filter((item) => item.profileId !== entry.profileId);
  return cacheLeaderboard([entry, ...cached]);
}

export default function App() {
  const [store, setStore] = useState(loadCasinoStore);
  const [screen, setScreen] = useState("lobby");
  const [cashOutAmount, setCashOutAmount] = useState(250);
  const [notice, setNotice] = useState("Play the tables, then convert net redeemable winnings into XP.");
  const [chipBurst, setChipBurst] = useState(null);
  const [leaderboard, setLeaderboard] = useState(readCachedLeaderboard);
  const [leaderboardStatus, setLeaderboardStatus] = useState("loading");
  const syncedLedgerId = useRef(null);

  const profile = store.profiles.find((item) => item.id === store.activeProfileId) || store.profiles[0];
  const activeGame = games.find((game) => game.id === screen);
  const ActiveGame = activeGame?.component;
  const vipTier = getVipTier(profile.level);
  const cashInAmount = getCashInAmount(profile);
  const cashInEligibility = getCashInEligibility(profile);
  const cashOutAvailable = getCashOutAvailable(profile);
  const xpRequirement = getXpRequirement(profile.level);
  const xpPercent = Math.min(100, (profile.xp / xpRequirement) * 100);
  const stats = calculateStats(profile);
  const unlockedThemes = getUnlockedThemes(profile.level);
  const leaderboardProfileId = profile.id;
  const leaderboardUsername = profile.username;
  const leaderboardLevel = profile.level;
  const leaderboardXp = profile.xp;
  const leaderboardChips = profile.chips;
  const leaderboardTotalCashedOut = profile.totalCashedOut;
  const leaderboardGamesPlayed = profile.gamesPlayed;
  const leaderboardBiggestWin = profile.biggestWin;
  const leaderboardNetProfit = stats.profit;
  const leaderboardWinRate = stats.winRate;

  useEffect(() => {
    localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(normalizeStore(store)));
  }, [store]);

  useEffect(() => {
    let ignore = false;

    async function loadLeaderboard() {
      try {
        const response = await fetch(LEADERBOARD_ENDPOINT);
        if (!response.ok) throw new Error("Leaderboard unavailable");
        const data = await response.json();
        const nextLeaderboard = cacheLeaderboard(data.leaderboard || []);
        if (!ignore) {
          setLeaderboard(nextLeaderboard);
          setLeaderboardStatus("online");
        }
      } catch {
        const cached = readCachedLeaderboard();
        if (!ignore) {
          setLeaderboard(cached);
          setLeaderboardStatus(cached.length > 0 ? "local" : "offline");
        }
      }
    }

    loadLeaderboard();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const latestLedgerEntry = profile.ledger[0];
    if (!profile.backendLedgerEnabled || !latestLedgerEntry || syncedLedgerId.current === latestLedgerEntry.id) return;
    syncedLedgerId.current = latestLedgerEntry.id;
    syncLedgerEntry({
      ...latestLedgerEntry,
      profileId: profile.id,
      username: profile.username,
    });
  }, [profile.backendLedgerEnabled, profile.id, profile.ledger, profile.username]);

  useEffect(() => {
    if (leaderboardGamesPlayed <= 0 && leaderboardTotalCashedOut <= 0) return undefined;

    const entry = {
      profileId: leaderboardProfileId,
      username: leaderboardUsername,
      level: leaderboardLevel,
      xp: leaderboardXp,
      chips: leaderboardChips,
      totalCashedOut: leaderboardTotalCashedOut,
      gamesPlayed: leaderboardGamesPlayed,
      biggestWin: leaderboardBiggestWin,
      netProfit: leaderboardNetProfit,
      winRate: leaderboardWinRate,
      updatedAt: new Date().toISOString(),
    };
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(LEADERBOARD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error("Leaderboard unavailable");
        const data = await response.json();
        setLeaderboard(cacheLeaderboard(data.leaderboard || []));
        setLeaderboardStatus("online");
      } catch {
        setLeaderboard(cacheLocalScore(entry));
        setLeaderboardStatus("local");
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [
    leaderboardBiggestWin,
    leaderboardChips,
    leaderboardGamesPlayed,
    leaderboardLevel,
    leaderboardNetProfit,
    leaderboardProfileId,
    leaderboardTotalCashedOut,
    leaderboardUsername,
    leaderboardWinRate,
    leaderboardXp,
  ]);

  function updateActiveProfile(updater) {
    setStore((current) => {
      const active = current.profiles.find((item) => item.id === current.activeProfileId) || current.profiles[0];
      const nextProfile = normalizeProfile(updater(active));
      return {
        ...current,
        profiles: current.profiles.map((item) => (item.id === active.id ? nextProfile : item)),
      };
    });
  }

  function showChipBurst(type, amount) {
    setChipBurst({ id: makeId("chip"), type, amount });
  }

  function playSound(type) {
    if (!profile.soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const tones = {
      bet: [180, 0.08],
      win: [660, 0.16],
      loss: [120, 0.12],
      cash: [420, 0.14],
      achievement: [820, 0.22],
    };
    const [frequency, duration] = tones[type] || tones.cash;
    oscillator.frequency.value = frequency;
    oscillator.type = type === "loss" ? "sawtooth" : "triangle";
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function finalizeProgress(nextProfile, event) {
    let progressed = updateDailyProgress(nextProfile, event);
    const achievementResult = unlockAchievements(progressed);
    progressed = achievementResult.profile;
    return { profile: progressed, unlocked: achievementResult.unlocked };
  }

  function cashIn() {
    updateActiveProfile((current) => {
      const eligibility = getCashInEligibility(current);
      if (!eligibility.canCashIn) {
        if (!eligibility.bankrollLow) {
          setNotice(`Rescue cash-in opens when your wallet is at ${formatChips(CASH_IN_LOW_CHIP_LIMIT)} chips or less.`);
        } else {
          setNotice(`Play ${eligibility.roundsUntilCashIn} more round${eligibility.roundsUntilCashIn === 1 ? "" : "s"} before another rescue cash-in.`);
        }
        return current;
      }

      playSound("cash");
      const currentTier = getVipTier(current.level);
      const amount = getCashInAmount(current);
      const nextChips = current.chips + amount;
      const ledgerResult = addLedgerEntry(
        {
          ...current,
          chips: nextChips,
          cashIns: current.cashIns + 1,
          nextCashInAtRound: current.gamesPlayed + CASH_IN_ROUND_COOLDOWN,
        },
        { type: "cash-in", amount, balanceAfter: nextChips }
      );
      setNotice(`Cashier issued a ${formatChips(amount)} chip rescue buy-in for Level ${current.level} ${currentTier.label}.`);
      showChipBurst("win", amount);
      return ledgerResult.profile;
    });
  }

  function cashOut() {
    let playedSound = false;
    updateActiveProfile((current) => {
      const available = getCashOutAvailable(current);
      const requestedAmount = cleanAmount(cashOutAmount);
      const amount = Math.min(requestedAmount, available);
      if (amount <= 0) {
        setNotice("Only net table winnings can be converted to XP. Win a round first, then cash out the redeemable chips.");
        return current;
      }

      let nextXp = current.xp + amount;
      let nextLevel = current.level;
      let levelsGained = 0;
      while (nextXp >= getXpRequirement(nextLevel)) {
        nextXp -= getXpRequirement(nextLevel);
        nextLevel += 1;
        levelsGained += 1;
      }

      const cashedOut = {
        ...current,
        chips: current.chips - amount,
        redeemableChips: Math.max(0, current.redeemableChips - amount),
        xp: nextXp,
        level: nextLevel,
        totalCashedOut: current.totalCashedOut + amount,
      };
      const dailyProgress = updateDailyProgress(cashedOut, { type: "cashout", amount });
      const achievementResult = unlockAchievements(dailyProgress);
      const ledgerResult = addLedgerEntry(achievementResult.profile, {
        type: "cash-out",
        amount: -amount,
        xp: amount,
        balanceAfter: achievementResult.profile.chips,
      });

      const unlockText =
        achievementResult.unlocked.length > 0
          ? ` Achievement unlocked: ${achievementResult.unlocked.map((item) => item.title).join(", ")}.`
          : "";
      setNotice(
        levelsGained > 0
          ? `Cashed out ${formatChips(amount)} redeemable chips. Level ${nextLevel} unlocked.${unlockText}`
          : `Cashed out ${formatChips(amount)} redeemable chips for ${formatChips(amount)} XP.${unlockText}`
      );
      showChipBurst("loss", amount);
      if (!playedSound) {
        playSound(achievementResult.unlocked.length > 0 ? "achievement" : "cash");
        playedSound = true;
      }
      return ledgerResult.profile;
    });
    setCashOutAmount(0);
  }

  function chargeBet(amount, detail = {}) {
    const wager = cleanAmount(amount);
    if (wager <= 0) {
      setNotice("Bets need to be at least 1 chip.");
      return false;
    }
    if (wager > profile.chips) {
      setNotice("Not enough chips for that bet. Cash in or lower the wager.");
      return false;
    }

    updateActiveProfile((current) => {
      if (wager > current.chips) {
        setNotice("Not enough chips for that bet. Cash in or lower the wager.");
        return current;
      }

      const nonRedeemableChips = Math.max(0, current.chips - current.redeemableChips);
      const redeemableSpent = Math.max(0, wager - nonRedeemableChips);
      const ledgerResult = addLedgerEntry(
        {
          ...current,
          chips: current.chips - wager,
          redeemableChips: Math.max(0, current.redeemableChips - redeemableSpent),
          wageredChipsAtRisk: current.wageredChipsAtRisk + wager,
          redeemableChipsAtRisk: current.redeemableChipsAtRisk + redeemableSpent,
        },
        {
          type: "wager",
          game: detail.game || "Table",
          amount: -wager,
          balanceAfter: current.chips - wager,
        }
      );
      showChipBurst("loss", wager);
      return ledgerResult.profile;
    });

    playSound("bet");
    return true;
  }

  function settleGame(payout, result = {}) {
    const safePayout = cleanAmount(payout);
    const profit = cleanSignedAmount(result.profit, safePayout);
    const wager = cleanAmount(result.wager, Math.max(0, safePayout - profit));
    const game = result.game || "Casino";
    let cue = profit > 0 ? "win" : "loss";

    updateActiveProfile((current) => {
      const pendingWager = Math.min(wager, current.wageredChipsAtRisk);
      const pendingRedeemable = Math.min(pendingWager, current.redeemableChipsAtRisk);
      const redeemableReturn =
        pendingWager > 0
          ? Math.min(safePayout, pendingRedeemable + Math.max(0, safePayout - pendingWager))
          : Math.max(0, profit);
      const nextChips = current.chips + safePayout;
      const nextRedeemableChips = Math.min(nextChips, current.redeemableChips + redeemableReturn);
      const historyProfile = addHistoryEntry(
        {
          ...current,
          chips: nextChips,
          redeemableChips: nextRedeemableChips,
          wageredChipsAtRisk: Math.max(0, current.wageredChipsAtRisk - pendingWager),
          redeemableChipsAtRisk: Math.max(0, current.redeemableChipsAtRisk - pendingRedeemable),
          gamesPlayed: current.gamesPlayed + 1,
          biggestWin: Math.max(current.biggestWin, profit),
          currentWinStreak: profit > 0 ? current.currentWinStreak + 1 : 0,
          bestWinStreak: profit > 0 ? Math.max(current.bestWinStreak, current.currentWinStreak + 1) : current.bestWinStreak,
        },
        {
          game,
          wager,
          payout: safePayout,
          profit,
          message: result.message || "",
          tags: result.tags || [],
        }
      );
      const progressResult = finalizeProgress(historyProfile, { type: "round", game, wager, profit });
      const ledgerResult = addLedgerEntry(progressResult.profile, {
        type: "settlement",
        game,
        amount: safePayout,
        wager,
        profit,
        balanceAfter: progressResult.profile.chips,
      });
      const achievementText =
        progressResult.unlocked.length > 0
          ? ` Achievement unlocked: ${progressResult.unlocked.map((item) => item.title).join(", ")}.`
          : "";

      if (progressResult.unlocked.length > 0) cue = "achievement";
      if (result.message) setNotice(`${result.message}${achievementText}`);
      if (safePayout > 0) showChipBurst("win", safePayout);
      return ledgerResult.profile;
    });

    playSound(cue);
  }

  function claimChallenge(challengeId) {
    updateActiveProfile((current) => {
      const { profile: rewardedProfile, reward } = claimDailyChallenge(current, challengeId);
      if (reward <= 0) return current;
      const ledgerResult = addLedgerEntry(rewardedProfile, {
        type: "daily-reward",
        amount: reward,
        balanceAfter: rewardedProfile.chips,
      });
      setNotice(`Daily challenge claimed for ${formatChips(reward)} bonus chips.`);
      showChipBurst("win", reward);
      playSound("achievement");
      return ledgerResult.profile;
    });
  }

  function createProfileSlot() {
    const nextProfile = createProfile(`Player ${store.profiles.length + 1}`);
    setStore((current) => ({
      activeProfileId: nextProfile.id,
      profiles: [...current.profiles, nextProfile],
    }));
    setNotice(`${nextProfile.username} is ready at the cashier.`);
  }

  function selectProfile(profileId) {
    setStore((current) => ({ ...current, activeProfileId: profileId }));
    setNotice("Profile loaded.");
  }

  function renameProfile(username) {
    const nextName = username.trim() || "Guest Player";
    updateActiveProfile((current) => ({ ...current, username: nextName }));
    setNotice(`Profile renamed to ${nextName}.`);
  }

  function deleteActiveProfile() {
    setStore((current) => {
      if (current.profiles.length <= 1) {
        const replacement = createProfile();
        return { activeProfileId: replacement.id, profiles: [replacement] };
      }
      const nextProfiles = current.profiles.filter((item) => item.id !== current.activeProfileId);
      return { activeProfileId: nextProfiles[0].id, profiles: nextProfiles };
    });
    setNotice("Profile slot removed.");
  }

  function updateTheme(theme) {
    updateActiveProfile((current) => {
      const canUseTheme = getUnlockedThemes(current.level).some((item) => item.id === theme);
      return { ...current, theme: canUseTheme ? theme : current.theme };
    });
  }

  function toggleSound() {
    updateActiveProfile((current) => ({ ...current, soundEnabled: !current.soundEnabled }));
  }

  function toggleBackendLedger() {
    updateActiveProfile((current) => {
      if (!current.backendLedgerEnabled && !LEDGER_API_URL) {
        setNotice("Ledger sync needs VITE_LEDGER_API_URL in this deploy. The local ledger is still recording.");
        return current;
      }
      return { ...current, backendLedgerEnabled: !current.backendLedgerEnabled };
    });
  }

  async function refreshLeaderboard() {
    setLeaderboardStatus("syncing");
    try {
      const response = await fetch(LEADERBOARD_ENDPOINT);
      if (!response.ok) throw new Error("Leaderboard unavailable");
      const data = await response.json();
      setLeaderboard(cacheLeaderboard(data.leaderboard || []));
      setLeaderboardStatus("online");
    } catch {
      const entry = makeLeaderboardEntry(profile, stats);
      setLeaderboard(cacheLocalScore(entry));
      setLeaderboardStatus("local");
    }
  }

  const wallet = {
    chips: profile.chips,
    chargeBet,
    settleGame,
    setNotice,
  };

  return (
    <div className={`theme-${profile.theme} min-h-screen overflow-hidden bg-[#06130f] text-slate-100`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_32rem),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_34rem)]" />
      <ChipBurst burst={chipBurst} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Header
          profile={profile}
          vipTier={vipTier}
          xpRequirement={xpRequirement}
          xpPercent={xpPercent}
          onLobby={() => setScreen("lobby")}
          onToggleSound={toggleSound}
        />

        {screen === "lobby" ? (
          <main className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section>
              <div className="min-h-[420px] content-center">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                  {vipTier.label} casino bank
                </p>
                <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">Casino Royale</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Cash in for chips, stack table bets, complete daily challenges, unlock VIP perks, and cash out winnings for XP.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {games.map((game) => (
                  <GameTile key={game.id} game={game} onPlay={() => setScreen(game.id)} />
                ))}
              </div>

              <PlayerHub
                profile={profile}
                stats={stats}
                leaderboard={leaderboard}
                leaderboardStatus={leaderboardStatus}
                onClaimChallenge={claimChallenge}
                onRefreshLeaderboard={refreshLeaderboard}
              />
            </section>

            <CashierPanel
              store={store}
              profile={profile}
              notice={notice}
              cashInAmount={cashInAmount}
              cashInEligibility={cashInEligibility}
              cashOutAmount={cashOutAmount}
              cashOutAvailable={cashOutAvailable}
              xpRequirement={xpRequirement}
              xpPercent={xpPercent}
              vipTier={vipTier}
              unlockedThemes={unlockedThemes}
              onCashIn={cashIn}
              onCashOut={cashOut}
              onCashOutAmount={setCashOutAmount}
              onCreateProfile={createProfileSlot}
              onDeleteProfile={deleteActiveProfile}
              onRenameProfile={renameProfile}
              onSelectProfile={selectProfile}
              onTheme={updateTheme}
              onToggleBackendLedger={toggleBackendLedger}
              onToggleSound={toggleSound}
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
            <div className="mt-6">
              <HistoryPanel history={profile.history.slice(0, 5)} compact />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function Header({ profile, vipTier, xpRequirement, xpPercent, onLobby, onToggleSound }) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onLobby} className="flex items-center gap-3 text-left">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-yellow-300 to-amber-500 text-xl font-black text-emerald-950 shadow-lg shadow-yellow-500/20">
          CR
        </span>
        <span>
          <span className="block text-lg font-black text-white">Casino Royale</span>
          <span className="block text-sm text-slate-400">
            {profile.username} · {vipTier.label}
          </span>
        </span>
      </button>

      <div className="grid gap-3 sm:grid-cols-[auto_auto_minmax(13rem,1fr)_auto] sm:items-center">
        <Stat label="Chips" value={formatChips(profile.chips)} />
        <Stat label="Level" value={profile.level} />
        <div className="min-w-52 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
          <div className="flex justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
            <span>XP</span>
            <span>{profile.xp}/{formatChips(xpRequirement)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-yellow-300 transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleSound}
          className={`rounded-lg border px-4 py-3 text-sm font-black transition ${
            profile.soundEnabled
              ? "border-cyan-300 bg-cyan-300 text-slate-950"
              : "border-white/10 bg-white/[0.06] text-slate-200 hover:border-cyan-300"
          }`}
        >
          Sound {profile.soundEnabled ? "On" : "Off"}
        </button>
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
  store,
  profile,
  notice,
  cashInAmount,
  cashInEligibility,
  cashOutAmount,
  cashOutAvailable,
  xpRequirement,
  xpPercent,
  vipTier,
  unlockedThemes,
  onCashIn,
  onCashOut,
  onCashOutAmount,
  onCreateProfile,
  onDeleteProfile,
  onRenameProfile,
  onSelectProfile,
  onTheme,
  onToggleBackendLedger,
  onToggleSound,
}) {
  const cashInStatus = cashInEligibility.canCashIn
    ? "Rescue available"
    : cashInEligibility.bankrollLow
      ? `${cashInEligibility.roundsUntilCashIn} rounds left`
      : `At ${formatChips(CASH_IN_LOW_CHIP_LIMIT)} chips`;
  const quickAmounts = [
    { label: "25%", value: Math.floor(cashOutAvailable * 0.25) },
    { label: "50%", value: Math.floor(cashOutAvailable * 0.5) },
    { label: "Max", value: cashOutAvailable },
  ];

  return (
    <aside className="self-start rounded-lg border border-yellow-300/25 bg-[#111c18]/90 p-5 shadow-2xl shadow-black/30">
      <ProfileManager
        key={profile.id}
        store={store}
        profile={profile}
        onCreateProfile={onCreateProfile}
        onDeleteProfile={onDeleteProfile}
        onRenameProfile={onRenameProfile}
        onSelectProfile={onSelectProfile}
      />

      <div className="mt-6 flex items-start justify-between gap-4 border-t border-white/10 pt-6">
        <div>
          <h2 className="text-2xl font-black text-white">Cashier</h2>
          <p className="mt-1 text-sm text-slate-400">{vipTier.label}: {vipTier.perk}</p>
        </div>
        <div className="rounded-lg bg-yellow-300 px-3 py-2 text-right text-emerald-950">
          <div className="text-xs font-bold uppercase">{cashInStatus}</div>
          <div className="text-lg font-black">+{formatChips(cashInAmount)}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCashIn}
        disabled={!cashInEligibility.canCashIn}
        className="mt-5 w-full rounded-lg bg-gradient-to-r from-yellow-300 to-amber-500 px-4 py-3 font-black text-emerald-950 shadow-lg shadow-yellow-500/20 transition hover:brightness-110"
      >
        Rescue Cash In
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
            max={cashOutAvailable}
            value={cashOutAmount}
            onChange={(event) => onCashOutAmount(Math.min(cleanAmount(event.target.value), cashOutAvailable))}
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
              disabled={cashOutAvailable <= 0}
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
          <span>{profile.xp}/{formatChips(xpRequirement)} XP</span>
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

      <div className="mt-5 grid gap-3">
        <label htmlFor="table-theme" className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
          VIP Theme
        </label>
        <select
          id="table-theme"
          value={profile.theme}
          onChange={(event) => onTheme(event.target.value)}
          className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        >
          {unlockedThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>{theme.label}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Sound {profile.soundEnabled ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={onToggleBackendLedger}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
              profile.backendLedgerEnabled
                ? "border-emerald-300 text-emerald-200"
                : "border-white/10 text-slate-200 hover:border-emerald-300 hover:text-emerald-200"
            }`}
          >
            Ledger {profile.backendLedgerEnabled ? "Sync" : "Local"}
          </button>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <SummaryItem label="Games" value={profile.gamesPlayed} />
        <SummaryItem label="Cash Ins" value={profile.cashIns} />
        <SummaryItem label="Cashable" value={formatChips(cashOutAvailable)} />
        <SummaryItem label="Best Win" value={formatChips(profile.biggestWin)} />
        <SummaryItem label="XP Banked" value={formatChips(profile.totalCashedOut)} />
      </dl>
    </aside>
  );
}

function ProfileManager({ store, profile, onCreateProfile, onDeleteProfile, onRenameProfile, onSelectProfile }) {
  const [name, setName] = useState(profile.username);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setConfirmDelete(false);
    onDeleteProfile();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Save Slots</h2>
          <p className="mt-1 text-sm text-slate-400">Multiple local casino careers.</p>
        </div>
        <button
          type="button"
          onClick={onCreateProfile}
          className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-black text-emerald-950 transition hover:bg-emerald-300"
        >
          New
        </button>
      </div>

      <select
        value={profile.id}
        onChange={(event) => onSelectProfile(event.target.value)}
        className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
      >
        {store.profiles.map((item) => (
          <option key={item.id} value={item.id}>
            {item.username} · L{item.level} · {formatChips(item.chips)} chips
          </option>
        ))}
      </select>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setConfirmDelete(false);
          }}
          className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          aria-label="Profile name"
        />
        <button
          type="button"
          onClick={() => onRenameProfile(name)}
          className="rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:border-yellow-300 hover:text-yellow-200"
        >
          Save
        </button>
      </div>

      <button
        type="button"
        onClick={handleDeleteClick}
        className={`mt-3 w-full rounded-lg border px-4 py-2 text-sm font-bold transition ${
          confirmDelete
            ? "border-red-300 bg-red-500/15 text-red-100 hover:bg-red-500/25"
            : "border-white/10 text-slate-300 hover:border-red-300 hover:text-red-200"
        }`}
      >
        {confirmDelete ? "Confirm Delete Save" : "Delete Current Slot"}
      </button>
      {confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className="mt-2 w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-slate-300 hover:text-white"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function PlayerHub({ profile, stats, leaderboard, leaderboardStatus, onClaimChallenge, onRefreshLeaderboard }) {
  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <StatsDashboard stats={stats} profile={profile} />
      <LeaderboardPanel
        leaderboard={leaderboard}
        profileId={profile.id}
        status={leaderboardStatus}
        onRefresh={onRefreshLeaderboard}
      />
      <DailyChallenges profile={profile} onClaimChallenge={onClaimChallenge} />
      <AchievementsPanel profile={profile} />
      <HistoryPanel history={profile.history} />
    </div>
  );
}

function LeaderboardPanel({ leaderboard, profileId, status, onRefresh }) {
  const statusLabel =
    status === "online" ? "Global" : status === "syncing" || status === "loading" ? "Syncing" : "Local";

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Global Leaderboard</h2>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{statusLabel}</div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-yellow-300 hover:text-yellow-200"
        >
          Refresh
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        {leaderboard.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 px-4 py-4 text-sm text-slate-400">
            No leaderboard scores yet.
          </div>
        ) : (
          leaderboard.slice(0, 10).map((entry) => (
            <div
              key={entry.profileId}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-3 text-sm ${
                entry.profileId === profileId
                  ? "border-yellow-300/40 bg-yellow-300/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/30 font-black text-yellow-200">
                {entry.rank}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-black text-white">{entry.username}</span>
                <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-slate-400">
                  L{entry.level} · {formatChips(entry.gamesPlayed)} rounds · {entry.winRate}%
                </span>
              </span>
              <span className="text-right">
                <span className="block font-black text-emerald-200">{formatChips(entry.totalCashedOut)}</span>
                <span className={entry.netProfit >= 0 ? "mt-1 block text-xs text-emerald-200" : "mt-1 block text-xs text-red-200"}>
                  {formatSigned(entry.netProfit)}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StatsDashboard({ stats, profile }) {
  const gameStats = Object.entries(stats.byGame);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
      <h2 className="text-xl font-black text-white">Stats Dashboard</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <SummaryItem label="Win Rate" value={`${stats.winRate}%`} />
        <SummaryItem label="Net" value={formatSigned(stats.profit)} />
        <SummaryItem label="Wagered" value={formatChips(stats.wagered)} />
        <SummaryItem label="Streak" value={`${profile.currentWinStreak}/${profile.bestWinStreak}`} />
      </div>
      <div className="mt-4 grid gap-2">
        {gameStats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 px-4 py-4 text-sm text-slate-400">
            Play a round to start building table stats.
          </div>
        ) : (
          gameStats.map(([game, gameStat]) => (
            <div key={game} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
              <span className="font-bold text-white">{game}</span>
              <span className="text-slate-300">{gameStat.rounds} rounds</span>
              <span className={gameStat.profit >= 0 ? "font-black text-emerald-200" : "font-black text-red-200"}>
                {formatSigned(gameStat.profit)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DailyChallenges({ profile, onClaimChallenge }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-white">Daily Challenges</h2>
        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{profile.daily.date}</span>
      </div>
      <div className="mt-4 grid gap-3">
        {dailyChallengeTemplates.map((template) => {
          const challenge = profile.daily.challenges.find((item) => item.id === template.id);
          const progress = challenge?.progress || 0;
          const complete = progress >= template.target;
          return (
            <div key={template.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-white">{template.label}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {formatChips(progress)} / {formatChips(template.target)} · +{template.reward}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!complete || challenge?.claimed}
                  onClick={() => onClaimChallenge(template.id)}
                  className="rounded-lg bg-yellow-300 px-3 py-2 text-sm font-black text-emerald-950 transition hover:bg-yellow-200"
                >
                  {challenge?.claimed ? "Claimed" : "Claim"}
                </button>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-yellow-300"
                  style={{ width: `${Math.min(100, (progress / template.target) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AchievementsPanel({ profile }) {
  const unlocked = new Set(profile.achievements);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
      <h2 className="text-xl font-black text-white">Achievements</h2>
      <div className="mt-4 grid gap-2">
        {achievementDefinitions.map((achievement) => {
          const isUnlocked = unlocked.has(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`rounded-lg border px-3 py-3 ${
                isUnlocked
                  ? "border-yellow-300/40 bg-yellow-300/10"
                  : "border-white/10 bg-black/20 opacity-70"
              }`}
            >
              <div className={isUnlocked ? "font-black text-yellow-100" : "font-black text-slate-300"}>
                {achievement.title}
              </div>
              <div className="mt-1 text-sm text-slate-400">{achievement.description}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HistoryPanel({ history, compact = false }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
      <h2 className="text-xl font-black text-white">Game History</h2>
      <div className="mt-4 grid gap-2">
        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 px-4 py-4 text-sm text-slate-400">
            No rounds recorded yet.
          </div>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              className={`grid gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm ${
                compact ? "sm:grid-cols-[auto_1fr_auto]" : "sm:grid-cols-[auto_1fr_auto_auto]"
              }`}
            >
              <span className="font-bold text-slate-300">{formatTime(entry.time)}</span>
              <span className="font-black text-white">{entry.game}</span>
              {!compact && <span className="text-slate-300">Bet {formatChips(entry.wager)}</span>}
              <span className={entry.profit >= 0 ? "font-black text-emerald-200" : "font-black text-red-200"}>
                {formatSigned(entry.profit)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
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

function ChipBurst({ burst }) {
  if (!burst) return null;
  const sign = burst.type === "win" ? "+" : "-";
  return (
    <div key={burst.id} className={`chip-burst chip-burst-${burst.type}`} aria-hidden="true">
      {sign}{formatChips(burst.amount)}
    </div>
  );
}
