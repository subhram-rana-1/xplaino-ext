// src/background/index.ts
// Chrome extension background service worker

import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { ApiService } from '@/api-services/ApiService';
import { extractDomain } from '@/utils/domain';
import { DomainStatus } from '@/types/domain';

// This file serves as the entry point for the background script
// Add background logic here (message handling, alarms, etc.)

console.log('Background service worker initialized');

/**
 * Sync domain status with API
 * Checks current tab domain against API and updates Chrome storage accordingly
 */
async function syncDomainStatus(): Promise<void> {
  try {
    // Get current active tab
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tabs.length === 0 || !tabs[0].url) {
      console.log('No active tab or URL found');
      return;
    }

    const tabUrl = tabs[0].url;

    console.log('Tab URL:', tabUrl);

    // Handle chrome://, chrome-extension://, and other special URLs as INVALID
    if (
      tabUrl.startsWith('chrome://') ||
      tabUrl.startsWith('chrome-extension://') ||
      tabUrl.startsWith('edge://') ||
      tabUrl.startsWith('about:')
    ) {
      console.log('Special URL detected, setting INVALID:', tabUrl);
      const specialDomain = extractDomain(tabUrl) || 'special-url';
      await ChromeStorage.setDomainStatus(specialDomain, DomainStatus.INVALID);
      return;
    }

    // Extract domain from URL
    const currentDomain = extractDomain(tabUrl);
    console.log('Current domain:', currentDomain);

    // Get all domains from API
    let apiDomains: Array<{ url: string; status: 'ALLOWED' | 'BANNED' }> = [];
    try {
      const response = await ApiService.getAllDomains();
      apiDomains = response.domains.map((d) => ({
        url: d.url.toLowerCase(),
        status: d.status,
      }));
      console.log('Fetched domains from API:', apiDomains.length);
    } catch (error) {
      console.error('Failed to fetch domains from API:', error);
      // On API failure, don't update storage - keep existing state
      return;
    }

    // Check if current domain exists in API response
    const apiDomain = apiDomains.find(
      (d) => d.url.toLowerCase() === currentDomain.toLowerCase()
    );

    // Get current domain status from storage
    const currentDomainStatus = await ChromeStorage.getDomainStatus(
      currentDomain
    );

    if (!apiDomain) {
      // Domain NOT in API response
      if (!currentDomainStatus) {
        // Domain not in storage - create with ENABLED
        await ChromeStorage.setDomainStatus(currentDomain, DomainStatus.ENABLED);
        console.log('Created domain in storage as ENABLED:', currentDomain);
      } else if (currentDomainStatus === DomainStatus.BANNED) {
        // Domain in storage but BANNED - reset to ENABLED
        await ChromeStorage.setDomainStatus(currentDomain, DomainStatus.ENABLED);
        console.log('Domain was BANNED, reset to ENABLED:', currentDomain);
      } else {
        // Domain already in storage with ENABLED/DISABLED - do nothing
        console.log('Domain already in storage, no change needed');
      }
    } else {
      // Domain exists in API response
      if (apiDomain.status === 'BANNED') {
        // API says BANNED - always update/create as BANNED
        await ChromeStorage.setDomainStatus(
          currentDomain,
          DomainStatus.BANNED
        );
        console.log('Updated domain status to BANNED:', currentDomain);
      } else if (apiDomain.status === 'ALLOWED') {
        // API says ALLOWED
        if (!currentDomainStatus) {
          // Domain not in storage - create with ENABLED
          await ChromeStorage.setDomainStatus(
            currentDomain,
            DomainStatus.ENABLED
          );
          console.log('Created domain in storage as ENABLED:', currentDomain);
        } else if (currentDomainStatus === DomainStatus.BANNED) {
          // Domain was BANNED locally but API says ALLOWED - reset to ENABLED
          await ChromeStorage.setDomainStatus(
            currentDomain,
            DomainStatus.ENABLED
          );
          console.log('Reset domain from BANNED to ENABLED:', currentDomain);
        } else {
          // Domain in storage with ENABLED or DISABLED - keep local value
          console.log(
            'Domain in storage, keeping local value:',
            currentDomainStatus
          );
        }
      }
    }
  } catch (error) {
    console.error('Error syncing domain status:', error);
  }
}

// Initialize on extension load
syncDomainStatus();

// Listen for tab URL changes
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  // Only process when URL changes and tab is complete
  if (changeInfo.status === 'complete' && tab.url) {
    syncDomainStatus();
  }
});

// Placeholder for message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Handle messages from content scripts or popup
  console.log('Message received:', message);
  sendResponse({ status: 'ok' });
  return true;
});

export {};

