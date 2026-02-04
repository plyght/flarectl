import { getAuthHeaders, getAccountId } from "./auth.ts";

const API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    cursor?: string;
  };
}

async function cfFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = (await response.json()) as CloudflareResponse<T>;

  if (!data.success) {
    const errorMsg = data.errors.map((e) => e.message).join(", ");
    throw new Error(errorMsg || "Cloudflare API request failed");
  }

  return data.result;
}

export interface Zone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  original_registrar: string;
  original_dnshost: string;
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

export async function listZones(): Promise<Zone[]> {
  return cfFetch<Zone[]>("/zones");
}

export async function getZone(zoneId: string): Promise<Zone> {
  return cfFetch<Zone>(`/zones/${zoneId}`);
}

export interface DNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: {
    auto_added: boolean;
    managed_by_apps: boolean;
    managed_by_argo_tunnel: boolean;
    source: string;
  };
  comment: string | null;
  tags: string[];
  created_on: string;
  modified_on: string;
  priority?: number;
}

export interface CreateDNSRecordParams {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
}

export interface UpdateDNSRecordParams {
  type?: string;
  name?: string;
  content?: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
}

export async function listDNSRecords(zoneId: string): Promise<DNSRecord[]> {
  return cfFetch<DNSRecord[]>(`/zones/${zoneId}/dns_records`);
}

export async function getDNSRecord(zoneId: string, recordId: string): Promise<DNSRecord> {
  return cfFetch<DNSRecord>(`/zones/${zoneId}/dns_records/${recordId}`);
}

export async function createDNSRecord(
  zoneId: string,
  params: CreateDNSRecordParams
): Promise<DNSRecord> {
  return cfFetch<DNSRecord>(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateDNSRecord(
  zoneId: string,
  recordId: string,
  params: UpdateDNSRecordParams
): Promise<DNSRecord> {
  return cfFetch<DNSRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

export async function deleteDNSRecord(zoneId: string, recordId: string): Promise<void> {
  await cfFetch<{ id: string }>(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
  });
}

export interface Worker {
  id: string;
  etag: string;
  handlers: string[];
  named_handlers?: Array<{ name: string; entrypoint: string }>;
  modified_on: string;
  created_on: string;
  usage_model: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
}

export async function listWorkers(): Promise<Worker[]> {
  const accountId = getAccountId();
  const response = await cfFetch<{ scripts: Worker[] }>(
    `/accounts/${accountId}/workers/scripts`
  );
  return response.scripts || [];
}

export interface KVNamespace {
  id: string;
  title: string;
  supports_url_encoding?: boolean;
}

export async function listKVNamespaces(): Promise<KVNamespace[]> {
  const accountId = getAccountId();
  return cfFetch<KVNamespace[]>(
    `/accounts/${accountId}/storage/kv/namespaces`
  );
}

export interface PagesProject {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  created_on: string;
  production_branch: string;
}

export async function listPagesProjects(): Promise<PagesProject[]> {
  const accountId = getAccountId();
  return cfFetch<PagesProject[]>(`/accounts/${accountId}/pages/projects`);
}

export interface R2Bucket {
  name: string;
  creation_date: string;
  location?: string;
}

export async function listR2Buckets(): Promise<R2Bucket[]> {
  const accountId = getAccountId();
  const response = await cfFetch<{ buckets: R2Bucket[] }>(
    `/accounts/${accountId}/r2/buckets`
  );
  return response.buckets || [];
}

export interface D1Database {
  uuid: string;
  name: string;
  version: string;
  num_tables?: number;
  file_size?: number;
  created_at: string;
}

export async function listD1Databases(): Promise<D1Database[]> {
  const accountId = getAccountId();
  return cfFetch<D1Database[]>(`/accounts/${accountId}/d1/database`);
}

export interface Domain {
  id: string;
  name: string;
  status: string;
  auto_renew: boolean;
  locked: boolean;
  registrant_contact?: {
    first_name: string;
    last_name: string;
    organization: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  expires_at: string;
  created_at: string;
  updated_at: string;
  available?: boolean;
  premium?: boolean;
  can_register?: boolean;
}

export interface DomainAvailability {
  name: string;
  available: boolean;
  premium: boolean;
  can_register: boolean;
  icann_fee?: number;
  price?: number;
}

export async function listDomains(): Promise<Domain[]> {
  const accountId = getAccountId();
  return cfFetch<Domain[]>(`/accounts/${accountId}/registrar/domains`);
}

export async function getDomain(domainName: string): Promise<Domain> {
  const accountId = getAccountId();
  return cfFetch<Domain>(`/accounts/${accountId}/registrar/domains/${domainName}`);
}

export async function checkDomainAvailability(domainName: string): Promise<DomainAvailability> {
  const accountId = getAccountId();
  return cfFetch<DomainAvailability>(`/accounts/${accountId}/registrar/domains/${domainName}/availability`);
}

export async function updateDomain(domainName: string, params: { auto_renew?: boolean; locked?: boolean }): Promise<Domain> {
  const accountId = getAccountId();
  return cfFetch<Domain>(`/accounts/${accountId}/registrar/domains/${domainName}`, {
    method: "PUT",
    body: JSON.stringify(params),
  });
}

export interface StreamVideo {
  uid: string;
  thumbnail: string;
  thumbnailTimestampPct: number;
  readyToStream: boolean;
  status: {
    state: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: Record<string, unknown>;
  created: string;
  modified: string;
  size: number;
  preview: string;
  allowedOrigins: string[];
  requireSignedURLs: boolean;
  uploaded: string;
  uploadExpiry?: string;
  maxSizeBytes?: number;
  maxDurationSeconds?: number;
  duration: number;
  input: {
    width: number;
    height: number;
  };
  playback: {
    hls: string;
    dash: string;
  };
}

export interface StreamUploadParams {
  maxDurationSeconds?: number;
  allowedOrigins?: string[];
  requireSignedURLs?: boolean;
  meta?: Record<string, string>;
}

export async function listStreamVideos(): Promise<StreamVideo[]> {
  const accountId = getAccountId();
  return cfFetch<StreamVideo[]>(`/accounts/${accountId}/stream`);
}

export async function getStreamVideo(videoId: string): Promise<StreamVideo> {
  const accountId = getAccountId();
  return cfFetch<StreamVideo>(`/accounts/${accountId}/stream/${videoId}`);
}

export async function deleteStreamVideo(videoId: string): Promise<void> {
  const accountId = getAccountId();
  await cfFetch<void>(`/accounts/${accountId}/stream/${videoId}`, {
    method: "DELETE",
  });
}

export async function createStreamDirectUpload(params: StreamUploadParams): Promise<{ uploadURL: string; uid: string }> {
  const accountId = getAccountId();
  return cfFetch<{ uploadURL: string; uid: string }>(`/accounts/${accountId}/stream/direct_upload`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export interface ImageVariant {
  id: string;
  options: {
    fit: string;
    width?: number;
    height?: number;
    metadata?: string;
  };
  neverRequireSignedURLs?: boolean;
}

export interface CloudflareImage {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
  meta?: Record<string, string>;
}

export interface ImagesStats {
  count: {
    current: number;
    allowed: number;
  };
}

export async function listImages(): Promise<CloudflareImage[]> {
  const accountId = getAccountId();
  const response = await cfFetch<{ images: CloudflareImage[] }>(`/accounts/${accountId}/images/v1`);
  return response.images || [];
}

export async function getImage(imageId: string): Promise<CloudflareImage> {
  const accountId = getAccountId();
  return cfFetch<CloudflareImage>(`/accounts/${accountId}/images/v1/${imageId}`);
}

export async function deleteImage(imageId: string): Promise<void> {
  const accountId = getAccountId();
  await cfFetch<void>(`/accounts/${accountId}/images/v1/${imageId}`, {
    method: "DELETE",
  });
}

export async function listImageVariants(): Promise<ImageVariant[]> {
  const accountId = getAccountId();
  const response = await cfFetch<{ variants: Record<string, ImageVariant> }>(`/accounts/${accountId}/images/v1/variants`);
  return Object.values(response.variants || {});
}

export async function createImageVariant(id: string, options: ImageVariant["options"]): Promise<ImageVariant> {
  const accountId = getAccountId();
  return cfFetch<ImageVariant>(`/accounts/${accountId}/images/v1/variants`, {
    method: "POST",
    body: JSON.stringify({ id, options }),
  });
}

export async function deleteImageVariant(variantId: string): Promise<void> {
  const accountId = getAccountId();
  await cfFetch<void>(`/accounts/${accountId}/images/v1/variants/${variantId}`, {
    method: "DELETE",
  });
}

export async function getImagesStats(): Promise<ImagesStats> {
  const accountId = getAccountId();
  return cfFetch<ImagesStats>(`/accounts/${accountId}/images/v1/stats`);
}

export interface CachePurgeParams {
  purge_everything?: boolean;
  files?: string[];
  tags?: string[];
  hosts?: string[];
  prefixes?: string[];
}

export interface CacheSettings {
  browser_cache_ttl?: { value: number };
  always_online?: { value: string };
  development_mode?: { value: string };
  cache_level?: { value: string };
}

export interface CacheRule {
  id: string;
  expression: string;
  action: string;
  action_parameters?: Record<string, unknown>;
  description?: string;
  enabled: boolean;
}

export async function purgeCache(zoneId: string, params: CachePurgeParams): Promise<{ id: string }> {
  return cfFetch<{ id: string }>(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getCacheSettings(zoneId: string): Promise<CacheSettings> {
  const settings: CacheSettings = {};
  try {
    settings.browser_cache_ttl = await cfFetch(`/zones/${zoneId}/settings/browser_cache_ttl`);
    settings.always_online = await cfFetch(`/zones/${zoneId}/settings/always_online`);
    settings.development_mode = await cfFetch(`/zones/${zoneId}/settings/development_mode`);
    settings.cache_level = await cfFetch(`/zones/${zoneId}/settings/cache_level`);
  } catch {
  }
  return settings;
}

export async function updateCacheSetting(zoneId: string, setting: string, value: unknown): Promise<void> {
  await cfFetch(`/zones/${zoneId}/settings/${setting}`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}

export async function listCacheRules(zoneId: string): Promise<CacheRule[]> {
  const response = await cfFetch<{ rules: CacheRule[] }>(`/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`);
  return response.rules || [];
}

export interface LoadBalancerPool {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  minimum_origins?: number;
  monitor?: string;
  origins: Array<{
    name: string;
    address: string;
    enabled: boolean;
    weight: number;
    header?: Record<string, string[]>;
  }>;
  notification_email?: string;
  check_regions?: string[];
  created_on: string;
  modified_on: string;
  healthy?: boolean;
}

export interface LoadBalancerMonitor {
  id: string;
  type: string;
  description?: string;
  method?: string;
  path?: string;
  header?: Record<string, string[]>;
  port?: number;
  timeout: number;
  retries: number;
  interval: number;
  expected_body?: string;
  expected_codes?: string;
  follow_redirects?: boolean;
  allow_insecure?: boolean;
  probe_zone?: string;
  created_on: string;
  modified_on: string;
}

export interface LoadBalancer {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  ttl?: number;
  fallback_pool: string;
  default_pools: string[];
  region_pools?: Record<string, string[]>;
  pop_pools?: Record<string, string[]>;
  proxied: boolean;
  steering_policy?: string;
  session_affinity?: string;
  session_affinity_ttl?: number;
  session_affinity_attributes?: Record<string, unknown>;
  rules?: Array<{
    name: string;
    condition: string;
    overrides: Record<string, unknown>;
    disabled?: boolean;
  }>;
  created_on: string;
  modified_on: string;
}

export async function listLoadBalancerPools(): Promise<LoadBalancerPool[]> {
  const accountId = getAccountId();
  return cfFetch<LoadBalancerPool[]>(`/accounts/${accountId}/load_balancers/pools`);
}

export async function getLoadBalancerPool(poolId: string): Promise<LoadBalancerPool> {
  const accountId = getAccountId();
  return cfFetch<LoadBalancerPool>(`/accounts/${accountId}/load_balancers/pools/${poolId}`);
}

export async function createLoadBalancerPool(params: Omit<LoadBalancerPool, "id" | "created_on" | "modified_on">): Promise<LoadBalancerPool> {
  const accountId = getAccountId();
  return cfFetch<LoadBalancerPool>(`/accounts/${accountId}/load_balancers/pools`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateLoadBalancerPool(poolId: string, params: Partial<LoadBalancerPool>): Promise<LoadBalancerPool> {
  const accountId = getAccountId();
  return cfFetch<LoadBalancerPool>(`/accounts/${accountId}/load_balancers/pools/${poolId}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

export async function deleteLoadBalancerPool(poolId: string): Promise<void> {
  const accountId = getAccountId();
  await cfFetch<void>(`/accounts/${accountId}/load_balancers/pools/${poolId}`, {
    method: "DELETE",
  });
}

export async function listLoadBalancerMonitors(): Promise<LoadBalancerMonitor[]> {
  const accountId = getAccountId();
  return cfFetch<LoadBalancerMonitor[]>(`/accounts/${accountId}/load_balancers/monitors`);
}

export async function createLoadBalancerMonitor(params: Omit<LoadBalancerMonitor, "id" | "created_on" | "modified_on">): Promise<LoadBalancerMonitor> {
  const accountId = getAccountId();
  return cfFetch<LoadBalancerMonitor>(`/accounts/${accountId}/load_balancers/monitors`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function deleteLoadBalancerMonitor(monitorId: string): Promise<void> {
  const accountId = getAccountId();
  await cfFetch<void>(`/accounts/${accountId}/load_balancers/monitors/${monitorId}`, {
    method: "DELETE",
  });
}

export async function listLoadBalancers(zoneId: string): Promise<LoadBalancer[]> {
  return cfFetch<LoadBalancer[]>(`/zones/${zoneId}/load_balancers`);
}

export async function getLoadBalancerPoolHealth(poolId: string): Promise<Record<string, unknown>> {
  const accountId = getAccountId();
  return cfFetch<Record<string, unknown>>(`/accounts/${accountId}/load_balancers/pools/${poolId}/health`);
}

export interface SpectrumApp {
  id: string;
  protocol: string;
  dns: {
    type: string;
    name: string;
  };
  origin_direct?: string[];
  origin_dns?: {
    name: string;
  };
  origin_port?: number | string;
  ip_firewall: boolean;
  proxy_protocol?: string;
  tls?: string;
  edge_ips?: {
    type: string;
    connectivity?: string;
    ips?: string[];
  };
  argo_smart_routing?: boolean;
  created_on: string;
  modified_on: string;
}

export async function listSpectrumApps(zoneId: string): Promise<SpectrumApp[]> {
  return cfFetch<SpectrumApp[]>(`/zones/${zoneId}/spectrum/apps`);
}

export async function getSpectrumApp(zoneId: string, appId: string): Promise<SpectrumApp> {
  return cfFetch<SpectrumApp>(`/zones/${zoneId}/spectrum/apps/${appId}`);
}

export async function createSpectrumApp(zoneId: string, params: Omit<SpectrumApp, "id" | "created_on" | "modified_on">): Promise<SpectrumApp> {
  return cfFetch<SpectrumApp>(`/zones/${zoneId}/spectrum/apps`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateSpectrumApp(zoneId: string, appId: string, params: Partial<SpectrumApp>): Promise<SpectrumApp> {
  return cfFetch<SpectrumApp>(`/zones/${zoneId}/spectrum/apps/${appId}`, {
    method: "PUT",
    body: JSON.stringify(params),
  });
}

export async function deleteSpectrumApp(zoneId: string, appId: string): Promise<void> {
  await cfFetch<void>(`/zones/${zoneId}/spectrum/apps/${appId}`, {
    method: "DELETE",
  });
}

export interface EmailRoutingRule {
  id: string;
  tag: string;
  name: string;
  priority: number;
  enabled: boolean;
  matchers: Array<{
    type: string;
    field: string;
    value: string;
  }>;
  actions: Array<{
    type: string;
    value: string[];
  }>;
}

export interface EmailRoutingAddress {
  id: string;
  tag: string;
  email: string;
  verified?: string;
  created: string;
  modified: string;
}

export interface EmailRoutingSettings {
  id: string;
  tag: string;
  name: string;
  enabled: boolean;
  created: string;
  modified: string;
  skip_wizard: boolean;
  status?: string;
}

export async function getEmailRoutingSettings(zoneId: string): Promise<EmailRoutingSettings> {
  return cfFetch<EmailRoutingSettings>(`/zones/${zoneId}/email/routing`);
}

export async function enableEmailRouting(zoneId: string): Promise<EmailRoutingSettings> {
  return cfFetch<EmailRoutingSettings>(`/zones/${zoneId}/email/routing/enable`, {
    method: "POST",
  });
}

export async function disableEmailRouting(zoneId: string): Promise<EmailRoutingSettings> {
  return cfFetch<EmailRoutingSettings>(`/zones/${zoneId}/email/routing/disable`, {
    method: "POST",
  });
}

export async function listEmailRoutingRules(zoneId: string): Promise<EmailRoutingRule[]> {
  return cfFetch<EmailRoutingRule[]>(`/zones/${zoneId}/email/routing/rules`);
}

export async function createEmailRoutingRule(zoneId: string, params: Omit<EmailRoutingRule, "id" | "tag">): Promise<EmailRoutingRule> {
  return cfFetch<EmailRoutingRule>(`/zones/${zoneId}/email/routing/rules`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateEmailRoutingRule(zoneId: string, ruleId: string, params: Partial<EmailRoutingRule>): Promise<EmailRoutingRule> {
  return cfFetch<EmailRoutingRule>(`/zones/${zoneId}/email/routing/rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(params),
  });
}

export async function deleteEmailRoutingRule(zoneId: string, ruleId: string): Promise<void> {
  await cfFetch<void>(`/zones/${zoneId}/email/routing/rules/${ruleId}`, {
    method: "DELETE",
  });
}

export async function listEmailRoutingAddresses(): Promise<EmailRoutingAddress[]> {
  const accountId = getAccountId();
  return cfFetch<EmailRoutingAddress[]>(`/accounts/${accountId}/email/routing/addresses`);
}

export async function createEmailRoutingAddress(email: string): Promise<EmailRoutingAddress> {
  const accountId = getAccountId();
  return cfFetch<EmailRoutingAddress>(`/accounts/${accountId}/email/routing/addresses`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function deleteEmailRoutingAddress(addressId: string): Promise<void> {
  const accountId = getAccountId();
  await cfFetch<void>(`/accounts/${accountId}/email/routing/addresses/${addressId}`, {
    method: "DELETE",
  });
}

export interface PageRule {
  id: string;
  targets: Array<{
    target: string;
    constraint: {
      operator: string;
      value: string;
    };
  }>;
  actions: Array<{
    id: string;
    value?: unknown;
  }>;
  priority: number;
  status: "active" | "disabled";
  created_on: string;
  modified_on: string;
}

export async function listPageRules(zoneId: string): Promise<PageRule[]> {
  return cfFetch<PageRule[]>(`/zones/${zoneId}/pagerules`);
}

export async function getPageRule(zoneId: string, ruleId: string): Promise<PageRule> {
  return cfFetch<PageRule>(`/zones/${zoneId}/pagerules/${ruleId}`);
}

export async function createPageRule(zoneId: string, params: Omit<PageRule, "id" | "created_on" | "modified_on">): Promise<PageRule> {
  return cfFetch<PageRule>(`/zones/${zoneId}/pagerules`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updatePageRule(zoneId: string, ruleId: string, params: Partial<PageRule>): Promise<PageRule> {
  return cfFetch<PageRule>(`/zones/${zoneId}/pagerules/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

export async function deletePageRule(zoneId: string, ruleId: string): Promise<void> {
  await cfFetch<void>(`/zones/${zoneId}/pagerules/${ruleId}`, {
    method: "DELETE",
  });
}
