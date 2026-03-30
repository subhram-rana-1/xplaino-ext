// src/content/utils/citationManager.ts
// Manages citation highlights on the live page DOM.
// Provides locate → scroll → highlight → toggle → cleanup operations.
// This is a pure DOM module with no React dependencies.

import { CitationDetail } from '@/api-services/WebpageChatService';

const MARK_ATTR = 'data-citation-highlight';
const MARK_STYLE =
  'all:unset !important;display:inline !important;' +
  'font:inherit !important;letter-spacing:inherit !important;word-spacing:inherit !important;' +
  'line-height:inherit !important;font-weight:inherit !important;' +
  'background-color:transparent !important;color:inherit !important;' +
  'text-decoration:underline !important;text-decoration-style:dashed !important;' +
  'text-decoration-color:#0d9488 !important;text-decoration-thickness:2px !important;' +
  'text-underline-offset:3px !important;';

// =============================================================================
// XPath resolution
// =============================================================================

function resolveXPath(xpath: string): Element | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return (result.singleNodeValue as Element) ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// Text-node-at-offset resolution
// =============================================================================

interface TextNodePos {
  node: Text;
  localOffset: number;
}

function getTextNodeAtOffset(element: Element, charOffset: number): TextNodePos | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let cumulative = 0;
  let node: Node | null;
  let lastSeen: Text | null = null;

  while ((node = walker.nextNode())) {
    const t = node as Text;
    lastSeen = t;
    const len = t.textContent?.length ?? 0;
    if (cumulative + len > charOffset) {
      return { node: t, localOffset: charOffset - cumulative };
    }
    cumulative += len;
  }

  if (lastSeen && cumulative === charOffset) {
    return { node: lastSeen, localOffset: lastSeen.textContent?.length ?? 0 };
  }
  return null;
}

function firstTextNode(el: Element): Text | null {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  return (w.nextNode() as Text) ?? null;
}

function lastTextNode(el: Element): Text | null {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  let last: Text | null = null;
  let n: Node | null;
  while ((n = w.nextNode())) last = n as Text;
  return last;
}

// =============================================================================
// Range construction — primary strategy (XPath + offsets)
// =============================================================================

function buildRangeFromXPath(citation: CitationDetail): Range | null {
  const startEl = resolveXPath(citation.startXPath);
  const endEl = resolveXPath(citation.endXPath);
  if (!startEl || !endEl) {
    console.log(`[Citation][XPath] chunkId=${citation.chunkId} FAILED — startEl=${!!startEl} endEl=${!!endEl} startXPath="${citation.startXPath}" endXPath="${citation.endXPath}"`);
    return null;
  }

  try {
    const range = document.createRange();
    const startPos = getTextNodeAtOffset(startEl, citation.startOffset);
    if (!startPos) {
      console.log(`[Citation][XPath] chunkId=${citation.chunkId} WARN — no text node at startOffset=${citation.startOffset}, using first text node of startEl`);
      const firstText = firstTextNode(startEl);
      if (firstText) {
        range.setStart(firstText, 0);
      } else {
        range.setStartBefore(startEl);
      }
    } else {
      range.setStart(startPos.node, startPos.localOffset);
    }

    const endPos = getTextNodeAtOffset(endEl, citation.endOffset);
    if (!endPos) {
      console.log(`[Citation][XPath] chunkId=${citation.chunkId} WARN — no text node at endOffset=${citation.endOffset}, using last text node of endEl`);
      const lastText = lastTextNode(endEl);
      if (lastText) {
        range.setEnd(lastText, lastText.textContent?.length ?? 0);
      } else {
        range.setEndAfter(endEl);
      }
    } else {
      range.setEnd(endPos.node, endPos.localOffset);
    }

    if (range.collapsed) {
      console.log(`[Citation][XPath] chunkId=${citation.chunkId} FAILED — range collapsed after construction`);
      return null;
    }
    console.log(`[Citation][XPath] chunkId=${citation.chunkId} OK`);
    return range;
  } catch (err) {
    console.log(`[Citation][XPath] chunkId=${citation.chunkId} FAILED — exception: ${err}`);
    return null;
  }
}

// =============================================================================
// Range construction — fallback strategy (fuzzy text search)
// =============================================================================

/**
 * Converts a whitespace-normalized snippet (as produced by the chunker's
 * `replace(/\s+/g, ' ').trim()`) into a RegExp that matches the equivalent
 * raw text regardless of how many/what kind of whitespace chars appear between
 * each word.  Special regex characters in the snippet are escaped first.
 */
function snippetToRegex(snippet: string): RegExp {
  const escaped = snippet
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(escaped);
}

/**
 * Returns the nearest common ancestor Element of two elements.
 * Falls back to document.body if no shared ancestor is found.
 */
function getCommonAncestor(a: Element, b: Element): Element {
  const aAncestors = new Set<Element>();
  let node: Element | null = a;
  while (node) {
    aAncestors.add(node);
    node = node.parentElement;
  }
  node = b;
  while (node) {
    if (aAncestors.has(node)) return node;
    node = node.parentElement;
  }
  return document.body;
}

function buildRangeFromSnippets(
  textSnippetStart: string,
  textSnippetEnd: string,
  chunkId?: string,
  /** Limit the search to this subtree. Defaults to document.body. */
  root: Element = document.body
): Range | null {
  if (!textSnippetStart || !textSnippetEnd) {
    console.log(`[Citation][Snippet] chunkId=${chunkId} FAILED — missing snippets (start="${textSnippetStart}" end="${textSnippetEnd}")`);
    return null;
  }

  // Collect all visible text nodes with cumulative positions in the raw DOM text.
  const textParts: { node: Text; start: number; end: number }[] = [];
  let pos = 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName?.toUpperCase();
      if (
        tag === 'SCRIPT' ||
        tag === 'STYLE' ||
        tag === 'NOSCRIPT' ||
        tag === 'TEXTAREA'
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const len = t.textContent?.length ?? 0;
    if (len === 0) continue;
    textParts.push({ node: t, start: pos, end: pos + len });
    pos += len;
  }

  // Raw (un-normalized) concatenation of all text node contents.
  // Regex search is used instead of indexOf so that the whitespace-normalized
  // snippets (produced by the chunker's `replace(/\s+/g, ' ')`) match DOM text
  // that may still contain raw newlines, tabs, or consecutive spaces.
  const fullText = textParts.map((p) => p.node.textContent ?? '').join('');

  const startRegex = snippetToRegex(textSnippetStart);
  const startMatch = startRegex.exec(fullText);
  if (!startMatch) {
    console.log(`[Citation][Snippet] chunkId=${chunkId} FAILED — textSnippetStart not found in page text. snippet="${textSnippetStart.slice(0, 60)}..."`);
    return null;
  }
  const startIdx = startMatch.index;

  // Search for the end snippet in the portion of fullText starting at startIdx.
  const endRegex = snippetToRegex(textSnippetEnd);
  const endMatch = endRegex.exec(fullText.slice(startIdx));
  if (!endMatch) {
    console.log(`[Citation][Snippet] chunkId=${chunkId} FAILED — textSnippetEnd not found after startIdx=${startIdx}. snippet="${textSnippetEnd.slice(0, 60)}..."`);
    return null;
  }
  // endIdx is the raw position just past the matched end snippet in fullText.
  const endIdx = startIdx + endMatch.index + endMatch[0].length;

  const startPartInfo = textParts.find(
    (p) => p.start <= startIdx && p.end > startIdx
  );
  const endPartInfo = textParts.find(
    (p) => p.start < endIdx && p.end >= endIdx
  );
  if (!startPartInfo || !endPartInfo) {
    console.log(`[Citation][Snippet] chunkId=${chunkId} FAILED — could not map indices to text nodes (startIdx=${startIdx} endIdx=${endIdx})`);
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(startPartInfo.node, startIdx - startPartInfo.start);
    range.setEnd(endPartInfo.node, endIdx - endPartInfo.start);
    if (range.collapsed) {
      console.log(`[Citation][Snippet] chunkId=${chunkId} FAILED — range collapsed`);
      return null;
    }
    console.log(`[Citation][Snippet] chunkId=${chunkId} OK — matched at positions ${startIdx}–${endIdx}`);
    return range;
  } catch (err) {
    console.log(`[Citation][Snippet] chunkId=${chunkId} FAILED — exception: ${err}`);
    return null;
  }
}

// =============================================================================
// Locate
// =============================================================================

export type LocationResult =
  | { found: true; range: Range }
  | { found: false };

export function locateCitation(citation: CitationDetail): LocationResult {
  // Primary: XPath + offsets
  const primaryRange = buildRangeFromXPath(citation);
  if (primaryRange) {
    console.log(`[Citation][locate] chunkId=${citation.chunkId} found via XPath`);
    return { found: true, range: primaryRange };
  }

  // Secondary: snippet search bounded to the XPath-resolved subtree.
  // The chunker walked within the content container (article/main/body), so
  // searching within the common ancestor of startXPath and endXPath avoids
  // interference from unrelated page elements (nav, breadcrumbs, sidebars, etc.)
  // that lie outside that subtree but still appear in a full document.body walk.
  const startEl = resolveXPath(citation.startXPath);
  const endEl = resolveXPath(citation.endXPath);
  if (startEl && endEl) {
    const ancestor = getCommonAncestor(startEl, endEl);
    console.log(`[Citation][locate] chunkId=${citation.chunkId} trying bounded snippet search within <${ancestor.tagName.toLowerCase()}>`);
    const boundedRange = buildRangeFromSnippets(
      citation.textSnippetStart,
      citation.textSnippetEnd,
      citation.chunkId,
      ancestor
    );
    if (boundedRange) {
      console.log(`[Citation][locate] chunkId=${citation.chunkId} found via bounded snippet search`);
      return { found: true, range: boundedRange };
    }
  }

  // Last resort: full document.body snippet search
  console.log(`[Citation][locate] chunkId=${citation.chunkId} trying full-body snippet search`);
  const fallbackRange = buildRangeFromSnippets(
    citation.textSnippetStart,
    citation.textSnippetEnd,
    citation.chunkId
  );
  if (fallbackRange) {
    console.log(`[Citation][locate] chunkId=${citation.chunkId} found via full-body snippet search`);
    return { found: true, range: fallbackRange };
  }

  console.log(`[Citation][locate] chunkId=${citation.chunkId} NOT FOUND — all strategies failed`);
  return { found: false };
}

// =============================================================================
// Highlight
// =============================================================================

function createMarkElement(chunkId: string): HTMLElement {
  const mark = document.createElement('mark');
  mark.setAttribute(MARK_ATTR, chunkId);
  mark.setAttribute('style', MARK_STYLE);
  return mark;
}

function wrapRangeInMark(range: Range, chunkId: string): HTMLElement | null {
  try {
    const mark = createMarkElement(chunkId);
    range.surroundContents(mark);
    console.log(`[Citation][wrap] chunkId=${chunkId} OK via surroundContents`);
    return mark;
  } catch (surroundErr) {
    console.log(`[Citation][wrap] chunkId=${chunkId} surroundContents failed (${surroundErr}) — trying multi-node fallback`);
    try {
      const ancestor = range.commonAncestorContainer;
      const root =
        ancestor.nodeType === Node.ELEMENT_NODE
          ? (ancestor as Element)
          : ancestor.parentElement;
      if (!root) {
        console.log(`[Citation][wrap] chunkId=${chunkId} FAILED — no root element for fallback`);
        return null;
      }
      console.log(`[Citation][wrap] chunkId=${chunkId} fallback root=<${root.tagName?.toLowerCase()}> rangeCollapsed=${range.collapsed}`);

      const textsToWrap: { node: Text; start: number; end: number }[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      let walked = 0;

      while ((n = walker.nextNode())) {
        walked++;
        const text = n as Text;
        const len = text.length;
        if (len === 0) continue;

        try {
          const cmpStart = range.comparePoint(text, 0);
          const cmpEnd = range.comparePoint(text, len);
          if (cmpStart > 0) continue;
          if (cmpEnd < 0) continue;
        } catch {
          continue;
        }

        const so = text === range.startContainer ? range.startOffset : 0;
        const eo = text === range.endContainer ? range.endOffset : len;
        if (so >= eo) continue;
        textsToWrap.push({ node: text, start: so, end: eo });
      }
      console.log(`[Citation][wrap] chunkId=${chunkId} walked ${walked} text nodes, ${textsToWrap.length} qualify for wrapping`);

      const marks: HTMLElement[] = [];
      for (const { node, start, end } of textsToWrap) {
        try {
          const nodeRange = document.createRange();
          nodeRange.setStart(node, start);
          nodeRange.setEnd(node, end);
          const m = createMarkElement(chunkId);
          nodeRange.surroundContents(m);
          marks.push(m);
        } catch (nodeErr) {
          console.log(`[Citation][wrap] chunkId=${chunkId} individual node wrap failed: ${nodeErr}`);
        }
      }

      if (marks.length > 0) {
        console.log(`[Citation][wrap] chunkId=${chunkId} OK via multi-node fallback (${marks.length} mark(s))`);
        return marks[0];
      }
      console.log(`[Citation][wrap] chunkId=${chunkId} FAILED — no nodes wrapped in fallback`);
      return null;
    } catch (err) {
      console.log(`[Citation][wrap] chunkId=${chunkId} FAILED — fallback exception: ${err}`);
      return null;
    }
  }
}

// =============================================================================
// Unwrap
// =============================================================================

function unwrapMarks(chunkId: string): void {
  const marks = document.querySelectorAll(`[${MARK_ATTR}="${chunkId}"]`);
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    const frag = document.createDocumentFragment();
    while (mark.firstChild) frag.appendChild(mark.firstChild);
    parent.replaceChild(frag, mark);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Activate a citation: locate its text on the page, apply highlight, then scroll to it.
 * Scrolling after DOM insertion ensures the browser targets the final <mark> position.
 * Returns whether the citation could be located.
 */
export function activateCitation(chunkId: string, citation: CitationDetail): boolean {
  console.log(`[Citation][activate] chunkId=${chunkId} — locating...`);
  const result = locateCitation(citation);
  if (!result.found) {
    console.log(`[Citation][activate] chunkId=${chunkId} FAILED — could not locate citation on page`);
    return false;
  }

  const mark = wrapRangeInMark(result.range, chunkId);
  if (!mark) {
    console.log(`[Citation][activate] chunkId=${chunkId} FAILED — could not wrap range in mark`);
    return false;
  }
  console.log(`[Citation][activate] chunkId=${chunkId} OK — mark inserted, scrolling...`);

  // Defer scroll until after the browser has finished painting the DOM mutation.
  // Using the direct mark reference avoids a querySelector race.
  setTimeout(() => {
    try {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      // Ignore scroll failures
    }
  }, 0);

  return true;
}

/**
 * Deactivate a citation: remove all <mark> elements for this chunkId, restoring DOM.
 */
export function deactivateCitation(chunkId: string): void {
  unwrapMarks(chunkId);
}

/**
 * Check whether a citation is currently highlighted on the page.
 */
export function isCitationActive(chunkId: string): boolean {
  return document.querySelector(`[${MARK_ATTR}="${chunkId}"]`) !== null;
}

/**
 * Remove ALL citation highlights from the page (on sidebar close / chat clear).
 */
export function removeAllHighlights(): void {
  const marks = document.querySelectorAll(`[${MARK_ATTR}]`);
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    const frag = document.createDocumentFragment();
    while (mark.firstChild) frag.appendChild(mark.firstChild);
    parent.replaceChild(frag, mark);
  }
}

// =============================================================================
// Answer text parsing
// =============================================================================

/** Pattern for inline citation markers: [[cite:chunk_4]] or [[cite:chunk_4,chunk_5]] */
export const CITE_PATTERN = /\[\[cite:([^\]]+)\]\]/g;

export interface ParsedCitation {
  /** Comma-separated raw chunkIds string as it appeared in the marker */
  raw: string;
  /** Parsed array of individual chunkIds */
  chunkIds: string[];
}

export interface ParsedAnswer {
  /** Answer text with [[cite:...]] replaced by CITE_N_PLACEHOLDER for ReactMarkdown */
  parsedText: string;
  /** Ordered list of citation groups, indexed by placeholder number (1-based) */
  citations: ParsedCitation[];
}

// =============================================================================
// Annotation pulsate (annotated text click → locate → scroll → 3× teal flash)
// =============================================================================

const PULSATE_ATTR = 'data-annotation-pulsate';

/**
 * Locate the annotated text on the live page using fuzzy snippet search,
 * scroll to it, then apply a 3× teal pulsate animation via WAAPI.
 * Silently no-ops if the text cannot be found.
 */
export function locateAndPulsateText(
  textSnippetStart: string,
  textSnippetEnd: string
): void {
  const range = buildRangeFromSnippets(textSnippetStart, textSnippetEnd);
  if (!range) return;

  // Scroll to the start of the range
  try {
    const startNode =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement;
    if (startNode) {
      startNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch {
    // ignore scroll errors
  }

  // Wrap in a <mark> element for the animation
  const mark = document.createElement('mark');
  mark.setAttribute(PULSATE_ATTR, 'true');
  mark.setAttribute(
    'style',
    'background-color:transparent;border-radius:3px;padding:0 2px;' +
    'box-decoration-break:clone;-webkit-box-decoration-break:clone;'
  );

  let wrapped = false;
  try {
    range.surroundContents(mark);
    wrapped = true;
  } catch {
    try {
      const frag = range.extractContents();
      mark.appendChild(frag);
      range.insertNode(mark);
      wrapped = true;
    } catch {
      // Cannot wrap — silently give up
    }
  }

  if (!wrapped) return;

  // 3× teal pulsate using Web Animations API (no CSS injection needed).
  // Semi-transparent teal so the underlying text remains readable.
  const anim = mark.animate(
    [
      { backgroundColor: 'transparent' },
      { backgroundColor: 'rgba(13,148,136,0.35)' },
      { backgroundColor: 'transparent' },
      { backgroundColor: 'rgba(13,148,136,0.35)' },
      { backgroundColor: 'transparent' },
      { backgroundColor: 'rgba(13,148,136,0.35)' },
      { backgroundColor: 'transparent' },
    ],
    { duration: 2100, easing: 'ease-in-out', fill: 'forwards' }
  );

  anim.onfinish = () => {
    // Unwrap the mark element, restoring original DOM
    const parent = mark.parentNode;
    if (!parent) return;
    const frag = document.createDocumentFragment();
    while (mark.firstChild) frag.appendChild(mark.firstChild);
    parent.replaceChild(frag, mark);
  };
}

/**
 * Parse [[cite:...]] markers in an answer string.
 * Replaces each with a `CITE_N_PLACEHOLDER` code span for ReactMarkdown rendering.
 */
export function parseAnswerCitations(answer: string): ParsedAnswer {
  const citations: ParsedCitation[] = [];
  let n = 0;

  const parsedText = answer.replace(CITE_PATTERN, (_match, inner: string) => {
    const chunkIds = inner
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    citations.push({ raw: inner, chunkIds });
    n++;
    return `\`CITE_${n}_PLACEHOLDER\``;
  });

  return { parsedText, citations };
}
