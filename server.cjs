const fs = require("node:fs");
const path = require("node:path");

const util = require("node:util");

const loadEnvFile = (envPath) => {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex == -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1);
    if (!key) continue;
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
};

const MAX_LOG_CHARS = 2000;
const MAX_LOG_ITEMS = 20;

const summarizeValue = (value, depth = 0, seen = new WeakSet()) => {
  if (value == null) return value;
  if (depth > 5) return "... (max depth reached)";

  if (Buffer.isBuffer(value)) {
    return `<Buffer len=${value.length}>`;
  }
  if (ArrayBuffer.isView(value)) {
    return `<${value.constructor?.name || "TypedArray"} len=${value.byteLength}>`;
  }
  if (value instanceof ArrayBuffer) {
    return `<ArrayBuffer len=${value.byteLength}>`;
  }
  if (typeof value === "string") {
    return value.length > MAX_LOG_CHARS
      ? value.slice(0, MAX_LOG_CHARS) + "..."
      : value;
  }
  if (Array.isArray(value)) {
    const head = value.slice(0, MAX_LOG_ITEMS).map((v) => summarizeValue(v, depth + 1, seen));
    return value.length > MAX_LOG_ITEMS ? [...head, `...(${value.length} items)`] : head;
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    const out = {};
    const entries = Object.entries(value);
    for (const [key, val] of entries.slice(0, MAX_LOG_ITEMS)) {
      out[key] = summarizeValue(val, depth + 1, seen);
    }
    if (entries.length > MAX_LOG_ITEMS) {
      out._extraFields = entries.length - MAX_LOG_ITEMS;
    }
    return out;
  }
  return value;
};

const sanitizeError = (err) => {
  if (!err || typeof err !== "object") return summarizeValue(err);
  const out = {
    name: err.name,
    message: err.message,
  };
  if (err.code) out.code = err.code;
  if (err.status) out.status = err.status;
  if (err.statusCode) out.statusCode = err.statusCode;
  if (err.response) {
    out.response = {
      status: err.response.status,
      data: summarizeValue(err.response.data),
      headers: summarizeValue(err.response.headers),
    };
  }
  if (err.config) {
    out.config = {
      url: err.config.url,
      method: err.config.method,
      timeout: err.config.timeout,
    };
  }
  return out;
};

const originalError = console.error.bind(console);
console.error = (...args) => {
  const safeArgs = args.map((arg) => (arg instanceof Error ? sanitizeError(arg) : summarizeValue(arg)));
  originalError(...safeArgs);
};

const isAuthError = (err) =>
  Boolean(
    err &&
    (err.status === 401 ||
      err.statusCode === 401 ||
      err.code === 31001 ||
      (err.response && err.response.status === 401)),
  );

process.on("unhandledRejection", (reason) => {
  if (isAuthError(reason)) {
    console.error({ message: "Unauthorized request skipped", status: 401 });
    return;
  }
  console.error(reason);
});

process.on("uncaughtException", (err) => {
  if (isAuthError(err)) {
    console.error({ message: "Unauthorized exception skipped", status: 401 });
    return;
  }
  console.error(err);
});
loadEnvFile(path.join(__dirname, ".env.local"));

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


const profileJson = process.env.CATPAW_PROFILE_JSON;
if (profileJson) {
  try {
    process.env.CATPAW_PROFILE_JSON = profileJson;
  } catch (err) {
    console.warn("Failed to read CATPAW_PROFILE_JSON:", err?.message || err);
  }
}

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

// Inject environment variables into config
if (process.env.ALI_TOKEN) {
  config.ali = config.ali || {};
  config.ali.token = process.env.ALI_TOKEN;
}
if (process.env.QUARK_COOKIE) {
  config.quark = config.quark || {};
  config.quark.cookie = process.env.QUARK_COOKIE;
}
if (process.env.UC_COOKIE) {
  config.uc = config.uc || {};
  config.uc.cookie = process.env.UC_COOKIE;
}
if (process.env.BAIDU_COOKIE) {
  config.baidu = config.baidu || {};
  config.baidu.cookie = process.env.BAIDU_COOKIE;
}

config.sites = config.sites || {};
if (!Array.isArray(config.sites.list)) config.sites.list = [];
if (sites.length) config.sites.list = sites;

const serverModule = require("./index.js");
if (typeof serverModule?.start !== "function") {
  throw new Error("Catpaw server module does not export start()");
}

serverModule.start(config);
