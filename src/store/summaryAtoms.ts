// src/store/summaryAtoms.ts
// Jotai atoms for Summary tab state persistence across tab switches

import { atom } from 'jotai';

// Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type PageReadingState = 'reading' | 'ready' | 'error';
export type PageReadingStatus = 'PAGE_READING_IN_PROGRESS' | 'PAGE_READING_COMPLETED' | 'PAGE_READING_ERROR';
export type SummariseState = 'idle' | 'summarising' | 'done' | 'error';
export type AskingState = 'idle' | 'asking' | 'error';

// ============================================
// SUMMARY TAB STATE ATOMS
// ============================================

/** Page reading status (in-memory only; used for wait-before-summarise) */
export const pageReadingStatusAtom = atom<PageReadingStatus>('PAGE_READING_IN_PROGRESS');

/** Page content (in-memory only; never stored in Chrome storage) */
export const pageContentAtom = atom<string>('');

/** @deprecated Use pageReadingStatusAtom and map in UI (IN_PROGRESS→reading, COMPLETED→ready, ERROR→error) */
export const pageReadingStateAtom = atom<PageReadingState>('reading');

/** Summarise state */
export const summariseStateAtom = atom<SummariseState>('idle');

/** Asking state for chat */
export const askingStateAtom = atom<AskingState>('idle');

/** Summary content */
export const summaryAtom = atom<string>('');

/** Streaming text during summarisation */
export const streamingTextAtom = atom<string>('');

/** Streaming text during ask */
export const askStreamingTextAtom = atom<string>('');

/** Possible/suggested questions */
export const possibleQuestionsAtom = atom<ChatMessage[]>([]);

/** Chat messages */
export const chatMessagesAtom = atom<ChatMessage[]>([]);

/** Suggested questions from API - stored per message index */
export const messageQuestionsAtom = atom<Record<number, string[]>>({});

/** Legacy atom for backward compatibility - will be removed */
export const suggestedQuestionsAtom = atom<string[]>([]);

/** Error message */
export const summaryErrorAtom = atom<string>('');

/** Signal to focus the ask input bar in SummaryView */
export const focusAskInputAtom = atom<boolean>(false);

/**
 * Map from sequential content ID (e.g. "1", "2") to DOM element for summary ref click-to-scroll.
 * Set when building the summarise request; cleared or replaced when starting a new summarise.
 */
export const summaryIdToElementMapAtom = atom<Map<string, HTMLElement> | null>(null);

// ============================================
// DERIVED ATOMS
// ============================================

/** Whether there is any content (summary, chat, or streaming) */
export const hasContentAtom = atom((get) => {
  const summary = get(summaryAtom);
  const streamingText = get(streamingTextAtom);
  const chatMessages = get(chatMessagesAtom);
  return !!(summary || streamingText || chatMessages.length > 0);
});

