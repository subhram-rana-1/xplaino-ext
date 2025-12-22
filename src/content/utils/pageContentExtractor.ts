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

// =============================================================================
// TRANSLATION ELEMENT EXTRACTION
// =============================================================================

/**
 * Target tags for translation (main content only)
 */
const TRANSLATABLE_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
  'LI', 'TD', 'TH', 'SPAN', 'DIV', 
  'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'FIGCAPTION',
  'LABEL', 'LEGEND', 'SUMMARY', 'DETAILS'
]);

/**
 * Elements to exclude from translation (navigation, headers, footers, etc.)
 */
const EXCLUDED_ROLES = new Set([
  'navigation', 'banner', 'search', 'complementary', 
  'contentinfo', 'menu', 'menubar', 'toolbar'
]);

/**
 * ID/Class patterns to exclude (navigation, headers, footers, etc.)
 */
const EXCLUDED_PATTERNS = [
  /nav/i, /menu/i, /header/i, /footer/i, /sidebar/i, 
  /cookie/i, /gdpr/i, /consent/i, /advertisement/i, /ad-/i
];

/**
 * Translatable element interface
 */
export interface TranslatableElement {
  element: HTMLElement;
  originalText: string;
  translatedText?: string;
}

/**
 * Check if an element is an extension element
 */
function isExtensionElement(element: Element): boolean {
  const id = element.id;
  const classes = element.className;
  
  // Check for xplaino extension elements
  if (id && id.includes('xplaino')) return true;
  if (typeof classes === 'string' && classes.includes('xplaino')) return true;
  
  // Check for chrome extension elements
  if (element.tagName.toLowerCase().includes('extension')) return true;
  
  return false;
}

/**
 * Check if element should be excluded from translation
 */
function shouldExcludeElement(element: HTMLElement): boolean {
  // Check if it's an extension element
  if (isExtensionElement(element)) return true;
  
  // Check ARIA role
  const role = element.getAttribute('role');
  if (role && EXCLUDED_ROLES.has(role)) return true;
  
  // Check ID and class names
  const id = element.id || '';
  const className = typeof element.className === 'string' ? element.className : '';
  const combined = `${id} ${className}`.toLowerCase();
  
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(combined)) return true;
  }
  
  // Check tag name
  const tagName = element.tagName.toUpperCase();
  if (tagName === 'NAV' || tagName === 'HEADER' || tagName === 'FOOTER' || tagName === 'ASIDE') {
    return true;
  }
  
  return false;
}

/**
 * Get direct text content of an element (not including children)
 */
function getDirectTextContent(element: HTMLElement): string {
  const texts: string[] = [];
  
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        texts.push(text);
      }
    }
  }
  
  return texts.join(' ').trim();
}

/**
 * Check if text is valid for translation
 */
function isValidTranslatableText(text: string): boolean {
  // Too short
  if (text.length < 3) return false;
  
  // Pure numbers or single characters
  if (/^[\d\s,.!?]+$/.test(text)) return false;
  
  // Only punctuation
  if (/^[^\w\s]+$/.test(text)) return false;
  
  // Minimal word count (at least 1 word)
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 1) return false;
  
  return true;
}

/**
 * Check if element has translatable children
 */
function hasTranslatableChildren(element: HTMLElement): boolean {
  for (const child of element.children) {
    if (child instanceof HTMLElement) {
      const childTag = child.tagName.toUpperCase();
      if (TRANSLATABLE_TAGS.has(childTag)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract translatable elements from the page
 * Returns array of elements with their original text
 */
export function extractTranslatableElements(): TranslatableElement[] {
  const translatableElements: TranslatableElement[] = [];
  const maxElements = 200; // Limit for performance
  
  console.log('[PageContentExtractor] Starting element extraction...');
  
  // Create tree walker to traverse visible elements
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const element = node as Element;
        
        // Skip excluded tags
        if (EXCLUDED_TAGS.has(element.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip extension elements
        if (isExtensionElement(element)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip invisible elements
        if (!isElementVisible(element)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node: Element | null;
  let count = 0;
  
  while ((node = walker.nextNode() as Element | null) && count < maxElements) {
    const element = node as HTMLElement;
    const tagName = element.tagName.toUpperCase();
    
    // Check if this tag is translatable
    if (!TRANSLATABLE_TAGS.has(tagName)) {
      continue;
    }
    
    // Check if element should be excluded
    if (shouldExcludeElement(element)) {
      continue;
    }
    
    // For container elements (DIV, SECTION, ARTICLE), only process if they have direct text
    // and don't have translatable children (to avoid duplicating content)
    if (tagName === 'DIV' || tagName === 'SECTION' || tagName === 'ARTICLE' || tagName === 'SPAN') {
      if (hasTranslatableChildren(element)) {
        continue; // Skip container, process children instead
      }
    }
    
    // Get direct text content
    const text = getDirectTextContent(element);
    
    // Validate text
    if (!isValidTranslatableText(text)) {
      continue;
    }
    
    // Check if already marked as translated
    if (element.hasAttribute('data-xplaino-original') || 
        element.hasAttribute('data-xplaino-translated')) {
      continue;
    }
    
    // Add to translatable elements
    translatableElements.push({
      element,
      originalText: text
    });
    
    count++;
  }
  
  console.log(`[PageContentExtractor] Extracted ${translatableElements.length} translatable elements`);
  
  return translatableElements;
}

