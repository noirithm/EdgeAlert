import type {
  DialogInfo,
  DisclosureInfo,
  ErrorSummaryInfo,
  FocusInfo,
  FormFieldIssue,
  PageInfo,
  Snapshot,
} from './types.js';

export type DomSnapshot = Omit<
  Snapshot,
  'liveRegionMutations' | 'contentMutations' | 'ariaTree' | 'capturedAt'
>;

export function extractDomSnapshot(): DomSnapshot {
  const LANDMARK_ROLES = [
    'banner',
    'navigation',
    'main',
    'complementary',
    'contentinfo',
    'search',
    'form',
    'region',
  ] as const;

  const IMPLICIT_LANDMARK_TAGS: Record<string, string> = {
    NAV: 'navigation',
    MAIN: 'main',
    HEADER: 'banner',
    FOOTER: 'contentinfo',
    ASIDE: 'complementary',
    FORM: 'form',
  };

  const IMPLICIT_ROLES: Record<string, string> = {
    BUTTON: 'button',
    A: 'link',
    DIALOG: 'dialog',
    SUMMARY: 'button',
    SELECT: 'combobox',
    TEXTAREA: 'textbox',
    NAV: 'navigation',
    MAIN: 'main',
    HEADER: 'banner',
    FOOTER: 'contentinfo',
    FORM: 'form',
    ASIDE: 'complementary',
  };

  function getAccessibleName(el: Element): string | null {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      if (text) return text;
    }

    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      const closestLabel = el.closest('label');
      if (closestLabel?.textContent?.trim()) return closestLabel.textContent.trim();
    }

    if (el.tagName === 'IMG') {
      const alt = el.getAttribute('alt');
      if (alt && alt.trim()) return alt.trim();
    }

    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();

    const text = el.textContent?.trim();
    if (text) return text.length > 120 ? `${text.slice(0, 120)}...` : text;

    return null;
  }

  function getRole(el: Element): string | null {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit.trim().split(/\s+/)[0] ?? null;

    if (el.tagName === 'A' && !el.hasAttribute('href')) return null;

    if (el.tagName === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
      return 'textbox';
    }

    return IMPLICIT_ROLES[el.tagName] ?? null;
  }

  function getSelectorPath(el: Element): string {
    if (el.id) {
      const escaped = CSS.escape(el.id);
      if (document.querySelectorAll(`#${escaped}`).length === 1) return `#${escaped}`;
    }

    const testId = el.getAttribute('data-testid');
    if (testId) {
      const escaped = CSS.escape(testId);
      if (document.querySelectorAll(`[data-testid="${escaped}"]`).length === 1) {
        return `[data-testid="${escaped}"]`;
      }
    }

    const parts: string[] = [];
    let node: Element | null = el;

    while (node && node.nodeType === 1 && node !== document.documentElement) {
      let selector = node.tagName.toLowerCase();
      const parent: Element | null = node.parentElement;

      if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter(
          (sibling) => sibling.tagName === node?.tagName,
        );
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(node) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(selector);

      if (node.id) {
        const escaped = CSS.escape(node.id);
        if (document.querySelectorAll(`#${escaped}`).length === 1) {
          parts[0] = `#${escaped}`;
          break;
        }
      }

      node = parent;
    }

    return parts.join(' > ');
  }

  function isVisible(el: Element): boolean {
    if (!el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      return false;
    }
    if (Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInsideInert(el: Element): boolean {
    let node: Element | null = el;
    while (node) {
      if ((node as HTMLElement).inert || node.hasAttribute('inert')) return true;
      node = node.parentElement;
    }
    return false;
  }

  function isInsideAriaHidden(el: Element): boolean {
    let node: Element | null = el;
    while (node) {
      if (node.getAttribute('aria-hidden') === 'true') return true;
      node = node.parentElement;
    }
    return false;
  }

  function getBackgroundSiblings(el: Element): Element[] {
    const result: Element[] = [];
    let node: Element | null = el;
    while (node && node !== document.body) {
      const parent: Element | null = node.parentElement;
      if (parent) {
        Array.from(parent.children).forEach((sibling) => {
          if (sibling !== node) result.push(sibling);
        });
      }
      node = parent;
    }
    return result;
  }

  function findOpenDialogs(): DialogInfo[] {
    const dialogs: DialogInfo[] = [];
    const candidates = document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]');

    candidates.forEach((el) => {
      if (el.tagName === 'DIALOG' && !el.hasAttribute('open')) return;
      if (!isVisible(el)) return;

      const role = el.getAttribute('role') === 'alertdialog' ? 'alertdialog' : 'dialog';
      const ariaModal = el.getAttribute('aria-modal') === 'true';
      const siblings = getBackgroundSiblings(el);

      let backgroundInert = siblings.length > 0;
      let backgroundAriaHidden = siblings.length > 0;

      for (const sibling of siblings) {
        if (!((sibling as HTMLElement).inert || sibling.hasAttribute('inert'))) backgroundInert = false;
        if (sibling.getAttribute('aria-hidden') !== 'true') backgroundAriaHidden = false;
      }

      dialogs.push({
        selector: getSelectorPath(el),
        role,
        isNativeDialogElement: el.tagName === 'DIALOG',
        ariaModal,
        backgroundInert,
        backgroundAriaHidden,
      });
    });

    return dialogs;
  }

  function findDisclosures(): DisclosureInfo[] {
    const disclosures: DisclosureInfo[] = [];

    document.querySelectorAll('[aria-expanded]').forEach((el) => {
      const expanded = el.getAttribute('aria-expanded') === 'true';
      const controlsId = el.getAttribute('aria-controls');
      let controlsSelector: string | null = null;
      let controlsTargetExists = false;
      let controlsTargetVisible: boolean | null = null;

      if (controlsId) {
        const target = document.getElementById(controlsId);
        controlsTargetExists = !!target;
        if (target) {
          controlsSelector = getSelectorPath(target);
          controlsTargetVisible = isVisible(target);
        }
      }

      disclosures.push({
        selector: getSelectorPath(el),
        accessibleName: getAccessibleName(el),
        expanded,
        controlsSelector,
        controlsTargetExists,
        controlsTargetVisible,
      });
    });

    return disclosures;
  }

  function findInvalidFields(): FormFieldIssue[] {
    const fields: FormFieldIssue[] = [];

    document.querySelectorAll('input, select, textarea').forEach((el) => {
      const ariaInvalid = el.getAttribute('aria-invalid') === 'true';
      const validity = (el as HTMLInputElement).validity;
      const invalidByValidity = Boolean(validity) && !validity.valid && el.hasAttribute('required');

      if (!ariaInvalid && !invalidByValidity) return;

      const describedBy = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      const errorMessage = (el.getAttribute('aria-errormessage') || '').split(/\s+/).filter(Boolean);

      const describedBySelectors = describedBy.map((id) => {
        const target = document.getElementById(id);
        return target ? getSelectorPath(target) : `#${id}`;
      });
      const errorMessageSelectors = errorMessage.map((id) => {
        const target = document.getElementById(id);
        return target ? getSelectorPath(target) : `#${id}`;
      });

      fields.push({
        selector: getSelectorPath(el),
        name: el.getAttribute('name'),
        ariaInvalid,
        describedBySelectors,
        errorMessageSelectors,
        hasAssociatedError: describedBySelectors.length > 0 || errorMessageSelectors.length > 0,
      });
    });

    return fields;
  }

  function findErrorSummaries(): ErrorSummaryInfo[] {
    const summaries: ErrorSummaryInfo[] = [];

    document.querySelectorAll('[role="alert"], [data-error-summary]').forEach((el) => {
      if (!isVisible(el)) return;
      const text = el.textContent?.trim() ?? '';
      if (text) {
        summaries.push({
          selector: getSelectorPath(el),
          text: text.length > 200 ? `${text.slice(0, 200)}...` : text,
        });
      }
    });

    return summaries;
  }

  function getPageInfo(): PageInfo {
    const landmarks: PageInfo['landmarks'] = [];

    LANDMARK_ROLES.forEach((role) => {
      document.querySelectorAll(`[role="${role}"]`).forEach((el) => {
        landmarks.push({ role, accessibleName: getAccessibleName(el) });
      });
    });

    Object.keys(IMPLICIT_LANDMARK_TAGS).forEach((tag) => {
      document.querySelectorAll(tag.toLowerCase()).forEach((el) => {
        if (!el.getAttribute('role')) {
          landmarks.push({ role: IMPLICIT_LANDMARK_TAGS[tag] ?? '', accessibleName: getAccessibleName(el) });
        }
      });
    });

    const h1 = document.querySelector('h1');

    return {
      url: window.location.href,
      title: document.title,
      h1Text: h1 ? h1.textContent?.trim() ?? null : null,
      landmarks,
    };
  }

  function getFocusInfo(): FocusInfo {
    const active = document.activeElement;

    if (!active || active === document.body) {
      return {
        tag: 'body',
        role: null,
        accessibleName: null,
        selector: 'body',
        isVisible: true,
        insideInert: false,
        insideAriaHidden: false,
        insideOpenDialog: false,
        isBody: true,
      };
    }

    const openDialogEls = Array.from(
      document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]'),
    );
    const insideOpenDialog = openDialogEls.some((dialog) => dialog.contains(active));

    return {
      tag: active.tagName.toLowerCase(),
      role: getRole(active),
      accessibleName: getAccessibleName(active),
      selector: getSelectorPath(active),
      isVisible: isVisible(active),
      insideInert: isInsideInert(active),
      insideAriaHidden: isInsideAriaHidden(active),
      insideOpenDialog,
      isBody: false,
    };
  }

  return {
    focus: getFocusInfo(),
    dialogs: findOpenDialogs(),
    disclosures: findDisclosures(),
    invalidFields: findInvalidFields(),
    errorSummaries: findErrorSummaries(),
    page: getPageInfo(),
  };
}
