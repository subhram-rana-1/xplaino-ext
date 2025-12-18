// src/types/domain.ts

/**
 * Domain-related types and enums
 */

/**
 * Domain status enum for local storage
 * ENABLED: Extension is enabled for this domain
 * DISABLED: Extension is disabled for this domain (user preference)
 * BANNED: Domain is banned by API (cannot be enabled)
 * INVALID: Special URLs (chrome://, about:, etc.) - extension not applicable
 */
export enum DomainStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  BANNED = 'BANNED',
  INVALID = 'INVALID',
}

