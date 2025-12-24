// src/store/wordExplanationAtoms.ts
// Jotai atoms for Word Explanation state management (multiple words support)

import { atom } from 'jotai';

// Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WordAskAIState {
  chatHistory: ChatMessage[];
  streamingText: string;
  possibleQuestions: string[];
  isRequesting: boolean;
  abortController: AbortController | null;
  firstChunkReceived: boolean;
}

export interface WordExplanationState {
  /** Unique identifier for this word explanation (e.g., word-1234567890) */
  id: string;
  /** The word being explained */
  word: string;
  /** Meaning/definition of the word */
  meaning: string;
  /** Example sentences */
  examples: string[];
  /** Synonyms for the word */
  synonyms: string[];
  /** Antonyms (opposites) for the word */
  antonyms: string[];
  /** Translations of the word */
  translations: Array<{ language: string; translated_content: string }>;
  /** Whether more examples can be fetched */
  shouldAllowFetchMoreExamples: boolean;
  /** Ask AI specific state */
  askAI: WordAskAIState;
  /** UI state - whether main popover is visible */
  popoverVisible: boolean;
  /** UI state - whether Ask AI popover is visible */
  askAIPopoverVisible: boolean;
  /** Active tab in the popover */
  activeTab: 'contextual' | 'grammar';
  /** Reference to the word span element in the DOM */
  wordSpanElement: HTMLElement | null;
  /** Reference for animation source */
  sourceRef: React.MutableRefObject<HTMLElement | null>;
  /** Reference to Ask AI button for popover positioning */
  askAIButtonRef: React.RefObject<HTMLButtonElement> | null;
  /** Loading states for each operation */
  isLoadingExamples: boolean;
  isLoadingSynonyms: boolean;
  isLoadingAntonyms: boolean;
  isLoadingTranslation: boolean;
  /** Error states */
  examplesError: string | null;
  synonymsError: string | null;
  antonymsError: string | null;
  translationError: string | null;
  /** Original range for the word selection */
  range: Range | null;
  /** Spinner element (if any) */
  spinnerElement: HTMLElement | null;
  /** Whether initial explanation is loading */
  isLoading: boolean;
  /** Error message for initial explanation */
  errorMessage: string | null;
  /** Streaming content for initial explanation */
  streamedContent: string;
  /** Whether first event was received */
  firstEventReceived: boolean;
  /** Abort controller for initial explanation */
  abortController: AbortController | null;
}

// ============================================
// WORD EXPLANATION STATE ATOMS
// ============================================

/** Map of all word explanations keyed by word ID (e.g., "word-1234567890") */
export const wordExplanationsAtom = atom<Map<string, WordExplanationState>>(new Map());

/** Currently active/selected word ID (null if no word popover is open) */
export const activeWordIdAtom = atom<string | null>(null);

// ============================================
// DERIVED ATOMS
// ============================================

/** Get the active word explanation from the map (returns null if active ID is null or not found) */
export const activeWordExplanationAtom = atom((get) => {
  const activeId = get(activeWordIdAtom);
  if (!activeId) {
    return null;
  }
  
  const explanations = get(wordExplanationsAtom);
  return explanations.get(activeId) || null;
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create initial word explanation state
 */
export function createInitialWordState(
  id: string,
  word: string,
  wordSpanElement: HTMLElement,
  sourceRef: React.MutableRefObject<HTMLElement | null>,
  range: Range
): WordExplanationState {
  return {
    id,
    word,
    meaning: '',
    examples: [],
    synonyms: [],
    antonyms: [],
    translations: [],
    shouldAllowFetchMoreExamples: true,
    askAI: {
      chatHistory: [],
      streamingText: '',
      possibleQuestions: [],
      isRequesting: false,
      abortController: null,
      firstChunkReceived: false,
    },
    popoverVisible: false,
    askAIPopoverVisible: false,
    activeTab: 'contextual',
    wordSpanElement,
    sourceRef,
    askAIButtonRef: null,
    isLoadingExamples: false,
    isLoadingSynonyms: false,
    isLoadingAntonyms: false,
    isLoadingTranslation: false,
    examplesError: null,
    synonymsError: null,
    antonymsError: null,
    translationError: null,
    range: range.cloneRange(),
    spinnerElement: null,
    isLoading: true,
    errorMessage: null,
    streamedContent: '',
    firstEventReceived: false,
    abortController: new AbortController(),
  };
}



