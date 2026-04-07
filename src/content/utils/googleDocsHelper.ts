// src/content/utils/googleDocsHelper.ts
// Utilities for detecting Google Docs pages and extracting doc/tab identifiers.

/**
 * Returns true when the current page is a Google Docs document editor.
 * Matches URLs like https://docs.google.com/document/d/{id}/edit
 */
export function isGoogleDocsPage(): boolean {
  return (
    window.location.hostname === 'docs.google.com' &&
    window.location.pathname.startsWith('/document/')
  );
}

const DOC_ID_RE = /\/document\/d\/([a-zA-Z0-9_-]+)/;

/**
 * Extract the Google Docs document ID from a URL.
 * e.g. https://docs.google.com/document/d/1aBcDeFgH/edit → "1aBcDeFgH"
 */
export function extractGoogleDocsId(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(DOC_ID_RE);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract the tab ID from a Google Docs URL query string.
 * e.g. ?tab=t.0 → "t.0"
 * Returns null when no tab param is present (single-tab documents).
 */
export function extractGoogleDocsTabId(url: string): string | null {
  try {
    return new URL(url).searchParams.get('tab');
  } catch {
    return null;
  }
}

/**
 * Build a normalised Google Docs URL that strips the tab parameter.
 * Useful for generating an "all-tabs" vector index key.
 */
export function googleDocsUrlWithoutTab(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('tab');
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Try to read the active tab's display name from the Google Docs tab bar DOM.
 * Falls back to null when the tab bar isn't present or is unreadable.
 */
export function getActiveTabName(): string | null {
  const selectors = [
    '.navigation-widget-tab-bar .navigation-widget-tab-bar-tab-selected .navigation-widget-tab-bar-tab-title',
    '.docs-tab-bar .docs-tab-bar-tab-selected',
    '[data-tab-id].active .tab-title',
  ];
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) return text;
    } catch {
      // ignore selector errors
    }
  }
  return null;
}
