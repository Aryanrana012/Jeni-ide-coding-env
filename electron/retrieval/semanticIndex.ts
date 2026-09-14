/**
 * SemanticIndex — Milestone 2.8
 *
 * Builds an in-memory vector index of workspace code chunks.
 * Supports nearest-neighbour search via brute-force cosine similarity.
 *
 * Lifecycle:
 *   - Built lazily on first query (or explicitly via build()).
 *   - Survives for the lifetime of the Electron main process.
 *   - Invalidated when workspaceRoot changes via setWorkspaceRoot().
 */

import fs from 'fs';
import { EmbedderService } from './embedder';
import { discoverFiles } from './index';
import { SemanticMatch, RetrievedFile, RetrievalLimits } from './types';

const CHUNK_LINES = 30;       // lines per chunk window
const CHUNK_STEP = 15;        // step between window starts (50% overlap)
const MAX_CHUNKS_PER_FILE = 200;
const MAX_SNIPPET_LENGTH = 160;
const DEFAULT_TOP_K = 20;

interface IndexedChunk {
  file: RetrievedFile;
  startLine: number;  // 1-indexed
  endLine: number;    // 1-indexed, inclusive
  snippet: string;
  vector: Float32Array;
}

export class SemanticIndex {
  private static instance: SemanticIndex | null = null;

  private workspaceRoot = '';
  private chunks: IndexedChunk[] = [];
  private built = false;
  private buildPromise: Promise<void> | null = null;
  private buildVersion = 0;

  private constructor() {}

  static getInstance(): SemanticIndex {
    if (!SemanticIndex.instance) {
      SemanticIndex.instance = new SemanticIndex();
    }
    return SemanticIndex.instance;
  }

  isBuilt(): boolean {
    return this.built;
  }

  /**
   * Call when workspaceRoot changes. Clears stale index.
   */
  setWorkspaceRoot(root: string): void {
    if (this.workspaceRoot !== root) {
      this.workspaceRoot = root;
      this.invalidate();
    }
  }

  /**
   * Clear the index so it will be rebuilt on next query.
   */
  invalidate(): void {
    this.buildVersion++;
    this.chunks = [];
    this.built = false;
    this.buildPromise = null;
    console.log('[Jeni SemanticIndex] Index invalidated.');
  }

  /**
   * Build (or rebuild) the full workspace index.
   * Safe to call concurrently — subsequent calls await the same promise.
   */
  async build(workspaceRoot: string, limits?: Partial<RetrievalLimits> & { extensions?: string[] }): Promise<void> {
    this.setWorkspaceRoot(workspaceRoot);

    if (this.built) return;
    if (this.buildPromise) return this.buildPromise;

    const version = this.buildVersion;
    this.buildPromise = this._doBuild(workspaceRoot, limits, version).then(() => {
      if (version === this.buildVersion) {
        this.built = true;
        this.buildPromise = null;
      }
    }).catch((err) => {
      if (version === this.buildVersion) {
        this.buildPromise = null;
      }
      throw err;
    });
    return this.buildPromise;
  }

  private async _doBuild(workspaceRoot: string, limits: Partial<RetrievalLimits> & { extensions?: string[] } | undefined, version: number): Promise<void> {
    const embedder = EmbedderService.getInstance();
    if (!embedder.isReady()) {
      throw new Error('EmbedderService not ready — cannot build semantic index.');
    }

    console.log('[Jeni SemanticIndex] Building index for:', workspaceRoot);
    const extensionSet = limits?.extensions
      ? new Set(limits.extensions.map((extension) => extension.toLowerCase()))
      : null;
    const files = discoverFiles(workspaceRoot, limits)
      .filter((file) => !extensionSet || extensionSet.has(file.extension));
    const allChunkTexts: string[] = [];
    const allChunkMeta: Omit<IndexedChunk, 'vector'>[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = fs.readFileSync(file.path, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);
      let chunkCount = 0;

      for (let start = 0; start < lines.length && chunkCount < MAX_CHUNKS_PER_FILE; start += CHUNK_STEP) {
        const end = Math.min(start + CHUNK_LINES - 1, lines.length - 1);
        const chunkLines = lines.slice(start, end + 1);
        const chunkText = chunkLines.join('\n').trim();
        if (!chunkText) continue;

        const snippet = chunkText.slice(0, MAX_SNIPPET_LENGTH);

        allChunkTexts.push(chunkText);
        allChunkMeta.push({
          file,
          startLine: start + 1,
          endLine: end + 1,
          snippet
        });
        chunkCount++;
      }
    }

    if (allChunkTexts.length === 0) {
      console.log('[Jeni SemanticIndex] No chunks to embed.');
      if (version === this.buildVersion) this.chunks = [];
      return;
    }

    console.log(`[Jeni SemanticIndex] Embedding ${allChunkTexts.length} chunks...`);
    const vectors = await embedder.embed(allChunkTexts);

    if (version !== this.buildVersion) return;

    this.chunks = allChunkMeta.map((meta, i) => ({
      ...meta,
      vector: vectors[i]
    }));

    console.log(`[Jeni SemanticIndex] Index built — ${this.chunks.length} chunks.`);
  }

  /**
   * Find the top-k most semantically similar chunks to the query.
   * Returns an empty array if the index is not built.
   */
  async query(queryText: string, topK: number = DEFAULT_TOP_K): Promise<SemanticMatch[]> {
    if (!this.built || this.chunks.length === 0) return [];

    const embedder = EmbedderService.getInstance();
    if (!embedder.isReady()) return [];

    let queryVec: Float32Array;
    try {
      queryVec = await embedder.embedOne(queryText);
    } catch {
      return [];
    }

    // Brute-force cosine similarity (dot product of unit vectors)
    const scored: Array<{ index: number; score: number }> = [];
    for (let i = 0; i < this.chunks.length; i++) {
      const score = EmbedderService.cosineSimilarity(queryVec, this.chunks[i].vector);
      scored.push({ index: i, score });
    }

    // Sort descending, take top-k
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, topK);

    return topChunks.map(({ index, score }) => {
      const chunk = this.chunks[index];
      return {
        file: chunk.file,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        score,
        snippet: chunk.snippet
      };
    });
  }
}
