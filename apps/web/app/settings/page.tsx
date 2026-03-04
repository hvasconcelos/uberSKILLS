"use client";

import type { AppSettings, Theme } from "@uberskillz/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@uberskillz/ui";
import {
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Monitor,
  Moon,
  Settings2,
  Sun,
  Upload,
  XCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";

type ConnectionStatus = "idle" | "testing" | "connected" | "error";

/** Cached model list with expiry timestamp. */
interface ModelCache {
  models: { id: string; name: string }[];
  expiresAt: number;
}

/** How long the model list stays cached on the client (5 minutes). */
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Settings page -- API key management (S3-2), preferences and data management (S3-3).
 *
 * Three sections:
 * 1. API Configuration -- OpenRouter API key input, masking, test
 * 2. Preferences -- Default model dropdown, theme selector
 * 3. Data Management -- Export all skills, backup DB, restore backup
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // API key form state
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyEdited, setKeyEdited] = useState(false);
  const savingRef = useRef(false);

  // Model list state
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const modelCacheRef = useRef<ModelCache | null>(null);

  // Data management state
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const pendingRestoreFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme (via next-themes)
  const { setTheme } = useTheme();

  // Fetch current settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = (await res.json()) as AppSettings;
        setSettings(data);
        setApiKey(data.openrouterApiKey ?? "");
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  /** Fetches available models from OpenRouter, using a 5-minute client cache. */
  const fetchModels = useCallback(async () => {
    // Return cached if still valid
    const cache = modelCacheRef.current;
    if (cache && Date.now() < cache.expiresAt) {
      setModels(cache.models);
      return;
    }

    setModelsLoading(true);
    try {
      const res = await fetch("/api/models");
      if (!res.ok) return;

      const data = (await res.json()) as { models: { id: string; name: string }[] };
      setModels(data.models);
      modelCacheRef.current = {
        models: data.models,
        expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
      };
    } catch {
      // Silently fail -- model list is a nice-to-have
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // Fetch model list when settings load and API key exists
  useEffect(() => {
    if (settings?.openrouterApiKey) {
      fetchModels();
    }
  }, [settings?.openrouterApiKey, fetchModels]);

  /** Saves the API key via PUT /api/settings. */
  const saveApiKey = useCallback(async () => {
    if (!keyEdited || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openrouterApiKey: apiKey }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Failed to save API key");
      }

      const updated = (await res.json()) as AppSettings;
      setSettings(updated);
      setKeyEdited(false);
      setApiKey(updated.openrouterApiKey ?? "");
      setShowKey(false);
      setConnectionStatus("idle");
      // Invalidate model cache since key changed
      modelCacheRef.current = null;
      toast.success("API key saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save API key";
      toast.error(message);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [apiKey, keyEdited]);

  /** Tests the OpenRouter API key. */
  const testConnection = useCallback(async () => {
    setConnectionStatus("testing");
    setConnectionError("");

    try {
      const res = await fetch("/api/settings/test");
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Connection test failed");
      }
      setConnectionStatus("connected");
      toast.success("Connected to OpenRouter");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection test failed";
      setConnectionStatus("error");
      setConnectionError(message);
      toast.error(message);
    }
  }, []);

  /** Saves a setting immediately and updates local state. */
  const saveSetting = useCallback(async (key: string, value: string) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Failed to save setting");
      }

      const updated = (await res.json()) as AppSettings;
      setSettings(updated);
      toast.success("Setting saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save setting";
      toast.error(message);
    }
  }, []);

  /** Handles theme change -- applies immediately via next-themes and persists to DB. */
  const handleThemeChange = useCallback(
    (value: string) => {
      setTheme(value);
      saveSetting("theme", value);
    },
    [setTheme, saveSetting],
  );

  /** Downloads a file from the given endpoint and triggers a browser download. */
  const fetchAndDownload = useCallback(
    async (
      endpoint: string,
      fallbackFilename: string,
      successMessage: string,
      setLoading: (v: boolean) => void,
    ) => {
      setLoading(true);
      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          const err = (await res.json()) as { error: string };
          throw new Error(err.error ?? "Download failed");
        }

        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition");
        const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? fallbackFilename;

        triggerDownload(blob, filename);
        toast.success(successMessage);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Download failed";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleExportAll = useCallback(
    () =>
      fetchAndDownload(
        "/api/export",
        "uberskillz-export.zip",
        "Skills exported successfully",
        setExporting,
      ),
    [fetchAndDownload],
  );

  const handleBackup = useCallback(
    () =>
      fetchAndDownload(
        "/api/backup",
        "uberskillz-backup.db",
        "Database backup downloaded",
        setBackingUp,
      ),
    [fetchAndDownload],
  );

  /** Opens file picker for restore. */
  const handleRestoreClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /** Handles file selection -- shows confirmation dialog before restoring. */
  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingRestoreFileRef.current = file;
    setShowRestoreDialog(true);
    // Reset the input so the same file can be selected again
    e.target.value = "";
  }, []);

  /** Restores the database from the selected file after user confirmation. */
  const handleRestoreConfirm = useCallback(async () => {
    const file = pendingRestoreFileRef.current;
    if (!file) return;

    setShowRestoreDialog(false);
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? "Restore failed");
      }

      toast.success("Database restored successfully. Reloading...");
      // Reload the page to pick up the new database state
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Restore failed";
      toast.error(message);
    } finally {
      setRestoring(false);
      pendingRestoreFileRef.current = null;
    }
  }, []);

  // Event handlers for API key input
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (!keyEdited) setKeyEdited(true);
  };

  const handleKeyBlur = () => {
    if (keyEdited) saveApiKey();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (keyEdited) saveApiKey();
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Settings" description="Manage your API configuration and preferences." />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasKey = settings?.openrouterApiKey !== null;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your API configuration and preferences." />

      {/* Section 1: API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Connect your OpenRouter API key to enable AI-powered skill creation and testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="api-key" className="text-sm font-medium">
              OpenRouter API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={handleKeyChange}
                  onBlur={handleKeyBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="sk-or-v1-..."
                  className="pr-10 font-mono"
                  aria-describedby="api-key-help"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={testConnection}
                disabled={!hasKey || connectionStatus === "testing"}
              >
                {connectionStatus === "testing" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Test
              </Button>

              {saving && (
                <Button variant="outline" disabled>
                  <Loader2 className="size-4 animate-spin" />
                  Saving
                </Button>
              )}
            </div>

            <div id="api-key-help">
              {!hasKey && !keyEdited ? (
                <p className="text-sm text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    openrouter.ai/keys
                  </a>
                  . Your key is encrypted before storage.
                </p>
              ) : null}
              <ConnectionStatusIndicator status={connectionStatus} error={connectionError} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            Preferences
          </CardTitle>
          <CardDescription>Configure default behavior for skill testing and UI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Model */}
          <div className="space-y-2">
            <label htmlFor="default-model" className="text-sm font-medium">
              Default Model
            </label>
            <Select
              value={settings?.defaultModel ?? ""}
              onValueChange={(value) => saveSetting("defaultModel", value)}
              disabled={!hasKey}
            >
              <SelectTrigger id="default-model" className="w-full">
                <SelectValue placeholder={hasKey ? "Select a model..." : "Add an API key first"} />
              </SelectTrigger>
              <SelectContent>
                <ModelSelectOptions models={models} loading={modelsLoading} />
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The model used by default when testing skills.
            </p>
          </div>

          <Separator />

          {/* Theme Selector */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Theme</span>
            <div className="flex gap-2">
              <ThemeButton
                value="light"
                label="Light"
                icon={<Sun className="size-4" />}
                current={settings?.theme ?? "system"}
                onSelect={handleThemeChange}
              />
              <ThemeButton
                value="dark"
                label="Dark"
                icon={<Moon className="size-4" />}
                current={settings?.theme ?? "system"}
                onSelect={handleThemeChange}
              />
              <ThemeButton
                value="system"
                label="System"
                icon={<Monitor className="size-4" />}
                current={settings?.theme ?? "system"}
                onSelect={handleThemeChange}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color scheme. System follows your OS preference.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export, backup, and restore your skills and data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={handleExportAll} disabled={exporting}>
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export All Skills
            </Button>

            <Button variant="outline" onClick={handleBackup} disabled={backingUp}>
              {backingUp ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Backup Database
            </Button>

            <Button variant="outline" onClick={handleRestoreClick} disabled={restoring}>
              {restoring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Restore Backup
            </Button>

            {/* Hidden file input for restore */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".db,.sqlite,.sqlite3"
              onChange={handleFileSelected}
              className="hidden"
              aria-label="Select database file to restore"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Export downloads all skills as a zip. Backup downloads the raw database. Restore
            replaces the database (an automatic backup is created first).
          </p>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Database</DialogTitle>
            <DialogDescription>
              This will replace your current database with the uploaded file. An automatic backup of
              the current database will be created before restoring.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">
            File: {pendingRestoreFileRef.current?.name ?? "Unknown"}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRestoreConfirm}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Renders a connection status indicator. */
function ConnectionStatusIndicator({ status, error }: { status: ConnectionStatus; error: string }) {
  if (status === "idle") return null;

  if (status === "testing") {
    return (
      <output className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Testing connection...
      </output>
    );
  }

  if (status === "connected") {
    return (
      <output
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--status-success-text)" }}
      >
        <CheckCircle2 className="size-4" />
        Connected
      </output>
    );
  }

  return (
    <div
      className="flex items-center gap-2 text-sm"
      style={{ color: "var(--status-error-text)" }}
      role="alert"
    >
      <XCircle className="size-4" />
      {error || "Connection failed"}
    </div>
  );
}

/** A theme toggle button -- visually selected when it matches the current theme. */
function ThemeButton({
  value,
  label,
  icon,
  current,
  onSelect,
}: {
  value: Theme;
  label: string;
  icon: React.ReactNode;
  current: Theme;
  onSelect: (value: string) => void;
}) {
  const isActive = current === value;
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={() => onSelect(value)}
      aria-pressed={isActive}
      className="flex-1 gap-2"
    >
      {icon}
      {label}
    </Button>
  );
}

/** Renders the model dropdown content -- avoids a nested ternary in JSX. */
function ModelSelectOptions({
  models,
  loading,
}: {
  models: { id: string; name: string }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-sm text-muted-foreground">No models available</div>
    );
  }

  return models.map((model) => (
    <SelectItem key={model.id} value={model.id}>
      {model.name}
    </SelectItem>
  ));
}

/** Triggers a browser download for a blob. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
