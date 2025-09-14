const express = require("express");
const { google } = require("googleapis");
const { getAuthorizedClient } = require("../lib/googleAuth");
const { categorizeText, loadStore } = require("../lib/ruleEngine");

const router = express.Router();

function pickHeader(headers = [], name) {
  name = name.toLowerCase();
  const h = headers.find(x => (x.name || "").toLowerCase() === name);
  return h ? h.value || "" : "";
}

router.get("/ping", (req, res) => {
  res.json({ ok: true, route: "/gmail/ping" });
});

// Reemplazo robusto de /import
router.get("/import", async (req, res) => {
  try {
    const max = Math.max(1, Math.min(100, Number(req.query.max) || 25));
    const query = (req.query.query || "").toString();

    const { oauth2, needsConsent } = await getAuthorizedClient();
    if (needsConsent) return res.status(428).json({ error: "consent_required", next: "/oauth2/google" });

    const gmail = google.gmail({ version: "v1", auth: oauth2 });

    let list;
    try {
      list = await gmail.users.messages.list({ userId: "me", q: query, maxResults: max });
    } catch (e) {
      console.error("gmail.list failed:", e?.message || e);
      return res.status(502).json({ error: "gmail_list_failed" });
    }

    const ids = (list.data.messages || []).map(m => m.id);
    if (ids.length === 0) return res.json({ ok: true, total: 0, items: [] });

    const store = loadStore();
    const items = [];

    for (const id of ids) {
      try {
        const msg = await gmail.users.messages.get({ userId: "me", id, format: "full" });
        const payload = msg.data?.payload || {};
        const headers = payload.headers || [];
        const subject = pickHeader(headers, "subject");
        const from = pickHeader(headers, "from");
        const snippet = msg.data?.snippet || "";
        const text = `${subject}\n${from}\n${snippet}`;
        const result = categorizeText(text, store);

        items.push({
          id,
          threadId: msg.data?.threadId,
          date: pickHeader(headers, "date"),
          from,
          subject,
          snippet,
          category: result.category,
          ruleId: result.ruleId,
          ruleName: result.ruleName,
          matchedKeywords: result.matchedKeywords,
        });
      } catch (e) {
        console.error("gmail.get failed for id", id, e?.message || e);
      }
    }

    res.json({ ok: true, total: items.length, items });
  } catch (e) {
    console.error("gmail/import uncaught:", e?.message || e);
    res.status(500).json({ error: "gmail_import_failed" });
  }
});

module.exports = router;
