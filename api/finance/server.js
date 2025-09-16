import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;

const KYARU_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyOpIdgQV-gutLG_TimogW9pbOHN8U_eS8FwBfFrnRrMkJNf1yL0OtDyHAN5pXfUyZv/exec";

app.use(express.json());

app.get("/health", (_req, res) => res.status(200).send("ok"));

async function postRoute(route, payload) {
  const r = await fetch(`${KYARU_WEBAPP_URL}?route=${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const txt = await r.text();
  try { return { status: r.status, json: JSON.parse(txt) }; }
  catch { return { status: r.status, json: { ok:false, raw: txt } }; }
}
async function kyaruGet(route, qs=""){
  const r = await fetch(`${KYARU_WEBAPP_URL}?route=${route}${qs}`);
  return r.json();
}

/* endpoints existentes */
app.get("/api/finance/today", async (_req, res) => {
  try { res.status(200).json(await kyaruGet("finance-today","")); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/kyaru/chat", async (req, res) => {
  try {
    const { message, currency="CLP", plan } = req.body || {};
    let planResult = null;
    if (plan?.amount && plan?.description){
      let t = plan.type;
      if (!t) {
        const m = (message||"").toLowerCase();
        t = /entr[oó]|recib[ií]|sueldo|dep[oó]sito/.test(m) ? "IN" : "OUT";
      }
      planResult = (await postRoute("plan", {
        description: plan.description, amount: Number(plan.amount),
        currency, type: String(t).toUpperCase()
      })).json;
    }
    const bal = (await kyaruGet("", "")).balance ?? null;
    res.status(200).json({
      ok:true,
      reply: `Te escucho. ${planResult?.ok ? `Registré ${plan?.amount} ${currency} para "${plan?.description}". `:""}`
           + (typeof bal==="number" ? `Tu saldo estimado ahora es ${bal} ${currency}.` : "No pude leer tu balance."),
      balance: bal, planResult
    });
  } catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/kyaru/plan", async (req, res) => {
  try {
    const { description, amount, currency="CLP", type="OUT" } = req.body || {};
    const r = await postRoute("plan", { description, amount:Number(amount), currency, type:String(type).toUpperCase() });
    res.status(200).json({ ok:true, planResult:r.json, balance:r.json?.balance ?? null });
  } catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

/* NUEVO: list / update / delete (proxy a la WebApp) */
app.post("/api/kyaru/list", async (req, res) => {
  try { res.status(200).json((await postRoute("list", { n: req.body?.n ?? 20 })).json); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/kyaru/update", async (req, res) => {
  try {
    const { id, description, amount, type, date } = req.body || {};
    res.status(200).json((await postRoute("update", { id, description, amount, type, date })).json);
  } catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
app.post("/api/kyaru/delete", async (req, res) => {
  try { res.status(200).json((await postRoute("delete", { id: req.body?.id })).json); }
  catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

app.listen(PORT, () => console.log(`API ready on port ${PORT}`));
