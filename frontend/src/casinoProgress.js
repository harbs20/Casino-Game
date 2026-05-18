export const PROFILE_STORE_KEY = "casino-royale-store-v2";
export const LEGACY_PROFILE_KEY = "casino-royale-profile-v1";
export const MAX_HISTORY = 20;
export const MAX_LEDGER = 80;

export const tableThemes = [
  { id: "classic", label: "Classic", unlockLevel: 1, accent: "emerald" },
  { id: "gold", label: "Gold Room", unlockLevel: 3, accent: "yellow" },
  { id: "neon", label: "Neon Night", unlockLevel: 5, accent: "cyan" },
  { id: "velvet", label: "Velvet Club", unlockLevel: 8, accent: "rose" },
];

export const vipTiers = [
  { label: "Club", level: 1, perk: "Standard tables" },
  { label: "Gold", level: 3, perk: "Gold table theme" },
  { label: "Platinum", level: 5, perk: "Neon table theme" },
  { label: "High Roller", level: 8, perk: "Velvet table theme" },
];

export const achievementDefinitions = [
  {
    id: "first-hand",
    title: "First Hand",
    description: "Play any casino round.",
    isUnlocked: (profile) => profile.gamesPlayed >= 1,
  },
  {
    id: "first-blackjack",
    title: "First Blackjack",
    description: "Play a Blackjack round.",
    isUnlocked: (profile) => profile.history.some((entry) => entry.game === "Blackjack"),
  },
  {
    id: "roulette-sniper",
    title: "Roulette Sniper",
    description: "Win at least 350 chips on Roulette.",
    isUnlocked: (profile) => profile.history.some((entry) => entry.game === "Roulette" && entry.profit >= 350),
  },
  {
    id: "hot-streak",
    title: "Hot Streak",
    description: "Win three rounds in a row.",
    isUnlocked: (profile) => profile.currentWinStreak >= 3,
  },
  {
    id: "big-cash-out",
    title: "Big Cash Out",
    description: "Cash out 1000 total chips.",
    isUnlocked: (profile) => profile.totalCashedOut >= 1000,
  },
  {
    id: "baccarat-banker",
    title: "Baccarat Banker",
    description: "Win a Baccarat round.",
    isUnlocked: (profile) => profile.history.some((entry) => entry.game === "Baccarat" && entry.profit > 0),
  },
  {
    id: "slots-line",
    title: "Slots Line",
    description: "Hit a Slots payout.",
    isUnlocked: (profile) => profile.history.some((entry) => entry.game === "Slots" && entry.profit > 0),
  },
  {
    id: "high-roller",
    title: "High Roller",
    description: "Win 1000 chips in a single round.",
    isUnlocked: (profile) => profile.biggestWin >= 1000,
  },
  {
    id: "vip-arrival",
    title: "VIP Arrival",
    description: "Reach Level 3.",
    isUnlocked: (profile) => profile.level >= 3,
  },
];

export const dailyChallengeTemplates = [
  { id: "play-3", label: "Play 3 rounds", target: 3, reward: 150, type: "rounds" },
  { id: "win-2", label: "Win 2 rounds", target: 2, reward: 250, type: "wins" },
  { id: "cashout-500", label: "Cash out 500 chips", target: 500, reward: 300, type: "cashout" },
];

export function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

export function createProfile(username = "Guest Player") {
  return normalizeProfile({
    id: makeId("profile"),
    username,
    level: 1,
    xp: 0,
    chips: 1000,
    cashIns: 0,
    gamesPlayed: 0,
    biggestWin: 0,
    totalCashedOut: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    history: [],
    ledger: [],
    achievements: [],
    daily: makeDailyChallenges(todayKey()),
    soundEnabled: false,
    backendLedgerEnabled: false,
    theme: "classic",
  });
}

export function loadCasinoStore() {
  try {
    const stored = localStorage.getItem(PROFILE_STORE_KEY);
    if (stored) return normalizeStore(JSON.parse(stored));

    const legacy = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacy) {
      const profile = normalizeProfile({
        ...createProfile("Guest Player"),
        ...JSON.parse(legacy),
        id: makeId("profile"),
      });
      return { activeProfileId: profile.id, profiles: [profile] };
    }
  } catch {
    return makeDefaultStore();
  }

  return makeDefaultStore();
}

export function normalizeStore(store) {
  const profiles = Array.isArray(store?.profiles) ? store.profiles.map(normalizeProfile) : [];
  if (profiles.length === 0) return makeDefaultStore();
  const activeProfileId = profiles.some((profile) => profile.id === store.activeProfileId)
    ? store.activeProfileId
    : profiles[0].id;

  return { activeProfileId, profiles };
}

export function normalizeProfile(profile) {
  const base = {
    id: makeId("profile"),
    username: "Guest Player",
    level: 1,
    xp: 0,
    chips: 1000,
    cashIns: 0,
    gamesPlayed: 0,
    biggestWin: 0,
    totalCashedOut: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    history: [],
    ledger: [],
    achievements: [],
    daily: makeDailyChallenges(todayKey()),
    soundEnabled: false,
    backendLedgerEnabled: false,
    theme: "classic",
  };
  const nextProfile = { ...base, ...profile };
  nextProfile.history = Array.isArray(nextProfile.history) ? nextProfile.history.slice(0, MAX_HISTORY) : [];
  nextProfile.ledger = Array.isArray(nextProfile.ledger) ? nextProfile.ledger.slice(0, MAX_LEDGER) : [];
  nextProfile.achievements = Array.isArray(nextProfile.achievements) ? nextProfile.achievements : [];
  nextProfile.daily = normalizeDaily(nextProfile.daily);
  nextProfile.theme = getUnlockedThemes(nextProfile.level).some((theme) => theme.id === nextProfile.theme)
    ? nextProfile.theme
    : "classic";
  return nextProfile;
}

export function makeDefaultStore() {
  const profile = createProfile();
  return { activeProfileId: profile.id, profiles: [profile] };
}

export function makeDailyChallenges(date) {
  return {
    date,
    challenges: dailyChallengeTemplates.map((challenge) => ({
      id: challenge.id,
      progress: 0,
      claimed: false,
    })),
  };
}

export function normalizeDaily(daily) {
  if (!daily || daily.date !== todayKey()) return makeDailyChallenges(todayKey());
  return {
    date: daily.date,
    challenges: dailyChallengeTemplates.map((template) => {
      const stored = daily.challenges?.find((challenge) => challenge.id === template.id);
      return {
        id: template.id,
        progress: Math.min(template.target, Math.max(0, Number(stored?.progress) || 0)),
        claimed: Boolean(stored?.claimed),
      };
    }),
  };
}

export function calculateStats(profile) {
  const stats = profile.history.reduce(
    (result, entry) => {
      const game = entry.game || "Unknown";
      const byGame = result.byGame[game] || { rounds: 0, wins: 0, losses: 0, pushes: 0, wagered: 0, profit: 0 };
      const won = entry.profit > 0;
      const lost = entry.profit < 0;
      const pushed = entry.profit === 0;

      return {
        rounds: result.rounds + 1,
        wins: result.wins + (won ? 1 : 0),
        losses: result.losses + (lost ? 1 : 0),
        pushes: result.pushes + (pushed ? 1 : 0),
        wagered: result.wagered + entry.wager,
        payout: result.payout + entry.payout,
        profit: result.profit + entry.profit,
        byGame: {
          ...result.byGame,
          [game]: {
            rounds: byGame.rounds + 1,
            wins: byGame.wins + (won ? 1 : 0),
            losses: byGame.losses + (lost ? 1 : 0),
            pushes: byGame.pushes + (pushed ? 1 : 0),
            wagered: byGame.wagered + entry.wager,
            profit: byGame.profit + entry.profit,
          },
        },
      };
    },
    { rounds: 0, wins: 0, losses: 0, pushes: 0, wagered: 0, payout: 0, profit: 0, byGame: {} }
  );

  return {
    ...stats,
    winRate: stats.rounds > 0 ? Math.round((stats.wins / stats.rounds) * 100) : 0,
  };
}

export function getVipTier(level) {
  return vipTiers.reduce((current, tier) => (level >= tier.level ? tier : current), vipTiers[0]);
}

export function getUnlockedThemes(level) {
  return tableThemes.filter((theme) => level >= theme.unlockLevel);
}

export function addLedgerEntry(profile, entry) {
  const ledgerEntry = {
    id: makeId("ledger"),
    time: new Date().toISOString(),
    ...entry,
  };

  return {
    profile: {
      ...profile,
      ledger: [ledgerEntry, ...profile.ledger].slice(0, MAX_LEDGER),
    },
    ledgerEntry,
  };
}

export function addHistoryEntry(profile, entry) {
  const historyEntry = {
    id: makeId("round"),
    time: new Date().toISOString(),
    ...entry,
  };

  return {
    ...profile,
    history: [historyEntry, ...profile.history].slice(0, MAX_HISTORY),
  };
}

export function updateDailyProgress(profile, event) {
  const daily = normalizeDaily(profile.daily);
  const challenges = daily.challenges.map((challenge) => {
    const template = dailyChallengeTemplates.find((item) => item.id === challenge.id);
    if (!template || challenge.claimed) return challenge;

    let increment = 0;
    if (event.type === "round" && template.type === "rounds") increment = 1;
    if (event.type === "round" && template.type === "wins" && event.profit > 0) increment = 1;
    if (event.type === "cashout" && template.type === "cashout") increment = event.amount;

    return {
      ...challenge,
      progress: Math.min(template.target, challenge.progress + increment),
    };
  });

  return { ...profile, daily: { ...daily, challenges } };
}

export function claimDailyChallenge(profile, challengeId) {
  const daily = normalizeDaily(profile.daily);
  const template = dailyChallengeTemplates.find((challenge) => challenge.id === challengeId);
  const stored = daily.challenges.find((challenge) => challenge.id === challengeId);
  if (!template || !stored || stored.claimed || stored.progress < template.target) {
    return { profile, reward: 0 };
  }

  return {
    profile: {
      ...profile,
      chips: profile.chips + template.reward,
      daily: {
        ...daily,
        challenges: daily.challenges.map((challenge) =>
          challenge.id === challengeId ? { ...challenge, claimed: true } : challenge
        ),
      },
    },
    reward: template.reward,
  };
}

export function unlockAchievements(profile) {
  const current = new Set(profile.achievements);
  const unlocked = achievementDefinitions.filter(
    (achievement) => !current.has(achievement.id) && achievement.isUnlocked(profile)
  );

  if (unlocked.length === 0) return { profile, unlocked };

  return {
    profile: {
      ...profile,
      achievements: [...profile.achievements, ...unlocked.map((achievement) => achievement.id)],
    },
    unlocked,
  };
}

export function makeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
