// src/store/webpageChatAtoms.ts
// Jotai atoms for the "Chat with Webpage" multi-session feature.

import { atom } from 'jotai';
import { ConversationMessage, CitationDetail } from '@/api-services/WebpageChatService';

export type { ConversationMessage };

// =============================================================================
// Message types
// =============================================================================

/** Annotation context attached to a question (selected text from page) */
export interface AnnotationData {
  selectedText: string;
  textSnippetStart: string;
  textSnippetEnd: string;
}

/**
 * A single rendered message in the chat UI.
 * Serializable — no function references. `errorQuestion` carries the question
 * to retry, and the component reconstructs the callback.
 */
export interface RenderedMessage {
  id: string;
  type: 'user' | 'assistant' | 'annotation' | 'error';
  /** User/assistant text content */
  content?: string;
  /** Per-message citation map (assistant messages only) */
  citationMap?: Record<string, CitationDetail>;
  /** Suggested follow-up questions returned by the /answer API (assistant messages only) */
  possibleQuestions?: string[];
  /** For error messages: the original question, used to reconstruct the retry handler */
  errorQuestion?: string;
  /** For annotation messages: the selected text context */
  annotation?: AnnotationData;
  /**
   * When this user message was asked about a specific image, holds the image
   * thumbnail URL (for display) and the explanation ID (for scroll-to-image).
   */
  imageContext?: {
    imageUrl: string;
    imageExplanationId: string;
  };
}

// =============================================================================
// Session
// =============================================================================

export type GoogleDocsTabScope = 'current' | 'all';

/** A single chat session with its own history, messages, and citation state */
export interface ChatSession {
  id: string;
  name: string;
  /** Rendered UI messages (includes annotation cards, errors, user/assistant bubbles) */
  messages: RenderedMessage[];
  /** API conversation history — sent to classify/answer endpoints */
  history: ConversationMessage[];
  /** Citation map accumulated across all answers in this session */
  citationMap: Record<string, CitationDetail>;
  /** chunkIds whose <mark> highlights are currently active on the page */
  activeCitations: string[];
  /**
   * Pending annotation set when a text-selection action opens this session.
   * Consumed (cleared) the moment the user submits their first question with it.
   */
  pendingAnnotation: AnnotationData & { question?: string } | null;
  /**
   * Google Docs tab scope for this session.
   * "current" indexes only the active tab; "all" indexes every tab.
   * Sticky per session — does not reset when the user switches Docs tabs.
   */
  googleDocsTabScope: GoogleDocsTabScope;
}

function createSession(id: string, name: string): ChatSession {
  return {
    id,
    name,
    messages: [],
    history: [],
    citationMap: {},
    activeCitations: [],
    pendingAnnotation: null,
    googleDocsTabScope: 'current',
  };
}

const INITIAL_SESSION_ID = 'session-1';

export function makeSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// =============================================================================
// Pending annotation (cross-boundary: set by content/index.ts, consumed in view)
// =============================================================================

/** Payload set by content/index.ts when a text-selection action fires */
export interface PendingAnnotation extends AnnotationData {
  /** Pre-populated question sent to the API */
  question?: string;
  /** Text shown in the user bubble (falls back to `question` when absent) */
  displayQuestion?: string;
  /** When true, the chat input bar should be focused after the annotation is consumed */
  focusInput?: boolean;
}

/** Set by content/index.ts; consumed + cleared by WebpageChatView on mount/update */
export const webpageChatPendingAnnotationAtom = atom<PendingAnnotation | null>(null);

// =============================================================================
// Session atoms
// =============================================================================

export const webpageChatSessionsAtom = atom<ChatSession[]>([
  createSession(INITIAL_SESSION_ID, 'Session 1'),
]);

export const webpageChatActiveSessionIdAtom = atom<string>(INITIAL_SESSION_ID);

/** Derived: the currently visible session object */
export const webpageChatActiveSessionAtom = atom<ChatSession | undefined>((get) => {
  const sessions = get(webpageChatSessionsAtom);
  const activeId = get(webpageChatActiveSessionIdAtom);
  return sessions.find((s) => s.id === activeId);
});

/**
 * Derived: session counter used when naming the next new session.
 * Equals (highest numeric suffix seen across all session names) + 1.
 */
export const webpageChatNextSessionCounterAtom = atom<number>((get) => {
  const sessions = get(webpageChatSessionsAtom);
  let max = 0;
  for (const s of sessions) {
    const m = s.name.match(/Session (\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
});

// =============================================================================
// Transient state atoms (apply to the currently active session in-flight)
// =============================================================================

export type WebpageChatState =
  | 'idle'
  | 'classifying'   // POST /classify in flight
  | 'indexing'      // Building / loading vector index
  | 'answering'     // POST /answer SSE streaming
  | 'error';

export const webpageChatStateAtom = atom<WebpageChatState>('idle');

export const webpageChatStreamingAnswerAtom = atom<string>('');

export const webpageChatErrorAtom = atom<string>('');

export const webpageChatLastQuestionAtom = atom<string>('');

export const webpageChatIndexingIndicatorAtom = atom<boolean>(false);

// =============================================================================
// Derived helpers
// =============================================================================

export const webpageChatIsLoadingAtom = atom<boolean>((get) => {
  const state = get(webpageChatStateAtom);
  return state === 'classifying' || state === 'indexing' || state === 'answering';
});

/**
 * True when any session has at least one user or assistant message.
 * Used by the refresh-guard keyboard listener in content/index.ts.
 */
export const webpageChatHasConversationAtom = atom<boolean>((get) => {
  const sessions = get(webpageChatSessionsAtom);
  return sessions.some((s) =>
    s.messages.some((m) => m.type === 'user' || m.type === 'assistant')
  );
});

/**
 * When true, the custom "Chat will be cleared on reload" warning modal is shown.
 * Set by the keyboard refresh interceptor in content/index.ts.
 * Reset to false when the user dismisses (Stay) or confirms (Reload).
 */
export const webpageChatShowRefreshWarningAtom = atom<boolean>(false);

// =============================================================================
// Pending image question (cross-boundary: set by content/index.ts, consumed in view)
// =============================================================================

/**
 * Payload set by content/index.ts when the user clicks Simplify, Ask AI,
 * or a custom prompt from the image hover button group.
 *
 * - `question` is sent to the API.
 * - `displayText` is shown in the user bubble.
 * - `imageFile` is the canvas-converted Blob for the multipart upload.
 * - `imageUrl` is the image's src URL used to render the thumbnail.
 * - `imageExplanationId` ties the message to an `ImageExplanationState` for scroll-to-image.
 * - `focusInput` — when true, open the chat panel and focus input WITHOUT auto-submitting.
 */
export interface PendingImageQuestion {
  question: string;
  displayText: string;
  imageFile: File | Blob;
  imageUrl: string;
  imageExplanationId: string;
  /** When true the panel opens and input is focused; question is NOT auto-submitted. */
  focusInput?: boolean;
}

/** Set by content/index.ts; consumed + cleared by WebpageChatView on change */
export const webpageChatPendingImageQuestionAtom = atom<PendingImageQuestion | null>(null);

// =============================================================================
// Auto-submit question (FAB Summarise → chat bridge)
// =============================================================================

/**
 * Set by content/index.ts when the FAB Summarise button (or Ctrl+M) is clicked.
 * WebpageChatView consumes this, clears it, and calls submitQuestion with the value.
 * Using a dedicated atom (rather than pendingAnnotation) avoids creating a
 * spurious annotation card for a page-level summarise with no selected text.
 */
export const webpageChatAutoSubmitQuestionAtom = atom<string | null>(null);
