import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

interface StoredLLMSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface PublicLLMSettings {
  configured: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'llm-settings.json');
}

function readSettings(): StoredLLMSettings | null {
  try {
    if (!fs.existsSync(settingsPath())) return null;
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) as Partial<StoredLLMSettings>;
    if (!parsed.apiKey || !parsed.baseUrl || !parsed.model) return null;

    return {
      apiKey: safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(Buffer.from(parsed.apiKey, 'base64'))
        : parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model
    };
  } catch (error) {
    console.warn('[Jeni] Unable to read saved AI settings:', error instanceof Error ? error.message : error);
    return null;
  }
}

export function applyStoredLLMSettings(): void {
  const settings = readSettings();
  if (!settings) return;

  process.env.JENI_LLM_API_KEY = settings.apiKey;
  process.env.JENI_LLM_BASE_URL = settings.baseUrl;
  process.env.JENI_LLM_MODEL = settings.model;
}

export function getPublicLLMSettings(): PublicLLMSettings {
  const settings = readSettings();
  return {
    configured: Boolean(settings?.apiKey),
    apiKey: settings?.apiKey ? `...${settings.apiKey.slice(-4)}` : '',
    baseUrl: settings?.baseUrl || process.env.JENI_LLM_BASE_URL || 'https://openrouter.ai/api/v1',
    model: settings?.model || process.env.JENI_LLM_MODEL || 'poolside/laguna-s-2.1:free'
  };
}

export function saveLLMSettings(settings: { apiKey: string; baseUrl: string; model: string }): PublicLLMSettings {
  const existingSettings = readSettings();
  const apiKey = settings.apiKey.trim() || existingSettings?.apiKey || '';
  const baseUrl = settings.baseUrl.trim().replace(/\/$/, '');
  const model = settings.model.trim();

  if (!apiKey || !baseUrl || !model) {
    throw new Error('API key, base URL, and model are required.');
  }

  const stored: StoredLLMSettings = {
    apiKey: safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(apiKey).toString('base64')
      : apiKey,
    baseUrl,
    model
  };

  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(stored, null, 2), { encoding: 'utf8', mode: 0o600 });
  process.env.JENI_LLM_API_KEY = apiKey;
  process.env.JENI_LLM_BASE_URL = baseUrl;
  process.env.JENI_LLM_MODEL = model;

  return getPublicLLMSettings();
}