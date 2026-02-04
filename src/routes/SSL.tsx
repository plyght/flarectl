import { useState, useEffect, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../lib/theme-context.tsx"
import type { SSLSettings, SSLCertificate, SSLMode } from "../types/security"
import {
  getSSLSettings,
  updateSSLMode,
  updateMinTLSVersion,
  updateSSLSetting,
  listSSLCertificates,
} from "../lib/security"
import { listZones, type Zone } from "../lib/cloudflare"

type ViewMode = "zones" | "settings" | "certificates" | "details"
type Tab = "settings" | "certificates"

const SSL_MODES: { value: SSLMode; label: string; description: string; color: string }[] = [
  { value: "off", label: "Off", description: "No encryption (not recommended)", color: "#EF4444" },
  { value: "flexible", label: "Flexible", description: "Encrypts between browser and Cloudflare", color: "#EAB308" },
  { value: "full", label: "Full", description: "Encrypts end-to-end (self-signed OK)", color: "#3B82F6" },
  { value: "strict", label: "Full (Strict)", description: "End-to-end with valid certificate", color: "#22C55E" },
]

const TLS_VERSIONS = ["1.0", "1.1", "1.2", "1.3"] as const

function getDaysUntilExpiry(expiresOn: string): number {
  const expiry = new Date(expiresOn)
  const now = new Date()
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getExpiryColor(daysLeft: number): string {
  if (daysLeft < 0) return "#EF4444"
  if (daysLeft < 14) return "#EF4444"
  if (daysLeft < 30) return "#EAB308"
  return "#22C55E"
}

export function SSL() {
  const { theme } = useTheme()
  const { colors } = theme

  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [settings, setSettings] = useState<SSLSettings | null>(null)
  const [certificates, setCertificates] = useState<SSLCertificate[]>([])
  const [selectedCert, setSelectedCert] = useState<SSLCertificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mode, setMode] = useState<ViewMode>("zones")
  const [activeTab, setActiveTab] = useState<Tab>("settings")
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

  const loadSettings = useCallback(async () => {
    if (!selectedZone) return
    try {
      setLoading(true)
      setError(null)
      const [settingsResult, certsResult] = await Promise.all([
        getSSLSettings(selectedZone.id),
        listSSLCertificates(selectedZone.id),
      ])
      setSettings(settingsResult)
      setCertificates(certsResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SSL settings")
    } finally {
      setLoading(false)
    }
  }, [selectedZone])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  useEffect(() => {
    if (selectedZone) {
      loadSettings()
    }
  }, [selectedZone, loadSettings])

  const handleModeChange = async (newMode: SSLMode) => {
    if (!selectedZone || !settings) return
    try {
      setStatusMessage("Updating SSL mode...")
      await updateSSLMode(selectedZone.id, newMode)
      setSettings((prev) => (prev ? { ...prev, mode: newMode } : null))
      setStatusMessage("SSL mode updated!")
      setTimeout(() => setStatusMessage(null), 2000)
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Failed to update"}`)
    }
  }

  const handleTLSVersionChange = async (version: SSLSettings["min_tls_version"]) => {
    if (!selectedZone || !settings) return
    try {
      setStatusMessage("Updating minimum TLS version...")
      await updateMinTLSVersion(selectedZone.id, version)
      setSettings((prev) => (prev ? { ...prev, min_tls_version: version } : null))
      setStatusMessage("TLS version updated!")
      setTimeout(() => setStatusMessage(null), 2000)
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Failed to update"}`)
    }
  }

  const handleToggleSetting = async (setting: string, currentValue: boolean) => {
    if (!selectedZone || !settings) return
    try {
      setStatusMessage(`Updating ${setting}...`)
      await updateSSLSetting(selectedZone.id, setting, currentValue ? "off" : "on")
      setSettings((prev) => {
        if (!prev) return null
        const key = setting.replace(/_/g, "_") as keyof SSLSettings
        if (typeof prev[key] === "boolean") {
          return { ...prev, [key]: !currentValue }
        }
        return prev
      })
      setStatusMessage(`${setting} updated!`)
      setTimeout(() => setStatusMessage(null), 2000)
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Failed to update"}`)
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
          setMode("settings")
          setSelectedIndex(0)
        }
      } else if (key.name === "l") {
        loadZones()
      }
    } else if (mode === "settings") {
      if (key.name === "tab") {
        setActiveTab(activeTab === "settings" ? "certificates" : "settings")
        setSelectedIndex(0)
      } else if (key.name === "escape" || key.name === "backspace") {
        setMode("zones")
        setSelectedZone(null)
        setSelectedIndex(0)
      } else if (key.name === "l") {
        loadSettings()
      }

      if (activeTab === "settings" && settings) {
        const items = [
          "mode",
          "min_tls_version",
          "always_use_https",
          "automatic_https_rewrites",
          "opportunistic_encryption",
          "early_hints",
        ]
        if (key.name === "up" || key.name === "k") {
          setSelectedIndex((i) => Math.max(0, i - 1))
        } else if (key.name === "down" || key.name === "j") {
          setSelectedIndex((i) => Math.min(items.length - 1, i + 1))
        } else if (key.name === "return" || key.name === "space") {
          const item = items[selectedIndex]
          if (item === "mode") {
            const currentIdx = SSL_MODES.findIndex((m) => m.value === settings.mode)
            const nextMode = SSL_MODES[(currentIdx + 1) % SSL_MODES.length]
            if (nextMode) handleModeChange(nextMode.value)
          } else if (item === "min_tls_version") {
            const currentIdx = TLS_VERSIONS.indexOf(settings.min_tls_version)
            const nextVersion = TLS_VERSIONS[(currentIdx + 1) % TLS_VERSIONS.length]
            if (nextVersion) handleTLSVersionChange(nextVersion)
          } else if (item === "always_use_https") {
            handleToggleSetting("always_use_https", settings.always_use_https)
          } else if (item === "automatic_https_rewrites") {
            handleToggleSetting("automatic_https_rewrites", settings.automatic_https_rewrites)
          } else if (item === "opportunistic_encryption") {
            handleToggleSetting("opportunistic_encryption", settings.opportunistic_encryption)
          } else if (item === "early_hints") {
            handleToggleSetting("early_hints", settings.early_hints)
          }
        }
      } else if (activeTab === "certificates") {
        if (key.name === "up" || key.name === "k") {
          setSelectedIndex((i) => Math.max(0, i - 1))
        } else if (key.name === "down" || key.name === "j") {
          setSelectedIndex((i) => Math.min(certificates.length - 1, i + 1))
        } else if (key.name === "return" || key.name === "v") {
          const cert = certificates[selectedIndex]
          if (cert) {
            setSelectedCert(cert)
            setMode("details")
          }
        }
      }
    } else if (mode === "details") {
      if (key.name === "escape" || key.name === "backspace" || key.name === "q") {
        setMode("settings")
        setSelectedCert(null)
      }
    }
  })

  if (mode === "details" && selectedCert) {
    const daysLeft = getDaysUntilExpiry(selectedCert.expires_on)
    const expiryColor = getExpiryColor(daysLeft)

    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>Certificate Details</strong>
        </text>

        <box marginTop={1} borderStyle="single" borderColor={colors.border} padding={1}>
          <box flexDirection="column" gap={1}>
            <box flexDirection="row">
              <box width={20}>
                <text>
                  <span fg={colors.textMuted}>Type:</span>
                </text>
              </box>
              <text>
                <span fg={colors.text}>{selectedCert.type}</span>
              </text>
            </box>

            <box flexDirection="row">
              <box width={20}>
                <text>
                  <span fg={colors.textMuted}>Status:</span>
                </text>
              </box>
              <text>
                <span fg={selectedCert.status === "active" ? colors.success : colors.warning}>
                  {selectedCert.status}
                </span>
              </text>
            </box>

            <box flexDirection="row">
              <box width={20}>
                <text>
                  <span fg={colors.textMuted}>Hosts:</span>
                </text>
              </box>
              <text>
                <span fg={colors.text}>{selectedCert.hosts.join(", ")}</span>
              </text>
            </box>

            <box flexDirection="row">
              <box width={20}>
                <text>
                  <span fg={colors.textMuted}>Issuer:</span>
                </text>
              </box>
              <text>
                <span fg={colors.text}>{selectedCert.issuer}</span>
              </text>
            </box>

            <box flexDirection="row">
              <box width={20}>
                <text>
                  <span fg={colors.textMuted}>Signature:</span>
                </text>
              </box>
              <text>
                <span fg={colors.text}>{selectedCert.signature}</span>
              </text>
            </box>

            <box flexDirection="row">
              <box width={20}>
                <text>
                  <span fg={colors.textMuted}>Uploaded:</span>
                </text>
              </box>
              <text>
                <span fg={colors.text}>{new Date(selectedCert.uploaded_on).toLocaleDateString()}</span>
              </text>
            </box>

            <box flexDirection="row">
              <box width={20}>
                <text>
                  <span fg={colors.textMuted}>Expires:</span>
                </text>
              </box>
              <text>
                <span fg={expiryColor}>
                  {new Date(selectedCert.expires_on).toLocaleDateString()} ({daysLeft} days)
                </span>
              </text>
            </box>

            {daysLeft < 30 && (
              <box marginTop={1} borderStyle="single" borderColor={colors.warning} padding={1}>
                <text>
                  <span fg={colors.warning}>
                    ⚠ {daysLeft < 0 ? "Certificate has expired!" : `Certificate expires in ${daysLeft} days`}
                  </span>
                </text>
              </box>
            )}
          </box>
        </box>

        <box marginTop={1}>
          <text>
            <span fg={colors.textMuted}>ESC: Back to certificates</span>
          </text>
        </box>
      </box>
    )
  }

  if (mode === "zones") {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.primary}>SSL/TLS</strong>
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

  const settingsItems = [
    {
      key: "mode",
      label: "SSL Mode",
      value: settings?.mode,
      description: SSL_MODES.find((m) => m.value === settings?.mode)?.description || "",
    },
    {
      key: "min_tls_version",
      label: "Minimum TLS Version",
      value: `TLS ${settings?.min_tls_version}`,
      description: "Minimum version required for connections",
    },
    {
      key: "always_use_https",
      label: "Always Use HTTPS",
      value: settings?.always_use_https ? "On" : "Off",
      toggle: true,
      enabled: settings?.always_use_https,
    },
    {
      key: "automatic_https_rewrites",
      label: "Automatic HTTPS Rewrites",
      value: settings?.automatic_https_rewrites ? "On" : "Off",
      toggle: true,
      enabled: settings?.automatic_https_rewrites,
    },
    {
      key: "opportunistic_encryption",
      label: "Opportunistic Encryption",
      value: settings?.opportunistic_encryption ? "On" : "Off",
      toggle: true,
      enabled: settings?.opportunistic_encryption,
    },
    {
      key: "early_hints",
      label: "Early Hints",
      value: settings?.early_hints ? "On" : "Off",
      toggle: true,
      enabled: settings?.early_hints,
    },
  ]

  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <strong fg={colors.primary}>SSL/TLS</strong>
          <span fg={colors.textMuted}> - {selectedZone?.name}</span>
        </text>
      </box>

      <box marginTop={1} flexDirection="row" gap={2}>
        <box
          padding={1}
          backgroundColor={activeTab === "settings" ? colors.primary : colors.surfaceAlt}
        >
          <text>
            <span fg={activeTab === "settings" ? colors.textInverse : colors.text}>Settings</span>
          </text>
        </box>
        <box
          padding={1}
          backgroundColor={activeTab === "certificates" ? colors.primary : colors.surfaceAlt}
        >
          <text>
            <span fg={activeTab === "certificates" ? colors.textInverse : colors.text}>
              Certificates ({certificates.length})
            </span>
          </text>
        </box>
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
          <span fg={colors.textMuted}>Loading...</span>
        </text>
      ) : activeTab === "settings" ? (
        <box marginTop={1} flexDirection="column">
          {settingsItems.map((item, i) => (
            <box
              key={item.key}
              padding={1}
              backgroundColor={i === selectedIndex ? colors.surfaceAlt : undefined}
              flexDirection="row"
            >
              <box width={30}>
                <text>
                  <span fg={i === selectedIndex ? colors.primary : colors.text}>{item.label}</span>
                </text>
              </box>
              <box width={20}>
                <text>
                  <span
                    fg={
                      item.toggle
                        ? item.enabled
                          ? colors.success
                          : colors.textMuted
                        : item.key === "mode"
                        ? SSL_MODES.find((m) => m.value === settings?.mode)?.color || colors.text
                        : colors.text
                    }
                  >
                    {item.value}
                  </span>
                </text>
              </box>
              {item.description && (
                <text>
                  <span fg={colors.textMuted}>{item.description}</span>
                </text>
              )}
            </box>
          ))}
        </box>
      ) : (
        <box marginTop={1} flexDirection="column">
          {certificates.length === 0 ? (
            <box borderStyle="single" borderColor={colors.border} padding={1}>
              <text>
                <span fg={colors.textMuted}>No certificates found.</span>
              </text>
            </box>
          ) : (
            certificates.map((cert, i) => {
              const daysLeft = getDaysUntilExpiry(cert.expires_on)
              const expiryColor = getExpiryColor(daysLeft)
              return (
                <box
                  key={cert.id}
                  padding={1}
                  backgroundColor={i === selectedIndex ? colors.surfaceAlt : undefined}
                  flexDirection="row"
                  gap={2}
                >
                  <box width={12}>
                    <text>
                      <span fg={cert.status === "active" ? colors.success : colors.warning}>
                        {cert.status === "active" ? "●" : "○"} {cert.type}
                      </span>
                    </text>
                  </box>
                  <box flexGrow={1}>
                    <text>
                      <span fg={i === selectedIndex ? colors.primary : colors.text}>
                        {cert.hosts.slice(0, 2).join(", ")}
                        {cert.hosts.length > 2 ? ` +${cert.hosts.length - 2}` : ""}
                      </span>
                    </text>
                  </box>
                  <box width={25}>
                    <text>
                      <span fg={expiryColor}>
                        {daysLeft < 0 ? "Expired" : `${daysLeft} days left`}
                      </span>
                    </text>
                  </box>
                </box>
              )
            })
          )}
        </box>
      )}

      <box marginTop={2} flexDirection="row" gap={2}>
        <text>
          <span fg={colors.textMuted}>Tab: Switch tabs</span>
        </text>
        <text>
          <span fg={colors.textMuted}>Enter/Space: Change setting</span>
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
