/**
 * YouTube Transcript Fetcher - Page Context Script
 * 
 * This script is injected into the YouTube page context (not the extension's isolated world)
 * to access YouTube's player response and fetch transcripts via the timedtext API.
 * 
 * IMPORTANT: This runs in the page's JavaScript context, NOT the extension's content script context.
 */

// Extend Window interface for YouTube globals
declare global {
  interface Window {
    ytInitialPlayerResponse?: any;
  }
}

// Make this file a module so declare global works
export {};

interface TranscriptSegment {
  text: string;
  start: string;
  dur: string;
}

/**
 * Fallback: Fetch transcript using XMLHttpRequest
 * Sometimes fetch() has issues with certain URLs, so we try XHR as backup
 */
async function fetchTranscriptWithXHR(url: string): Promise<void> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.withCredentials = true;
    
    xhr.onload = function() {
      console.log('[Xplaino] XHR Response status:', xhr.status);
      console.log('[Xplaino] XHR Response length:', xhr.responseText.length);
      console.log('[Xplaino] XHR Response type:', xhr.getResponseHeader('content-type'));
      
      if (xhr.status === 200 && xhr.responseText.length > 0) {
        console.log('='.repeat(80));
        console.log('[Xplaino] ✅ XHR fetch successful!');
        console.log('='.repeat(80));
        
        const segments = parseTranscriptXML(xhr.responseText);
        
        if (segments.length > 0) {
          console.log('[Xplaino] Found', segments.length, 'transcript segments');
          console.log('[Xplaino] First segment example:', segments[0]);
          console.log('[Xplaino] Full transcript:', segments);
          
          // Send segments to content script
          window.postMessage({
            type: 'XPLAINO_YOUTUBE_TRANSCRIPT',
            segments: segments
          }, '*');
          console.log('[Xplaino] Sent transcript segments to content script');
        }
      } else {
        console.error('[Xplaino] XHR also failed:', xhr.status, xhr.statusText);
        console.error('[Xplaino] Response:', xhr.responseText);
      }
      
      resolve();
    };
    
    xhr.onerror = function() {
      console.error('[Xplaino] XHR request failed with network error');
      resolve();
    };
    
    xhr.send();
  });
}

/**
 * Extract current video ID from URL
 */
function getVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const videoIdFromUrl = urlParams.get('v');
  
  if (videoIdFromUrl) {
    return videoIdFromUrl;
  }
  
  // Fallback to ytInitialPlayerResponse
  const videoIdFromPlayer = window.ytInitialPlayerResponse?.videoDetails?.videoId;
  
  if (videoIdFromPlayer) {
    return videoIdFromPlayer;
  }
  
  return null;
}

/**
 * Get caption track URL from player response
 * This URL points to the /api/timedtext endpoint with all necessary params
 */
function getCaptionTrackUrl(): string | null {
  try {
    const captions = window.ytInitialPlayerResponse?.captions;
    
    if (!captions) {
      console.log('[Xplaino] No captions data found in player response');
      return null;
    }
    
    const renderer = captions.playerCaptionsTracklistRenderer;
    if (!renderer) {
      console.log('[Xplaino] No playerCaptionsTracklistRenderer found');
      return null;
    }
    
    const captionTracks = renderer.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      console.log('[Xplaino] No caption tracks available');
      return null;
    }
    
      console.log('[Xplaino] Found', captionTracks.length, 'caption tracks');
    console.log('[Xplaino] All tracks:', captionTracks);
      
      // Look for English track first, or use first available
    const enTrack = captionTracks.find((t: any) => 
      t.languageCode === 'en' || t.languageCode?.startsWith('en')
    );
    
    const track = enTrack || captionTracks[0];
      
      console.log('[Xplaino] Selected track:', track.languageCode || track.name?.simpleText);
    console.log('[Xplaino] Full track object:', track);
    
    if (!track.baseUrl) {
      console.error('[Xplaino] Selected track has no baseUrl');
      return null;
    }
    
    // Ensure the URL is absolute
    let captionUrl = track.baseUrl;
    if (captionUrl.startsWith('/')) {
      captionUrl = `https://www.youtube.com${captionUrl}`;
    }
    
    console.log('[Xplaino] Caption track URL:', captionUrl);
    return captionUrl;
  } catch (error) {
    console.error('[Xplaino] Error extracting caption track URL:', error);
    return null;
  }
}

/**
 * Parse XML transcript response
 * Uses regex parsing to avoid YouTube's Trusted Types restrictions on DOMParser
 */
function parseTranscriptXML(xmlText: string): TranscriptSegment[] {
  try {
    // YouTube uses Trusted Types API which blocks DOMParser.parseFromString
    // So we'll parse the simple XML structure using regex instead
    
    // Log first 500 chars of XML for debugging
    console.log('[Xplaino] XML Response Preview:', xmlText.substring(0, 500));
    
    const segments: TranscriptSegment[] = [];
    
    // Match all <text> elements with their attributes and content
    // More flexible regex that handles attributes in any order and optional whitespace
    const textRegex = /<text\s+([^>]+)>([^<]*)<\/text>/g;
    
    let match;
    while ((match = textRegex.exec(xmlText)) !== null) {
      const [, attributes, text] = match;
      
      // Extract start and dur attributes
      const startMatch = attributes.match(/start="([^"]+)"/);
      const durMatch = attributes.match(/dur="([^"]+)"/);
      
      if (!startMatch || !durMatch) {
        continue; // Skip if missing required attributes
      }
      
      const start = startMatch[1];
      const dur = durMatch[1];
      
      // Decode HTML entities (like &amp; -> &, &quot; -> ", &lt; -> <, etc.)
      const decodedText = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
      
      if (decodedText.trim()) {
        segments.push({
          text: decodedText.trim(),
          start: start,
          dur: dur
        });
      }
    }
    
    console.log('[Xplaino] Parsed', segments.length, 'transcript segments');
    if (segments.length > 0) {
      console.log('[Xplaino] First segment example:', segments[0]);
    }
    
    return segments;
  } catch (error) {
    console.error('[Xplaino] Error parsing XML:', error);
    return [];
  }
}

/**
 * Fetch transcript using YouTube's timedtext API
 * GET https://www.youtube.com/api/timedtext
 */
async function fetchYouTubeTranscript(): Promise<void> {
  console.log('[Xplaino] Starting YouTube transcript fetch...');
  
  try {
    // Step 1: Get video ID
    const videoId = getVideoId();
    if (!videoId) {
      console.error('[Xplaino] Could not extract video ID from page');
      return;
    }
    
    console.log('[Xplaino] Video ID:', videoId);
    
    // Step 2: Get caption track URL from player response
    const captionUrl = getCaptionTrackUrl();
    if (!captionUrl) {
      console.error('[Xplaino] Could not get caption track URL. Video may not have captions.');
      return;
    }
    
    console.log('[Xplaino] Fetching transcript from:', captionUrl);
    
    // Step 3: Fetch the transcript XML
    const response = await fetch(captionUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Referer': window.location.href,
        'User-Agent': navigator.userAgent,
      },
      credentials: 'include',
    });
    
    console.log('[Xplaino] API Response status:', response.status, response.statusText);
    console.log('[Xplaino] Response headers:', {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    });
    
    if (!response.ok) {
      console.error('[Xplaino] API request failed');
      console.error('[Xplaino] Status:', response.status);
      console.error('[Xplaino] Status Text:', response.statusText);
      
      // Try to get error details
      try {
        const errorText = await response.text();
        console.error('[Xplaino] Error response:', errorText);
      } catch (e) {
        console.error('[Xplaino] Could not read error response');
      }
      
      return;
    }
    
    // Step 4: Parse the XML response
    const xmlText = await response.text();
    
    console.log('='.repeat(80));
    console.log('[Xplaino] ✅ Transcript fetched successfully!');
    console.log('='.repeat(80));
    console.log('[Xplaino] Response text length:', xmlText.length);
    console.log('[Xplaino] Response content type:', response.headers.get('content-type'));
    
    // Log the actual response to see what we got
    if (xmlText.length < 2000) {
      console.log('[Xplaino] Full response:', xmlText);
    } else {
      console.log('[Xplaino] Response preview (first 1000 chars):', xmlText.substring(0, 1000));
    }
    
    if (xmlText.length === 0) {
      console.error('[Xplaino] Response body is empty!');
      console.error('[Xplaino] This could mean:');
      console.error('  - The URL expired or signature is invalid');
      console.error('  - CORS or authentication issue');
      console.error('  - The video may not have captions in the requested language');
      console.error('[Xplaino] Trying alternative method with XMLHttpRequest...');
      
      // Try with XMLHttpRequest as fallback
      await fetchTranscriptWithXHR(captionUrl);
      return;
    }
    
    // Step 5: Parse XML and extract segments
    const segments = parseTranscriptXML(xmlText);
    
    if (segments.length === 0) {
      console.warn('[Xplaino] No segments found in transcript');
      return;
    }
    
    console.log('[Xplaino] Found', segments.length, 'transcript segments');
    console.log('[Xplaino] First segment example:', segments[0]);
    console.log('[Xplaino] Full transcript:', segments);
    
    // Step 6: Send segments to content script via postMessage
    window.postMessage({
      type: 'XPLAINO_YOUTUBE_TRANSCRIPT',
      segments: segments
    }, '*');
    console.log('[Xplaino] Sent transcript segments to content script');
    
  } catch (error) {
    console.error('[Xplaino] Error fetching transcript:', error);
    console.error('[Xplaino] Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
  }
}

// Execute the transcript fetch with a small delay
// This runs when the script is injected, but waits to ensure ytInitialPlayerResponse is ready
console.log('[Xplaino] YouTube transcript fetcher script loaded in page context');

// Wait for ytInitialPlayerResponse to be available
async function waitForPlayerResponse(maxAttempts = 10, delayMs = 300): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (window.ytInitialPlayerResponse?.videoDetails?.videoId) {
      console.log('[Xplaino] Player response is ready');
      return true;
    }
    console.log(`[Xplaino] Waiting for player response... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

// Start fetching after ensuring player response is ready
(async () => {
  const isReady = await waitForPlayerResponse();
  if (isReady) {
    await fetchYouTubeTranscript();
  } else {
    console.error('[Xplaino] Player response not available after waiting');
  }
})().catch(error => {
  console.error('[Xplaino] Unhandled error in transcript fetcher:', error);
});

