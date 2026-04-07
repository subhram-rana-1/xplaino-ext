// src/api-services/GoogleDocsApiService.ts
// Fetches Google Docs content (including tabs) via the Google Docs REST API.
// Uses chrome.identity.getAuthToken() for the Google API access token.

// ---------------------------------------------------------------------------
// Google Docs API response types (subset we care about)
// ---------------------------------------------------------------------------

export interface GoogleDocsTabProperties {
  tabId: string;
  title: string;
  index: number;
}

export interface GoogleDocsTextRun {
  content?: string;
  textStyle?: Record<string, unknown>;
}

export interface GoogleDocsParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: GoogleDocsTextRun;
  pageBreak?: Record<string, unknown>;
}

export interface GoogleDocsParagraphStyle {
  namedStyleType?: string;
  headingId?: string;
}

export interface GoogleDocsParagraph {
  elements: GoogleDocsParagraphElement[];
  paragraphStyle?: GoogleDocsParagraphStyle;
}

export interface GoogleDocsSectionBreak {
  sectionStyle?: Record<string, unknown>;
}

export interface GoogleDocsStructuralElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: GoogleDocsParagraph;
  sectionBreak?: GoogleDocsSectionBreak;
  table?: Record<string, unknown>;
}

export interface GoogleDocsBody {
  content: GoogleDocsStructuralElement[];
}

export interface GoogleDocsDocumentTab {
  body: GoogleDocsBody;
}

export interface GoogleDocsTab {
  tabProperties: GoogleDocsTabProperties;
  documentTab: GoogleDocsDocumentTab;
  childTabs?: GoogleDocsTab[];
}

export interface GoogleDocsDocument {
  documentId: string;
  title: string;
  tabs: GoogleDocsTab[];
}

// ---------------------------------------------------------------------------
// Flattened tab descriptor returned to consumers
// ---------------------------------------------------------------------------

export interface FlatTab {
  tabId: string;
  title: string;
  body: GoogleDocsBody;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const DOCS_API_BASE = 'https://docs.googleapis.com/v1/documents';

export class GoogleDocsApiService {
  /**
   * Obtain a Google API access token via chrome.identity.
   * The token carries the scopes listed in manifest.json → oauth2.scopes.
   */
  static async getGoogleAccessToken(interactive = true): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(
            new Error(
              chrome.runtime.lastError?.message ?? 'Failed to get Google access token'
            )
          );
          return;
        }
        resolve(token);
      });
    });
  }

  /**
   * Fetch the full document JSON including all tabs.
   */
  static async fetchDocument(
    docId: string,
    accessToken: string
  ): Promise<GoogleDocsDocument> {
    const url = `${DOCS_API_BASE}/${encodeURIComponent(docId)}?includeTabsContent=true`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Google Docs API error ${response.status}: ${text}`
      );
    }

    return (await response.json()) as GoogleDocsDocument;
  }

  /**
   * Recursively flatten the nested tab tree into a flat array.
   */
  static flattenTabs(tabs: GoogleDocsTab[]): FlatTab[] {
    const result: FlatTab[] = [];

    const walk = (tabList: GoogleDocsTab[]) => {
      for (const tab of tabList) {
        result.push({
          tabId: tab.tabProperties.tabId,
          title: tab.tabProperties.title,
          body: tab.documentTab.body,
        });
        if (tab.childTabs?.length) {
          walk(tab.childTabs);
        }
      }
    };

    walk(tabs);
    return result;
  }

  /**
   * Convenience: fetch document and return flat tabs.
   * If `tabId` is provided, only that tab is returned (still uses the
   * full document fetch since there is no single-tab endpoint, but filters
   * the result to keep bandwidth down for the chunker).
   */
  static async fetchAndFlattenTabs(
    docId: string,
    accessToken: string,
    tabId?: string | null
  ): Promise<{ title: string; tabs: FlatTab[] }> {
    const doc = await this.fetchDocument(docId, accessToken);
    let flat = this.flattenTabs(doc.tabs);

    if (tabId) {
      flat = flat.filter((t) => t.tabId === tabId);
    }

    return { title: doc.title, tabs: flat };
  }
}
