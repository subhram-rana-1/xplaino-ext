// src/content/utils/pageContentExtractor.ts
// Utility for extracting text content from web pages

import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';

/**
 * Tags to exclude when extracting text content
 */
const EXCLUDED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'MAP',
  'TEMPLATE',
]);

/**
 * Attributes that indicate an element should be hidden
 */
const HIDDEN_ATTRIBUTES = ['hidden', 'aria-hidden'];

/**
 * Check if an element is visible
 */
function isElementVisible(element: Element): boolean {
  // Check for hidden attributes
  for (const attr of HIDDEN_ATTRIBUTES) {
    if (element.hasAttribute(attr) && element.getAttribute(attr) !== 'false') {
      return false;
    }
  }

  // Check computed style if available
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    try {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    } catch {
      // Ignore errors from getComputedStyle
    }
  }

  return true;
}

/**
 * Extract text from a single element
 */
function extractTextFromElement(element: Element): string {
  // Skip excluded tags
  if (EXCLUDED_TAGS.has(element.tagName)) {
    return '';
  }

  // Skip hidden elements
  if (!isElementVisible(element)) {
    return '';
  }

  const texts: string[] = [];

  // Process child nodes
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        texts.push(text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childText = extractTextFromElement(node as Element);
      if (childText) {
        texts.push(childText);
      }
    }
  }

  return texts.join(' ');
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  return text
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}

/**
 * Extract all visible text content from the page
 */
export function extractPageContent(): string {
  const body = document.body;
  if (!body) {
    return '';
  }

  const rawText = extractTextFromElement(body);
  return cleanText(rawText);
}

/**
 * Extract page content and store in Chrome storage
 * Returns the extracted content
 */
export async function extractAndStorePageContent(): Promise<string> {
  const domain = window.location.hostname;
  const content = extractPageContent();
  
  if (content) {
    await ChromeStorage.setPageContent(domain, content);
    console.log(`[PageContentExtractor] Stored ${content.length} characters for ${domain}`);
  }
  
  return content;
}

/**
 * Check if page content exists for the current domain
 */
export async function hasPageContent(): Promise<boolean> {
  const domain = window.location.hostname;
  const content = await ChromeStorage.getPageContent(domain);
  return content !== null && content.length > 0;
}

/**
 * Get page content for the current domain
 */
export async function getStoredPageContent(): Promise<string | null> {
  const domain = window.location.hostname;
  return ChromeStorage.getPageContent(domain);
}

