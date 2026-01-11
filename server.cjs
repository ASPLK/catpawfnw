const fs = require("node:fs");
const path = require("node:path");

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
