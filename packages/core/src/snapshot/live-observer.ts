import type { ContentMutation, LiveRegionMutation } from './types.js';

interface StateWeaveWindow extends Window {
  __sw_observer?: MutationObserver;
  __sw_live_mutations?: LiveRegionMutation[];
  __sw_content_mutations?: ContentMutation[];
  __sw_clear_mutations?: () => void;
}

export function installLiveObserver(): void {
  const sw = window as unknown as StateWeaveWindow;

  sw.__sw_live_mutations = sw.__sw_live_mutations ?? [];
  sw.__sw_content_mutations = sw.__sw_content_mutations ?? [];

  if (sw.__sw_observer) {
    sw.__sw_observer.disconnect();
  }

  function isLiveRegion(el: Element): boolean {
    const live = el.getAttribute('aria-live');
    const role = el.getAttribute('role');
    return Boolean((live && live !== 'off') || role === 'status' || role === 'alert' || role === 'log');
  }

  function closestLiveRegion(node: Node): Element | null {
    let el: Element | null = node.nodeType === 1 ? (node as Element) : node.parentElement;
    while (el) {
      if (isLiveRegion(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function isInsideLiveRegion(node: Node): boolean {
    return closestLiveRegion(node) !== null;
  }

  function describeNode(node: Node): string {
    if (node.nodeType === 3) {
      const text = (node.textContent ?? '').trim();
      return text.length > 80 ? `${text.slice(0, 80)}...` : text;
    }
    const el = node as Element;
    if (!el.tagName) return 'node';
    return el.id ? `${el.tagName.toLowerCase()}#${el.id}` : el.tagName.toLowerCase();
  }

  const observer = new MutationObserver((records) => {
    const liveLog = sw.__sw_live_mutations ?? [];
    const contentLog = sw.__sw_content_mutations ?? [];

    for (const record of records) {
      const target = record.target;
      const liveRegion = closestLiveRegion(target);

      if (liveRegion) {
        liveLog.push({
          selector: liveRegion.id
            ? `${liveRegion.tagName.toLowerCase()}#${liveRegion.id}`
            : liveRegion.tagName.toLowerCase(),
          role: liveRegion.getAttribute('role'),
          ariaLive: liveRegion.getAttribute('aria-live'),
          ariaAtomic: liveRegion.getAttribute('aria-atomic') === 'true',
          ariaRelevant: liveRegion.getAttribute('aria-relevant'),
          textSnapshot: (liveRegion.textContent ?? '').trim().slice(0, 200),
          changedAt: Date.now(),
        });
        if (liveLog.length > 50) liveLog.shift();
        continue;
      }

      if (record.type === 'childList') {
        record.addedNodes.forEach((added) => {
          if (isInsideLiveRegion(added)) return;
          contentLog.push({ type: 'added', selector: describeNode(target), summary: describeNode(added) });
        });
        record.removedNodes.forEach((removed) => {
          if (isInsideLiveRegion(removed)) return;
          contentLog.push({ type: 'removed', selector: describeNode(target), summary: describeNode(removed) });
        });
      } else if (record.type === 'characterData') {
        contentLog.push({ type: 'text-changed', selector: describeNode(target), summary: describeNode(target) });
      }

      if (contentLog.length > 50) contentLog.shift();
    }

    sw.__sw_live_mutations = liveLog;
    sw.__sw_content_mutations = contentLog;
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  sw.__sw_observer = observer;

  sw.__sw_clear_mutations = () => {
    sw.__sw_live_mutations = [];
    sw.__sw_content_mutations = [];
  };
}
