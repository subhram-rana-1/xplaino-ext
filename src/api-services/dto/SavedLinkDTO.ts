// src/api-services/dto/SavedLinkDTO.ts
// DTOs for Saved Link API

export interface SaveLinkRequest {
  url: string;
  folder_id?: string;
  name?: string;
  summary?: string;
  metadata?: Record<string, any>;
}

export interface SavedLinkResponse {
  id: string;
  name: string | null;
  url: string;
  type: string;
  summary: string | null;
  metadata: Record<string, any> | null;
  folder_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

