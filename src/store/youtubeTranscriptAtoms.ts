// src/store/youtubeTranscriptAtoms.ts
// Jotai atoms for YouTube Transcript state management

import { atom } from 'jotai';

// Types for YouTube transcript segments (from timedtext API XML response)
export interface YouTubeTranscriptSegment {
  text: string;
  start: string;  // Start time in seconds
  dur: string;    // Duration in seconds
}

/** Atom storing YouTube transcript segments (from timedtext API) */
export const youtubeTranscriptSegmentsAtom = atom<YouTubeTranscriptSegment[] | null>(null);

