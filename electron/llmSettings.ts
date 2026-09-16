import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

interface StoredSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface PublicSettings {
  configured: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const settingsFile = () => path.join(app.getPath('userData'), 'llm-settings.json');

function readSettings(): StoredSettings | null {
  try {
    if (!fs.existsSync(settingsFile())) return null;
    const value = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) as StoredSettings;
    if (!value.apiKey || !value.baseUrl || !value.model) return null;
    return {
      apiKey: safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(Buffer.from(value.apiKey, 'base64'))
        : value.apiKey,
      baseUrl: value.baseUrl,
      model: value.model
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

export function getPublicLLMSettings(): PublicSettings {
  const settings = readSettings();
  return {
    configured: Boolean(settings?.apiKey),
    apiKey: settings?.apiKey ? `...${settings.apiKey.slice(-4)}` : '',
    baseUrl: settings?.baseUrl || 'https://openrouter.ai/api/v1',
    model: settings?.model || 'poolside/laguna-s-2.1:free'
  };
}

export function saveLLMSettings(input: { apiKey: string; baseUrl: string; model: string }): PublicSettings {
  const existing = readSettings();
  const apiKey = input.apiKey.trim() || existing?.apiKey || '';
  const baseUrl = input.baseUrl.trim().replace(/\/$/, '');
  const model = input.model.trim();
  if (!apiKey || !baseUrl || !model) throw new Error('API key, base URL, and model are required.');

  const value: StoredSettings = {
    apiKey: safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(apiKey).toString('base64')
      : apiKey,
    baseUrl,
    model
  };
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(value, null, 2), 'utf8');
  process.env.JENI_LLM_API_KEY = apiKey;
  process.env.JENI_LLM_BASE_URL = baseUrl;
  process.env.JENI_LLM_MODEL = model;
  return getPublicLLMSettings();
}