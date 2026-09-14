export type RetrievalMatchKind = 'content' | 'filename';

export interface RetrievedFile {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  language: string | null;
  size: number;
  type: 'file';
}

export interface RetrievalMatch {
  kind: RetrievalMatchKind;
  file: RetrievedFile;
  line?: number;
  column?: number;
  snippet?: string;
  match?: string;
  score: number;
}

export interface RetrievalLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxResults: number;
  maxSnippetLength: number;
}

export interface RetrievalSummary {
  query: string;
  matches: RetrievalMatch[];
  scannedFiles: number;
  truncated: boolean;
}

// --- Semantic / Hybrid retrieval types (Milestone 2.8) ---

/** A single chunk match returned by the semantic index. */
export interface SemanticMatch {
  file: RetrievedFile;
  /** 1-indexed start line of the chunk within the file. */
  startLine: number;
  /** 1-indexed end line of the chunk within the file (inclusive). */
  endLine: number;
  /** Raw cosine similarity in [0, 1]. */
  score: number;
  /** First ~160 characters of the chunk for display. */
  snippet: string;
}

export interface HybridOptions {
  maxResults?: number;
  /** Weight applied to the normalized keyword score. Default: 0.4 */
  keywordWeight?: number;
  /** Weight applied to the semantic cosine score. Default: 0.6 */
  semanticWeight?: number;
  activeFile?: string;
  extensions?: string[];
}

/** Merged result from hybrid retrieval. */
export interface HybridRetrievalSummary {
  query: string;
  /** Combined, de-duplicated, ranked matches. */
  matches: RetrievalMatch[];
  scannedFiles: number;
  truncated: boolean;
  /** True if semantic search contributed results. */
  semanticAvailable: boolean;
}
