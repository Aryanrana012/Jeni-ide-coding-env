/**
 * EmbedderService — Milestone 2.8
 *
 * Singleton wrapper around @xenova/transformers for local embedding inference.
 * Uses `Xenova/all-MiniLM-L6-v2` (384-dim, ~40 MB download on first use, cached).
 *
 * All vectors are L2-normalized so dot-product == cosine similarity.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no bundled types; types come from @xenova/transformers itself
import { pipeline } from '@xenova/transformers';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const BATCH_SIZE = 32; // max texts per pipeline call to avoid OOM

function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

export class EmbedderService {
  private static instance: EmbedderService | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractor: any = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): EmbedderService {
    if (!EmbedderService.instance) {
      EmbedderService.instance = new EmbedderService();
    }
    return EmbedderService.instance;
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Load the model. Safe to call multiple times — subsequent calls are no-ops.
   */
  async initialize(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[Jeni Embedder] Loading model:', MODEL_ID);
        this.extractor = await pipeline('feature-extraction', MODEL_ID, {
          // quantized WASM model — smaller & faster
          quantized: true
        });
        this.ready = true;
        console.log('[Jeni Embedder] Model ready.');
      } catch (err) {
        console.warn('[Jeni Embedder] Model load failed:', err);
        this.ready = false;
        throw err;
      }
    })();

    return this.initPromise;
  }

  /**
   * Embed an array of strings.
   * Returns one normalized Float32Array per input text.
   * Throws if the model is not ready.
   */
  async embed(texts: string[]): Promise<Float32Array[]> {
    if (!this.ready || !this.extractor) {
      throw new Error('EmbedderService not ready — call initialize() first.');
    }

    const results: Float32Array[] = [];

    for (let start = 0; start < texts.length; start += BATCH_SIZE) {
      const batch = texts.slice(start, start + BATCH_SIZE);
      // pooling: 'mean', normalize: false (we do it ourselves)
      const output = await this.extractor(batch, { pooling: 'mean', normalize: false });
      // output.data is a flat Float32Array of shape [batchSize, dims]
      const dims = output.data.length / batch.length;
      for (let i = 0; i < batch.length; i++) {
        const raw = output.data.slice(i * dims, (i + 1) * dims) as Float32Array;
        results.push(l2Normalize(raw));
      }
    }

    return results;
  }

  /**
   * Embed a single string. Convenience wrapper.
   */
  async embedOne(text: string): Promise<Float32Array> {
    const [vec] = await this.embed([text]);
    return vec;
  }

  /**
   * Cosine similarity between two unit-normalized vectors.
   * Because vectors are pre-normalized, this is just a dot product.
   */
  static cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return Math.max(0, Math.min(1, dot));
  }
}
