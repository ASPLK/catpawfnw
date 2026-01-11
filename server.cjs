const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PORT = "10000";
const normalizePortEnv = (key, fallback) => {
  const raw = process.env[key];
  if (typeof raw !== "string" || !raw.length) {
    if (fallback) process.env[key] = String(fallback);
    return;
  }
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 65535) {
    process.env[key] = String(numeric);
    return;
  }
  if (raw.startsWith("$")) {
    const envKey = raw.slice(1);
    const envValue = process.env[envKey];
    const envNumeric = Number(envValue);
    if (Number.isFinite(envNumeric) && envNumeric >= 0 && envNumeric <= 65535) {
      process.env[key] = String(envNumeric);
      return;
    }
  }
  if (fallback) {
    process.env[key] = String(fallback);
  }
};

normalizePortEnv("PORT", DEFAULT_PORT);
normalizePortEnv("DEV_HTTP_PORT", process.env.PORT || DEFAULT_PORT);

const configModule = require("./index.config.js");
const baseConfig = configModule?.default || configModule;

let sites = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, "newwex.json"), "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed?.sites)) sites = parsed.sites;
} catch (err) {
  console.warn("Failed to read newwex.json sites:", err?.message || err);
}

const config = { ...baseConfig };
config.sites = config.sites || {};
if (!Array.isArray(config.sites.list)) config.sites.list = [];
if (sites.length) config.sites.list = sites;

const serverModule = require("./index.js");
if (typeof serverModule?.start !== "function") {
  throw new Error("Catpaw server module does not export start()");
}

serverModule.start(config);
