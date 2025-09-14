const express = require("express");
const apiKey = require("../lib/apiKey");
const { google } = require("googleapis");
const { getOAuthClient, getAuthorizedClient, saveTokens } = require("../lib/googleAuth");

const router = express.Router();

// ✅ Rutas públicas (NO requieren API key)
router.get("/google", (req, res) => {
  const oauth2 = getOAuthClient();
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "openid", "email", "profile",
  ];
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
  return res.redirect(url);
});

router.get("/callback/google", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing ?code");
  const oauth2 = getOAuthClient();
  try {
    const { tokens } = await oauth2.getToken(code);
    saveTokens(tokens);
    res.status(200).send("✅ Google OAuth listo. Ya puedes probar /oauth2/gmail/profile y /oauth2/calendar/list");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth error");
  }
});

// 🔒 A partir de aquí, TODO requiere API key
router.use(apiKey);

router.get("/gmail/profile", async (req, res) => {
  try {
    const { oauth2, needsConsent } = await getAuthorizedClient();
    if (needsConsent) return res.status(428).json({ error: "consent_required", next: "/oauth2/google" });
    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    const me = await gmail.users.getProfile({ userId: "me" });
    res.json(me.data);
  } catch (e) { console.error(e); res.status(500).json({ error: "gmail_failed" }); }
});

router.get("/calendar/list", async (req, res) => {
  try {
    const { oauth2, needsConsent } = await getAuthorizedClient();
    if (needsConsent) return res.status(428).json({ error: "consent_required", next: "/oauth2/google" });
    const calendar = google.calendar({ version: "v3", auth: oauth2 });
    const out = await calendar.calendarList.list();
    res.json(out.data);
  } catch (e) { console.error(e); res.status(500).json({ error: "calendar_failed" }); }
});

module.exports = router;
