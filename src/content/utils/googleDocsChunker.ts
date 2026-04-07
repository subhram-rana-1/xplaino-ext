// src/content/utils/googleDocsChunker.ts
// Chunks Google Docs API JSON into PageChunk[] with tab/page metadata.

import type { PageChunk, ChunkMetadata } from './pageChunker';
import type {
  FlatTab,
  GoogleDocsStructuralElement,
  GoogleDocsParagraph,
} from '@/api-services/GoogleDocsApiService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADING_STYLES = new Set([
  'HEADING_1',
  'HEADING_2',
  'HEADING_3',
  'HEADING_4',
  'HEADING_5',
  'HEADING_6',
]);

/** Rough estimate: one "page" ≈ 3 000 characters of plain text. */
const CHARS_PER_PAGE = 3000;

// ---------------------------------------------------------------------------
// Internal paragraph descriptor
// ---------------------------------------------------------------------------

interface ParaBlock {
  text: string;
  isHeading: boolean;
  /** Cumulative character position within the tab (used for page estimation). */
  charOffset: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paragraphText(p: GoogleDocsParagraph): string {
  return (
    p.elements
      ?.map((el) => el.textRun?.content ?? '')
      .join('')
      .replace(/\n$/, '') ?? ''
  );
}

function isHeadingParagraph(p: GoogleDocsParagraph): boolean {
  const style = p.paragraphStyle?.namedStyleType;
  return style != null && HEADING_STYLES.has(style);
}

function hasPageBreak(el: GoogleDocsStructuralElement): boolean {
  if (!el.paragraph) return false;
  return el.paragraph.elements?.some((e) => e.pageBreak != null) ?? false;
}

function estimatePage(charOffset: number, explicitPageCount: number): number {
  if (explicitPageCount > 0) return explicitPageCount;
  return Math.floor(charOffset / CHARS_PER_PAGE) + 1;
}

function buildGDocsMetadata(
  text: string,
  tabId: string,
  tabName: string,
  pageNumber: number
): ChunkMetadata {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return {
    startXPath: '',
    endXPath: '',
    startOffset: 0,
    endOffset: 0,
    cssSelector: '',
    textSnippetStart: trimmed.slice(0, 60),
    textSnippetEnd: trimmed.slice(-60),
    tabName,
    tabId,
    pageNumber,
  };
}

// ---------------------------------------------------------------------------
// Single-tab chunking
// ---------------------------------------------------------------------------

function chunkTab(tab: FlatTab, startIndex: number): PageChunk[] {
  const blocks: ParaBlock[] = [];
  let charOffset = 0;
  let explicitPage = 0;

  for (const el of tab.body.content) {
    if (hasPageBreak(el)) explicitPage++;

    if (!el.paragraph) continue;

    const text = paragraphText(el.paragraph).trim();
    if (!text) continue;

    blocks.push({
      text,
      isHeading: isHeadingParagraph(el.paragraph),
      charOffset,
    });
    charOffset += text.length;
  }

  if (blocks.length === 0) return [];

  const chunks: PageChunk[] = [];
  let idx = startIndex;
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.isHeading) {
      // Group heading + following non-heading paragraphs
      const group: ParaBlock[] = [block];
      let j = i + 1;
      while (j < blocks.length && !blocks[j].isHeading) {
        group.push(blocks[j]);
        j++;
      }

      const combinedText = group.map((b) => b.text).join('\n');
      const page = estimatePage(block.charOffset, explicitPage);
      chunks.push({
        chunkId: `chunk_${idx++}`,
        text: combinedText.replace(/\s+/g, ' ').trim(),
        metadata: buildGDocsMetadata(combinedText, tab.tabId, tab.title, page),
      });
      i = j;
      continue;
    }

    // Standalone paragraph
    const page = estimatePage(block.charOffset, explicitPage);
    chunks.push({
      chunkId: `chunk_${idx++}`,
      text: block.text.replace(/\s+/g, ' ').trim(),
      metadata: buildGDocsMetadata(block.text, tab.tabId, tab.title, page),
    });
    i++;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Chunk an array of flat Google Docs tabs into PageChunk[].
 * Each chunk carries `tabName`, `tabId`, and an estimated `pageNumber`.
 */
export function chunkGoogleDocTabs(tabs: FlatTab[]): PageChunk[] {
  const allChunks: PageChunk[] = [];
  let nextIndex = 0;

  for (const tab of tabs) {
    const tabChunks = chunkTab(tab, nextIndex);
    allChunks.push(...tabChunks);
    nextIndex += tabChunks.length;
  }

  return allChunks;
}

/**
 * Extract all plain text from the given tabs (used for content hashing).
 */
export function extractGoogleDocFullText(tabs: FlatTab[]): string {
  const parts: string[] = [];
  for (const tab of tabs) {
    for (const el of tab.body.content) {
      if (el.paragraph) {
        parts.push(paragraphText(el.paragraph));
      }
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
