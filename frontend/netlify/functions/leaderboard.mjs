import { getStore } from "@netlify/blobs";

const STORE_NAME = "casino-royale-leaderboard";
const LEADERBOARD_KEY = "global";
const MAX_ENTRIES = 25;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return response(204, {});
  }

  try {
    if (request.method === "GET") {
      return response(200, { leaderboard: await readLeaderboard() });
    }

    if (request.method === "POST") {
      const body = await request.text();
      const entry = normalizeEntry(JSON.parse(body || "{}"));
      if (!entry) return response(400, { error: "Invalid leaderboard entry" });

      const leaderboard = await readLeaderboard();
      const nextLeaderboard = upsertEntry(leaderboard, entry);
      await writeLeaderboard(nextLeaderboard);
      return response(200, { leaderboard: nextLeaderboard });
    }

    return response(405, { error: "Method not allowed" });
  } catch (error) {
    return response(500, { error: error.message || "Leaderboard unavailable" });
  }
}

async function readLeaderboard() {
  const store = getStore(STORE_NAME);
  const entries = await store.get(LEADERBOARD_KEY, { type: "json" });
  return rankEntries(Array.isArray(entries) ? entries.map(normalizeEntry).filter(Boolean) : []);
}

async function writeLeaderboard(leaderboard) {
  const store = getStore(STORE_NAME);
  await store.setJSON(LEADERBOARD_KEY, leaderboard.slice(0, MAX_ENTRIES));
}

function upsertEntry(leaderboard, entry) {
  const withoutCurrent = leaderboard.filter((item) => item.profileId !== entry.profileId);
  return rankEntries([entry, ...withoutCurrent]).slice(0, MAX_ENTRIES);
}

function rankEntries(entries) {
  return entries
    .sort((first, second) => {
      if (second.totalCashedOut !== first.totalCashedOut) return second.totalCashedOut - first.totalCashedOut;
      if (second.level !== first.level) return second.level - first.level;
      if (second.netProfit !== first.netProfit) return second.netProfit - first.netProfit;
      if (second.chips !== first.chips) return second.chips - first.chips;
      return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function normalizeEntry(entry) {
  const profileId = cleanText(entry.profileId || entry.id, 80);
  if (!profileId) return null;

  return {
    profileId,
    username: cleanText(entry.username, 32) || "Guest Player",
    level: cleanNumber(entry.level, 1, 100),
    xp: cleanNumber(entry.xp, 0, 10_000_000),
    chips: cleanNumber(entry.chips, 0, 100_000_000),
    totalCashedOut: cleanNumber(entry.totalCashedOut, 0, 100_000_000),
    gamesPlayed: cleanNumber(entry.gamesPlayed, 0, 100_000),
    biggestWin: cleanNumber(entry.biggestWin, 0, 100_000_000),
    netProfit: cleanSignedNumber(entry.netProfit, -100_000_000, 100_000_000),
    winRate: cleanNumber(entry.winRate, 0, 100),
    updatedAt: validDate(entry.updatedAt) || new Date().toISOString(),
  };
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanNumber(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.floor(number)));
}

function cleanSignedNumber(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(maximum, Math.max(minimum, Math.trunc(number)));
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function response(statusCode, payload) {
  return new Response(statusCode === 204 ? null : JSON.stringify(payload), {
    status: statusCode,
    headers: corsHeaders,
  });
}
