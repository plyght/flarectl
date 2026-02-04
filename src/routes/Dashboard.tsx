import { useState, useEffect } from "react";
import { useTheme } from "../lib/theme-context.tsx";
import {
  listZones,
  listWorkers,
  listR2Buckets,
  listKVNamespaces,
  listD1Databases,
  listPagesProjects,
} from "../lib/cloudflare.ts";
import { isAuthenticated } from "../lib/auth.ts";

interface DashboardStats {
  zones: number;
  workers: number;
  r2Buckets: number;
  kvNamespaces: number;
  d1Databases: number;
  pagesProjects: number;
}

export function Dashboard() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!isAuthenticated()) {
        setError("Not authenticated. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [zones, workers, r2Buckets, kvNamespaces, d1Databases, pagesProjects] = await Promise.allSettled([
          listZones(),
          listWorkers().catch(() => []),
          listR2Buckets().catch(() => []),
          listKVNamespaces().catch(() => []),
          listD1Databases().catch(() => []),
          listPagesProjects().catch(() => []),
        ]);

        setStats({
          zones: zones.status === "fulfilled" ? zones.value.length : 0,
          workers: workers.status === "fulfilled" ? workers.value.length : 0,
          r2Buckets: r2Buckets.status === "fulfilled" ? r2Buckets.value.length : 0,
          kvNamespaces: kvNamespaces.status === "fulfilled" ? kvNamespaces.value.length : 0,
          d1Databases: d1Databases.status === "fulfilled" ? d1Databases.value.length : 0,
          pagesProjects: pagesProjects.status === "fulfilled" ? pagesProjects.value.length : 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const StatCard = ({ label, value, icon }: { label: string; value: number | string; icon: string }) => (
    <box borderStyle="single" borderColor={colors.border} padding={1} width={20}>
      <box flexDirection="column">
        <text>
          <span fg={colors.textMuted}>{icon} {label}</span>
        </text>
        <text>
          <span fg={colors.primary}>{value}</span>
        </text>
      </box>
    </box>
  );

  return (
    <box flexDirection="column" gap={1}>
      <text>
        <strong fg={colors.primary}>Dashboard</strong>
      </text>
      <text>
        <span fg={colors.textMuted}>
          Welcome to flarectl - Cloudflare TUI Client
        </span>
      </text>

      {error && (
        <box marginTop={1} padding={1} borderStyle="single" borderColor={colors.error}>
          <text fg={colors.error}>⚠ {error}</text>
        </box>
      )}

      {loading ? (
        <box marginTop={1}>
          <text fg={colors.textMuted}>⟳ Loading stats...</text>
        </box>
      ) : stats && (
        <>
          <box marginTop={1} flexDirection="column" gap={1}>
            <text>
              <span fg={colors.text}>Quick Stats:</span>
            </text>
            <box flexDirection="row" gap={2}>
              <StatCard label="Zones" value={stats.zones} icon="🌐" />
              <StatCard label="Workers" value={stats.workers} icon="⚡" />
              <StatCard label="R2 Buckets" value={stats.r2Buckets} icon="📦" />
            </box>
            <box flexDirection="row" gap={2}>
              <StatCard label="KV" value={stats.kvNamespaces} icon="🔑" />
              <StatCard label="D1" value={stats.d1Databases} icon="🗃" />
              <StatCard label="Pages" value={stats.pagesProjects} icon="📄" />
            </box>
          </box>

          <box marginTop={2} flexDirection="column" gap={1}>
            <text>
              <span fg={colors.text}>Quick Actions:</span>
            </text>
            <box flexDirection="column" gap={1} padding={1} borderStyle="single" borderColor={colors.border}>
              <text>
                <span fg={colors.primary}>DNS</span>
                <span fg={colors.textMuted}> - Manage DNS zones and records</span>
              </text>
              <text>
                <span fg={colors.primary}>Workers</span>
                <span fg={colors.textMuted}> - Deploy serverless functions</span>
              </text>
              <text>
                <span fg={colors.primary}>R2</span>
                <span fg={colors.textMuted}> - Object storage management</span>
              </text>
              <text>
                <span fg={colors.primary}>KV</span>
                <span fg={colors.textMuted}> - Key-value storage</span>
              </text>
            </box>
          </box>
        </>
      )}

      <box marginTop={2}>
        <text>
          <span fg={colors.textMuted}>
            Use ↑/↓ or j/k to navigate • Enter to select • q to quit
          </span>
        </text>
      </box>
    </box>
  );
}
