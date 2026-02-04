import type {
  FirewallRule,
  FirewallRuleFormData,
  WAFRuleset,
  WAFManagedRuleset,
  WAFOverride,
  SSLSettings,
  SSLCertificate,
  SecurityEvent,
  SecurityEventFilters,
  RateLimitRule,
  RateLimitRuleFormData,
  DDoSSettings,
  DDoSAttackAnalytics,
  BotManagementSettings,
  BotAnalytics,
  SSLMode,
} from "../types/security"

const API_BASE = "https://api.cloudflare.com/client/v4"

interface CloudflareResponse<T> {
  success: boolean
  errors: Array<{ code: number; message: string }>
  messages: string[]
  result: T
  result_info?: {
    page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }

  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const apiKey = process.env.CLOUDFLARE_API_KEY
  const email = process.env.CLOUDFLARE_EMAIL

  if (apiToken) {
    headers["Authorization"] = `Bearer ${apiToken}`
  } else if (apiKey && email) {
    headers["X-Auth-Key"] = apiKey
    headers["X-Auth-Email"] = email
  } else {
    throw new Error("Authentication not configured. Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL")
  }

  return headers
}

async function cfFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = getAuthHeaders()
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })

  const data = (await response.json()) as CloudflareResponse<T>

  if (!data.success) {
    const errorMsg = data.errors.map((e) => e.message).join(", ")
    throw new Error(errorMsg || "Cloudflare API request failed")
  }

  return data.result
}

async function cfFetchWithInfo<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ result: T; result_info?: CloudflareResponse<T>["result_info"] }> {
  const headers = getAuthHeaders()
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })

  const data = (await response.json()) as CloudflareResponse<T>

  if (!data.success) {
    const errorMsg = data.errors.map((e) => e.message).join(", ")
    throw new Error(errorMsg || "Cloudflare API request failed")
  }

  return { result: data.result, result_info: data.result_info }
}

export interface ListFirewallRulesResult {
  rules: FirewallRule[]
  total_count: number
  page: number
  per_page: number
}

export async function listFirewallRules(
  zoneId: string,
  options?: { page?: number; per_page?: number }
): Promise<ListFirewallRulesResult> {
  const params = new URLSearchParams()
  if (options?.page) params.append("page", options.page.toString())
  if (options?.per_page) params.append("per_page", options.per_page.toString())

  const query = params.toString() ? `?${params.toString()}` : ""
  const { result, result_info } = await cfFetchWithInfo<FirewallRule[]>(
    `/zones/${zoneId}/firewall/rules${query}`
  )

  return {
    rules: result,
    total_count: result_info?.total_count || result.length,
    page: result_info?.page || 1,
    per_page: result_info?.per_page || result.length,
  }
}

export async function getFirewallRule(zoneId: string, ruleId: string): Promise<FirewallRule> {
  return cfFetch<FirewallRule>(`/zones/${zoneId}/firewall/rules/${ruleId}`)
}

export async function createFirewallRule(
  zoneId: string,
  data: FirewallRuleFormData
): Promise<FirewallRule[]> {
  const payload = [
    {
      filter: { expression: data.expression, paused: false },
      action: data.action,
      description: data.description,
      paused: data.paused ?? false,
      priority: data.priority,
    },
  ]

  return cfFetch<FirewallRule[]>(`/zones/${zoneId}/firewall/rules`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateFirewallRule(
  zoneId: string,
  ruleId: string,
  data: Partial<FirewallRuleFormData>
): Promise<FirewallRule> {
  const existingRule = await getFirewallRule(zoneId, ruleId)

  const payload = {
    id: ruleId,
    filter: {
      id: existingRule.filter.id,
      expression: data.expression ?? existingRule.filter.expression,
      paused: existingRule.filter.paused,
    },
    action: data.action ?? existingRule.action,
    description: data.description ?? existingRule.description,
    paused: data.paused ?? existingRule.paused,
    priority: data.priority ?? existingRule.priority,
  }

  return cfFetch<FirewallRule>(`/zones/${zoneId}/firewall/rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteFirewallRule(zoneId: string, ruleId: string): Promise<void> {
  const rule = await getFirewallRule(zoneId, ruleId)

  await cfFetch<null>(`/zones/${zoneId}/firewall/rules/${ruleId}`, { method: "DELETE" })

  if (rule.filter?.id) {
    try {
      await cfFetch<null>(`/zones/${zoneId}/filters/${rule.filter.id}`, { method: "DELETE" })
    } catch {
    }
  }
}

export async function reorderFirewallRules(
  zoneId: string,
  rules: Array<{ id: string; priority: number }>
): Promise<FirewallRule[]> {
  const updatePromises = rules.map(({ id, priority }) => updateFirewallRule(zoneId, id, { priority }))
  return Promise.all(updatePromises)
}

export async function toggleFirewallRule(
  zoneId: string,
  ruleId: string,
  paused: boolean
): Promise<FirewallRule> {
  return updateFirewallRule(zoneId, ruleId, { paused })
}

export async function listWAFRulesets(zoneId: string): Promise<WAFRuleset[]> {
  return cfFetch<WAFRuleset[]>(`/zones/${zoneId}/rulesets`)
}

export async function getWAFRuleset(zoneId: string, rulesetId: string): Promise<WAFRuleset> {
  return cfFetch<WAFRuleset>(`/zones/${zoneId}/rulesets/${rulesetId}`)
}

export async function listManagedWAFRulesets(zoneId: string): Promise<WAFManagedRuleset[]> {
  const rulesets = await cfFetch<WAFRuleset[]>(`/zones/${zoneId}/rulesets?kind=managed`)
  return rulesets.map((r: WAFRuleset) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    enabled: true,
    rules_count: r.rules?.length || 0,
    version: r.version,
    last_updated: r.rules?.[0]?.last_updated,
  }))
}

export async function toggleWAFRuleset(zoneId: string, rulesetId: string, enabled: boolean): Promise<void> {
  await cfFetch(`/zones/${zoneId}/rulesets/${rulesetId}`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  })
}

export async function getWAFOverrides(zoneId: string): Promise<WAFOverride[]> {
  return cfFetch<WAFOverride[]>(`/zones/${zoneId}/firewall/waf/overrides`)
}

export async function createWAFOverride(zoneId: string, override: Partial<WAFOverride>): Promise<WAFOverride> {
  return cfFetch<WAFOverride>(`/zones/${zoneId}/firewall/waf/overrides`, {
    method: "POST",
    body: JSON.stringify(override),
  })
}

export async function deleteWAFOverride(zoneId: string, overrideId: string): Promise<void> {
  await cfFetch<{ id: string }>(`/zones/${zoneId}/firewall/waf/overrides/${overrideId}`, {
    method: "DELETE",
  })
}

export async function getSSLSettings(zoneId: string): Promise<SSLSettings> {
  const [modeRes, tlsRes, earlyHintsRes, httpsRewritesRes, alwaysHttpsRes, opportunisticRes] = await Promise.all([
    cfFetch<{ value: SSLSettings["mode"] }>(`/zones/${zoneId}/settings/ssl`),
    cfFetch<{ value: SSLSettings["min_tls_version"] }>(`/zones/${zoneId}/settings/min_tls_version`),
    cfFetch<{ value: "on" | "off" }>(`/zones/${zoneId}/settings/early_hints`),
    cfFetch<{ value: "on" | "off" }>(`/zones/${zoneId}/settings/automatic_https_rewrites`),
    cfFetch<{ value: "on" | "off" }>(`/zones/${zoneId}/settings/always_use_https`),
    cfFetch<{ value: "on" | "off" }>(`/zones/${zoneId}/settings/opportunistic_encryption`),
  ])

  return {
    mode: modeRes.value,
    certificate_status: "active",
    min_tls_version: tlsRes.value,
    early_hints: earlyHintsRes.value === "on",
    tls_1_3: "on",
    automatic_https_rewrites: httpsRewritesRes.value === "on",
    always_use_https: alwaysHttpsRes.value === "on",
    opportunistic_encryption: opportunisticRes.value === "on",
    ssl_recommender: false,
  }
}

export async function updateSSLMode(zoneId: string, mode: SSLMode): Promise<void> {
  await cfFetch(`/zones/${zoneId}/settings/ssl`, {
    method: "PATCH",
    body: JSON.stringify({ value: mode }),
  })
}

export async function updateMinTLSVersion(zoneId: string, version: SSLSettings["min_tls_version"]): Promise<void> {
  await cfFetch(`/zones/${zoneId}/settings/min_tls_version`, {
    method: "PATCH",
    body: JSON.stringify({ value: version }),
  })
}

export async function updateSSLSetting(zoneId: string, setting: string, value: "on" | "off"): Promise<void> {
  await cfFetch(`/zones/${zoneId}/settings/${setting}`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  })
}

export async function listSSLCertificates(zoneId: string): Promise<SSLCertificate[]> {
  return cfFetch<SSLCertificate[]>(`/zones/${zoneId}/ssl/certificate_packs?status=all`)
}

export async function getSSLCertificate(zoneId: string, certId: string): Promise<SSLCertificate> {
  return cfFetch<SSLCertificate>(`/zones/${zoneId}/ssl/certificate_packs/${certId}`)
}

export async function orderSSLCertificate(
  zoneId: string,
  type: "dedicated" | "advanced",
  hosts: string[]
): Promise<SSLCertificate> {
  return cfFetch<SSLCertificate>(`/zones/${zoneId}/ssl/certificate_packs`, {
    method: "POST",
    body: JSON.stringify({
      type,
      hosts,
      validation_method: "txt",
      validity_days: 365,
    }),
  })
}

export async function deleteSSLCertificate(zoneId: string, certId: string): Promise<void> {
  await cfFetch<{ id: string }>(`/zones/${zoneId}/ssl/certificate_packs/${certId}`, {
    method: "DELETE",
  })
}

export async function getSecurityEvents(
  zoneId: string,
  filters?: SecurityEventFilters
): Promise<{ events: SecurityEvent[]; total: number }> {
  const params = new URLSearchParams()
  if (filters?.from) params.set("since", filters.from)
  if (filters?.to) params.set("until", filters.to)
  if (filters?.action) params.set("action", filters.action)
  if (filters?.client_ip) params.set("clientIP", filters.client_ip)
  if (filters?.host) params.set("host", filters.host)
  if (filters?.uri_path) params.set("path", filters.uri_path)
  if (filters?.page) params.set("page", filters.page.toString())
  if (filters?.per_page) params.set("per_page", (filters.per_page || 50).toString())

  const query = params.toString() ? `?${params.toString()}` : ""

  try {
    const { result, result_info } = await cfFetchWithInfo<SecurityEvent[]>(
      `/zones/${zoneId}/security/events${query}`
    )
    return { events: result, total: result_info?.total_count || result.length }
  } catch {
    const { result, result_info } = await cfFetchWithInfo<SecurityEvent[]>(
      `/zones/${zoneId}/firewall/events${query}`
    )
    return { events: result, total: result_info?.total_count || result.length }
  }
}

export async function listRateLimitRules(zoneId: string): Promise<RateLimitRule[]> {
  return cfFetch<RateLimitRule[]>(`/zones/${zoneId}/rate_limits`)
}

export async function getRateLimitRule(zoneId: string, ruleId: string): Promise<RateLimitRule> {
  return cfFetch<RateLimitRule>(`/zones/${zoneId}/rate_limits/${ruleId}`)
}

export async function createRateLimitRule(zoneId: string, data: RateLimitRuleFormData): Promise<RateLimitRule> {
  return cfFetch<RateLimitRule>(`/zones/${zoneId}/rate_limits`, {
    method: "POST",
    body: JSON.stringify({
      disabled: data.disabled ?? false,
      description: data.description,
      match: {
        request: {
          url_pattern: data.url_pattern,
          methods: data.methods?.length ? data.methods : ["_ALL_"],
          schemes: ["_ALL_"],
        },
      },
      threshold: data.threshold,
      period: data.period,
      action: {
        mode: data.action_mode,
        timeout: data.action_timeout || 3600,
      },
    }),
  })
}

export async function updateRateLimitRule(
  zoneId: string,
  ruleId: string,
  data: Partial<RateLimitRuleFormData>
): Promise<RateLimitRule> {
  return cfFetch<RateLimitRule>(`/zones/${zoneId}/rate_limits/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify({
      disabled: data.disabled,
      description: data.description,
      match: {
        request: {
          url_pattern: data.url_pattern,
          methods: data.methods?.length ? data.methods : ["_ALL_"],
          schemes: ["_ALL_"],
        },
      },
      threshold: data.threshold,
      period: data.period,
      action: {
        mode: data.action_mode,
        timeout: data.action_timeout || 3600,
      },
    }),
  })
}

export async function deleteRateLimitRule(zoneId: string, ruleId: string): Promise<void> {
  await cfFetch<{ id: string }>(`/zones/${zoneId}/rate_limits/${ruleId}`, { method: "DELETE" })
}

export async function getDDoSSettings(zoneId: string): Promise<DDoSSettings> {
  try {
    const result = await cfFetch<{ value: string }>(`/zones/${zoneId}/settings/security_level`)
    return {
      ddos_protection: (result.value as DDoSSettings["ddos_protection"]) || "high",
      sensitivity_level: "default",
      action: "managed_challenge",
      mode: "enabled",
    }
  } catch {
    return {
      ddos_protection: "high",
      sensitivity_level: "default",
      action: "managed_challenge",
      mode: "enabled",
    }
  }
}

export async function updateDDoSSettings(zoneId: string, settings: Partial<DDoSSettings>): Promise<void> {
  if (settings.ddos_protection) {
    await cfFetch(`/zones/${zoneId}/settings/security_level`, {
      method: "PATCH",
      body: JSON.stringify({ value: settings.ddos_protection }),
    })
  }
}

export async function getDDoSAnalytics(zoneId: string): Promise<DDoSAttackAnalytics> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  try {
    const result = await cfFetch<{
      totals: { attacks: number; mitigated: number }
      timeseries: Array<{ timestamp: string; attacks: number; mitigated: number }>
    }>(
      `/zones/${zoneId}/security/analytics/attacks?since=${weekAgo.toISOString()}&until=${now.toISOString()}`
    )
    return {
      total_attacks: result.totals.attacks,
      attacks_mitigated: result.totals.mitigated,
      attack_bandwidth_bits: 0,
      attack_bandwidth_packets: 0,
      top_attack_vectors: [],
      attack_timeline: result.timeseries,
    }
  } catch {
    return {
      total_attacks: 0,
      attacks_mitigated: 0,
      attack_bandwidth_bits: 0,
      attack_bandwidth_packets: 0,
      top_attack_vectors: [],
      attack_timeline: [],
    }
  }
}

export async function getBotManagementSettings(zoneId: string): Promise<BotManagementSettings> {
  try {
    return await cfFetch<BotManagementSettings>(`/zones/${zoneId}/bot_management`)
  } catch {
    return {
      enable_js: false,
      fight_mode: false,
      optimize_wordpress: false,
      using_latest_model: true,
      sbfm_definitely_automated: "block",
      sbfm_verified_bots: "allow",
      sbfm_static_resource_protection: false,
      sbfm_likely_automated: "challenge",
      suppress_session_score: false,
    }
  }
}

export async function updateBotManagementSettings(
  zoneId: string,
  settings: Partial<BotManagementSettings>
): Promise<BotManagementSettings> {
  return cfFetch<BotManagementSettings>(`/zones/${zoneId}/bot_management`, {
    method: "PUT",
    body: JSON.stringify(settings),
  })
}

export async function getBotAnalytics(zoneId: string): Promise<BotAnalytics> {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    const result = await cfFetch<{
      totals: {
        requests: number
        automated: number
        likely_automated: number
        verified_bots: number
        human: number
      }
      score_distribution: Array<{ range: string; count: number }>
    }>(
      `/zones/${zoneId}/security/analytics/bots?since=${dayAgo.toISOString()}&until=${now.toISOString()}`
    )
    return {
      total_requests: result.totals.requests,
      automated_requests: result.totals.automated,
      likely_automated_requests: result.totals.likely_automated,
      verified_bot_requests: result.totals.verified_bots,
      human_requests: result.totals.human,
      bot_score_distribution: result.score_distribution.map((d) => ({
        score_range: d.range,
        count: d.count,
      })),
    }
  } catch {
    return {
      total_requests: 0,
      automated_requests: 0,
      likely_automated_requests: 0,
      verified_bot_requests: 0,
      human_requests: 0,
      bot_score_distribution: [],
    }
  }
}
