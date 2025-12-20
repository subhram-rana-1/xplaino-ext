// src/content/utils/referenceMatcher.ts
// Utility for fuzzy matching reference text to HTML elements

/**
 * Tags to exclude when searching for reference matches
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
  'HEAD',
  'META',
  'LINK',
]);

/**
 * Extension shadow DOM host IDs to exclude
 */
const EXTENSION_HOST_IDS = [
  'xplaino-side-panel-host',
  'xplaino-content-actions-host',
  'xplaino-fab-host',
];

/**
 * Check if an element is part of our extension
 */
function isExtensionElement(element: Element): boolean {
  // Check if element has our data attributes
  if (element.hasAttribute('data-xplaino')) {
    return true;
  }

  // Check if element is inside our shadow DOM hosts
  let current: Element | null = element;
  while (current) {
    if (current.id && EXTENSION_HOST_IDS.includes(current.id)) {
      return true;
    }
    // Check if element is inside a shadow root
    if (current.getRootNode() && current.getRootNode() instanceof ShadowRoot) {
      const host = (current.getRootNode() as ShadowRoot).host;
      if (host && host.id && EXTENSION_HOST_IDS.includes(host.id)) {
        return true;
      }
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * Check if an element is visible
 */
function isElementVisible(element: Element): boolean {
  // Check for hidden attributes
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
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
 * Get text content from an element (excluding child elements)
 */
function getDirectTextContent(element: Element): string {
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
 * Get all text content from an element and its children
 */
function getAllTextContent(element: Element): string {
  return element.textContent?.trim() || '';
}

/**
 * Calculate similarity score between two strings (simple approach)
 * Returns a score between 0 and 1, where 1 is exact match
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) {
    return 1.0;
  }

  // Substring match
  if (s2.includes(s1) || s1.includes(s2)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return shorter.length / longer.length;
  }

  // Word-based matching
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  let matchingWords = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matchingWords++;
    }
  }
  if (words1.length > 0) {
    return matchingWords / words1.length;
  }

  return 0;
}

/**
 * Find the best matching HTML element for a reference text
 * Uses fuzzy matching to find elements containing similar text
 */
export function findMatchingElement(refText: string): HTMLElement | null {
  console.log('[ReferenceMatcher] ===== STARTING SEARCH =====');
  console.log('[ReferenceMatcher] Input refText:', refText);
  
  if (!refText || typeof document === 'undefined') {
    console.log('[ReferenceMatcher] Early return: refText empty or document undefined');
    return null;
  }

  const normalizedRefText = refText.trim();
  console.log('[ReferenceMatcher] Normalized refText:', normalizedRefText);
  console.log('[ReferenceMatcher] Normalized refText length:', normalizedRefText.length);
  
  if (!normalizedRefText) {
    console.log('[ReferenceMatcher] Early return: normalizedRefText empty');
    return null;
  }

  const minScore = 0.3; // Minimum similarity score to consider
  let elementsChecked = 0;
  let elementsWithText = 0;
  
  // Store all potential matches with their scores
  interface MatchCandidate {
    element: HTMLElement;
    score: number;
    hasDirectText: boolean;
    directTextScore: number;
    childCount: number;
  }
  
  const candidates: MatchCandidate[] = [];

  // Walk through all elements in the document
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
  while ((node = walker.nextNode() as Element | null)) {
    elementsChecked++;
    const element = node as HTMLElement;
    
    // Get text content
    const elementText = getAllTextContent(element);
    if (!elementText) {
      continue;
    }
    
    elementsWithText++;
    
    if (elementsWithText <= 5) {
      console.log(`[ReferenceMatcher] Checking element ${elementsWithText}:`, {
        tagName: element.tagName,
        textSnippet: elementText.substring(0, 50),
      });
    }

    // Calculate similarity
    const score = calculateSimilarity(normalizedRefText, elementText);
    
    // Check for direct text content
    const directText = getDirectTextContent(element);
    let directTextScore = 0;
    let hasDirectText = false;
    
    if (directText) {
      directTextScore = calculateSimilarity(normalizedRefText, directText);
      hasDirectText = directTextScore >= minScore;
    }
    
    // Use the better score (direct text or all text)
    const finalScore = Math.max(score, directTextScore);
    
    // Only consider if score meets minimum threshold
    if (finalScore >= minScore) {
      // Count child elements (to prefer leaf nodes)
      const childCount = element.children.length;
      
      candidates.push({
        element,
        score: finalScore,
        hasDirectText,
        directTextScore,
        childCount,
      });
      
      console.log(`[ReferenceMatcher] Candidate match:`, {
        tagName: element.tagName,
        score: finalScore,
        hasDirectText,
        childCount,
        textSnippet: elementText.substring(0, 50),
      });
    }
  }
  
  // Now find the best match, preferring leaf nodes
  let bestMatch: HTMLElement | null = null;
  let bestScore = 0;
  
  if (candidates.length > 0) {
    console.log(`[ReferenceMatcher] Found ${candidates.length} candidate matches`);
    
    // Sort candidates: prefer elements with direct text, then by score, then by fewer children (leaf nodes)
    candidates.sort((a, b) => {
      // First, prefer elements with direct text
      if (a.hasDirectText !== b.hasDirectText) {
        return a.hasDirectText ? -1 : 1;
      }
      // Then by score (higher is better)
      if (Math.abs(a.score - b.score) > 0.01) {
        return b.score - a.score;
      }
      // Finally, prefer elements with fewer children (more leaf-like)
      return a.childCount - b.childCount;
    });
    
    // Filter out candidates that have a child that also matches (prefer the child)
    const filteredCandidates: MatchCandidate[] = [];
    
    for (const candidate of candidates) {
      // Check if any child of this element is also a candidate
      let hasMatchingChild = false;
      for (const otherCandidate of candidates) {
        if (otherCandidate.element !== candidate.element && 
            candidate.element.contains(otherCandidate.element)) {
          // This candidate has a child that also matches
          // Only skip if the child has a similar or better score
          if (otherCandidate.score >= candidate.score * 0.9) {
            hasMatchingChild = true;
            break;
          }
        }
      }
      
      if (!hasMatchingChild) {
        filteredCandidates.push(candidate);
      }
    }
    
    // Use the best candidate from filtered list
    if (filteredCandidates.length > 0) {
      bestMatch = filteredCandidates[0].element;
      bestScore = filteredCandidates[0].score;
      console.log(`[ReferenceMatcher] Selected best match after filtering:`, {
        tagName: bestMatch.tagName,
        score: bestScore,
        hasDirectText: filteredCandidates[0].hasDirectText,
        childCount: filteredCandidates[0].childCount,
        filteredCandidatesCount: filteredCandidates.length,
      });
    } else {
      // Fallback: use the best candidate even if it has matching children
      bestMatch = candidates[0].element;
      bestScore = candidates[0].score;
      console.log(`[ReferenceMatcher] Using best candidate (no filtered matches):`, {
        tagName: bestMatch.tagName,
        score: bestScore,
      });
    }
  }

  console.log('[ReferenceMatcher] ===== SEARCH COMPLETE =====');
  console.log('[ReferenceMatcher] Elements checked:', elementsChecked);
  console.log('[ReferenceMatcher] Elements with text:', elementsWithText);
  console.log('[ReferenceMatcher] Best match found:', bestMatch ? 'YES' : 'NO');
  if (bestMatch) {
    console.log('[ReferenceMatcher] Best match details:', {
      tagName: bestMatch.tagName,
      id: bestMatch.id,
      className: bestMatch.className,
      textSnippet: bestMatch.textContent?.substring(0, 100),
      score: bestScore,
    });
  } else {
    console.log('[ReferenceMatcher] No match found. Best score was:', bestScore, '(min required:', minScore, ')');
  }
  console.log('[ReferenceMatcher] ===== END SEARCH =====');

  return bestMatch;
}

