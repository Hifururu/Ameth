const fs = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "..", "rules", "rules.store.json");

function loadStore() {
  let raw = fs.readFileSync(STORE_PATH, "utf8");
  raw = raw.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  return JSON.parse(raw);
}

function saveStore(store) {
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function normalize(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .toLowerCase();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatch(corpus, kw, mode) {
  if (!kw) return false;
  const k = normalize(kw);
  const c = corpus;

  switch (mode) {
    case "word": {
      const pattern = `\\b${escapeRegex(k)}\\b`;
      return new RegExp(pattern, "i").test(c);
    }
    case "regex": {
      try {
        return new RegExp(kw, "i").test(c); // usa el kw original para regex
      } catch {
        return false; // regex inválida => no matchea
      }
    }
    case "substring":
    default:
      return c.includes(k);
  }
}

/**
 * Aplica reglas sobre un texto y devuelve la mejor categoría:
 * - Solo reglas enabled
 * - Orden por prioridad desc y luego por nombre
 * - match=any (≥1 keyword) | match=all (todas las keywords)
 * - matchMode por regla: substring|word|regex (default: substring)
 */
function categorizeText(text, store = null) {
  const s = store || loadStore();
  const corpus = normalize(text);

  const active = s.rules
    .filter(r => r.enabled !== false)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.name.localeCompare(b.name));

  for (const rule of active) {
    const kws = (rule.keywords || []).filter(Boolean);
    if (kws.length === 0) continue;

    const mode = rule.matchMode === "word" || rule.matchMode === "regex" ? rule.matchMode : "substring";
    const hitsArr = kws.map(kw => keywordMatch(corpus, kw, mode));
    const ok = (rule.match === "all") ? hitsArr.every(Boolean) : hitsArr.some(Boolean);

    if (ok) {
      const matchedKeywords = kws.filter((kw, i) => hitsArr[i]).map(k => normalize(k));
      return {
        category: rule.category,
        ruleId: rule.id,
        ruleName: rule.name,
        matchedKeywords,
      };
    }
  }

  return { category: null, ruleId: null, ruleName: null, matchedKeywords: [] };
}

module.exports = { STORE_PATH, loadStore, saveStore, categorizeText };
