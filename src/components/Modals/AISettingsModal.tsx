import React, { useEffect, useState } from 'react';
import { KeyRound, X } from 'lucide-react';

export const AISettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [configuredKey, setConfiguredKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [model, setModel] = useState('poolside/laguna-s-2.1:free');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    window.jeniAPI.getLLMSettings().then((settings) => {
      setConfiguredKey(settings.apiKey);
      setBaseUrl(settings.baseUrl);
      setModel(settings.model);
      setApiKey('');
      setError('');
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await window.jeniAPI.saveLLMSettings({ apiKey, baseUrl, model });
      onClose();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to save AI settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <section className="w-full max-w-lg rounded-xl border border-surface-border bg-[#151518] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-jeni-purple" /><h2 className="font-semibold text-gray-100">Jeni AI Settings</h2></div>
          <button type="button" title="Close settings" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={save} className="space-y-4 p-5">
          <label className="block text-sm text-gray-300">API key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={configuredKey || 'Paste your API key'} className="mt-1 w-full rounded-lg border border-surface-border bg-[#0d0d0f] px-3 py-2 text-sm text-gray-100 outline-none focus:border-jeni-purple" /></label>
          <label className="block text-sm text-gray-300">API base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="mt-1 w-full rounded-lg border border-surface-border bg-[#0d0d0f] px-3 py-2 text-sm text-gray-100 outline-none focus:border-jeni-purple" /></label>
          <label className="block text-sm text-gray-300">Model<input value={model} onChange={(event) => setModel(event.target.value)} className="mt-1 w-full rounded-lg border border-surface-border bg-[#0d0d0f] px-3 py-2 text-sm text-gray-100 outline-none focus:border-jeni-purple" /></label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/10">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-jeni-purple px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save settings'}</button></div>
        </form>
      </section>
    </div>
  );
};