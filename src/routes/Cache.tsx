import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import {
  listZones,
  purgeCache,
  getCacheSettings,
  updateCacheSetting,
  listCacheRules,
  type Zone,
  type CacheSettings,
  type CacheRule,
} from "../lib/cloudflare.ts";

type Tab = "purge" | "settings" | "rules";
type PurgeMode = "everything" | "urls" | "tags" | "hosts" | "prefixes";

export function Cache() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [tab, setTab] = useState<Tab>("purge");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [cacheSettings, setCacheSettings] = useState<CacheSettings | null>(null);
  const [cacheRules, setCacheRules] = useState<CacheRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoneSelectIndex, setZoneSelectIndex] = useState(0);
  const [zoneSelectMode, setZoneSelectMode] = useState(true);
  const [purgeMode, setPurgeMode] = useState<PurgeMode>("everything");
  const [purgeInput, setPurgeInput] = useState("");
  const [inputMode, setInputMode] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [ruleIndex, setRuleIndex] = useState(0);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listZones();
      setZones(data);
      if (data.length > 0 && data[0]) {
        setSelectedZone(data[0]);
        setZoneSelectMode(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCacheSettings = useCallback(async () => {
    if (!selectedZone) return;
    try {
      const settings = await getCacheSettings(selectedZone.id);
      setCacheSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cache settings");
    }
  }, [selectedZone]);

  const loadCacheRules = useCallback(async () => {
    if (!selectedZone) return;
    try {
      const rules = await listCacheRules(selectedZone.id);
      setCacheRules(rules);
    } catch (err) {
      setCacheRules([]);
    }
  }, [selectedZone]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  useEffect(() => {
    if (selectedZone) {
      loadCacheSettings();
      loadCacheRules();
    }
  }, [selectedZone, loadCacheSettings, loadCacheRules]);

  const handlePurge = async () => {
    if (!selectedZone) return;
    setLoading(true);
    try {
      let params = {};
      switch (purgeMode) {
        case "everything":
          params = { purge_everything: true };
          break;
        case "urls":
          params = { files: purgeInput.split("\n").filter((u) => u.trim()) };
          break;
        case "tags":
          params = { tags: purgeInput.split(",").map((t) => t.trim()).filter(Boolean) };
          break;
        case "hosts":
          params = { hosts: purgeInput.split(",").map((h) => h.trim()).filter(Boolean) };
          break;
        case "prefixes":
          params = { prefixes: purgeInput.split("\n").filter((p) => p.trim()) };
          break;
      }
      await purgeCache(selectedZone.id, params);
      setActionMessage(`Cache purged successfully for ${selectedZone.name}`);
      setConfirmPurge(false);
      setPurgeInput("");
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purge cache");
    } finally {
      setLoading(false);
    }
  };

  const toggleDevelopmentMode = async () => {
    if (!selectedZone || !cacheSettings) return;
    const newValue = cacheSettings.development_mode?.value === "on" ? "off" : "on";
    try {
      await updateCacheSetting(selectedZone.id, "development_mode", newValue);
      setActionMessage(`Development mode ${newValue === "on" ? "enabled" : "disabled"}`);
      loadCacheSettings();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setting");
    }
  };

  useKeyboard((key) => {
    if (inputMode) {
      if (key.name === "escape") {
        setInputMode(false);
      } else if (key.name === "backspace") {
        setPurgeInput((prev) => prev.slice(0, -1));
      } else if (key.name === "return") {
        if (purgeMode === "urls" || purgeMode === "prefixes") {
          setPurgeInput((prev) => prev + "\n");
        } else {
          setInputMode(false);
        }
      } else if (key.sequence && key.sequence.length === 1) {
        setPurgeInput((prev) => prev + key.sequence);
      }
      return;
    }

    if (confirmPurge) {
      if (key.name === "y") {
        handlePurge();
      } else if (key.name === "n" || key.name === "escape") {
        setConfirmPurge(false);
      }
      return;
    }

    if (zoneSelectMode) {
      if (key.name === "up" || key.name === "k") {
        setZoneSelectIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "down" || key.name === "j") {
        setZoneSelectIndex((prev) => Math.min(zones.length - 1, prev + 1));
      } else if (key.name === "return" && zones[zoneSelectIndex]) {
        setSelectedZone(zones[zoneSelectIndex]);
        setZoneSelectMode(false);
      }
      return;
    }

    if (key.name === "z") {
      setZoneSelectMode(true);
      return;
    }

    if (key.name === "tab" || key.name === "right") {
      const tabs: Tab[] = ["purge", "settings", "rules"];
      const currentIndex = tabs.indexOf(tab);
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      if (nextTab) setTab(nextTab);
    } else if (key.name === "left") {
      const tabs: Tab[] = ["purge", "settings", "rules"];
      const currentIndex = tabs.indexOf(tab);
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      if (prevTab) setTab(prevTab);
    }

    if (tab === "purge") {
      if (key.name === "1") setPurgeMode("everything");
      else if (key.name === "2") setPurgeMode("urls");
      else if (key.name === "3") setPurgeMode("tags");
      else if (key.name === "4") setPurgeMode("hosts");
      else if (key.name === "5") setPurgeMode("prefixes");
      else if (key.name === "i" && purgeMode !== "everything") {
        setInputMode(true);
      } else if (key.name === "p") {
        setConfirmPurge(true);
      }
    } else if (tab === "settings") {
      if (key.name === "d") {
        toggleDevelopmentMode();
      } else if (key.name === "r") {
        loadCacheSettings();
      }
    } else if (tab === "rules") {
      if (key.name === "up" || key.name === "k") {
        setRuleIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "down" || key.name === "j") {
        setRuleIndex((prev) => Math.min(cacheRules.length - 1, prev + 1));
      } else if (key.name === "r") {
        loadCacheRules();
      }
    }
  });

  const renderTabs = () => (
    <box flexDirection="row" gap={2} marginBottom={1}>
      {(["purge", "settings", "rules"] as Tab[]).map((t) => (
        <box
          key={t}
          paddingLeft={2}
          paddingRight={2}
          borderStyle={tab === t ? "single" : undefined}
          borderColor={tab === t ? colors.primary : undefined}
          backgroundColor={tab === t ? colors.surfaceAlt : undefined}
        >
          <text>
            <span fg={tab === t ? colors.primary : colors.textMuted}>
              {t === "purge" ? "Purge Cache" : t === "settings" ? "Settings" : "Cache Rules"}
            </span>
          </text>
        </box>
      ))}
    </box>
  );

  const renderZoneSelector = () => (
    <box flexDirection="column" gap={1}>
      <text>
        <span fg={colors.primary}>Select Zone</span>
      </text>
      {loading ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.info}>Loading zones...</span>
          </text>
        </box>
      ) : zones.length === 0 ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No zones found</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column">
          {zones.map((zone, index) => (
            <box
              key={zone.id}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={index === zoneSelectIndex ? colors.surfaceAlt : undefined}
            >
              <text>
                <span fg={index === zoneSelectIndex ? colors.primary : colors.text}>{zone.name}</span>
                <span fg={colors.textMuted}> ({zone.status})</span>
              </text>
            </box>
          ))}
        </box>
      )}
      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>↑/↓ Navigate • Enter Select</span>
        </text>
      </box>
    </box>
  );

  const renderPurge = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Purge Cache for {selectedZone?.name}</span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Remove cached content to serve fresh versions from your origin.
            </span>
          </text>
        </box>
      </box>

      <box flexDirection="column" gap={1}>
        <text>
          <span fg={colors.text}>Purge Method:</span>
        </text>
        <box flexDirection="column">
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={purgeMode === "everything" ? colors.surfaceAlt : undefined}
          >
            <text>
              <span fg={purgeMode === "everything" ? colors.primary : colors.text}>[1] Purge Everything</span>
              <span fg={colors.textMuted}> - Clear all cached content</span>
            </text>
          </box>
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={purgeMode === "urls" ? colors.surfaceAlt : undefined}
          >
            <text>
              <span fg={purgeMode === "urls" ? colors.primary : colors.text}>[2] Purge by URL</span>
              <span fg={colors.textMuted}> - Specific URLs</span>
            </text>
          </box>
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={purgeMode === "tags" ? colors.surfaceAlt : undefined}
          >
            <text>
              <span fg={purgeMode === "tags" ? colors.primary : colors.text}>[3] Purge by Tag</span>
              <span fg={colors.textMuted}> - Cache tags</span>
            </text>
          </box>
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={purgeMode === "hosts" ? colors.surfaceAlt : undefined}
          >
            <text>
              <span fg={purgeMode === "hosts" ? colors.primary : colors.text}>[4] Purge by Host</span>
              <span fg={colors.textMuted}> - Hostnames</span>
            </text>
          </box>
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={purgeMode === "prefixes" ? colors.surfaceAlt : undefined}
          >
            <text>
              <span fg={purgeMode === "prefixes" ? colors.primary : colors.text}>[5] Purge by Prefix</span>
              <span fg={colors.textMuted}> - URL prefixes</span>
            </text>
          </box>
        </box>
      </box>

      {purgeMode !== "everything" && (
        <box borderStyle="single" borderColor={inputMode ? colors.primary : colors.border} padding={1}>
          <box flexDirection="column" gap={1}>
            <text>
              <span fg={colors.text}>
                {purgeMode === "urls" && "Enter URLs (one per line):"}
                {purgeMode === "tags" && "Enter cache tags (comma-separated):"}
                {purgeMode === "hosts" && "Enter hostnames (comma-separated):"}
                {purgeMode === "prefixes" && "Enter URL prefixes (one per line):"}
              </span>
            </text>
            <text>
              <span fg={colors.info}>{purgeInput || (inputMode ? "_" : "Press 'i' to enter values")}</span>
            </text>
          </box>
        </box>
      )}

      <box marginTop={1} flexDirection="row" gap={2}>
        <box
          borderStyle="single"
          borderColor={colors.error}
          paddingLeft={2}
          paddingRight={2}
        >
          <text>
            <span fg={colors.error}>[p] Execute Purge</span>
          </text>
        </box>
      </box>

      {confirmPurge && (
        <box backgroundColor={colors.warning} padding={1}>
          <text>
            <span fg={colors.textInverse}>
              {purgeMode === "everything"
                ? "Purge ALL cached content? This may increase origin load. [y]es / [n]o"
                : "Execute cache purge? [y]es / [n]o"}
            </span>
          </text>
        </box>
      )}

      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>z Change zone • 1-5 Select method • i Enter input • p Purge</span>
        </text>
      </box>
    </box>
  );

  const renderSettings = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Cache Settings for {selectedZone?.name}</span>
          </text>
        </box>
      </box>

      <box flexDirection="row" gap={2} flexWrap="wrap">
        <box
          borderStyle="single"
          borderColor={cacheSettings?.development_mode?.value === "on" ? colors.warning : colors.border}
          padding={1}
          width={30}
        >
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Development Mode</span>
            </text>
            <text>
              <span fg={cacheSettings?.development_mode?.value === "on" ? colors.warning : colors.success}>
                {cacheSettings?.development_mode?.value === "on" ? "Enabled" : "Disabled"}
              </span>
            </text>
            <text>
              <span fg={colors.textMuted}>[d] Toggle</span>
            </text>
          </box>
        </box>

        <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Browser Cache TTL</span>
            </text>
            <text>
              <span fg={colors.info}>
                {cacheSettings?.browser_cache_ttl?.value
                  ? `${cacheSettings.browser_cache_ttl.value} seconds`
                  : "Respect headers"}
              </span>
            </text>
          </box>
        </box>

        <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Cache Level</span>
            </text>
            <text>
              <span fg={colors.info}>{cacheSettings?.cache_level?.value || "Standard"}</span>
            </text>
          </box>
        </box>

        <box
          borderStyle="single"
          borderColor={cacheSettings?.always_online?.value === "on" ? colors.success : colors.border}
          padding={1}
          width={30}
        >
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>Always Online</span>
            </text>
            <text>
              <span fg={cacheSettings?.always_online?.value === "on" ? colors.success : colors.textMuted}>
                {cacheSettings?.always_online?.value === "on" ? "Enabled" : "Disabled"}
              </span>
            </text>
          </box>
        </box>
      </box>

      <box borderStyle="single" borderColor={colors.info} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Tiered Cache</span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Tiered Cache uses Cloudflare's Smart Topology to reduce requests to your origin by serving cached content from the nearest data center.
            </span>
          </text>
          <text>
            <span fg={colors.success}>✓ Enabled for all Pro, Business, and Enterprise plans</span>
          </text>
        </box>
      </box>

      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>z Change zone • d Toggle dev mode • r Refresh</span>
        </text>
      </box>
    </box>
  );

  const renderRules = () => (
    <box flexDirection="column" gap={1}>
      <box borderStyle="single" borderColor={colors.border} padding={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.primary}>Cache Rules for {selectedZone?.name}</span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              Configure custom caching behavior with fine-grained rules.
            </span>
          </text>
        </box>
      </box>

      {cacheRules.length === 0 ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>
              No cache rules configured. Create rules in the Cloudflare Dashboard.
            </span>
          </text>
        </box>
      ) : (
        <box flexDirection="column">
          <box flexDirection="row" paddingLeft={1} paddingRight={1} paddingBottom={1}>
            <box width={30}>
              <text>
                <span fg={colors.textMuted}>Expression</span>
              </text>
            </box>
            <box width={20}>
              <text>
                <span fg={colors.textMuted}>Action</span>
              </text>
            </box>
            <box width={10}>
              <text>
                <span fg={colors.textMuted}>Status</span>
              </text>
            </box>
          </box>
          {cacheRules.map((rule, index) => (
            <box
              key={rule.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={index === ruleIndex ? colors.surfaceAlt : undefined}
            >
              <box width={30}>
                <text>
                  <span fg={index === ruleIndex ? colors.primary : colors.text}>
                    {rule.expression.length > 26 ? rule.expression.slice(0, 24) + "..." : rule.expression}
                  </span>
                </text>
              </box>
              <box width={20}>
                <text>
                  <span fg={colors.info}>{rule.action}</span>
                </text>
              </box>
              <box width={10}>
                <text>
                  <span fg={rule.enabled ? colors.success : colors.warning}>
                    {rule.enabled ? "Active" : "Disabled"}
                  </span>
                </text>
              </box>
            </box>
          ))}
        </box>
      )}

      <box borderStyle="single" borderColor={colors.border} padding={1} marginTop={1}>
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Common Cache Rule Patterns</span>
          </text>
          <box flexDirection="column">
            <text>
              <span fg={colors.info}>(http.request.uri.path contains "/api/")</span>
              <span fg={colors.textMuted}> → Bypass cache</span>
            </text>
            <text>
              <span fg={colors.info}>(http.request.uri.path.extension in {"{"}"css" "js" "jpg"{"}"} )</span>
              <span fg={colors.textMuted}> → Cache 1 month</span>
            </text>
            <text>
              <span fg={colors.info}>(http.host eq "static.example.com")</span>
              <span fg={colors.textMuted}> → Aggressive caching</span>
            </text>
          </box>
        </box>
      </box>

      <box marginTop={1}>
        <text>
          <span fg={colors.textMuted}>z Change zone • ↑/↓ Navigate rules • r Refresh</span>
        </text>
      </box>
    </box>
  );

  return (
    <box flexDirection="column" gap={1}>
      <text>
        <span fg={colors.primary}>Cache</span>
      </text>
      <text>
        <span fg={colors.textMuted}>Cache configuration and purge</span>
      </text>

      {actionMessage && (
        <box backgroundColor={colors.success} padding={1}>
          <text>
            <span fg={colors.textInverse}>{actionMessage}</span>
          </text>
        </box>
      )}

      {error && (
        <box backgroundColor={colors.error} padding={1}>
          <text>
            <span fg={colors.textInverse}>{error}</span>
          </text>
        </box>
      )}

      {zoneSelectMode ? (
        renderZoneSelector()
      ) : !selectedZone ? (
        <box borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No zone selected. Press 'z' to select a zone.</span>
          </text>
        </box>
      ) : (
        <>
          <box
            borderStyle="single"
            borderColor={colors.primary}
            paddingLeft={1}
            paddingRight={1}
            marginBottom={1}
          >
            <text>
              <span fg={colors.textMuted}>Zone: </span>
              <span fg={colors.primary}>{selectedZone.name}</span>
              <span fg={colors.textMuted}> [z to change]</span>
            </text>
          </box>
          {renderTabs()}
          {tab === "purge" && renderPurge()}
          {tab === "settings" && renderSettings()}
          {tab === "rules" && renderRules()}
        </>
      )}
    </box>
  );
}
