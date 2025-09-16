import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// === CONFIG ===
// Pega aquí tu Web App URL de Google Apps Script cuando la tengas.
// Si la dejas vacía, igual funcionará en "modo demo" sin registrar en Google.
const KYARU_WEBAPP_URL = ""; // ej: "https://script.google.com/macros/s/XXXXX/exec"

// --- Salud ---
app.get("/health", (_req, res) => res.status(200).send("ok"));

// --- Finance: TODAY (mock) ---
app.get("/api/finance/today", (_req, res) => {
  res.status(200).json({
    date: "2025-09-15",
    timezone: "America/Santiago",
    generated_at: "2025-09-15T10:05:13Z",
    markets: [
      {
        code: "us",
        exchanges: [
          {
            mic: "XNYS",
            name: "NYSE",
            session: {
              status: "pre",
              local_time: "2025-09-15T06:05:13-04:00",
              opens_at: "2025-09-15T09:30:00-04:00",
              closes_at: "2025-09-15T16:00:00-04:00",
              is_holiday: false
            },
            indices: [
              { symbol: "^GSPC", name: "S&P 500", price: 5578.12, change: -12.4, change_pct: -0.22, day_range: [5550.1, 5601.8] }
            ],
            movers: {
              top_gainers: [{ symbol: "XYZ", name: "XYZ Corp", price: 12.34, change_pct: 18.9, volume: 32100000 }],
              top_losers: [{ symbol: "ABC", name: "ABC Inc", price: 5.67, change_pct: -14.2, volume: 18900000 }],
              most_active: [{ symbol: "TSLA", name: "Tesla", price: 242.1, change_pct: 1.3, volume: 54000000 }]
            },
            earnings_today: [{ symbol: "AAPL", when: "post", eps_est: 1.32, rev_est: 85200000000 }]
          }
        ]
      }
    ],
    fx: [
      { pair: "USDCLP", price: 945.2, change_pct: 0.15 },
      { pair: "EURUSD", price: 1.0842, change_pct: -0.10 }
    ],
    crypto: [
      { symbol: "BTC", price: 61234.56, change_pct: 0.85, market: "spot" },
      { symbol: "ETH", price: 2610.11, change_pct: -0.40, market: "spot" }
    ],
    eco_calendar: [
      { country: "US", event: "Retail Sales (MoM)", time_local: "2025-09-15T08:30:00-04:00", consensus: 0.4, previous: 0.7, importance: "high" }
    ],
    news: [
      { headline: "Futuros de EE.UU. mixtos...", source: "Reuters", published_at: "2025-09-15T09:12:00Z", tickers: ["^GSPC","AAPL"] }
    ],
    notes: ["Pre-market para US; variaciones intradía pueden cambiar rápidamente."]
  });
});

// --- Finance: YESTERDAY (mock) ---
app.get("/api/finance/yesterday", (_req, res) => {
  res.status(200).json({
    date: "2025-09-14",
    timezone: "America/Santiago",
    generated_at: "2025-09-16T10:05:13Z",
    markets: [
      {
        code: "us",
        exchanges: [
          {
            mic: "XNYS",
            name: "NYSE",
            session: {
              status: "closed",
              local_time: "2025-09-14T16:01:00-04:00",
              opens_at: "2025-09-15T09:30:00-04:00",
              closes_at: "2025-09-15T16:00:00-04:00",
              is_holiday: false
            },
            indices: [
              { symbol: "^GSPC", name: "S&P 500", price: 5560.02, change: -8.1, change_pct: -0.15, day_range: [5531.0, 5582.7] }
            ],
            movers: {
              top_gainers: [{ symbol: "LMN", name: "LMN Corp", price: 18.40, change_pct: 9.2, volume: 12700000 }],
              top_losers: [{ symbol: "QRS", name: "QRS Inc", price: 7.21, change_pct: -7.9, volume: 9800000 }],
              most_active: [{ symbol: "AAPL", name: "Apple", price: 227.5, change_pct: 0.6, volume: 60200000 }]
            },
            earnings_today: []
          }
        ]
      }
    ],
    fx: [
      { pair: "USDCLP", price: 942.1, change_pct: -0.12 },
      { pair: "EURUSD", price: 1.0820, change_pct: -0.08 }
    ],
    crypto: [
      { symbol: "BTC", price: 60810.10, change_pct: -0.20, market: "spot" },
      { symbol: "ETH", price: 2588.00, change_pct: -0.65, market: "spot" }
    ],
    eco_calendar: [
      { country: "US", event: "CPI (YoY)", time_local: "2025-09-14T08:30:00-04:00", consensus: 3.3, previous: 3.4, importance: "high" }
    ],
    news: [
      { headline: "Cierre mixto en Wall Street", source: "Reuters", published_at: "2025-09-14T21:10:00Z", tickers: ["^GSPC","AAPL","TSLA"] }
    ],
    notes: ["Datos simulados del día anterior para pruebas."]
  });
});

// ===== Kyaru helpers (usan fetch global de Node 20) =====
async function kyaruGetBalance() {
  if (!KYARU_WEBAPP_URL) return null;
  try {
    const r = await fetch(KYARU_WEBAPP_URL);
    const data = await r.json();
    return typeof data.balance === "number" ? data.balance : null;
  } catch {
    return null;
  }
}

async function kyaruPlanExpense({ description, amount, currency = "CLP" }) {
  if (!KYARU_WEBAPP_URL) {
    // Modo demo: no persiste, solo simula OK
    return { ok: true, demo: true };
  }
  const r = await fetch(KYARU_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, amount, currency })
  });
  try { return await r.json(); } catch { return { ok:false, error:"No JSON" }; }
}

// --- Kyaru: registrar gasto planificado ---
app.post("/api/kyaru/plan", async (req, res) => {
  try {
    const { description, amount, currency = "CLP" } = req.body || {};
    if (!description || !amount) return res.status(400).json({ ok:false, error:"description y amount requeridos" });
    const planResult = await kyaruPlanExpense({ description, amount: Number(amount), currency });
    const balance = await kyaruGetBalance();
    res.status(200).json({ ok:true, planResult, balance });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// --- Kyaru: chat simple (sin OpenAI por ahora) ---
app.post("/api/kyaru/chat", async (req, res) => {
  try {
    const { message, currency = "CLP", plan } = req.body || {};
    if (!message) return res.status(400).json({ ok:false, error:"message requerido" });

    let planResult = null;
    if (plan?.amount && plan?.description) {
      planResult = await kyaruPlanExpense({
        description: plan.description,
        amount: Number(plan.amount),
        currency
      });
    }

    const balance = await kyaruGetBalance();
    // Respuesta "humana" simple
    let reply = "Te escucho. ";
    if (planResult?.ok) reply += `Registré ${plan?.amount?.toLocaleString?.("es-CL") ?? plan?.amount} ${currency} para "${plan?.description}". `;
    if (balance !== null) reply += `Tu saldo estimado ahora es ${balance.toLocaleString("es-CL")} ${currency}.`;
    else reply += "Por ahora no puedo leer tu balance (falta conectar la hoja de Kyaru).";

    res.status(200).json({ ok:true, reply, balance, planResult });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`API ready on port ${PORT}`);
});
