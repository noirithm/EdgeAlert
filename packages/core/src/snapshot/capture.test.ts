import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureSnapshot, clearMutationLog } from './capture.js';
import { installLiveObserver } from './live-observer.js';

describe('captureSnapshot', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('reports body focus when nothing is focused', async () => {
    await page.setContent('<html><body><h1>Title</h1></body></html>');
    const snapshot = await captureSnapshot(page);
    expect(snapshot.focus.isBody).toBe(true);
    expect(snapshot.page.h1Text).toBe('Title');
  });

  it('detects an open dialog and whether the background is inert', async () => {
    await page.setContent(`
      <html><body>
        <main id="app" inert>
          <button id="opener">Open</button>
        </main>
        <div role="dialog" aria-modal="true" id="d1">
          <button id="close">Close</button>
        </div>
      </body></html>
    `);
    const snapshot = await captureSnapshot(page);
    expect(snapshot.dialogs).toHaveLength(1);
    expect(snapshot.dialogs[0]?.ariaModal).toBe(true);
    expect(snapshot.dialogs[0]?.backgroundInert).toBe(true);
  });

  it('flags a disclosure whose target visibility does not match aria-expanded', async () => {
    await page.setContent(`
      <html><body>
        <button id="toggle" aria-expanded="true" aria-controls="panel">Menu</button>
        <div id="panel" hidden>content</div>
      </body></html>
    `);
    const snapshot = await captureSnapshot(page);
    expect(snapshot.disclosures).toHaveLength(1);
    expect(snapshot.disclosures[0]?.expanded).toBe(true);
    expect(snapshot.disclosures[0]?.controlsTargetVisible).toBe(false);
  });

  it('flags an invalid field with no associated error message', async () => {
    await page.setContent(`
      <html><body>
        <form>
          <input id="email" name="email" aria-invalid="true" />
        </form>
      </body></html>
    `);
    const snapshot = await captureSnapshot(page);
    expect(snapshot.invalidFields).toHaveLength(1);
    expect(snapshot.invalidFields[0]?.hasAssociatedError).toBe(false);
  });

  it('records a live region update and clears it on demand', async () => {
    await page.setContent(`
      <html><body>
        <div role="status" id="status"></div>
      </body></html>
    `);
    await page.evaluate(installLiveObserver);
    await clearMutationLog(page);

    await page.evaluate(() => {
      const el = document.getElementById('status');
      if (el) el.textContent = 'Saved';
    });

    await page.waitForFunction(() => {
      const w = window as unknown as { __sw_live_mutations?: unknown[] };
      return (w.__sw_live_mutations?.length ?? 0) > 0;
    });

    const snapshot = await captureSnapshot(page);
    expect(snapshot.liveRegionMutations.length).toBeGreaterThan(0);
    expect(snapshot.liveRegionMutations[0]?.textSnapshot).toBe('Saved');

    await clearMutationLog(page);
    const cleared = await captureSnapshot(page);
    expect(cleared.liveRegionMutations).toHaveLength(0);
  });
});
