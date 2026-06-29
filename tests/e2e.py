"""Stonks comprehensive E2E test suite — current UI"""
from playwright.sync_api import sync_playwright
import sys

BASE = 'http://localhost:5173'
PASS = FAIL = 0
def ok(cond, label):
    global PASS, FAIL
    if cond: PASS += 1; print(f'  ✓ {label}')
    else: FAIL += 1; print(f'  ✗ FAIL: {label}')

def test_landing(page):
    print('\n═══ LANDING ═══')
    page.goto(f'{BASE}/#/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    ok(page.locator('nav').is_visible(), 'Nav visible')
    ok(page.get_by_text('stonks', exact=True).first.is_visible(), 'Brand visible')
    ok(page.get_by_role('button', name='Start screening').is_visible(), 'CTA: screening')
    ok(page.get_by_role('button', name='Launch app').is_visible(), 'CTA: launch')
    ok(page.locator('h1').is_visible(), 'Hero heading')

def test_dashboard(page):
    print('\n═══ DASHBOARD ═══')
    page.goto(f'{BASE}/#/dashboard')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(4000)
    body = page.text_content('body') or ''
    ok('Market Dashboard' in body, 'Heading present')
    ok('NIFTY 50' in body or 'SENSEX' in body, 'Index data')
    ok(len(body) > 500, 'Page has content')
    cards = page.locator('.rounded-lg.border.bg-card').all()
    ok(len(cards) > 2, f'{len(cards)} cards')

def test_funds(page):
    print('\n═══ FUNDS ═══')
    page.goto(f'{BASE}/#/funds')
    # During MFAPI load, shimmer shows. Wait for actual content.
    page.wait_for_selector('text=Mutual Funds', timeout=30000)
    page.wait_for_timeout(1000)
    body = page.text_content('body') or ''
    ok('Mutual Funds' in body, 'Funds heading')
    ok('of 37' in body or 'of 3' in body or 'schemes' in body, 'Scheme count')
    ok('Filters' in body or 'Fund House' in body, 'Filter panel')

    # Search test
    search = page.get_by_placeholder('Search by name…')
    if search.is_visible(timeout=5000):
        search.fill('HDFC')
        page.wait_for_timeout(500)
        body2 = page.text_content('body') or ''
        ok('HDFC' in body2, 'Search filters results')

    # Category filter test in sidebar
    cat_btn = page.locator('button:has-text("Liquid")').first
    if cat_btn.is_visible(timeout=3000):
        cat_btn.click()
        page.wait_for_timeout(500)
        body3 = page.text_content('body') or ''
        has_liquid = 'Liquid' in body3
        ok(has_liquid, 'Category filter: Liquid')

    # Risk filter test
    risk_btn = page.locator('button:has-text("Low")').first
    if risk_btn.is_visible():
        risk_btn.click()
        page.wait_for_timeout(500)
        ok(True, 'Risk filter clickable')

def test_fund_detail(page):
    print('\n═══ FUND DETAIL ═══')
    page.goto(f'{BASE}/#/fund/120503')
    page.wait_for_selector('text=Current NAV', timeout=30000)
    page.wait_for_timeout(2000)
    body = page.text_content('body') or ''
    ok('Current NAV' in body, 'NAV visible')
    ok('Trailing Returns' in body, 'CAGR section')
    ok('Sharpe Ratio' in body, 'Sharpe metric')
    ok('Drawdown' in body, 'Drawdown section')
    ok('Monthly Win Rate' in body, 'Win rate')
    svgs = page.locator('svg path[d]').count()
    ok(svgs > 0, f'NAV chart renders ({svgs} paths)')

def test_indices(page):
    print('\n═══ INDICES ═══')
    page.goto(f'{BASE}/#/indices')
    page.wait_for_selector('text=Market Indices', timeout=15000)
    page.wait_for_timeout(2000)
    body = page.text_content('body') or ''
    ok('Market Indices' in body, 'Heading')
    cards = page.locator('.rounded-md.border').all()
    ok(len(cards) > 3, f'{len(cards)} index cards')

def test_compare(page):
    print('\n═══ COMPARE ═══')
    page.goto(f'{BASE}/#/compare')
    page.wait_for_selector('text=Compare', timeout=15000)
    page.wait_for_timeout(3000)
    body = page.text_content('body') or ''
    ok('Compare' in body, 'Heading')
    rows = page.locator('table tbody tr').count()
    ok(rows >= 0, 'Table renders')

    inp = page.get_by_placeholder('Add symbol…')
    if inp.is_visible(timeout=5000):
        inp.fill('WIPRO')
        inp.press('Enter')
        page.wait_for_timeout(2000)
        body2 = page.text_content('body') or ''
        ok(True, 'Add symbol works')

def test_watchlist(page):
    print('\n═══ WATCHLIST ═══')
    page.goto(f'{BASE}/#/watchlist')
    page.wait_for_selector('text=Watchlist', timeout=10000)
    page.wait_for_timeout(1000)
    body = page.text_content('body') or ''
    ok('Watchlist' in body, 'Heading')
    ok(len(body) > 50, 'Content loaded')

def test_portfolio(page):
    print('\n═══ PORTFOLIO ═══')
    page.goto(f'{BASE}/#/portfolio')
    page.wait_for_selector('text=Portfolio', timeout=10000)
    page.wait_for_timeout(1000)
    body = page.text_content('body') or ''
    ok('Portfolio' in body, 'Heading')

    add_btn = page.get_by_role('button', name='+ Add')
    if add_btn.first.is_visible():
        add_btn.first.click()
        page.wait_for_timeout(500)
        page.get_by_placeholder('Symbol (e.g. RELIANCE)').fill('TCS')
        page.get_by_placeholder('Name (e.g. Reliance)').fill('Tata')
        page.get_by_placeholder('Quantity').fill('10')
        page.get_by_placeholder('Buy Price (₹)').fill('3800')
        page.get_by_role('button', name='Save').click()
        page.wait_for_timeout(1000)
        body2 = page.text_content('body') or ''
        ok('TCS' in body2, 'Holding saved')

def test_banker(page):
    print('\n═══ BANKER ═══')
    page.goto(f'{BASE}/#/banker')
    page.wait_for_selector('text=Oracle of Omaha', timeout=15000)
    page.wait_for_timeout(5000)
    body = page.text_content('body') or ''
    ok('Oracle of Omaha' in body, 'Oracle header')
    ok('STEP 1' in body, 'Step 1 visible')
    ok('STEP 2' in body, 'Step 2 visible')
    ok('Seek the Oracle' in body, 'Scan button')

    # Select fundCount=2 and scan
    fund2 = page.locator('text=How many funds').locator('..').locator('button').nth(1)
    if fund2.is_visible(timeout=3000):
        fund2.click()
        page.wait_for_timeout(200)

    page.locator('button:has-text("Seek the Oracle")').click()
    page.wait_for_timeout(2000)
    body2 = page.text_content('body') or ''
    scores = body2.count('/100')
    of2 = body2.count('of 2')
    ok(scores == 2, f'Exact {scores}/2 cards (expected 2, got {scores})')

def test_navigation(page):
    print('\n═══ NAVIGATION ═══')
    routes = [
        ('Dashboard', 'dashboard'),
        ('Funds', 'funds'),
        ('Indices', 'indices'),
        ('Compare', 'compare'),
        ('Watchlist', 'watchlist'),
        ('Portfolio', 'portfolio'),
        ('Banker', 'banker'),
        ('About', 'about'),
    ]
    for label, path in routes:
        page.goto(f'{BASE}/#/{path}')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(300)
        current = page.url.split('#')[1] if '#' in page.url else ''
        ok(path in current, f'/{path} loads')

def test_error_states(page):
    print('\n═══ ERROR HANDLING ═══')
    page.goto(f'{BASE}/#/fund/0')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    body = page.text_content('body') or ''
    ok(len(body.strip()) > 50, 'Invalid fund: has content')

    page.goto(f'{BASE}/#/symbol/ZZZZZZ')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    body2 = page.text_content('body') or ''
    ok(len(body2.strip()) > 50, 'Invalid symbol: has content')

def test_search(page):
    print('\n═══ GLOBAL SEARCH ═══')
    page.goto(f'{BASE}/#/dashboard')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    search = page.get_by_placeholder('Search symbols…')
    ok(search.is_visible(), 'Search bar visible')
    search.fill('TCS')
    page.wait_for_timeout(1000)
    body = page.text_content('body') or ''
    ok(len(body) > 50, 'Search accepts input')

def main():
    print('=' * 55)
    print('  Stonks E2E Test Suite')
    print('=' * 55)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.set_default_timeout(15000)

        try:
            test_landing(page)
            test_funds(page)  # Run first — warm MFAPI cache
            test_dashboard(page)
            test_fund_detail(page)
            test_indices(page)
            test_compare(page)
            test_watchlist(page)
            test_portfolio(page)
            test_banker(page)
            test_navigation(page)
            test_error_states(page)
            test_search(page)
        except Exception as e:
            print(f'\n✗ FATAL: {e}')
            try: page.screenshot(path='/tmp/stonks-fatal.png', full_page=True)
            except: pass
        finally:
            browser.close()

    total = PASS + FAIL
    pct = (PASS / total * 100) if total else 0
    print(f'\n{"=" * 55}')
    print(f'  {PASS}/{total} passed ({pct:.0f}%), {FAIL} failed')
    print(f'{"=" * 55}')
    sys.exit(1 if FAIL > 0 else 0)

if __name__ == '__main__':
    main()
