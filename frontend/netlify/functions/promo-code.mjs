const DEFAULT_PROMO_CODES = [
  {
    code: "ROYAL-FOUNDER",
    badge: {
      id: "royal-founder",
      title: "Royal Founder",
      description: "Claimed a founding player promo.",
      accent: "yellow",
    },
  },
  {
    code: "LUCKY-SEVEN",
    badge: {
      id: "lucky-seven",
      title: "Lucky Seven",
      description: "Redeemed a lucky launch code.",
      accent: "fuchsia",
    },
  },
  {
    code: "VELVET-VIP",
    badge: {
      id: "velvet-vip",
      title: "Velvet VIP",
      description: "Entered with a private VIP promo.",
      accent: "rose",
    },
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return response(204, {});
  }

  if (request.method !== "POST") {
    return response(405, { status: "method-not-allowed", message: "Method not allowed." });
  }

  try {
    const body = await request.json();
    const code = normalizeCode(body.code);
    const redeemedCodes = Array.isArray(body.redeemedCodes)
      ? new Set(body.redeemedCodes.map(normalizeCode).filter(Boolean))
      : new Set();

    if (!code) {
      return response(400, { status: "missing-code", message: "Enter a promo code." });
    }

    const promo = getPromoCodes().find((item) => normalizeCode(item.code) === code);
    if (!promo) {
      return response(200, { status: "invalid", message: "That promo code is not active." });
    }

    if (redeemedCodes.has(code)) {
      return response(200, { status: "already-redeemed", message: "That promo code was already redeemed." });
    }

    if (promo.expiresAt && Date.now() > new Date(promo.expiresAt).getTime()) {
      return response(200, { status: "expired", message: "That promo code has expired." });
    }

    const badge = normalizeBadge(promo.badge);
    if (!badge) {
      return response(500, { status: "bad-config", message: "Promo code is missing a badge." });
    }

    return response(200, {
      status: "redeemed",
      codeId: code,
      badge: {
        ...badge,
        awardedAt: new Date().toISOString(),
      },
      rewardChips: cleanNumber(promo.rewardChips, 0, 100_000),
      message: `${badge.title} badge unlocked.`,
    });
  } catch {
    return response(400, { status: "bad-request", message: "Promo code request was invalid." });
  }
}

function getPromoCodes() {
  const rawCodes = process.env.PROMO_CODES_JSON;
  if (!rawCodes) return DEFAULT_PROMO_CODES;

  try {
    const parsed = JSON.parse(rawCodes);
    return Array.isArray(parsed) ? parsed : DEFAULT_PROMO_CODES;
  } catch {
    return DEFAULT_PROMO_CODES;
  }
}

function normalizeBadge(badge) {
  const id = cleanText(badge?.id, 48);
  const title = cleanText(badge?.title, 36);
  if (!id || !title) return null;

  return {
    id,
    title,
    description: cleanText(badge?.description, 120),
    accent: cleanText(badge?.accent, 24) || "yellow",
  };
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
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

function response(statusCode, payload) {
  return new Response(statusCode === 204 ? null : JSON.stringify(payload), {
    status: statusCode,
    headers: corsHeaders,
  });
}
