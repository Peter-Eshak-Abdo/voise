/**
 * VoiceClear PWA - Core TypeScript Types & Interfaces
 */

export type GeminiModelId =
  | 'gemini-3.8-flash'
  | 'gemini-3.5-pro'
  | 'gemini-3.0-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.0-pro'
  | 'gemini-flash-latest'
  | 'gemini-pro-latest';

export interface FallbackAttemptLog {
  model: string;
  success: boolean;
  error?: string;
  statusCode?: number;
  durationMs: number;
  timestamp: string;
}

export interface TranscriptionRequest {
  audioBase64: string;
  mimeType: string;
  fileName?: string;
  fileSizeBytes?: number;
  customPrompt?: string;
}

export interface TranscriptionSuccessResponse {
  success: true;
  refinedText: string;
  modelUsed: string;
  latencyMs: number;
  fallbackTrail: FallbackAttemptLog[];
  audioMeta?: {
    name?: string;
    mimeType: string;
    sizeFormatted?: string;
    durationSec?: number;
  };
}

export interface TranscriptionErrorResponse {
  success: false;
  error: string;
  details?: string;
  fallbackTrail: FallbackAttemptLog[];
}

export type TranscriptionApiResponse =
  | TranscriptionSuccessResponse
  | TranscriptionErrorResponse;

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  fileSizeFormatted: string;
  durationSeconds?: number;
  refinedText: string;
  modelUsed: string;
  latencyMs: number;
  isFavorite?: boolean;
}

export type ProcessingStage =
  | 'idle'
  | 'recording'
  | 'reading_file'
  | 'contacting_ai'
  | 'refining_text'
  | 'success'
  | 'error';
