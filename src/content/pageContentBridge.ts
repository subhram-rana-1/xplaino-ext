// src/content/pageContentBridge.ts
// Bridge so SummaryView and handleSummariseClick can get page content or wait for it
// without circular dependencies. Content script registers the implementation.

let getPageContentOrWaitImpl: (() => Promise<string>) | null = null;

export interface SummarisePayload {
  content: Record<string, string>;
}

let getSummarisePayloadOrWaitImpl: (() => Promise<SummarisePayload>) | null = null;

/**
 * Register the implementation that waits for page read completion and returns in-memory content.
 * Called once from content script init.
 */
export function registerGetPageContentOrWait(fn: () => Promise<string>): void {
  getPageContentOrWaitImpl = fn;
}

/**
 * Register the implementation that waits for page read, runs extractPageContentWithIds(),
 * sets summaryIdToElementMapAtom, and returns { content } for the summarise v2 API.
 */
export function registerGetSummarisePayloadOrWait(fn: () => Promise<SummarisePayload>): void {
  getSummarisePayloadOrWaitImpl = fn;
}

/**
 * Returns page content after waiting for PAGE_READING_COMPLETED if still in progress.
 * Use this for summarise and ask flows instead of Chrome storage.
 */
export async function getPageContentOrWait(): Promise<string> {
  if (!getPageContentOrWaitImpl) {
    return '';
  }
  return getPageContentOrWaitImpl();
}

/**
 * Returns summarise payload (ID-keyed content) after page read and sets the ID→element map
 * in the store for click-to-scroll. Use for summarise flow only.
 */
export async function getSummarisePayloadOrWait(): Promise<SummarisePayload> {
  if (!getSummarisePayloadOrWaitImpl) {
    return { content: {} };
  }
  return getSummarisePayloadOrWaitImpl();
}
