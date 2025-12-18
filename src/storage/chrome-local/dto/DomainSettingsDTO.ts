// src/storage/chrome-local/dto/DomainSettingsDTO.ts

import type { DomainStatus } from '@/types/domain';

/**
 * Domain settings storage DTO
 * Stores global and domain-level extension settings
 */
export interface DomainSettingsDTO {
  /** Global extension disable flag */
  globalDisabled: boolean;
  /** Map of domain name to domain status */
  domainSettings: Record<string, DomainStatus>;
}

