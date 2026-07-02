import { describe, it, expect } from 'vitest'
import { cat, risk, RISK_LABELS } from '../useFundList'

describe('cat() — category classification precedence', () => {
  it('does not let generic Sectoral/Thematic swallow Banking and PSU debt funds', () => {
    expect(cat('HDFC Banking and PSU Debt Fund - Direct Growth')).toBe('Banking and PSU')
  })

  it('does not let generic Sectoral/Thematic swallow Dividend Yield equity funds', () => {
    expect(cat('ICICI Prudential Dividend Yield Equity Fund - Direct Growth')).toBe('Dividend Yield')
  })

  it('still classifies genuine sector/thematic funds as Sectoral/Thematic', () => {
    expect(cat('SBI Banking & Financial Services Fund - Direct Growth')).toBe('Sectoral/Thematic')
    expect(cat('Tata Digital India Fund - Technology - Direct Growth')).toBe('Sectoral/Thematic')
  })

  it('classifies core equity categories correctly', () => {
    expect(cat('Axis Large Cap Fund - Direct Growth')).toBe('Large Cap')
    expect(cat('Nippon India Small Cap Fund - Direct Growth')).toBe('Small Cap')
    expect(cat('Parag Parikh Flexi Cap Fund - Direct Growth')).toBe('Flexi Cap')
  })

  it('falls back to Other for an unrecognized name', () => {
    expect(cat('Some Made Up Fund Name')).toBe('Other')
  })
})

describe('risk() — risk tier assignment', () => {
  it('rates Banking and PSU (debt) as low/moderate risk, not high', () => {
    // 'Banking and PSU' does not match risk()'s own regex table directly,
    // but must never be silently reclassified as Sectoral/Thematic (risk 3)
    // upstream by cat() — verify the category string itself scores sanely.
    expect(risk('Banking and PSU')).toBeLessThan(2)
  })

  it('rates true sectoral/thematic equity as Very High risk', () => {
    expect(RISK_LABELS[risk('Sectoral/Thematic')]).toBe('Very High')
  })

  it('rates broad-market equity (Large/Flexi/Multi Cap, Index) as High risk, never Moderate', () => {
    // Regression: these used to sit at tier 1 with debt funds, which let the
    // Banker's "Capital Preservation / Debt-heavy" Conservative profile
    // (max risk 1) recommend equity funds.
    for (const equity of ['Large Cap', 'Flexi Cap', 'Multi Cap', 'Index Fund', 'ETF', 'Value', 'Dividend Yield']) {
      expect(risk(equity)).toBeGreaterThanOrEqual(2)
    }
  })

  it('keeps debt and hybrid categories at Moderate or below', () => {
    for (const safe of ['Corporate Bond', 'Gilt', 'Balanced Hybrid', 'Conservative Hybrid', 'Arbitrage', 'Dynamic Bond', 'Multi Asset']) {
      expect(risk(safe)).toBeLessThanOrEqual(1)
    }
  })

  it('rates Liquid as Low risk', () => {
    expect(RISK_LABELS[risk('Liquid')]).toBe('Low')
  })
})
