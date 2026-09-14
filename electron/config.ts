/**
 * Configuration for Jeni AI agent.
 * Loads environment variables for LLM access.
 * API key must NEVER be exposed to the renderer.
 */

import { loadEnvironmentFile } from './env';

loadEnvironmentFile();

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

/**
 * Load and validate LLM configuration from environment.
 * Throws if required configuration is missing.
 */
export function loadLLMConfig(): LLMConfig {
  const apiKey = process.env.JENI_LLM_API_KEY?.trim();
  const baseUrl = process.env.JENI_LLM_BASE_URL?.trim() || 'https://openrouter.ai/api/v1';
  const model = process.env.JENI_LLM_MODEL?.trim() || 'poolside/laguna-s-2.1:free';
  const configuredTimeout = Number(process.env.JENI_LLM_TIMEOUT_MS ?? 120000);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000
    ? Math.min(configuredTimeout, 300000)
    : 120000;

  if (!apiKey) {
    throw new Error(
      'JENI_LLM_API_KEY environment variable is not set. ' +
      'Set it before running Jeni: JENI_LLM_API_KEY=your-key npm run dev'
    );
  }

  return {
    apiKey,
    baseUrl,
    model,
    timeoutMs
  };
}

/**
 * Check if LLM is configured (used for graceful degradation).
 */
export function isLLMConfigured(): boolean {
  return !!process.env.JENI_LLM_API_KEY?.trim();
}
