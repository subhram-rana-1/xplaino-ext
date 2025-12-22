// src/content/utils/pageTranslationManager.ts
// Manager for page translation state and operations

import { TranslatableElement, extractTranslatableElements } from './pageContentExtractor';
import { TranslateService } from '@/api-services/TranslateService';

/**
 * Manages page translation state, batching, and DOM manipulation
 */
export class PageTranslationManager {
  private elements: TranslatableElement[] = [];
  private translationMode: 'append' | 'replace' = 'append';
  private isTranslated: boolean = false;
  private batchSize: number = 15;
  private abortController: AbortController | null = null;

  /**
   * Translate the page
   * @param targetLanguageCode Target language ISO 639-1 code (e.g., 'EN', 'ES')
   * @param mode Translation mode ('append' or 'replace')
   */
  async translatePage(targetLanguageCode: string, mode: 'append' | 'replace'): Promise<void> {
    console.log('[PageTranslationManager] Starting page translation', {
      targetLanguageCode,
      mode
    });

    // Extract translatable elements
    this.elements = extractTranslatableElements();
    this.translationMode = mode;

    if (this.elements.length === 0) {
      console.warn('[PageTranslationManager] No translatable elements found');
      return;
    }

    console.log(`[PageTranslationManager] Found ${this.elements.length} elements to translate`);

    // Create batches
    const batches = this.createBatches();
    console.log(`[PageTranslationManager] Created ${batches.length} batches`);

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      console.log(`[PageTranslationManager] Processing batch ${i + 1}/${batches.length} (${batch.texts.length} texts)`);

      try {
        await this.translateBatch(batch, targetLanguageCode);
      } catch (error) {
        console.error(`[PageTranslationManager] Error translating batch ${i + 1}:`, error);
        // Continue with next batch even if this one fails
      }
    }

    this.isTranslated = true;
    console.log('[PageTranslationManager] Page translation complete');
  }

  /**
   * Toggle between translated and original view
   */
  async toggleView(): Promise<void> {
    if (!this.isTranslated) {
      console.warn('[PageTranslationManager] Cannot toggle - page not translated');
      return;
    }

    console.log('[PageTranslationManager] Toggling view');

    for (const element of this.elements) {
      if (element.translatedText) {
        if (this.translationMode === 'append') {
          this.toggleAppendedTranslation(element);
        } else {
          this.toggleReplacedTranslation(element);
        }
      }
    }
  }

  /**
   * Cancel ongoing translation
   */
  cancel(): void {
    if (this.abortController) {
      console.log('[PageTranslationManager] Cancelling translation');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if page is currently translated
   */
  isPageTranslated(): boolean {
    return this.isTranslated;
  }

  /**
   * Create batches of texts for translation
   */
  private createBatches(): Array<{ texts: string[]; indices: number[] }> {
    const batches: Array<{ texts: string[]; indices: number[] }> = [];

    for (let i = 0; i < this.elements.length; i += this.batchSize) {
      const batchElements = this.elements.slice(i, i + this.batchSize);
      batches.push({
        texts: batchElements.map(el => el.originalText),
        indices: batchElements.map((_, idx) => i + idx)
      });
    }

    return batches;
  }

  /**
   * Translate a batch of texts
   */
  private async translateBatch(
    batch: { texts: string[]; indices: number[] },
    targetLanguageCode: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      TranslateService.translate(
        {
          targetLangugeCode: targetLanguageCode,
          texts: batch.texts
        },
        {
          onSuccess: (translatedTexts) => {
            console.log(`[PageTranslationManager] Batch translation successful, got ${translatedTexts.length} translations`);

            // Apply translations to elements
            for (let i = 0; i < translatedTexts.length && i < batch.indices.length; i++) {
              const elementIdx = batch.indices[i];
              const element = this.elements[elementIdx];

              if (element && translatedTexts[i]) {
                element.translatedText = translatedTexts[i];
                this.applyTranslation(element);
              }
            }

            resolve();
          },
          onError: (errorCode, errorMessage) => {
            console.error('[PageTranslationManager] Translation error:', errorCode, errorMessage);
            // Don't reject - just skip this batch and continue
            resolve();
          },
          onLoginRequired: () => {
            console.log('[PageTranslationManager] Login required for translation');
            reject(new Error('LOGIN_REQUIRED'));
          }
        },
        this.abortController || undefined
      );
    });
  }

  /**
   * Apply translation to an element based on mode
   */
  private applyTranslation(element: TranslatableElement): void {
    if (!element.translatedText) return;

    if (this.translationMode === 'append') {
      this.applyAppendedTranslation(element);
    } else {
      this.applyReplacedTranslation(element);
    }
  }

  /**
   * Apply translation in append mode (add below original)
   */
  private applyAppendedTranslation(element: TranslatableElement): void {
    if (!element.translatedText) return;

    // Check if already appended
    const nextSibling = element.element.nextSibling;
    if (nextSibling && 
        nextSibling.nodeType === Node.ELEMENT_NODE && 
        (nextSibling as HTMLElement).classList.contains('xplaino-translation-appended')) {
      return; // Already appended
    }

    // Create translation div
    const translationDiv = document.createElement('div');
    translationDiv.className = 'xplaino-translation-appended';
    translationDiv.textContent = element.translatedText;
    translationDiv.style.cssText = `
      color: rgba(149, 39, 245, 0.8);
      font-style: italic;
      margin-top: 4px;
      padding-left: 8px;
      border-left: 2px solid rgba(149, 39, 245, 0.3);
      font-size: inherit;
      line-height: inherit;
    `;

    // Insert after the original element
    if (element.element.parentNode) {
      element.element.parentNode.insertBefore(translationDiv, element.element.nextSibling);
      element.element.setAttribute('data-xplaino-translated', 'true');
    }
  }

  /**
   * Apply translation in replace mode (swap content)
   */
  private applyReplacedTranslation(element: TranslatableElement): void {
    if (!element.translatedText) return;

    // Store original text
    if (!element.element.hasAttribute('data-xplaino-original')) {
      element.element.setAttribute('data-xplaino-original', element.originalText);
    }

    // Replace text content
    element.element.textContent = element.translatedText;
    element.element.setAttribute('data-xplaino-translated', 'true');
  }

  /**
   * Toggle appended translation visibility
   */
  private toggleAppendedTranslation(element: TranslatableElement): void {
    const nextSibling = element.element.nextSibling;
    
    if (nextSibling && 
        nextSibling.nodeType === Node.ELEMENT_NODE && 
        (nextSibling as HTMLElement).classList.contains('xplaino-translation-appended')) {
      
      const translationDiv = nextSibling as HTMLElement;
      
      // Toggle visibility
      if (translationDiv.style.display === 'none') {
        translationDiv.style.display = '';
      } else {
        translationDiv.style.display = 'none';
      }
    }
  }

  /**
   * Toggle replaced translation
   */
  private toggleReplacedTranslation(element: TranslatableElement): void {
    const isShowingTranslation = element.element.getAttribute('data-xplaino-translated') === 'true';
    
    if (isShowingTranslation) {
      // Restore original
      const original = element.element.getAttribute('data-xplaino-original');
      if (original) {
        element.element.textContent = original;
        element.element.setAttribute('data-xplaino-translated', 'false');
      }
    } else {
      // Show translation
      if (element.translatedText) {
        element.element.textContent = element.translatedText;
        element.element.setAttribute('data-xplaino-translated', 'true');
      }
    }
  }

  /**
   * Restore original content (cleanup)
   */
  restoreOriginal(): void {
    console.log('[PageTranslationManager] Restoring original content');

    for (const element of this.elements) {
      if (this.translationMode === 'append') {
        // Remove appended translation divs
        const nextSibling = element.element.nextSibling;
        if (nextSibling && 
            nextSibling.nodeType === Node.ELEMENT_NODE && 
            (nextSibling as HTMLElement).classList.contains('xplaino-translation-appended')) {
          nextSibling.parentNode?.removeChild(nextSibling);
        }
      } else {
        // Restore original text
        const original = element.element.getAttribute('data-xplaino-original');
        if (original) {
          element.element.textContent = original;
        }
      }

      // Clean up attributes
      element.element.removeAttribute('data-xplaino-translated');
      element.element.removeAttribute('data-xplaino-original');
    }

    this.isTranslated = false;
    this.elements = [];
  }
}

