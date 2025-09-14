const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const TOKENS_DIR  = process.env.GOOGLE_TOKENS_DIR || "/data";
const TOKENS_PATH = path.join(TOKENS_DIR, "google.tokens.json");

function getOAuthClient() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Google OAuth env vars");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function saveTokens(tokens) {
  fs.mkdirSync(TOKENS_DIR, { recursive: true });
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf8");
}

function loadTokens() {
  if (!fs.existsSync(TOKENS_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8")); }
  catch { return null; }
}

async function getAuthorizedClient() {
  const oauth2 = getOAuthClient();
  const tokens = loadTokens();
  if (!tokens) return { oauth2, needsConsent: true };

  oauth2.setCredentials(tokens);
  // guardar tokens refrescados automáticamente
  oauth2.on("tokens", (t) => {
    const merged = { ...tokens, ...t };
    saveTokens(merged);
  });

  return { oauth2, needsConsent: false };
}

module.exports = { getOAuthClient, getAuthorizedClient, saveTokens, TOKENS_PATH };
