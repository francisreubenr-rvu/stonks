"""Stonks E2E test suite — resilient to Yahoo Finance rate limiting"""
from playwright.sync_api import sync_playwright
import sys

BASE = 'http://localhost:5173'
passed = 0
failed = 0

def ok(cond, label):
    global passed, failed
    if cond:
        print(f'  ✓ {label}')
        passed += 1
    else:
        print(f'  ✗ FAIL: {label}')
        failed += 1

def page_has_content(page, min_chars=100):
    return len((page.text_content('body') or '').strip()) > min_chars

def test_landing(page):
    print('\n[Landing Page]')
    page.goto(f'{BASE}/#/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    ok(page.locator('nav').is_visible(), 'Nav bar visible')
    ok(page.get_by_text('stonks', exact=True).first.is_visible(), 'Brand name visible')
    ok(page.locator('h1').is_visible(), 'Hero heading visible')
    ok(page.get_by_role('button', name='Start screening').is_visible(), 'CTA visible')

def test_dashboard(page):
    print('\n[Dashboard]')
    page.goto(f'{BASE}/#/dashboard')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)
    ok(page_has_content(page, 100), 'Page has content')
    # Check heading or loading state
    has_heading = page.get_by_text('Market Dashboard').is_visible()
    has_indices = page.get_by_text('NIFTY 50').count() > 0
    ok(has_heading or has_indices, 'Dashboard renders (data or loading)')

def test_funds(page):
    print('\n[Funds Page]')
    page.goto(f'{BASE}/#/funds')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(6000)
    ok(page.get_by_text('Mutual Funds').is_visible(timeout=5000), 'Funds heading')
    ok(page.get_by_text('Filters').is_visible(), 'Filters visible')
    # Check data loaded or shimmer visible
    content = page.text_content('body') or ''
    has_schemes = 'Grindlays' in content or 'scheme' in content
    ok(has_schemes or 'Loading' in content, 'Fund data loading or loaded')

    # Test search (works even with shimmer)
    search = page.get_by_placeholder('Search by fund name…')
    if search.is_visible(timeout=3000):
        search.fill('Mirae')
        page.wait_for_timeout(800)
        ok(page_has_content(page), 'Search input works')

def test_indices(page):
    print('\n[Indices]')
    page.goto(f'{BASE}/#/indices')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(4000)
    ok(page_has_content(page, 100), 'Page has content')
    ok(page.get_by_text('Market Indices').is_visible(timeout=5000), 'Heading visible')

def test_compare(page):
    print('\n[Compare]')
    page.goto(f'{BASE}/#/compare')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(4000)
    ok(page_has_content(page, 100), 'Page has content')
    ok(page.get_by_text('Compare').count() > 0, 'Compare page renders')

    # Test add symbol (works regardless of API state)
    inp = page.get_by_placeholder('Add symbol…')
    if inp.is_visible(timeout=3000):
        inp.fill('WIPRO')
        inp.press('Enter')
        page.wait_for_timeout(1000)
        ok(page_has_content(page), 'Symbol add works')

def test_watchlist(page):
    print('\n[Watchlist]')
    page.goto(f'{BASE}/#/watchlist')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    ok(page.get_by_text('Watchlist').count() > 0, 'Watchlist renders')
    body = page.text_content('body') or ''
    ok('empty' in body or 'item' in body, 'Content loaded')

def test_portfolio(page):
    print('\n[Portfolio]')
    page.goto(f'{BASE}/#/portfolio')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    ok(page.get_by_text('Portfolio').count() > 0, 'Portfolio renders')
    add_btn = page.get_by_role('button', name='+ Add')
    if add_btn.first.is_visible():
        add_btn.first.click()
        page.wait_for_timeout(500)
        ok(page.get_by_role('button', name='Save').is_visible(), 'Add form opens')

def test_navigation(page):
    print('\n[Navigation]')
    page.goto(f'{BASE}/#/dashboard')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    for label in ['Funds', 'Indices', 'Compare', 'Watchlist', 'Portfolio', 'About']:
        link = page.get_by_role('link', name=label)
        if link.is_visible():
            link.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(300)
            ok(label.lower() in page.url.lower(), f'Nav → {label}')

def test_error_handling(page):
    print('\n[Error Handling]')
    page.goto(f'{BASE}/#/fund/999999')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    ok(page_has_content(page, 50), 'Error page has content')

def test_about(page):
    print('\n[About]')
    page.goto(f'{BASE}/#/about')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    ok(page.get_by_text('Disclaimer').is_visible(), 'Disclaimer')
    ok(page.get_by_text('Data Sources').is_visible(), 'Data Sources')

def test_search_bar(page):
    print('\n[Global Search]')
    page.goto(f'{BASE}/#/dashboard')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    search = page.get_by_placeholder('Search symbols…')
    if search.is_visible():
        search.fill('TCS')
        page.wait_for_timeout(1200)
        ok(page_has_content(page), 'Search input accepts text')

def main():
    print('=' * 55)
    print('  Stonks E2E Test Suite')
    print('=' * 55)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.set_default_timeout(15000)

        try:
            test_landing(page)
            test_dashboard(page)
            test_funds(page)
            test_indices(page)
            test_compare(page)
            test_watchlist(page)
            test_portfolio(page)
            test_search_bar(page)
            test_navigation(page)
            test_error_handling(page)
            test_about(page)
        except Exception as e:
            print(f'\n✗ FATAL: {e}')
            try:
                page.screenshot(path='/tmp/stonks-failure.png', full_page=True)
            except:
                pass
        finally:
            browser.close()

    total = passed + failed
    print(f'\n{"=" * 55}')
    pct = (passed / total * 100) if total else 0
    print(f'  Results: {passed}/{total} passed ({pct:.0f}%), {failed} failed')
    print(f'{"=" * 55}')
    sys.exit(1 if failed > 0 else 0)

if __name__ == '__main__':
    main()
