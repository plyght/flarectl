import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import { listKVNamespaces, type KVNamespace } from "../lib/cloudflare.ts";
import { isAuthenticated } from "../lib/auth.ts";

type ViewState = "list" | "details";

export function KV() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [view, setView] = useState<ViewState>("list");
  const [namespaces, setNamespaces] = useState<KVNamespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedNamespace, setSelectedNamespace] = useState<KVNamespace | null>(null);

  const loadNamespaces = useCallback(async () => {
    if (!isAuthenticated()) {
      setError("Not authenticated. Set CLOUDFLARE_API_TOKEN environment variable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listKVNamespaces();
      setNamespaces(data);
      if (selectedIndex >= data.length) {
        setSelectedIndex(Math.max(0, data.length - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KV namespaces");
    } finally {
      setLoading(false);
    }
  }, [selectedIndex]);

  useEffect(() => {
    loadNamespaces();
  }, [loadNamespaces]);

  useKeyboard((key) => {
    if (view === "details") {
      if (key.name === "escape" || key.name === "backspace") {
        setView("list");
        setSelectedNamespace(null);
      }
      return;
    }

    const maxIndex = namespaces.length - 1;

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
        if (namespaces[selectedIndex]) {
          setSelectedNamespace(namespaces[selectedIndex]);
          setView("details");
        }
        break;
      case "r":
        loadNamespaces();
        break;
    }
  });

  if (loading && namespaces.length === 0) {
    return (
      <box flexDirection="column" flexGrow={1} padding={2}>
        <box flexDirection="row" gap={1}>
          <text fg={colors.primary}>⟳</text>
          <text fg={colors.textMuted}>Loading KV namespaces...</text>
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

  if (view === "details" && selectedNamespace) {
    return (
      <box flexDirection="column" flexGrow={1} padding={1}>
        <box flexDirection="row" gap={1} marginBottom={1}>
          <text fg={colors.primary}>‹ Back (Esc)</text>
          <text>|</text>
          <text><strong>{selectedNamespace.title}</strong></text>
        </box>

        <box flexDirection="column" borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>ID:</text>
            <text>{selectedNamespace.id}</text>
          </box>
          
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Title:</text>
            <text>{selectedNamespace.title}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>URL Encoding:</text>
            <text>{selectedNamespace.supports_url_encoding ? "Supported" : "Not Supported"}</text>
          </box>
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <box flexDirection="column">
          <text>
            <strong fg={colors.primary}>KV Namespaces</strong>
          </text>
          <text>
            <span fg={colors.textMuted}>Key-value storage at the edge</span>
          </text>
        </box>
        <text fg={colors.textMuted}>
          {namespaces.length} namespaces • Press 'r' to refresh
        </text>
      </box>

      {namespaces.length === 0 ? (
        <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No KV namespaces found</span>
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
            <text width="40%"><strong>Title</strong></text>
            <text width="60%"><strong>ID</strong></text>
          </box>
          <scrollbox flexDirection="column" flexGrow={1}>
            {namespaces.map((ns, index) => {
              const isSelected = index === selectedIndex;
              return (
                <box
                  key={ns.id}
                  flexDirection="row"
                  padding={1}
                  backgroundColor={isSelected ? colors.surfaceAlt : undefined}
                >
                  <text width="40%" fg={isSelected ? colors.primary : colors.text}>
                    {isSelected ? "> " : "  "}{ns.title}
                  </text>
                  <text width="60%" fg={isSelected ? colors.text : colors.textMuted}>
                    {ns.id}
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
