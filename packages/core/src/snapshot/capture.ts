import type { Page } from 'playwright';
import type { Snapshot } from './types.js';
import { extractDomSnapshot } from './browser-script.js';
import { installLiveObserver } from './live-observer.js';

export async function captureSnapshot(page: Page): Promise<Snapshot> {
  await page.evaluate(installLiveObserver);
  const domPart = await page.evaluate(extractDomSnapshot);

  const mutationLog = await page.evaluate(() => {
    const w = window as unknown as {
      __sw_live_mutations?: Snapshot['liveRegionMutations'];
      __sw_content_mutations?: Snapshot['contentMutations'];
    };
    return {
      live: w.__sw_live_mutations ?? [],
      content: w.__sw_content_mutations ?? [],
    };
  });

  const ariaTree = await page.locator('body').ariaSnapshot();

  return {
    ...domPart,
    liveRegionMutations: mutationLog.live,
    contentMutations: mutationLog.content,
    ariaTree,
    capturedAt: Date.now(),
  };
}

export async function clearMutationLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __sw_clear_mutations?: () => void };
    w.__sw_clear_mutations?.();
  });
}
