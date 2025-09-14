const express = require("express");
const { google } = require("googleapis");
const { getAuthorizedClient } = require("../lib/googleAuth");
const { categorizeText, loadStore } = require("../lib/ruleEngine");

const router = express.Router();

// Todas las rutas aquí requieren API key (la aplica server.js antes de montar /gmail)

function pickHeader(headers = [], name) {
  name = name.toLowerCase();
  const h = headers.find(x => (x.name || "").toLowerCase() === name);
  return h ? h.value || "" : "";
}

// GET /gmail/import?max=25&query=subject:uber newer_than:30d
router.get("/import", async (req, res) => {
  try {
    const max = Math.max(1, Math.min(100, Number(req.query.max) || 25));
    const query = (req.query.query || "").toString();

    const { oauth2, needsConsent } = await getAuthorizedClient();
    if (needsConsent) return res.status(428).json({ error: "consent_required", next: "/oauth2/google" });

    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    const list = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: max,
    });

    const ids = (list.data.messages || []).map(m => m.id);
    if (ids.length === 0) return res.json({ ok: true, total: 0, items: [] });

    const store = loadStore();
    const items = [];

    for (const id of ids) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

      const payload = msg.data.payload || {};
      const headers = payload.headers || [];
      const subject = pickHeader(headers, "subject");
      const from = pickHeader(headers, "from");
      const snippet = msg.data.snippet || "";

      const text = `${subject}\n${from}\n${snippet}`;
      const result = categorizeText(text, store);

      items.push({
        id,
        threadId: msg.data.threadId,
        date: pickHeader(headers, "date"),
        from,
        subject,
        snippet,
        category: result.category,
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        matchedKeywords: result.matchedKeywords,
      });
    }

    res.json({ ok: true, total: items.length, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "gmail_import_failed" });
  }
});

module.exports = router;
router.get("/ping", (req, res) => {
  res.json({ ok: true, route: "/gmail/ping" });
});
