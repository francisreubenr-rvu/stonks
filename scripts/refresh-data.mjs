#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  refresh-data.mjs — regenerate every shipped data snapshot from the keyless
//  NSE / AMFI feeds so the site never serves stale or invented numbers.
//
//  Regenerates:
//    • public/amfi-active-codes.json  — AMFI active scheme codes (fund prune list)
//    • public/indices-fallback.json   — live NSE index snapshot
//    • public/stocks-fallback.json    — real EOD prices for the tracked universe
//    • src/pages/LandingPage.tsx       — the marquee TICKER rows (between sentinels)
//
//  Run: npm run refresh-data   (Node ≥18, no dependencies)
//
//  Design: each section is independent and defensive — a fetch failure logs and
//  KEEPS the existing file rather than overwriting it with garbage. Exit code is
//  non-zero if any section failed, so a scheduler can alert on it.
// ─────────────────────────────────────────────────────────────────────────────
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Tracked equity universe — single source of truth for the marquee + stock
// fallback. TATAMOTORS was retired in the Nov-2025 Tata Motors demerger; TMPV
// (Passenger Vehicles) is its successor.
const TRACKED = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC',
  'LT', 'AXISBANK', 'KOTAKBANK', 'HINDUNILVR', 'BAJFINANCE', 'MARUTI', 'SUNPHARMA',
  'TMPV', 'ADANIENT', 'WIPRO',
]

// (NSE indexSymbol) → display name, in the order the app shows them.
const INDEX_MAP = [
  ['NIFTY 50', 'Nifty 50'], ['NIFTY NEXT 50', 'Nifty Next 50'], ['NIFTY BANK', 'Nifty Bank'],
  ['NIFTY IT', 'Nifty IT'], ['NIFTY MIDCAP 100', 'Nifty Midcap 100'],
  ['NIFTY SMLCAP 100', 'Nifty Smallcap 100'], ['NIFTY PHARMA', 'Nifty Pharma'],
  ['NIFTY AUTO', 'Nifty Auto'], ['NIFTY FMCG', 'Nifty FMCG'],
]

let failures = 0
const log = (...a) => console.log('•', ...a)
const warn = (m) => { console.warn('⚠', m); failures++ }

async function fetchWithTimeout(url, opts = {}, ms = 40_000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  try { return await fetch(url, { ...opts, signal: c.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) } }) }
  finally { clearTimeout(t) }
}

// Minimal CSV parse that respects double-quoted fields.
function parseCsv(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const out = []; let cur = ''; let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch }
      else if (ch === '"') q = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    rows.push(out.map(s => s.trim()))
  }
  return rows
}

const writeJson = (rel, data, pretty = true) =>
  writeFile(join(ROOT, rel), pretty ? JSON.stringify(data, null, 2) + '\n' : JSON.stringify(data))

// ── 1. AMFI active scheme codes ──────────────────────────────────────────────
async function refreshAmfi() {
  const res = await fetchWithTimeout('https://portal.amfiindia.com/spages/NAVAll.txt', {}, 60_000)
  if (!res.ok) throw new Error(`AMFI ${res.status}`)
  const text = await res.text()
  const codes = []
  for (const line of text.split(/\r?\n/)) {
    const code = line.split(';')[0]?.trim()
    if (code && /^\d+$/.test(code) && line.split(';').length >= 6) codes.push(Number(code))
  }
  const uniq = [...new Set(codes)].sort((a, b) => a - b)
  if (uniq.length < 5000) throw new Error(`AMFI parsed only ${uniq.length} codes — refusing to overwrite`)
  await writeJson('public/amfi-active-codes.json', uniq, false)
  log(`amfi-active-codes.json → ${uniq.length} active schemes`)
}

// ── NSE session cookie (needed for the market-data API host) ─────────────────
async function nseCookie() {
  const res = await fetchWithTimeout('https://www.nseindia.com/', {
    headers: { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
  })
  const jar = res.headers.getSetCookie?.() ?? []
  return jar.map(c => c.split(';')[0]).join('; ')
}

// ── 2. NSE indices ───────────────────────────────────────────────────────────
async function refreshIndices() {
  const cookie = await nseCookie()
  const res = await fetchWithTimeout('https://www.nseindia.com/api/allIndices', {
    headers: { Accept: 'application/json', Referer: 'https://www.nseindia.com/', Cookie: cookie },
  })
  if (!res.ok) throw new Error(`allIndices ${res.status}`)
  const rows = (await res.json()).data ?? []
  const bySym = new Map(rows.map(r => [r.indexSymbol, r]))
  const out = []
  for (const [sym, name] of INDEX_MAP) {
    const r = bySym.get(sym)
    if (!r || !isFinite(r.last)) { warn(`index missing in NSE feed: ${sym}`); continue }
    out.push({ symbol: sym, name, value: +r.last.toFixed(2), change: +r.variation.toFixed(2), changePct: +r.percentChange.toFixed(2) })
  }
  if (out.length < 5) throw new Error(`only ${out.length} indices resolved — refusing to overwrite`)
  await writeJson('public/indices-fallback.json', out)
  log(`indices-fallback.json → ${out.length} indices (NIFTY 50 = ${bySym.get('NIFTY 50')?.last})`)
}

// ── 3. NSE equities (verify vs master + real EOD from bhavcopy) ───────────────
async function latestBhavcopy() {
  const pad = n => String(n).padStart(2, '0')
  const today = new Date()
  for (let i = 1; i <= 8; i++) {
    const d = new Date(today.getTime() - i * 86_400_000)
    const ddmmyyyy = `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`
    const url = `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${ddmmyyyy}.csv`
    const res = await fetchWithTimeout(url, { headers: { Referer: 'https://www.nseindia.com/' } })
    const text = res.ok ? await res.text() : ''
    if (res.ok && text.length > 10_000) return { date: ddmmyyyy, text }
  }
  throw new Error('no bhavcopy found in the last 8 days')
}

async function refreshStocks() {
  // listed master (verification + company names)
  const mres = await fetchWithTimeout('https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv', {
    headers: { Referer: 'https://www.nseindia.com/' },
  })
  if (!mres.ok) throw new Error(`EQUITY_L ${mres.status}`)
  const master = parseCsv(await mres.text())
  const mHead = master[0].map(h => h.trim())
  const iSym = mHead.indexOf('SYMBOL'), iName = mHead.indexOf('NAME OF COMPANY')
  const names = new Map()
  for (const row of master.slice(1)) if (row[iSym]) names.set(row[iSym], row[iName])

  // EOD prices
  const { date, text } = await latestBhavcopy()
  const bhav = parseCsv(text)
  const bHead = bhav[0].map(h => h.trim())
  const bi = k => bHead.indexOf(k)
  const [cSym, cSer, cPrev, cClose, cVol] = ['SYMBOL', 'SERIES', 'PREV_CLOSE', 'CLOSE_PRICE', 'TTL_TRD_QNTY'].map(bi)
  const eod = new Map()
  for (const row of bhav.slice(1)) {
    if (row[cSer] !== 'EQ') continue
    eod.set(row[cSym], { prev: +row[cPrev], close: +row[cClose], vol: Math.round(+row[cVol]) })
  }

  const stocks = []; const ticker = []; const dropped = []
  for (const s of TRACKED) {
    if (!names.has(s)) { dropped.push(`${s} (not in NSE listed master)`); continue }
    const b = eod.get(s)
    if (!b || !isFinite(b.close) || !b.close) { dropped.push(`${s} (no EOD row)`); continue }
    const change = +(b.close - b.prev).toFixed(2)
    const pct = b.prev ? +(change / b.prev * 100).toFixed(2) : 0
    // NSE's bhavcopy EOD file has no P/E or market cap columns — leave them
    // null rather than writing a fake 0 into the fallback snapshot.
    stocks.push({ symbol: s, name: names.get(s), price: +b.close.toFixed(2), change, changePct: pct, volume: b.vol, pe: null, marketCap: null })
    const priceStr = b.close.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const up = pct >= 0
    ticker.push(`['${s}','${priceStr}','${up ? '+' : ''}${pct.toFixed(2)}%',${up}]`)
  }
  if (stocks.length < TRACKED.length / 2) throw new Error(`only ${stocks.length}/${TRACKED.length} stocks resolved — refusing to overwrite`)

  await writeJson('public/stocks-fallback.json', stocks)
  log(`stocks-fallback.json → ${stocks.length} stocks (bhavcopy ${date})`)
  if (dropped.length) warn(`dropped tracked symbols: ${dropped.join(', ')}`)

  // rewrite the LandingPage marquee rows between the sentinels
  const lpPath = join(ROOT, 'src/pages/LandingPage.tsx')
  const lp = await readFile(lpPath, 'utf8')
  const rows = []
  for (let i = 0; i < ticker.length; i += 2) rows.push('  ' + ticker.slice(i, i + 2).join(',') + ',')
  const block = `  /* TICKER-DATA:START */\n${rows.join('\n')}\n  /* TICKER-DATA:END */`
  const next = lp.replace(/ {2}\/\* TICKER-DATA:START \*\/[\s\S]*?\/\* TICKER-DATA:END \*\//, block)
  if (next === lp && !lp.includes(block)) warn('LandingPage TICKER sentinels not found — marquee not updated')
  else { await writeFile(lpPath, next); log('LandingPage.tsx → marquee refreshed') }
}

// ── run all sections independently ───────────────────────────────────────────
for (const [name, fn] of [['AMFI', refreshAmfi], ['indices', refreshIndices], ['stocks', refreshStocks]]) {
  try { await fn() } catch (e) { warn(`${name} refresh failed: ${e.message}`) }
}
console.log(failures ? `\n✗ finished with ${failures} warning(s)` : '\n✓ all snapshots fresh')
process.exit(failures ? 1 : 0)
