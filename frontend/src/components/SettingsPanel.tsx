import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Bot, CheckCircle2, Eye, EyeOff, Mail, Save, X } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchSettings, updateSettings, type AppSettings } from "../lib/api";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_SETTINGS: AppSettings = {
  llm_provider: "",
  llm_api_key: "",
  llm_model: "",
  email_enabled: "false",
  email_to: "",
  email_from: "",
  email_password: "",
};

const PROVIDERS = [
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
  { value: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat" },
] as const;

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage(null);
    fetchSettings()
      .then((data) => setSettings({ ...EMPTY_SETTINGS, ...data }))
      .catch(() => setMessage({ type: "error", text: "Failed to load settings." }))
      .finally(() => setLoading(false));
  }, [open]);

  const handleProviderChange = (provider: string) => {
    const match = PROVIDERS.find((p) => p.value === provider);
    setSettings((s) => ({
      ...s,
      llm_provider: provider,
      llm_model: match?.defaultModel ?? s.llm_model,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateSettings(settings);
      setSettings({ ...EMPTY_SETTINGS, ...updated });
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch {
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const llmConfigured = Boolean(settings.llm_provider && settings.llm_api_key && !settings.llm_api_key.startsWith("*") ? true : settings.llm_api_key);
  const emailConfigured = settings.email_enabled === "true" && Boolean(settings.email_from && settings.email_to && settings.email_password);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="settings-sheet" aria-describedby="settings-description">
          <div className="sheet-header">
            <div>
              <p className="eyebrow">CONFIGURATION</p>
              <Dialog.Title>Settings</Dialog.Title>
              <Dialog.Description id="settings-description">
                Configure LLM provider and email notifications. The app works without these — alerts use deterministic fallback messages.
              </Dialog.Description>
            </div>
            <Dialog.Close className="sheet-close" aria-label="Close settings"><X size={20} /></Dialog.Close>
          </div>

          {loading && <div className="settings-loading">Loading settings...</div>}

          {!loading && (
            <div className="settings-body">
              <section className="settings-section">
                <h3 className="settings-section-title">
                  <Bot size={17} aria-hidden="true" />
                  LLM Provider
                  {llmConfigured
                    ? <span className="config-badge config-badge-ok"><CheckCircle2 size={13} /> Configured</span>
                    : <span className="config-badge config-badge-warn"><AlertTriangle size={13} /> Not configured</span>
                  }
                </h3>
                <p className="settings-hint">Without an LLM key, alerts use deterministic fallback messages.</p>

                <label className="settings-label">
                  Provider
                  <select
                    className="settings-select"
                    value={settings.llm_provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                  >
                    <option value="">Select provider...</option>
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </label>

                <label className="settings-label">
                  API Key
                  <div className="settings-input-group">
                    <input
                      className="settings-input"
                      type={showApiKey ? "text" : "password"}
                      value={settings.llm_api_key}
                      onChange={(e) => setSettings((s) => ({ ...s, llm_api_key: e.target.value }))}
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      className="settings-toggle-btn"
                      onClick={() => setShowApiKey((v) => !v)}
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="settings-label">
                  Model name
                  <input
                    className="settings-input"
                    type="text"
                    value={settings.llm_model}
                    onChange={(e) => setSettings((s) => ({ ...s, llm_model: e.target.value }))}
                    placeholder="gpt-4o-mini"
                  />
                </label>
              </section>

              <section className="settings-section">
                <h3 className="settings-section-title">
                  <Mail size={17} aria-hidden="true" />
                  Email Notifications
                  {emailConfigured
                    ? <span className="config-badge config-badge-ok"><CheckCircle2 size={13} /> Enabled</span>
                    : <span className="config-badge config-badge-warn"><AlertTriangle size={13} /> Disabled</span>
                  }
                </h3>
                <p className="settings-hint">Send email alerts to an admin when new incidents are detected. Uses Gmail SMTP.</p>

                <label className="settings-label settings-toggle-label">
                  <span>Enable email notifications</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.email_enabled === "true"}
                    className={`settings-switch ${settings.email_enabled === "true" ? "settings-switch-on" : ""}`}
                    onClick={() => setSettings((s) => ({ ...s, email_enabled: s.email_enabled === "true" ? "false" : "true" }))}
                  >
                    <span className="settings-switch-thumb" />
                  </button>
                </label>

                {settings.email_enabled === "true" && (
                  <>
                    <label className="settings-label">
                      Recipient email (admin)
                      <input
                        className="settings-input"
                        type="email"
                        value={settings.email_to}
                        onChange={(e) => setSettings((s) => ({ ...s, email_to: e.target.value }))}
                        placeholder="ops-team@company.com"
                      />
                    </label>

                    <label className="settings-label">
                      Sender Gmail address
                      <input
                        className="settings-input"
                        type="email"
                        value={settings.email_from}
                        onChange={(e) => setSettings((s) => ({ ...s, email_from: e.target.value }))}
                        placeholder="alerts@gmail.com"
                      />
                    </label>

                    <label className="settings-label">
                      Gmail App Password
                      <div className="settings-input-group">
                        <input
                          className="settings-input"
                          type={showEmailPass ? "text" : "password"}
                          value={settings.email_password}
                          onChange={(e) => setSettings((s) => ({ ...s, email_password: e.target.value }))}
                          placeholder="xxxx xxxx xxxx xxxx"
                        />
                        <button
                          type="button"
                          className="settings-toggle-btn"
                          onClick={() => setShowEmailPass((v) => !v)}
                          aria-label={showEmailPass ? "Hide password" : "Show password"}
                        >
                          {showEmailPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>
                  </>
                )}
              </section>

              {message && (
                <div className={`settings-message ${message.type === "error" ? "settings-message-error" : "settings-message-success"}`}>
                  {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {message.text}
                </div>
              )}

              <button
                type="button"
                className="settings-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} aria-hidden="true" />
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
