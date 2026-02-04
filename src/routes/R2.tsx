import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import { listR2Buckets, type R2Bucket } from "../lib/cloudflare.ts";
import { isAuthenticated } from "../lib/auth.ts";

type ViewState = "list" | "details";

export function R2() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [view, setView] = useState<ViewState>("list");
  const [buckets, setBuckets] = useState<R2Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedBucket, setSelectedBucket] = useState<R2Bucket | null>(null);

  const loadBuckets = useCallback(async () => {
    if (!isAuthenticated()) {
      setError("Not authenticated. Set CLOUDFLARE_API_TOKEN environment variable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listR2Buckets();
      setBuckets(data);
      if (selectedIndex >= data.length) {
        setSelectedIndex(Math.max(0, data.length - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load R2 buckets");
    } finally {
      setLoading(false);
    }
  }, [selectedIndex]);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  useKeyboard((key) => {
    if (view === "details") {
      if (key.name === "escape" || key.name === "backspace") {
        setView("list");
        setSelectedBucket(null);
      }
      return;
    }

    const maxIndex = buckets.length - 1;

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
        if (buckets[selectedIndex]) {
          setSelectedBucket(buckets[selectedIndex]);
          setView("details");
        }
        break;
      case "r":
        loadBuckets();
        break;
    }
  });

  if (loading && buckets.length === 0) {
    return (
      <box flexDirection="column" flexGrow={1} padding={2}>
        <box flexDirection="row" gap={1}>
          <text fg={colors.primary}>⟳</text>
          <text fg={colors.textMuted}>Loading R2 buckets...</text>
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

  if (view === "details" && selectedBucket) {
    return (
      <box flexDirection="column" flexGrow={1} padding={1}>
        <box flexDirection="row" gap={1} marginBottom={1}>
          <text fg={colors.primary}>‹ Back (Esc)</text>
          <text>|</text>
          <text><strong>{selectedBucket.name}</strong></text>
        </box>

        <box flexDirection="column" borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Bucket Name:</text>
            <text>{selectedBucket.name}</text>
          </box>
          
          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Location:</text>
            <text>{selectedBucket.location || "Auto"}</text>
          </box>

          <box flexDirection="row" gap={2} marginBottom={1}>
            <text fg={colors.textMuted} width={20}>Created:</text>
            <text>{new Date(selectedBucket.creation_date).toLocaleString()}</text>
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
            <strong fg={colors.primary}>R2 Storage</strong>
          </text>
          <text>
            <span fg={colors.textMuted}>Object storage for the edge</span>
          </text>
        </box>
        <text fg={colors.textMuted}>
          {buckets.length} buckets • Press 'r' to refresh
        </text>
      </box>

      {buckets.length === 0 ? (
        <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No R2 buckets found</span>
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
            <text width="30%"><strong>Created</strong></text>
            <text width="30%"><strong>Location</strong></text>
          </box>
          <scrollbox flexDirection="column" flexGrow={1}>
            {buckets.map((bucket, index) => {
              const isSelected = index === selectedIndex;
              return (
                <box
                  key={bucket.name}
                  flexDirection="row"
                  padding={1}
                  backgroundColor={isSelected ? colors.surfaceAlt : undefined}
                >
                  <text width="40%" fg={isSelected ? colors.primary : colors.text}>
                    {isSelected ? "> " : "  "}{bucket.name}
                  </text>
                  <text width="30%" fg={isSelected ? colors.text : colors.textMuted}>
                    {new Date(bucket.creation_date).toLocaleDateString()}
                  </text>
                  <text width="30%" fg={isSelected ? colors.text : colors.textMuted}>
                    {bucket.location || "Auto"}
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
