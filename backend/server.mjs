import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const ledgerFile = join(dataDir, "ledger.json");
const port = Number(process.env.PORT || 8787);

async function readLedger() {
  try {
    const contents = await readFile(ledgerFile, "utf8");
    const ledger = JSON.parse(contents);
    return Array.isArray(ledger) ? ledger : [];
  } catch {
    return [];
  }
}

async function writeLedger(ledger) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true, service: "casino-royale-backend" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/ledger") {
      sendJson(response, 200, { ledger: await readLedger() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/ledger") {
      const body = await readBody(request);
      const entry = JSON.parse(body || "{}");
      const ledger = await readLedger();
      const nextEntry = {
        id: entry.id || `server-ledger-${Date.now()}`,
        receivedAt: new Date().toISOString(),
        ...entry,
      };
      const nextLedger = [nextEntry, ...ledger].slice(0, 500);
      await writeLedger(nextLedger);
      sendJson(response, 201, { entry: nextEntry });
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/ledger") {
      await writeLedger([]);
      sendJson(response, 200, { ledger: [] });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Casino Royale backend listening on http://127.0.0.1:${port}`);
});
