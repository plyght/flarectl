import { useState, useEffect, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../lib/theme-context.tsx"
import type { WAFManagedRuleset, WAFRuleset } from "../types/security"
import { listManagedWAFRulesets, listWAFRulesets, toggleWAFRuleset, getWAFRuleset } from "../lib/security"
import { listZones, type Zone } from "../lib/cloudflare"

type ViewMode = "zones" | "list" | "details"

const RULESET_CATEGORIES: Record<string, { icon: string; color: string }> = {
  "cloudflare managed": { icon: "☁", color: "#F38020" },
  "owasp": { icon: "⚔", color: "#EAB308" },
  "specials": { icon: "★", color: "#A855F7" },
  "leaked credentials": { icon: "🔐", color: "#EF4444" },
  "exposed credentials": { icon: "🔑", color: "#EF4444" },
  default: { icon: "◉", color: "#3B82F6" },
}

export function WAF() {
  const { theme } = useTheme()
  const { colors } = theme

  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [rulesets, setRulesets] = useState<WAFManagedRuleset[]>([])
  const [detailedRuleset, setDetailedRuleset] = useState<WAFRuleset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mode, setMode] = useState<ViewMode>("zones")
  const [toggling, setToggling] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const loadZones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await listZones()
      setZones(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRulesets = useCallback(async () => {
    if (!selectedZone) return
    try {
      setLoading(true)
      setError(null)
      const managed = await listManagedWAFRulesets(selectedZone.id)
      const all = await listWAFRulesets(selectedZone.id)
      const combined = managed.map((m: WAFManagedRuleset) => {
        const full = all.find((a: WAFRuleset) => a.id === m.id)
        return {
          ...m,
          rules_count: full?.rules?.length || m.rules_count,
        }
      })
      setRulesets(combined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rulesets")
    } finally {
      setLoading(false)
    }
  }, [selectedZone])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  useEffect(() => {
    if (selectedZone) {
      loadRulesets()
    }
  }, [selectedZone, loadRulesets])

  const handleToggle = async (ruleset: WAFManagedRuleset) => {
    if (!selectedZone) return
    try {
      setToggling(ruleset.id)
      setStatusMessage(`${ruleset.enabled ? "Disabling" : "Enabling"} ${ruleset.name}...`)
      await toggleWAFRuleset(selectedZone.id, ruleset.id, !ruleset.enabled)
      setRulesets((prev) =>
        prev.map((r) => (r.id === ruleset.id ? { ...r, enabled: !r.enabled } : r))
      )
      setStatusMessage(`${ruleset.name} ${ruleset.enabled ? "disabled" : "enabled"}`)
      setTimeout(() => setStatusMessage(null), 2000)
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Failed to toggle"}`)
    } finally {
      setToggling(null)
    }
  }

  const viewDetails = async (ruleset: WAFManagedRuleset) => {
    if (!selectedZone) return
    try {
      setLoading(true)
      const details = await getWAFRuleset(selectedZone.id, ruleset.id)
      setDetailedRuleset(details)
      setMode("details")
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Failed to load details"}`)
    } finally {
      setLoading(false)
    }
  }

  useKeyboard((key) => {
    if (mode === "zones") {
      if (key.name === "up" || key.name === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1))
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((i) => Math.min(zones.length - 1, i + 1))
      } else if (key.name === "return") {
        const zone = zones[selectedIndex]
        if (zone) {
          setSelectedZone(zone)
          setMode("list")
          setSelectedIndex(0)
        }
      } else if (key.name === "l") {
        loadZones()
      }
    } else if (mode === "list") {
      if (key.name === "up" || key.name === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1))
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((i) => Math.min(rulesets.length - 1, i + 1))
      } else if (key.name === "space" || key.name === "t") {
        const ruleset = rulesets[selectedIndex]
        if (ruleset) handleToggle(ruleset)
      } else if (key.name === "return" || key.name === "v") {
        const ruleset = rulesets[selectedIndex]
        if (ruleset) viewDetails(ruleset)
      } else if (key.name === "l") {
        loadRulesets()
      } else if (key.name === "escape" || key.name === "backspace") {
        setMode("zones")
        setSelectedZone(null)
        setSelectedIndex(0)
      }
    } else if (mode === "details") {
      if (key.name === "escape" || key.name === "q" || key.name === "backspace") {
        setMode("list")
        setDetailedRuleset(null)
      }
    }
  })

  const getCategoryStyle = (name: string) => {
    const lowerName = name.toLowerCase()
    for (const [key, style] of Object.entries(RULESET_CATEGORIES)) {
      if (lowerName.includes(key)) {
        return style
      }
    }
    return RULESET_CATEGORIES.default
  }

  if (mode === "details" && detailedRuleset) {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>{detailedRuleset.name}</strong>
        </text>
        <text>
          <span fg={colors.textMuted}>{detailedRuleset.description}</span>
        </text>

        <box marginTop={1} flexDirection="row" gap={3}>
          <box flexDirection="column">
            <text>
              <span fg={colors.textMuted}>Version:</span>
            </text>
            <text>
              <span fg={colors.text}>{detailedRuleset.version}</span>
            </text>
          </box>
          <box flexDirection="column">
            <text>
              <span fg={colors.textMuted}>Phase:</span>
            </text>
            <text>
              <span fg={colors.text}>{detailedRuleset.phase}</span>
            </text>
          </box>
          <box flexDirection="column">
            <text>
              <span fg={colors.textMuted}>Rules:</span>
            </text>
            <text>
              <span fg={colors.primary}>{detailedRuleset.rules?.length || 0}</span>
            </text>
          </box>
        </box>

        <box marginTop={1} borderStyle="single" borderColor={colors.border}>
          <box flexDirection="column" padding={1}>
            <text>
              <span fg={colors.text}>Rule Details:</span>
            </text>
            <box marginTop={1} flexDirection="column" gap={1}>
              {detailedRuleset.rules?.slice(0, 12).map((rule) => (
                <box key={rule.id} flexDirection="column">
                  <text>
                    <span fg={rule.enabled ? colors.success : colors.error}>
                      {rule.enabled ? "●" : "○"}
                    </span>
                    <span fg={colors.text}> {rule.description || rule.id}</span>
                  </text>
                  <text>
                    <span fg={colors.textMuted}>
                      {"  "}Action: {rule.action}
                    </span>
                  </text>
                </box>
              ))}
              {(detailedRuleset.rules?.length || 0) > 12 && (
                <text>
                  <span fg={colors.textMuted}>
                    ... and {(detailedRuleset.rules?.length || 0) - 12} more rules
                  </span>
                </text>
              )}
            </box>
          </box>
        </box>

        <box marginTop={1}>
          <text>
            <span fg={colors.textMuted}>ESC: Back to list</span>
          </text>
        </box>
      </box>
    )
  }

  if (mode === "zones") {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>Web Application Firewall</strong>
          <span fg={colors.textMuted}> - Select a zone</span>
        </text>

        {error && (
          <box borderStyle="single" borderColor={colors.error} padding={1}>
            <text>
              <span fg={colors.error}>{error}</span>
            </text>
          </box>
        )}

        {loading ? (
          <text>
            <span fg={colors.textMuted}>Loading zones...</span>
          </text>
        ) : zones.length === 0 ? (
          <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
            <text>
              <span fg={colors.textMuted}>No zones found.</span>
            </text>
          </box>
        ) : (
          <box marginTop={1} flexDirection="column">
            {zones.map((zone, i) => (
              <box
                key={zone.id}
                padding={1}
                backgroundColor={i === selectedIndex ? colors.surfaceAlt : undefined}
                flexDirection="row"
                gap={2}
              >
                <text>
                  <span fg={i === selectedIndex ? colors.primary : colors.text}>{zone.name}</span>
                </text>
                <text>
                  <span fg={zone.status === "active" ? colors.success : colors.warning}>
                    {zone.status}
                  </span>
                </text>
              </box>
            ))}
          </box>
        )}

        <box marginTop={2}>
          <text>
            <span fg={colors.textMuted}>Enter: Select zone | L: Refresh</span>
          </text>
        </box>
      </box>
    )
  }

  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <strong fg={colors.primary}>WAF Managed Rulesets</strong>
          <span fg={colors.textMuted}> - {selectedZone?.name}</span>
        </text>
        <text>
          <span fg={colors.textMuted}>{rulesets.length} rulesets</span>
        </text>
      </box>

      {error && (
        <box borderStyle="single" borderColor={colors.error} padding={1}>
          <text>
            <span fg={colors.error}>{error}</span>
          </text>
        </box>
      )}

      {statusMessage && (
        <text>
          <span fg={statusMessage.startsWith("Error") ? colors.error : colors.success}>
            {statusMessage}
          </span>
        </text>
      )}

      {loading ? (
        <text>
          <span fg={colors.textMuted}>Loading rulesets...</span>
        </text>
      ) : rulesets.length === 0 ? (
        <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No WAF rulesets available.</span>
          </text>
        </box>
      ) : (
        <box marginTop={1} flexDirection="column">
          {rulesets.map((ruleset, i) => {
            const style = getCategoryStyle(ruleset.name)
            const isSelected = i === selectedIndex
            const isToggling = toggling === ruleset.id

            return (
              <box
                key={ruleset.id}
                padding={1}
                backgroundColor={isSelected ? colors.surfaceAlt : undefined}
                flexDirection="row"
                gap={2}
              >
                <box width={3}>
                  <text>
                    <span fg={ruleset.enabled ? colors.success : colors.textMuted}>
                      {isToggling ? "◐" : ruleset.enabled ? "◉" : "○"}
                    </span>
                  </text>
                </box>
                <box width={3}>
                  <text>
                    <span fg={style?.color || colors.info}>{style?.icon || "◉"}</span>
                  </text>
                </box>
                <box flexGrow={1} flexDirection="column">
                  <text>
                    <span fg={isSelected ? colors.primary : colors.text}>
                      {ruleset.name}
                    </span>
                  </text>
                  <text>
                    <span fg={colors.textMuted}>
                      {ruleset.description?.slice(0, 60)}
                      {(ruleset.description?.length || 0) > 60 ? "..." : ""}
                    </span>
                  </text>
                </box>
                <box width={12}>
                  <text>
                    <span fg={colors.textMuted}>Rules: {ruleset.rules_count}</span>
                  </text>
                </box>
                <box width={10}>
                  <text>
                    <span fg={ruleset.enabled ? colors.success : colors.error}>
                      {ruleset.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </text>
                </box>
              </box>
            )
          })}
        </box>
      )}

      <box marginTop={2} flexDirection="row" gap={2}>
        <text>
          <span fg={colors.textMuted}>Space/T: Toggle</span>
        </text>
        <text>
          <span fg={colors.textMuted}>Enter/V: View details</span>
        </text>
        <text>
          <span fg={colors.textMuted}>L: Refresh</span>
        </text>
        <text>
          <span fg={colors.textMuted}>ESC: Back</span>
        </text>
      </box>
    </box>
  )
}
