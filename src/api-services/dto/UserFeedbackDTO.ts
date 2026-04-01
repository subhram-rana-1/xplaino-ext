// src/api-services/dto/UserFeedbackDTO.ts
// DTOs for User Feedback API

export enum UserFeedbackVerdict {
  UNHAPPY = 'UNHAPPY',
  NEUTRAL = 'NEUTRAL',
  HAPPY = 'HAPPY',
}

export interface UserFeedbackQnA {
  question: string;
  answer: string;
}

export interface UserFeedbackMetadata {
  qna: UserFeedbackQnA[];
}

export interface UserFeedbackRequest {
  verdict: UserFeedbackVerdict;
  metadata: UserFeedbackMetadata;
}

export interface UserFeedbackResponse {
  id: string;
  user_id: string;
  verdict: string;
  metadata: UserFeedbackMetadata;
  created_at: string;
  updated_at: string;
}
