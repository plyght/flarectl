import { useState, useEffect, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../lib/theme-context.tsx"
import type {
  FirewallRule,
  FirewallAction,
  FirewallRuleFormData,
  ExpressionValidationResult,
} from "../types/security"
import {
  validateFirewallExpression,
  getExpressionSuggestions,
  EXPRESSION_FIELDS,
  EXPRESSION_OPERATORS,
} from "../types/security"
import {
  listFirewallRules,
  createFirewallRule,
  updateFirewallRule,
  deleteFirewallRule,
  reorderFirewallRules,
} from "../lib/security"
import { listZones, type Zone } from "../lib/cloudflare"

type ViewMode = "zones" | "list" | "create" | "edit" | "delete" | "reorder" | "help"

const ACTION_COLORS: Record<FirewallAction, string> = {
  block: "#EF4444",
  challenge: "#EAB308",
  js_challenge: "#EAB308",
  managed_challenge: "#EAB308",
  allow: "#22C55E",
  log: "#3B82F6",
  bypass: "#A855F7",
  skip: "#6B7280",
}

const ACTION_ICONS: Record<FirewallAction, string> = {
  block: "✕",
  challenge: "?",
  js_challenge: "⚡",
  managed_challenge: "⚔",
  allow: "✓",
  log: "📋",
  bypass: "↷",
  skip: "→",
}

export function Firewall() {
  const { theme } = useTheme()
  const { colors } = theme

  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [rules, setRules] = useState<FirewallRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mode, setMode] = useState<ViewMode>("zones")

  const [formData, setFormData] = useState<FirewallRuleFormData>({
    description: "",
    action: "block",
    expression: "",
    paused: false,
  })
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [validation, setValidation] = useState<ExpressionValidationResult | null>(null)
  const [suggestions, setSuggestions] = useState<
    Array<{ text: string; description: string; type: "field" | "operator" | "value" }>
  >([])
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeField, setActiveField] = useState<"description" | "expression" | "action">("description")
  const [formStatus, setFormStatus] = useState<string | null>(null)

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

  const loadRules = useCallback(async () => {
    if (!selectedZone) return
    try {
      setLoading(true)
      setError(null)
      const result = await listFirewallRules(selectedZone.id)
      setRules(result.rules.sort((a, b) => (a.priority || 0) - (b.priority || 0)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules")
    } finally {
      setLoading(false)
    }
  }, [selectedZone])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  useEffect(() => {
    if (selectedZone) {
      loadRules()
    }
  }, [selectedZone, loadRules])

  useEffect(() => {
    if (formData.expression) {
      const result = validateFirewallExpression(formData.expression)
      setValidation(result)
    } else {
      setValidation(null)
    }
  }, [formData.expression])

  const handleCreateRule = async () => {
    if (!selectedZone || !validation?.valid) {
      setFormStatus("Fix expression errors before saving")
      return
    }
    try {
      setFormStatus("Creating rule...")
      await createFirewallRule(selectedZone.id, formData)
      setFormStatus("Rule created!")
      await loadRules()
      setMode("list")
      resetForm()
    } catch (err) {
      setFormStatus(`Error: ${err instanceof Error ? err.message : "Failed to create"}`)
    }
  }

  const handleUpdateRule = async () => {
    if (!selectedZone || !editingRuleId || !validation?.valid) {
      setFormStatus("Fix expression errors before saving")
      return
    }
    try {
      setFormStatus("Updating rule...")
      await updateFirewallRule(selectedZone.id, editingRuleId, formData)
      setFormStatus("Rule updated!")
      await loadRules()
      setMode("list")
      resetForm()
    } catch (err) {
      setFormStatus(`Error: ${err instanceof Error ? err.message : "Failed to update"}`)
    }
  }

  const handleDeleteRule = async () => {
    const rule = rules[selectedIndex]
    if (!selectedZone || !rule) return
    try {
      setFormStatus("Deleting rule...")
      await deleteFirewallRule(selectedZone.id, rule.id)
      await loadRules()
      setMode("list")
      setFormStatus(null)
      if (selectedIndex >= rules.length - 1) {
        setSelectedIndex(Math.max(0, rules.length - 2))
      }
    } catch (err) {
      setFormStatus(`Error: ${err instanceof Error ? err.message : "Failed to delete"}`)
    }
  }

  const handleReorder = async (direction: "up" | "down") => {
    if (!selectedZone) return
    const newIndex = direction === "up" ? selectedIndex - 1 : selectedIndex + 1
    if (newIndex < 0 || newIndex >= rules.length) return

    const newRules = [...rules]
    const currentRule = newRules[selectedIndex]
    const swapRule = newRules[newIndex]
    if (!currentRule || !swapRule) return
    newRules[selectedIndex] = swapRule
    newRules[newIndex] = currentRule

    const reorderedRules = newRules.map((r, i) => ({ id: r.id, priority: i + 1 }))

    try {
      await reorderFirewallRules(selectedZone.id, reorderedRules)
      setRules(newRules)
      setSelectedIndex(newIndex)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder")
    }
  }

  const resetForm = () => {
    setFormData({ description: "", action: "block", expression: "", paused: false })
    setEditingRuleId(null)
    setValidation(null)
    setFormStatus(null)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveField("description")
  }

  const startEdit = (rule: FirewallRule) => {
    setFormData({
      description: rule.description,
      action: rule.action,
      expression: rule.filter.expression,
      paused: rule.paused,
    })
    setEditingRuleId(rule.id)
    setMode("edit")
  }

  const applySuggestion = () => {
    if (suggestions.length === 0) return
    const suggestion = suggestions[suggestionIndex]
    if (!suggestion) return
    const words = formData.expression.split(/\s+/)
    words[words.length - 1] = suggestion.text
    const newExpression = words.join(" ") + " "
    setFormData((prev) => ({ ...prev, expression: newExpression }))
    setShowSuggestions(false)
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
        setSelectedIndex((i) => Math.min(rules.length - 1, i + 1))
      } else if (key.name === "n") {
        setMode("create")
        resetForm()
      } else if (key.name === "e" && rules.length > 0) {
        const ruleToEdit = rules[selectedIndex]
        if (ruleToEdit) startEdit(ruleToEdit)
      } else if (key.name === "d" && rules.length > 0) {
        setMode("delete")
      } else if (key.name === "r") {
        setMode("reorder")
      } else if (key.name === "h" || key.name === "?") {
        setMode("help")
      } else if (key.name === "p" && rules.length > 0 && selectedZone) {
        const rule = rules[selectedIndex]
        if (rule) updateFirewallRule(selectedZone.id, rule.id, { paused: !rule.paused }).then(loadRules)
      } else if (key.name === "l") {
        loadRules()
      } else if (key.name === "escape" || key.name === "backspace") {
        setMode("zones")
        setSelectedZone(null)
        setSelectedIndex(0)
      }
    } else if (mode === "reorder") {
      if (key.name === "up" || key.name === "k") {
        handleReorder("up")
      } else if (key.name === "down" || key.name === "j") {
        handleReorder("down")
      } else if (key.name === "escape" || key.name === "return") {
        setMode("list")
      }
    } else if (mode === "create" || mode === "edit") {
      if (key.name === "escape") {
        setMode("list")
        resetForm()
      } else if (key.name === "tab") {
        if (showSuggestions && activeField === "expression") {
          applySuggestion()
        } else {
          const fields = ["description", "expression", "action"] as const
          const currentIdx = fields.indexOf(activeField)
          const nextField = fields[(currentIdx + 1) % fields.length]
          if (nextField) setActiveField(nextField)
        }
      } else if (key.ctrl && key.name === "s") {
        if (mode === "create") handleCreateRule()
        else handleUpdateRule()
      } else if (showSuggestions && activeField === "expression") {
        if (key.name === "up") {
          setSuggestionIndex((i) => Math.max(0, i - 1))
        } else if (key.name === "down") {
          setSuggestionIndex((i) => Math.min(suggestions.length - 1, i + 1))
        } else if (key.name === "return") {
          applySuggestion()
        }
      } else if (activeField === "action") {
        const actions: FirewallAction[] = ["block", "challenge", "js_challenge", "managed_challenge", "allow", "log", "bypass", "skip"]
        const currentIdx = actions.indexOf(formData.action)
        if (key.name === "left" || key.name === "up") {
          const newAction = actions[(currentIdx - 1 + actions.length) % actions.length]
          if (newAction) setFormData((prev) => ({ ...prev, action: newAction }))
        } else if (key.name === "right" || key.name === "down") {
          const newAction = actions[(currentIdx + 1) % actions.length]
          if (newAction) setFormData((prev) => ({ ...prev, action: newAction }))
        }
      }
    } else if (mode === "delete") {
      if (key.name === "y" || key.name === "return") {
        handleDeleteRule()
      } else if (key.name === "n" || key.name === "escape") {
        setMode("list")
      }
    } else if (mode === "help") {
      if (key.name === "escape" || key.name === "return" || key.name === "q") {
        setMode("list")
      }
    }
  })

  if (mode === "help") {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>Expression Builder Help</strong>
        </text>
        <box marginTop={1} flexDirection="column" gap={1}>
          <text>
            <span fg={colors.text}>Available Fields:</span>
          </text>
          <box flexDirection="column" paddingLeft={2}>
            {EXPRESSION_FIELDS.slice(0, 10).map((field) => (
              <text key={field.name}>
                <span fg={colors.info}>{field.name.padEnd(28)}</span>
                <span fg={colors.textMuted}>{field.description}</span>
              </text>
            ))}
          </box>
          <text marginTop={1}>
            <span fg={colors.text}>Operators:</span>
          </text>
          <box flexDirection="column" paddingLeft={2}>
            {EXPRESSION_OPERATORS.map((op) => (
              <text key={op.op}>
                <span fg={colors.warning}>{op.op.padEnd(12)}</span>
                <span fg={colors.textMuted}>{op.syntax}</span>
              </text>
            ))}
          </box>
          <text marginTop={1}>
            <span fg={colors.textMuted}>Press ESC to return</span>
          </text>
        </box>
      </box>
    )
  }

  if (mode === "zones") {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>Firewall Rules</strong>
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
              <span fg={colors.textMuted}>No zones found. Add a domain to Cloudflare first.</span>
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

  if (mode === "create" || mode === "edit") {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>{mode === "create" ? "Create Firewall Rule" : "Edit Firewall Rule"}</strong>
          <span fg={colors.textMuted}> - {selectedZone?.name}</span>
        </text>
        <box flexDirection="column" gap={1} marginTop={1}>
          <box flexDirection="column">
            <text>
              <span fg={activeField === "description" ? colors.primary : colors.text}>Description:</span>
            </text>
            <box
              borderStyle="single"
              borderColor={activeField === "description" ? colors.primary : colors.border}
              padding={1}
            >
              <text>
                <span fg={colors.text}>{formData.description || "(enter description)"}</span>
              </text>
            </box>
          </box>

          <box flexDirection="column">
            <text>
              <span fg={activeField === "expression" ? colors.primary : colors.text}>Expression:</span>
              <span fg={colors.textMuted}> (Tab for suggestions, ? for help)</span>
            </text>
            <box
              borderStyle="single"
              borderColor={activeField === "expression" ? colors.primary : colors.border}
              padding={1}
            >
              <text>
                <span fg={colors.text}>{formData.expression || '(e.g., ip.src eq "1.2.3.4")'}</span>
              </text>
            </box>
            {showSuggestions && activeField === "expression" && suggestions.length > 0 && (
              <box flexDirection="column" borderStyle="single" borderColor={colors.border} marginTop={1}>
                {suggestions.map((s, i) => (
                  <box
                    key={s.text}
                    padding={1}
                    backgroundColor={i === suggestionIndex ? colors.primary : undefined}
                  >
                    <text>
                      <span fg={i === suggestionIndex ? colors.textInverse : colors.text}>
                        {s.text.padEnd(25)}
                      </span>
                      <span fg={i === suggestionIndex ? colors.textInverse : colors.textMuted}>
                        {s.description}
                      </span>
                    </text>
                  </box>
                ))}
              </box>
            )}
            {validation && (
              <box marginTop={1}>
                {validation.valid ? (
                  <text>
                    <span fg={colors.success}>✓ Expression valid</span>
                  </text>
                ) : (
                  <box flexDirection="column">
                    {validation.errors.map((err, i) => (
                      <text key={i}>
                        <span fg={colors.error}>✕ {err.message}</span>
                      </text>
                    ))}
                  </box>
                )}
              </box>
            )}
          </box>

          <box flexDirection="column">
            <text>
              <span fg={activeField === "action" ? colors.primary : colors.text}>Action:</span>
              <span fg={colors.textMuted}> (←/→ to change)</span>
            </text>
            <box flexDirection="row" gap={1} marginTop={1}>
              {(["block", "challenge", "managed_challenge", "allow", "log", "bypass"] as FirewallAction[]).map((action) => (
                <box
                  key={action}
                  padding={1}
                  backgroundColor={formData.action === action ? ACTION_COLORS[action] : colors.surfaceAlt}
                  borderStyle={formData.action === action ? "single" : undefined}
                  borderColor={ACTION_COLORS[action]}
                >
                  <text>
                    <span fg={formData.action === action ? "#FFFFFF" : colors.textMuted}>
                      {ACTION_ICONS[action]} {action}
                    </span>
                  </text>
                </box>
              ))}
            </box>
          </box>
        </box>

        {formStatus && (
          <text marginTop={1}>
            <span fg={formStatus.startsWith("Error") ? colors.error : colors.success}>{formStatus}</span>
          </text>
        )}

        <box marginTop={2} flexDirection="row" gap={2}>
          <text>
            <span fg={colors.textMuted}>Ctrl+S: Save</span>
          </text>
          <text>
            <span fg={colors.textMuted}>ESC: Cancel</span>
          </text>
          <text>
            <span fg={colors.textMuted}>Tab: Next field</span>
          </text>
          <text>
            <span fg={colors.textMuted}>?: Help</span>
          </text>
        </box>
      </box>
    )
  }

  if (mode === "delete") {
    const rule = rules[selectedIndex]
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.error}>Delete Firewall Rule?</strong>
        </text>
        <box marginTop={1} borderStyle="single" borderColor={colors.error} padding={1}>
          <box flexDirection="column">
            <text>
              <span fg={colors.text}>{rule?.description || "Unnamed rule"}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{rule?.filter.expression}</span>
            </text>
          </box>
        </box>
        <text marginTop={1}>
          <span fg={colors.textMuted}>Press Y to confirm, N to cancel</span>
        </text>
      </box>
    )
  }

  if (mode === "reorder") {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>Reorder Rules</strong>
          <span fg={colors.textMuted}> - Use ↑/↓ to move selected rule</span>
        </text>
        <box marginTop={1} flexDirection="column">
          {rules.map((rule, i) => (
            <box
              key={rule.id}
              padding={1}
              backgroundColor={i === selectedIndex ? colors.primary : undefined}
              flexDirection="row"
              gap={2}
            >
              <text>
                <span fg={i === selectedIndex ? colors.textInverse : colors.textMuted}>
                  {(i + 1).toString().padStart(2)}
                </span>
              </text>
              <text>
                <span fg={i === selectedIndex ? colors.textInverse : ACTION_COLORS[rule.action]}>
                  {ACTION_ICONS[rule.action]}
                </span>
              </text>
              <text>
                <span fg={i === selectedIndex ? colors.textInverse : colors.text}>
                  {rule.description || rule.filter.expression.slice(0, 50)}
                </span>
              </text>
            </box>
          ))}
        </box>
        <text marginTop={1}>
          <span fg={colors.textMuted}>Press Enter or ESC when done</span>
        </text>
      </box>
    )
  }

  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <strong fg={colors.primary}>Firewall Rules</strong>
          <span fg={colors.textMuted}> - {selectedZone?.name}</span>
        </text>
        <text>
          <span fg={colors.textMuted}>{rules.length} rules</span>
        </text>
      </box>

      {error && (
        <box borderStyle="single" borderColor={colors.error} padding={1}>
          <text>
            <span fg={colors.error}>{error}</span>
          </text>
        </box>
      )}

      {loading ? (
        <text>
          <span fg={colors.textMuted}>Loading rules...</span>
        </text>
      ) : rules.length === 0 ? (
        <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
          <text>
            <span fg={colors.textMuted}>No firewall rules configured. Press N to create one.</span>
          </text>
        </box>
      ) : (
        <box marginTop={1} flexDirection="column">
          <box flexDirection="row" borderStyle="single" borderColor={colors.border} padding={1}>
            <text>
              <span fg={colors.textMuted}>
                {"#".padEnd(4)}{"Status".padEnd(10)}{"Action".padEnd(14)}{"Description".padEnd(28)}Expression
              </span>
            </text>
          </box>
          {rules.map((rule, i) => (
            <box
              key={rule.id}
              padding={1}
              backgroundColor={i === selectedIndex ? colors.surfaceAlt : undefined}
              flexDirection="row"
            >
              <text>
                <span fg={i === selectedIndex ? colors.primary : colors.textMuted}>
                  {(i + 1).toString().padEnd(4)}
                </span>
                <span fg={rule.paused ? colors.warning : colors.success}>
                  {(rule.paused ? "Paused" : "Active").padEnd(10)}
                </span>
                <span fg={ACTION_COLORS[rule.action]}>
                  {`${ACTION_ICONS[rule.action]} ${rule.action}`.padEnd(14)}
                </span>
                <span fg={colors.text}>
                  {(rule.description || "-").slice(0, 26).padEnd(28)}
                </span>
                <span fg={colors.textMuted}>
                  {rule.filter.expression.slice(0, 35)}
                  {rule.filter.expression.length > 35 ? "..." : ""}
                </span>
              </text>
            </box>
          ))}
        </box>
      )}

      <box marginTop={2} flexDirection="row" gap={2} flexWrap="wrap">
        <text>
          <span fg={colors.textMuted}>N: New</span>
        </text>
        <text>
          <span fg={colors.textMuted}>E: Edit</span>
        </text>
        <text>
          <span fg={colors.textMuted}>D: Delete</span>
        </text>
        <text>
          <span fg={colors.textMuted}>R: Reorder</span>
        </text>
        <text>
          <span fg={colors.textMuted}>P: Pause/Resume</span>
        </text>
        <text>
          <span fg={colors.textMuted}>L: Refresh</span>
        </text>
        <text>
          <span fg={colors.textMuted}>ESC: Back</span>
        </text>
        <text>
          <span fg={colors.textMuted}>?: Help</span>
        </text>
      </box>
    </box>
  )
}
