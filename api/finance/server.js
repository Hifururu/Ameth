// api/finance/server.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 8080;

// Salud
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Endpoint principal
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
              top_gainers: [
                { symbol: "XYZ", name: "XYZ Corp", price: 12.34, change_pct: 18.9, volume: 32100000 }
              ],
              top_losers: [
                { symbol: "ABC", name: "ABC Inc", price: 5.67, change_pct: -14.2, volume: 18900000 }
              ],
              most_active: [
                { symbol: "TSLA", name: "Tesla", price: 242.1, change_pct: 1.3, volume: 54000000 }
              ]
            },
            earnings_today: [
              { symbol: "AAPL", when: "post", eps_est: 1.32, rev_est: 85200000000 }
            ]
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

app.listen(PORT, () => {
  console.log(`API ready on port ${PORT}`);
});
