const fs = require("fs");
const path = require("path");

// Permite configurar por env:
// - RULES_PATH: ruta absoluta del JSON (recom: /data/rules.store.json)
// - RULES_DIR : carpeta base (recom: /data) si no se da RULES_PATH
const DEFAULT_PATH = path.join(__dirname, "..", "rules", "rules.store.json");
const RULES_PATH = process.env.RULES_PATH
  || (process.env.RULES_DIR ? path.join(process.env.RULES_DIR, "rules.store.json") : null)
  || DEFAULT_PATH;

// Ruta legacy para migrar si existe
const LEGACY_PATH = DEFAULT_PATH;

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function initStoreFile(p) {
  const initial = { version: 1, updatedAt: new Date().toISOString(), rules: [] };
  ensureDir(p);
  fs.writeFileSync(p, JSON.stringify(initial, null, 2), "utf8");
  return initial;
}

function safeReadJSON(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    // limpia BOM si aparece
    const txt = raw.replace(/^\uFEFF/, "");
    return JSON.parse(txt);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

function loadStore() {
  // 1) intenta RULES_PATH
  let data = safeReadJSON(RULES_PATH);
  if (data) return data;

  // 2) si no existe, migra desde legacy si hay
  const legacy = safeReadJSON(LEGACY_PATH);
  if (legacy) {
    ensureDir(RULES_PATH);
    fs.writeFileSync(RULES_PATH, JSON.stringify(legacy, null, 2), "utf8");
    return legacy;
  }

  // 3) si no hay nada, inicializa en RULES_PATH
  return initStoreFile(RULES_PATH);
}

function saveStore(store) {
  store.updatedAt = new Date().toISOString();
  ensureDir(RULES_PATH);
  fs.writeFileSync(RULES_PATH, JSON.stringify(store, null, 2), "utf8");
}

function normalize(text) {
  return (text || "").toString().toLowerCase();
}

function categorizeText(text, store = null) {
  const s = store || loadStore();
  const corpus = normalize(text);

  const active = (s.rules || [])
    .filter(r => r.enabled !== false)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || String(a.name).localeCompare(String(b.name)));

  for (const rule of active) {
    const kws = (rule.keywords || []).map(normalize).filter(Boolean);
    if (kws.length === 0) continue;

    const hits = kws.map(kw => corpus.includes(kw));
    const ok = (rule.match === "all") ? hits.every(Boolean) : hits.some(Boolean);

    if (ok) {
      return {
        category: rule.category,
        ruleId: rule.id,
        ruleName: rule.name,
        matchedKeywords: kws.filter(kw => corpus.includes(kw)),
      };
    }
  }

  return { category: null, ruleId: null, ruleName: null, matchedKeywords: [] };
}

module.exports = { STORE_PATH: RULES_PATH, loadStore, saveStore, categorizeText };
