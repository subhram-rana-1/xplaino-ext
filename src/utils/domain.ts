// src/utils/domain.ts

/**
 * Domain utility functions
 */

/**
 * Extract domain from URL
 * Removes protocol, www prefix, paths, and query strings
 * @param url - Full URL (e.g., "https://www.docs.google.com/path?query=1")
 * @returns Domain name in lowercase (e.g., "docs.google.com")
 */
export function extractDomain(url: string): string {
  try {
    // Handle chrome://, chrome-extension://, and other special protocols
    if (!url.includes('://') && !url.startsWith('http')) {
      // If no protocol, assume it's already a domain or add http://
      url = `http://${url}`;
    }

    // Create URL object to parse
    const urlObj = new URL(url);

    // Get hostname (removes port if present)
    let hostname = urlObj.hostname;

    // Remove www. prefix (case-insensitive)
    if (hostname.toLowerCase().startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Return lowercase domain
    return hostname.toLowerCase();
  } catch (error) {
    // If URL parsing fails, try simple string manipulation
    let domain = url;

    // Remove protocol
    domain = domain.replace(/^https?:\/\//i, '');
    domain = domain.replace(/^chrome:\/\//i, '');
    domain = domain.replace(/^chrome-extension:\/\//i, '');

    // Remove www. prefix
    if (domain.toLowerCase().startsWith('www.')) {
      domain = domain.slice(4);
    }

    // Remove path and query string
    const pathIndex = domain.indexOf('/');
    if (pathIndex !== -1) {
      domain = domain.slice(0, pathIndex);
    }

    // Remove port if present
    const portIndex = domain.indexOf(':');
    if (portIndex !== -1) {
      domain = domain.slice(0, portIndex);
    }

    return domain.toLowerCase();
  }
}

