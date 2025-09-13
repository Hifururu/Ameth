const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const router = express.Router();

function buildOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:8080/google/oauth/callback";
  if (!clientId || !clientSecret) throw new Error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env");
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const tokensPath = path.join(__dirname, "..", "secrets", "google_tokens.json");
  if (fs.existsSync(tokensPath)) {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
    oAuth2Client.setCredentials(tokens);
  }
  return { oAuth2Client, tokensPath };
}

const DATA_PATH = path.join(__dirname, "..", "data", "expenses.json");
function loadAll(){ if(!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH,"[]"); const raw=fs.readFileSync(DATA_PATH,"utf8"); const clean=raw.replace(/^\uFEFF/,"").trim(); try{const a=JSON.parse(clean||"[]"); return Array.isArray(a)?a:[]}catch{fs.writeFileSync(DATA_PATH,"[]"); return []} }
function saveAll(arr){ fs.writeFileSync(DATA_PATH, JSON.stringify(arr, null, 2)); }

function requireApiKey(req,res,next){ const envKey=(process.env.AMETH_API_KEY||"").trim(); const reqKey=(req.headers["x-api-key"]||"").toString().trim(); if(!envKey||reqKey!==envKey) return res.status(401).json({error:"invalid_api_key"}); next(); }

// OAuth básico
router.get("/google/auth", (_req,res)=>{ const {oAuth2Client}=buildOAuth2Client(); const scopes=["https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/calendar.readonly","https://www.googleapis.com/auth/userinfo.email"]; const url=oAuth2Client.generateAuthUrl({access_type:"offline",scope:scopes,prompt:"consent"}); res.redirect(url); });
router.get("/google/oauth/callback", async (req,res)=>{ try{ const code=req.query.code; const {oAuth2Client,tokensPath}=buildOAuth2Client(); const {tokens}=await oAuth2Client.getToken(code); fs.writeFileSync(tokensPath, JSON.stringify(tokens,null,2)); res.send("Google autorizado ✅. Tokens guardados en secrets/google_tokens.json"); } catch(e){ res.status(500).send("Error en OAuth: "+e.message);} });

router.get("/gmail/profile", async (_req,res)=>{ try{ const {oAuth2Client}=buildOAuth2Client(); const gmail=google.gmail({version:"v1",auth:oAuth2Client}); const me=await gmail.users.getProfile({userId:"me"}); res.json(me.data);}catch(e){res.status(500).send(e.message);} });
router.get("/calendar/list", async (_req,res)=>{ try{ const {oAuth2Client}=buildOAuth2Client(); const calendar=google.calendar({version:"v3",auth:oAuth2Client}); const now=new Date().toISOString(); const {data}=await calendar.events.list({calendarId:"primary",timeMin:now,singleEvents:true,orderBy:"startTime",maxResults:10}); res.json(data.items||[]);}catch(e){res.status(500).send(e.message);} });

// ===== util texto =====
function b64urlDecode(s){ return Buffer.from((s||"").replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8"); }
function extractText(payload){ let out=""; if(!payload) return out; const mine=p=> (p&&p.mimeType)||""; if(payload.body&&payload.body.data&&/text\/(plain|html)/i.test(mine(payload))) out+=b64urlDecode(payload.body.data)+"\n"; if(payload.parts&&Array.isArray(payload.parts)) for(const p of payload.parts) out+=extractText(p); return out; }

// ===== parser específico Banco de Chile =====
function parseFromBancoChile(text, subject){
  const t=(text||"").replace(/\s+/g," ").trim().toLowerCase();
  const subj=(subject||"").toLowerCase();

  if (/entre mis cuentas/.test(t) || /transferencia entre mis cuentas/.test(subj)) {
    return { skip:true, reason:"interna" };
  }

  let type="gasto";
  if (/abono en cuenta|transferencia recibida|hemos abonado|a tu favor/.test(t) || /abono/.test(subj)) type="ingreso";
  if (/cargo en cuenta|compra|pago|transferencia a terceros/.test(t) || /(cargo|transferencia a terceros|compra)/.test(subj)) type="gasto";

  // monto
  let amount_clp=null;
  const m1=(text||"").match(/(?:CLP|\$)\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)/);
  if(m1){ amount_clp=parseInt(m1[1].replace(/\./g,""),10); }
  if(amount_clp==null){ const m2=(text||"").match(/\b([0-9]{4,9})\b/); if(m2) amount_clp=parseInt(m2[1],10); }

  // concepto
  let concept=null;
  const c1=(text||"").match(/Beneficiario[:\s]+([A-Za-zÁÉÍÓÚÑ0-9 .,\-]{3,60})/i);
  const c2=(text||"").match(/Destinatario[:\s]+([A-Za-zÁÉÍÓÚÑ0-9 .,\-]{3,60})/i);
  const c3=(text||"").match(/Comercio[:\s]+([A-Za-zÁÉÍÓÚÑ0-9 .,\-]{3,60})/i);
  concept=(c1&&c1[1])||(c2&&c2[1])||(c3&&c3[1])||subject||"Movimiento Banco de Chile";
  // evita frases de seguridad
  concept=concept.replace(/no hagas clic.*|links ni descargues.*|verifica la url.*/i,"").trim();
  return { amount_clp, type, concept };
}

// ===== parser genérico =====
function parseGeneric(text, subject){
  const lower=(text||"").toLowerCase();
  const type=/(abono|dep[oó]sito|transferencia recibida|a tu favor)/.test(lower) ? "ingreso" : "gasto";
  const amt=(text||"").match(/(?:CLP|\$)\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)/);
  let amount_clp=null; if(amt){ amount_clp=parseInt(amt[1].replace(/\./g,""),10); }
  let concept=null;
  const c1=(text||"").match(/Comercio[:\s-]*([A-Za-z0-9 .,\-]{3,60})/i);
  const c2=(text||"").match(/en\s+([A-Za-z0-9 .,\-]{3,40})\s+(?:por|monto|de)/i);
  concept=(c1&&c1[1])||(c2&&c2[1])||(subject||"Movimiento");
  concept=concept.replace(/no hagas clic.*|links ni descargues.*|verifica la url.*/i,"").trim();
  return { amount_clp, type, concept };
}

function parseExpense(text, subject, headers){
  const from=(headers["from"]||"").toLowerCase();
  if (from.includes("bancochile.cl")) return parseFromBancoChile(text, subject);
  return parseGeneric(text, subject);
}

// ====== búsqueda ======
router.get("/gmail/search", requireApiKey, async (req,res)=>{
  try{
    const q = (req.query.q || "in:inbox newer_than:7d").toString();
    const max = Math.min(parseInt(req.query.max || "5",10), 50);
    const { oAuth2Client } = buildOAuth2Client();
    const gmail = google.gmail({ version:"v1", auth:oAuth2Client });
    const list = await gmail.users.messages.list({ userId:"me", q, maxResults:max });
    const ids = (list.data.messages||[]).map(m=>m.id);
    const results=[];
    for (const id of ids){
      const msg = await gmail.users.messages.get({ userId:"me", id, format:"full" });
      const headers = Object.fromEntries((msg.data.payload.headers||[]).map(h=>[h.name.toLowerCase(), h.value]));
      const subject = headers["subject"] || "";
      const text = extractText(msg.data.payload) + "\n" + (msg.data.snippet || "");
      const parsed = parseExpense(text, subject, headers);
      results.push({ id, subject, parsed, date: new Date(Number(msg.data.internalDate||Date.now())).toISOString() });
    }
    res.json(results);
  }catch(e){ res.status(500).send(e.message); }
});

// ====== import ======
router.post("/finance/import-from-gmail", requireApiKey, async (req,res)=>{
  try{
    const q = (req.body && req.body.q) ? String(req.body.q) : "in:inbox newer_than:7d";
    const max = Math.min(parseInt((req.body && req.body.max) || 10,10), 50);
    const { oAuth2Client } = buildOAuth2Client();
    const gmail = google.gmail({ version:"v1", auth:oAuth2Client });

    const list = await gmail.users.messages.list({ userId:"me", q, maxResults:max });
    const ids = (list.data.messages||[]).map(m=>m.id);

    let imported=0, skipped=0;
    const all = loadAll();

    for (const id of ids){
      if (all.some(x=>x.external_id==="gmail:"+id)) { skipped++; continue; }

      const msg = await gmail.users.messages.get({ userId:"me", id, format:"full" });
      const headers = Object.fromEntries((msg.data.payload.headers||[]).map(h=>[h.name.toLowerCase(), h.value]));
      const subject = headers["subject"] || "";
      const text = extractText(msg.data.payload) + "\n" + (msg.data.snippet || "");
      const parsed = parseExpense(text, subject, headers);
      if (parsed.skip) { skipped++; continue; }
      if (parsed.amount_clp == null) { skipped++; continue; }

      const date = new Date(Number(msg.data.internalDate || Date.now())).toISOString().slice(0,10);
      const rec = {
        id: Date.now().toString() + Math.floor(Math.random()*1000),
        date,
        concept: parsed.concept,
        category: "banco",
        amount_clp: parsed.amount_clp,
        type: parsed.type,
        source: "gmail",
        external_id: "gmail:"+id,
        created_at: new Date().toISOString()
      };
      all.push(rec); imported++;
    }
    saveAll(all);
    res.json({ ok:true, imported, skipped });
  }catch(e){ res.status(500).send(e.message); }
});

module.exports = router;
