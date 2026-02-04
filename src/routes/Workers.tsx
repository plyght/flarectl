import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import { listWorkers, type Worker } from "../lib/cloudflare.ts";
import { isAuthenticated } from "../lib/auth.ts";

type ViewState = "list" | "details";

export function Workers() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [view, setView] = useState<ViewState>("list");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const loadWorkers = useCallback(async () => {
    if (!isAuthenticated()) {
      setError("Not authenticated. Set CLOUDFLARE_API_TOKEN environment variable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkers();
      setWorkers(data);
      if (selectedIndex >= data.length) {
        setSelectedIndex(Math.max(0, data.length - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }, [selectedIndex]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  useKeyboard((key) => {
    if (view === "details") {
      if (key.name === "escape" || key.name === "backspace") {
        setView("list");
        setSelectedWorker(null);
      }
      return;
    }

    const maxIndex = workers.length - 1;

    switch (key.name) {
      case "j":
      case "down":
        setSelectedIndex((i) => Math.min(i + 1, maxIndex));
        break;
      case "k":
      case "up":
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "return":
      case "enter":
        if (workers[selectedIndex]) {
          setSelectedWorker(workers[selectedIndex]);
          setView("details");
        }
        break;
      case "r":
        loadWorkers();
        break;
    }
  });

  if (loading && workers.length === 0) {
    return (
      <box flexDirection="column" flexGrow={1} padding={2}>
        <box flexDirection="row" gap={1}>
          <text fg={colors.primary}>⟳</text>
          <text fg={colors.textMuted}>Loading workers...</text>
        </box>
      </box>
    );
  }

  if (error) {
    return (
      <box flexDirection="column" flexGrow={1} padding={2}>
        <text fg={colors.error}>Error: {error}</text>
        <text fg={colors.textMuted}>Press 'r' to retry</text>
      </box>
    );
  }

  if (view === "details" && selectedWorker) {
    return (
      <box flexDirection="column" flexGrow={1} padding={1}>
        <box flexDirection="row" gap={1} marginBottom={1}>
          <text fg={colors.primary}>‹ Back (Esc)</text>
          <text>|</text>
          <text><strong>{selectedWorker.id}</strong></text>
        </box>

        <box flexDirection="column" borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Script Name:</text>
            <text>{selectedWorker.id}</text>
          </box>
          
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Usage Model:</text>
            <text>{selectedWorker.usage_model}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Created:</text>
            <text>{new Date(selectedWorker.created_on).toLocaleString()}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Modified:</text>
            <text>{new Date(selectedWorker.modified_on).toLocaleString()}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>ETag:</text>
            <text>{selectedWorker.etag}</text>
          </box>

          {selectedWorker.compatibility_date && (
            <box flexDirection="row" gap={2} marginBottom={1}>
              <text fg={colors.textMuted} width={20}>Compat Date:</text>
              <text>{selectedWorker.compatibility_date}</text>
            </box>
          )}

          {selectedWorker.compatibility_flags && selectedWorker.compatibility_flags.length > 0 && (
            <box flexDirection="row" gap={2} marginBottom={1}>
              <text fg={colors.textMuted} width={20}>Compat Flags:</text>
              <text>{selectedWorker.compatibility_flags.join(", ")}</text>
            </box>
          )}
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <box flexDirection="column">
          <text>
            <strong fg={colors.primary}>Workers</strong>
          </text>
          <text>
            <span fg={colors.textMuted}>Serverless functions at the edge</span>
          </text>
        </box>
        <text fg={colors.textMuted}>
          {workers.length} scripts • Press 'r' to refresh
        </text>
      </box>

      {workers.length === 0 ? (
        <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No Workers deployed</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column" flexGrow={1}>
          <box 
            flexDirection="row" 
            padding={1} 
            borderStyle="single" 
            borderColor={colors.border} 
            backgroundColor={colors.surfaceAlt}
          >
            <text width="40%"><strong>Name</strong></text>
            <text width="30%"><strong>Modified</strong></text>
            <text width="30%"><strong>Usage Model</strong></text>
          </box>
          <scrollbox flexDirection="column" flexGrow={1}>
            {workers.map((worker, index) => {
              const isSelected = index === selectedIndex;
              return (
                <box
                  key={worker.id}
                  flexDirection="row"
                  padding={1}
                  backgroundColor={isSelected ? colors.surfaceAlt : undefined}
                >
                  <text width="40%" fg={isSelected ? colors.primary : colors.text}>
                    {isSelected ? "> " : "  "}{worker.id}
                  </text>
                  <text width="30%" fg={isSelected ? colors.text : colors.textMuted}>
                    {new Date(worker.modified_on).toLocaleDateString()}
                  </text>
                  <text width="30%" fg={isSelected ? colors.text : colors.textMuted}>
                    {worker.usage_model}
                  </text>
                </box>
              );
            })}
          </scrollbox>
        </box>
      )}
      
      <box marginTop={1}>
        <text fg={colors.textMuted}>
          ↑/↓: Navigate • Enter: Details • r: Refresh
        </text>
      </box>
    </box>
  );
}
