export type RouteId =
  | "dashboard"
  | "dns"
  | "workers"
  | "pages"
  | "r2"
  | "kv"
  | "d1"
  | "analytics"
  | "firewall"
  | "waf"
  | "ssl"
  | "domains"
  | "stream"
  | "images"
  | "cache"
  | "loadbalancer"
  | "spectrum"
  | "email"
  | "pagerules";

export interface RouteConfig {
  id: RouteId;
  label: string;
  icon: string;
}

export const ROUTES: RouteConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: "◉" },
  { id: "dns", label: "DNS", icon: "◎" },
  { id: "workers", label: "Workers", icon: "⚙" },
  { id: "pages", label: "Pages", icon: "◱" },
  { id: "r2", label: "R2", icon: "◫" },
  { id: "kv", label: "KV", icon: "◧" },
  { id: "d1", label: "D1", icon: "◨" },
  { id: "analytics", label: "Analytics", icon: "◰" },
  { id: "firewall", label: "Firewall", icon: "◲" },
  { id: "waf", label: "WAF", icon: "◳" },
  { id: "ssl", label: "SSL", icon: "◴" },
  { id: "domains", label: "Domains", icon: "◵" },
  { id: "stream", label: "Stream", icon: "▷" },
  { id: "images", label: "Images", icon: "◻" },
  { id: "cache", label: "Cache", icon: "◈" },
  { id: "loadbalancer", label: "Load Balancer", icon: "⊛" },
  { id: "spectrum", label: "Spectrum", icon: "◇" },
  { id: "email", label: "Email", icon: "✉" },
  { id: "pagerules", label: "Page Rules", icon: "⚑" },
];

export interface CloudflareZone {
  id: string;
  name: string;
  status: "active" | "pending" | "initializing" | "moved" | "deleted" | "deactivated";
  paused: boolean;
  type: "full" | "partial" | "secondary";
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  original_registrar: string | null;
  original_dnshost: string | null;
  modified_on: string;
  created_on: string;
  activated_on: string;
  meta: {
    step: number;
    custom_certificate_quota: number;
    page_rule_quota: number;
    phishing_detected: boolean;
    multiple_railguns_allowed: boolean;
  };
  owner: {
    id: string;
    type: string;
    email: string;
  };
  account: {
    id: string;
    name: string;
  };
  permissions: string[];
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    frequency: string;
    is_subscribed: boolean;
    can_subscribe: boolean;
    legacy_id: string;
    legacy_discount: boolean;
    externally_managed: boolean;
  };
}

export interface CloudflareDNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "CAA" | "SRV" | "HTTPS" | "SVCB";
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: {
    auto_added: boolean;
    managed_by_apps: boolean;
    managed_by_argo_tunnel: boolean;
  };
  comment: string | null;
  tags: string[];
  created_on: string;
  modified_on: string;
}

export interface CloudflareWorker {
  id: string;
  name: string;
  created_on: string;
  modified_on: string;
  usage_model: "bundled" | "unbound";
}

export interface CloudflareKVNamespace {
  id: string;
  title: string;
  supports_url_encoding: boolean;
}

export interface CloudflareD1Database {
  uuid: string;
  name: string;
  version: string;
  num_tables: number;
  file_size: number;
  created_at: string;
}

export interface CloudflareR2Bucket {
  name: string;
  creation_date: string;
  location: string;
}

export interface ApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
}
