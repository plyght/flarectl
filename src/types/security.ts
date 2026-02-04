export type FirewallAction = 
  | "block"
  | "challenge"
  | "js_challenge"
  | "managed_challenge"
  | "allow"
  | "log"
  | "bypass"
  | "skip"

export interface FirewallRule {
  id: string
  paused: boolean
  description: string
  action: FirewallAction
  priority?: number
  filter: {
    id: string
    expression: string
    paused: boolean
    description?: string
  }
  products?: string[]
  created_on: string
  modified_on: string
}

export interface FirewallRuleFormData {
  description: string
  action: FirewallAction
  expression: string
  paused?: boolean
  priority?: number
}

export interface ExpressionField {
  name: string
  description: string
  type: "string" | "number" | "boolean" | "ip" | "array"
  examples: string[]
}

export const EXPRESSION_FIELDS: ExpressionField[] = [
  { name: "ip.src", description: "Client IP address", type: "ip", examples: ["1.2.3.4", "10.0.0.0/8"] },
  { name: "ip.geoip.country", description: "Country code", type: "string", examples: ["US", "GB", "DE"] },
  { name: "ip.geoip.continent", description: "Continent code", type: "string", examples: ["NA", "EU", "AS"] },
  { name: "ip.geoip.asnum", description: "AS number", type: "number", examples: ["13335", "15169"] },
  { name: "http.host", description: "Request hostname", type: "string", examples: ["example.com"] },
  { name: "http.request.uri", description: "Request URI", type: "string", examples: ["/api/v1/*"] },
  { name: "http.request.uri.path", description: "Request path", type: "string", examples: ["/login", "/admin/*"] },
  { name: "http.request.uri.query", description: "Query string", type: "string", examples: ["?foo=bar"] },
  { name: "http.request.method", description: "Request method", type: "string", examples: ["GET", "POST", "DELETE"] },
  { name: "http.user_agent", description: "User-Agent header", type: "string", examples: ["*bot*", "*curl*"] },
  { name: "http.referer", description: "Referer header", type: "string", examples: ["https://google.com/*"] },
  { name: "http.cookie", description: "Cookie header", type: "string", examples: ["session=*"] },
  { name: "ssl", description: "HTTPS connection", type: "boolean", examples: ["true", "false"] },
  { name: "cf.bot_management.score", description: "Bot score (0-99)", type: "number", examples: ["30", "50"] },
  { name: "cf.threat_score", description: "Threat score (0-100)", type: "number", examples: ["10", "50"] },
  { name: "cf.client.bot", description: "Known bot", type: "boolean", examples: ["true", "false"] },
]

export const EXPRESSION_OPERATORS = [
  { op: "eq", desc: "equals", syntax: "field eq value" },
  { op: "ne", desc: "not equals", syntax: "field ne value" },
  { op: "lt", desc: "less than", syntax: "field lt value" },
  { op: "le", desc: "less or equal", syntax: "field le value" },
  { op: "gt", desc: "greater than", syntax: "field gt value" },
  { op: "ge", desc: "greater or equal", syntax: "field ge value" },
  { op: "contains", desc: "contains", syntax: 'field contains "value"' },
  { op: "matches", desc: "regex match", syntax: 'field matches "regex"' },
  { op: "in", desc: "in list", syntax: "field in {val1 val2}" },
  { op: "not", desc: "logical NOT", syntax: "not (expression)" },
  { op: "and", desc: "logical AND", syntax: "(expr1) and (expr2)" },
  { op: "or", desc: "logical OR", syntax: "(expr1) or (expr2)" },
]

export interface WAFRuleset {
  id: string
  name: string
  description: string
  kind: "managed" | "custom" | "root" | "zone"
  version: string
  phase: string
  rules?: WAFRule[]
}

export interface WAFRule {
  id: string
  version: string
  action: string
  expression: string
  description: string
  last_updated: string
  ref?: string
  enabled: boolean
  categories?: string[]
}

export interface WAFManagedRuleset {
  id: string
  name: string
  description: string
  enabled: boolean
  rules_count: number
  version: string
  last_updated?: string
}

export interface WAFOverride {
  id: string
  description?: string
  rules: Record<string, "block" | "challenge" | "simulate" | "disable" | "default">
  rewrite_action?: Record<string, "block" | "challenge" | "simulate" | "disable">
  paused: boolean
}

export type SSLMode = "off" | "flexible" | "full" | "strict"

export interface SSLSettings {
  mode: SSLMode
  certificate_status: "active" | "pending" | "expired" | "inactive"
  min_tls_version: "1.0" | "1.1" | "1.2" | "1.3"
  early_hints: boolean
  tls_1_3: "on" | "off" | "zrt"
  automatic_https_rewrites: boolean
  always_use_https: boolean
  opportunistic_encryption: boolean
  ssl_recommender: boolean
}

export interface SSLCertificate {
  id: string
  type: "universal" | "dedicated" | "custom" | "advanced"
  hosts: string[]
  issuer: string
  signature: string
  status: "active" | "pending_validation" | "pending_issuance" | "pending_deployment" | "expired" | "deleted"
  uploaded_on: string
  expires_on: string
  bundle_method: "ubiquitous" | "optimal" | "force"
  geo_restrictions?: { label: string }
  zone_id: string
  priority?: number
}

export interface CipherSuite {
  id: string
  name: string
  enabled: boolean
  recommended: boolean
}

export const CIPHER_SUITES: CipherSuite[] = [
  { id: "ECDHE-ECDSA-AES128-GCM-SHA256", name: "ECDHE-ECDSA-AES128-GCM-SHA256", enabled: true, recommended: true },
  { id: "ECDHE-RSA-AES128-GCM-SHA256", name: "ECDHE-RSA-AES128-GCM-SHA256", enabled: true, recommended: true },
  { id: "ECDHE-ECDSA-AES256-GCM-SHA384", name: "ECDHE-ECDSA-AES256-GCM-SHA384", enabled: true, recommended: true },
  { id: "ECDHE-RSA-AES256-GCM-SHA384", name: "ECDHE-RSA-AES256-GCM-SHA384", enabled: true, recommended: true },
  { id: "ECDHE-ECDSA-CHACHA20-POLY1305", name: "ECDHE-ECDSA-CHACHA20-POLY1305", enabled: true, recommended: true },
  { id: "ECDHE-RSA-CHACHA20-POLY1305", name: "ECDHE-RSA-CHACHA20-POLY1305", enabled: true, recommended: true },
  { id: "AES128-GCM-SHA256", name: "AES128-GCM-SHA256", enabled: false, recommended: false },
  { id: "AES256-GCM-SHA384", name: "AES256-GCM-SHA384", enabled: false, recommended: false },
]

export interface SecurityEvent {
  ray_id: string
  timestamp: string
  action: FirewallAction | "connection_close" | "force_connection_close"
  client_ip: string
  client_country: string
  client_asn: number
  host: string
  method: string
  uri: string
  user_agent: string
  rule_id?: string
  rule_message?: string
  source: "firewall" | "waf" | "rate_limit" | "bot_management" | "ddos"
  matches?: Array<{ source: string; action: string; rule_id: string }>
}

export interface SecurityEventFilters {
  from?: string
  to?: string
  action?: FirewallAction
  source?: SecurityEvent["source"]
  client_ip?: string
  host?: string
  uri_path?: string
  page?: number
  per_page?: number
}

export interface RateLimitRule {
  id: string
  disabled: boolean
  description: string
  match: {
    request: {
      url_pattern: string
      methods?: string[]
      schemes?: string[]
    }
    response?: {
      status?: number[]
      origin_traffic?: boolean
      headers?: Array<{ name: string; op: "eq" | "ne" | "match"; value: string }>
    }
  }
  threshold: number
  period: number
  action: {
    mode: "simulate" | "ban" | "challenge" | "js_challenge" | "managed_challenge"
    timeout?: number
    response?: { content_type: string; body: string }
  }
  bypass?: Array<{ name: string; value: string }>
}

export interface RateLimitRuleFormData {
  description: string
  url_pattern: string
  methods: string[]
  threshold: number
  period: number
  action_mode: RateLimitRule["action"]["mode"]
  action_timeout?: number
  disabled?: boolean
}

export interface DDoSSettings {
  ddos_protection: "essentially_off" | "low" | "medium" | "high"
  sensitivity_level: "essentially_off" | "low" | "medium" | "high" | "default"
  action: "block" | "challenge" | "log" | "managed_challenge"
  mode?: "enabled" | "disabled"
}

export interface DDoSAttackAnalytics {
  total_attacks: number
  attacks_mitigated: number
  attack_bandwidth_bits: number
  attack_bandwidth_packets: number
  top_attack_vectors: Array<{ name: string; count: number; percentage: number }>
  attack_timeline: Array<{ timestamp: string; attacks: number; mitigated: number }>
}

export interface BotManagementSettings {
  enable_js: boolean
  fight_mode: boolean
  optimize_wordpress: boolean
  using_latest_model: boolean
  sbfm_definitely_automated: "block" | "challenge" | "allow"
  sbfm_verified_bots: "block" | "challenge" | "allow"
  sbfm_static_resource_protection: boolean
  sbfm_likely_automated: "block" | "challenge" | "allow"
  suppress_session_score: boolean
}

export interface BotAnalytics {
  total_requests: number
  automated_requests: number
  likely_automated_requests: number
  verified_bot_requests: number
  human_requests: number
  bot_score_distribution: Array<{ score_range: string; count: number }>
}

export interface ExpressionValidationResult {
  valid: boolean
  errors: Array<{ message: string; position?: number; suggestion?: string }>
  warnings?: Array<{ message: string; position?: number }>
}

export function validateFirewallExpression(expression: string): ExpressionValidationResult {
  const errors: ExpressionValidationResult["errors"] = []
  const warnings: ExpressionValidationResult["warnings"] = []

  if (!expression || expression.trim() === "") {
    return { valid: false, errors: [{ message: "Expression cannot be empty" }] }
  }

  const trimmed = expression.trim()

  const openParens = (trimmed.match(/\(/g) || []).length
  const closeParens = (trimmed.match(/\)/g) || []).length
  if (openParens !== closeParens) {
    errors.push({
      message: `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`,
      suggestion: "Ensure all parentheses are properly matched",
    })
  }

  const openBraces = (trimmed.match(/\{/g) || []).length
  const closeBraces = (trimmed.match(/\}/g) || []).length
  if (openBraces !== closeBraces) {
    errors.push({
      message: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
      suggestion: "Ensure all braces in lists are properly matched",
    })
  }

  const openQuotes = (trimmed.match(/"/g) || []).length
  if (openQuotes % 2 !== 0) {
    errors.push({
      message: "Unbalanced quotes",
      suggestion: 'Ensure all string values are enclosed in quotes: "value"',
    })
  }

  const knownFields = EXPRESSION_FIELDS.map((f) => f.name)
  const fieldPattern = /([a-z][a-z0-9_.]*)\s*(eq|ne|lt|le|gt|ge|contains|matches|in)\s/gi
  let match
  while ((match = fieldPattern.exec(trimmed)) !== null) {
    const fieldName = match[1]
    if (fieldName) {
      const isKnown = knownFields.some((kf) => fieldName.startsWith(kf) || kf.startsWith(fieldName))
      if (!isKnown && !fieldName.startsWith("cf.") && !fieldName.startsWith("http.") && !fieldName.startsWith("ip.")) {
        warnings?.push({ message: `Unknown field: ${fieldName}`, position: match.index })
      }
    }
  }

  const operators = ["eq", "ne", "lt", "le", "gt", "ge", "contains", "matches", "in", "not", "and", "or"]
  const words = trimmed.toLowerCase().split(/\s+/)
  const hasOperator = words.some((w) => operators.includes(w))
  if (!hasOperator) {
    errors.push({
      message: "Expression must contain at least one operator (eq, ne, contains, matches, in, etc.)",
      suggestion: 'Example: ip.src eq "1.2.3.4" or http.request.uri.path contains "/admin"',
    })
  }

  if (trimmed.includes("ip.src eq") || trimmed.includes("ip.src ne")) {
    const ipPattern = /ip\.src\s+(eq|ne)\s+"?(\d+\.\d+\.\d+\.\d+(?:\/\d+)?)"?/i
    const ipMatch = ipPattern.exec(trimmed)
    if (ipMatch && ipMatch[2]) {
      const ipValue = ipMatch[2]
      const ipBase = ipValue.split("/")[0]
      if (ipBase) {
        const parts = ipBase.split(".")
        const validIP = parts.every((p) => {
          const num = parseInt(p, 10)
          return num >= 0 && num <= 255
        })
        if (!validIP) {
          errors.push({
            message: `Invalid IP address: ${ipValue}`,
            suggestion: "Use valid IPv4 address like 192.168.1.1 or CIDR like 10.0.0.0/8",
          })
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings: warnings?.length ? warnings : undefined }
}

export function getExpressionSuggestions(
  partial: string,
  cursorPosition: number
): Array<{ text: string; description: string; type: "field" | "operator" | "value" }> {
  const beforeCursor = partial.slice(0, cursorPosition)
  const words = beforeCursor.split(/\s+/)
  const lastWord = words[words.length - 1] || ""
  const prevWord = words[words.length - 2] || ""

  const suggestions: Array<{ text: string; description: string; type: "field" | "operator" | "value" }> = []

  const isAfterOperator = ["eq", "ne", "lt", "le", "gt", "ge", "contains", "matches", "in"].includes(
    prevWord.toLowerCase()
  )

  if (isAfterOperator) {
    const fieldWord = words[words.length - 3] || ""
    const matchedField = EXPRESSION_FIELDS.find((f) => fieldWord.includes(f.name))
    if (matchedField) {
      matchedField.examples.forEach((ex) => {
        suggestions.push({
          text: matchedField.type === "string" ? `"${ex}"` : ex,
          description: `Example ${matchedField.type} value`,
          type: "value",
        })
      })
    }
  } else if (lastWord.includes(".") || /^[a-z]/i.test(lastWord)) {
    EXPRESSION_FIELDS.filter((f) => f.name.toLowerCase().includes(lastWord.toLowerCase())).forEach((f) => {
      suggestions.push({ text: f.name, description: f.description, type: "field" })
    })
  } else {
    EXPRESSION_OPERATORS.forEach((op) => {
      suggestions.push({ text: op.op, description: op.desc, type: "operator" })
    })
  }

  return suggestions.slice(0, 10)
}
