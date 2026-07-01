# Indian Market Data Sources — Access Matrix

A working reference of websites/APIs that supply Indian **mutual fund**, **equity**,
**index**, and **market-news** data, for use by the `stonks` app.

Reachability marked ✅ / ⚠️ / ❌ was **verified first-hand on 2026-07-01** from a
datacenter IP (curl, keyless). "Browser-only" means it works from a real browser
session (residential IP + cookies) but is blocked server-side by Akamai/WAF, so it
must go through the app's proxy (`api-proxy/worker.ts` in prod, Vite proxy in dev).

Legend — **Auth**: `none` = no key/login · `key` = API key · `account` = broker/login.
**CORS**: whether a browser can fetch it directly (else needs the proxy).

---

## A. Keyless / official feeds — free, no API key (preferred; power this app)

| Source | Endpoint | Data | Auth | Reachability (server-side) | CORS | Used here |
|---|---|---|---|---|---|---|
| **AMFI** (official) | `portal.amfiindia.com/spages/NAVAll.txt` | All **active** MF schemes + ISIN + daily NAV (~14.2k schemes) | none | ✅ 200, 1.6 MB, 13.4k ISIN rows | proxy | ✅ active-scheme prune (`public/amfi-active-codes.json`) |
| **mfapi.in** | `api.mfapi.in/mf` · `/mf/{code}` | MF list + full historical NAV per scheme (AMFI mirror) | none | ✅ 200, 11 MB list | ✅ yes | ✅ fund list + NAV history |
| **NSE indices** | `nseindia.com/api/allIndices` | Live values for 139 NSE indices (PE/PB/adv-decl) | none¹ | ✅ 200 (needs cookie bootstrap) | proxy | ✅ dashboard/indices |
| **NSE equity master** | `nsearchives.nseindia.com/content/equities/EQUITY_L.csv` | All 2,380 NSE-listed symbols + ISIN + listing date | none | ✅ 200, no cookie needed | proxy | ✅ symbol verification |
| **NSE bhavcopy (EOD)** | `nsearchives.nseindia.com/products/content/sec_bhavdata_full_DDMMYYYY.csv` | Daily OHLC/close/volume/delivery for every stock | none | ✅ 200, 371 KB | proxy | ✅ fallback-price regen |
| **NSE quote/history/search** | `nseindia.com/api/quote-equity?symbol=` · `/historical/...` · `/search/autocomplete` | Per-symbol live quote, fundamentals, EOD, autocomplete | none¹ | ❌ Akamai "Access Denied" server-side | **browser-only** | ✅ best-effort via proxy |
| **BSE** | `api.bseindia.com/BseIndiaAPI/api/...` | SENSEX + BSE quotes/indices | none | ❌ 302→error server-side | browser-only | ❌ not wired (see note) |

¹ NSE serves market-wide endpoints (allIndices, marketStatus) cookielessly, but
Akamai-protects per-symbol endpoints — they need a warm browser session.

> **SENSEX note:** SENSEX is a BSE index; the app has no BSE feed and BSE is WAF-blocked
> server-side, so SENSEX was **removed** from `indices-fallback.json`. To restore it,
> add a BSE route to the proxy or swap in a NIFTY broad index in the UI.

## B. Developer APIs — key/account required (paid or freemium)

| Source | URL | Data | Auth | Cost | Notes |
|---|---|---|---|---|---|
| **IndianAPI Marketplace** | `indianapi.in` (`stock.indianapi.in`) | Unified REST: NSE/BSE stocks, MF, IPO, commodities, news | key | freemium/paid (UPI/card) | Single unified API; easiest paid upgrade path |
| **Apify — MoneyControl API** | `apify.com/fingolfin/india-stock-market-api` | 5000+ NSE/BSE stocks, 30+ indices, 10k+ MF, realtime | token | usage-priced | Scrapes MoneyControl; good breadth |
| **TrueData** | `truedata.in/products/marketdataapi` | Realtime NSE/BSE/MCX WebSocket, option chain, Greeks, history | key | paid subscription | Low-latency; for serious realtime |
| **API Ninjas — Mutual Fund** | `api-ninjas.com/api/mutualfund` | MF price, AUM, ISIN/CUSIP (global incl. India) | key | freemium | Thin on Indian MF depth |
| **Finnhub** | `finnhub.io` | Global equities, news, fundamentals; realtime | key | free tier (30 req/s) | Weak on Indian MF; good for news |
| **RapidAPI (various)** | `rapidapi.com` (search "NSE"/"BSE") | Community NSE/BSE/MF wrappers | key | mixed | Quality varies per provider |

### Broker APIs (real-time, need a broker account + OAuth)

| Broker | URL | Cost | Notes |
|---|---|---|---|
| Zerodha Kite Connect | `kite.trade` | ₹2,000/mo | Most popular; robust historical + realtime |
| Upstox API | `upstox.com/developer/api` | free w/ account | REST + WebSocket |
| ICICI Direct Breeze | `icicidirect.com` (Breeze) | free w/ account | REST + WebSocket, ₹0 |
| Kotak Neo Trade API | `kotakneo.com` | free w/ account | REST + WebSocket |
| Angel One SmartAPI | `smartapi.angelbroking.com` | free w/ account | Free realtime + historical |

## C. Research / news portals — human-facing (data-rich, no clean public API)

| Portal | URL | Best for | API? |
|---|---|---|---|
| **AMFI India** | `amfiindia.com` | Official NAVs, AUM, industry data | NAVAll feed (§A) |
| **Value Research** | `valueresearchonline.com` | MF ratings, analysis (since 1991) | no public API |
| **Morningstar India** | `morningstar.in` | MF star ratings, X-Ray, screener | no public API |
| **Tickertape** | `tickertape.in` | MF/stock screener, 50+ metrics | no public API (scrape-discouraged) |
| **Moneycontrol** | `moneycontrol.com` | News + broad MF/stock data | unofficial (via Apify §B) |
| **Groww** | `groww.in` | MF/stock data, clean pages | unofficial endpoints |
| **Screener.in** | `screener.in` | Equity fundamentals, custom screens | no public API |
| **Trendlyne** | `trendlyne.com` | Analyst forecasts, MF portfolios | paid API |
| **Economic Times Markets** | `economictimes.indiatimes.com/markets` | Market news, quotes | no public API |
| **Livemint / Mint** | `livemint.com/market` | Market news, MF coverage | no public API |
| **NSE / BSE official** | `nseindia.com` · `bseindia.com` | Authoritative listings, circulars | keyless feeds (§A) |

---

## Recommendation for `stonks`

- **Keep the keyless §A stack** — it already covers the app's needs with zero keys:
  AMFI (active-scheme truth) + mfapi (NAV history) + NSE (indices, listings, EOD).
- **Regenerate the shipped snapshots** with **`npm run refresh-data`**
  (`scripts/refresh-data.mjs`) — pulls §A live and rewrites
  `public/amfi-active-codes.json`, `indices-fallback.json`, `stocks-fallback.json`,
  and the LandingPage marquee. Run it in CI/pre-deploy (or on a schedule) so the
  offline fallbacks never drift into stale/fake numbers again. It refuses to
  overwrite a file if a feed returns too little data, and exits non-zero on any
  failure so a scheduler can alert.
- **If real-time per-symbol quotes are needed server-side** (Akamai blocks NSE
  quote-equity from datacenters), the cheapest robust upgrade is a **broker API**
  (Angel One SmartAPI / Upstox — free) or the **IndianAPI** unified key.
- **News/research portals (§C)** are for humans, not scraping — link out to them
  rather than ingesting.

_Verified 2026-07-01. Reachability can change as NSE/BSE rotate WAF rules._
