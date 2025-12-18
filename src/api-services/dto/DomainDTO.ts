// src/api-services/dto/DomainDTO.ts

/**
 * Domain-related API DTOs
 */

/**
 * Single domain response from API
 */
export interface DomainResponseDTO {
  /** Domain ID (UUID) */
  id: string;
  /** Domain URL (e.g., "docs.google.com") */
  url: string;
  /** Domain status from API */
  status: 'ALLOWED' | 'BANNED';
  /** User who created the domain */
  created_by: {
    id: string;
    name: string;
    role?: string | null;
    email?: string | null;
  };
  /** ISO format timestamp when domain was created */
  created_at: string;
  /** ISO format timestamp when domain was last updated */
  updated_at: string;
}

/**
 * Response DTO for getting all domains
 */
export interface GetAllDomainsResponseDTO {
  /** List of all domains */
  domains: DomainResponseDTO[];
  /** Total number of domains */
  total: number;
  /** Pagination offset */
  offset: number;
  /** Pagination limit */
  limit: number;
  /** Whether there are more domains to fetch */
  has_next: boolean;
}

