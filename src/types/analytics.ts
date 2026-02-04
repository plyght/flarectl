export type TimeRange = "24h" | "7d" | "30d" | "custom";

export interface TimeRangeConfig {
  id: TimeRange;
  label: string;
  duration: number;
}

export const TIME_RANGES: TimeRangeConfig[] = [
  { id: "24h", label: "Last 24 Hours", duration: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "Last 7 Days", duration: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "Last 30 Days", duration: 30 * 24 * 60 * 60 * 1000 },
  { id: "custom", label: "Custom Range", duration: 0 },
];

export interface AnalyticsPoint {
  timestamp: Date;
  value: number;
}

export interface TrafficMetrics {
  totalRequests: number;
  uniqueVisitors: number;
  totalBandwidth: number;
  cachedRequests: number;
  uncachedRequests: number;
  threats: number;
  requestsOverTime: AnalyticsPoint[];
  bandwidthOverTime: AnalyticsPoint[];
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  cacheHitRatio: number;
  ttfbAvg: number;
  errorRate: number;
  responseTimeOverTime: AnalyticsPoint[];
  errorRateOverTime: AnalyticsPoint[];
}

export interface GeoTraffic {
  countryCode: string;
  countryName: string;
  requests: number;
  bandwidth: number;
  percentage: number;
}

export interface TopPath {
  path: string;
  requests: number;
  bandwidth: number;
  avgResponseTime: number;
}

export interface TopReferrer {
  referrer: string;
  requests: number;
  percentage: number;
}

export interface TopUserAgent {
  userAgent: string;
  browser: string;
  requests: number;
  percentage: number;
}

export interface HTTPStatusBreakdown {
  status: number;
  statusText: string;
  count: number;
  percentage: number;
}

export interface RequestLog {
  timestamp: Date;
  method: string;
  path: string;
  status: number;
  responseTime: number;
  country: string;
  userAgent: string;
  cached: boolean;
  bytes: number;
}

export interface WorkerMetrics {
  scriptName: string;
  invocations: number;
  errors: number;
  cpuTimeAvg: number;
  cpuTimeP50: number;
  cpuTimeP99: number;
  durationAvg: number;
  durationP50: number;
  durationP99: number;
  requestsOverTime: AnalyticsPoint[];
  errorsOverTime: AnalyticsPoint[];
  cpuTimeOverTime: AnalyticsPoint[];
}

export interface WorkerSummary {
  name: string;
  invocations: number;
  errors: number;
  errorRate: number;
  cpuTimeAvg: number;
}

export interface AnalyticsDashboard {
  traffic: TrafficMetrics;
  performance: PerformanceMetrics;
  geoTraffic: GeoTraffic[];
  topPaths: TopPath[];
  topReferrers: TopReferrer[];
  topUserAgents: TopUserAgent[];
  httpStatus: HTTPStatusBreakdown[];
  workers: WorkerSummary[];
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export interface ZoneAnalyticsData {
  viewer: {
    zones: Array<{
      httpRequests1dGroups?: Array<{
        sum: {
          requests: number;
          bytes: number;
          cachedBytes: number;
          cachedRequests: number;
          threats: number;
          pageViews: number;
        };
        uniq: {
          uniques: number;
        };
        dimensions: {
          date: string;
        };
      }>;
      httpRequests1hGroups?: Array<{
        sum: {
          requests: number;
          bytes: number;
          cachedBytes: number;
          cachedRequests: number;
          threats: number;
        };
        avg: {
          sampleInterval: number;
        };
        dimensions: {
          datetime: string;
        };
      }>;
      httpRequestsAdaptiveGroups?: Array<{
        count: number;
        sum: {
          edgeResponseBytes: number;
        };
        avg: {
          edgeTimeToFirstByteMs: number;
          originResponseDurationMs: number;
        };
        dimensions: {
          clientCountryName?: string;
          clientRequestPath?: string;
          clientRequestHTTPHost?: string;
          clientRefererHost?: string;
          userAgent?: string;
          edgeResponseStatus?: number;
          datetime?: string;
          datetimeHour?: string;
          cacheStatus?: string;
        };
      }>;
      firewallEventsAdaptiveGroups?: Array<{
        count: number;
        dimensions: {
          action: string;
          clientCountryName: string;
          datetime: string;
        };
      }>;
    }>;
  };
}

export interface WorkerAnalyticsData {
  viewer: {
    accounts: Array<{
      workersInvocationsAdaptive?: Array<{
        sum: {
          requests: number;
          errors: number;
          subrequests: number;
        };
        quantiles: {
          cpuTimeP50: number;
          cpuTimeP99: number;
          durationP50: number;
          durationP99: number;
        };
        dimensions: {
          scriptName: string;
          datetime?: string;
        };
      }>;
    }>;
  };
}

export const COUNTRY_CODES: Record<string, string> = {
  US: "United States",
  CN: "China",
  JP: "Japan",
  DE: "Germany",
  GB: "United Kingdom",
  FR: "France",
  IN: "India",
  BR: "Brazil",
  CA: "Canada",
  AU: "Australia",
  RU: "Russia",
  KR: "South Korea",
  IT: "Italy",
  ES: "Spain",
  MX: "Mexico",
  NL: "Netherlands",
  PL: "Poland",
  SE: "Sweden",
  SG: "Singapore",
  HK: "Hong Kong",
  TW: "Taiwan",
  ID: "Indonesia",
  TR: "Turkey",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  ZA: "South Africa",
  NG: "Nigeria",
  EG: "Egypt",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  IL: "Israel",
  TH: "Thailand",
  VN: "Vietnam",
  MY: "Malaysia",
  PH: "Philippines",
  NZ: "New Zealand",
  IE: "Ireland",
  DK: "Denmark",
  NO: "Norway",
  FI: "Finland",
  PT: "Portugal",
  CZ: "Czech Republic",
  RO: "Romania",
  HU: "Hungary",
  UA: "Ukraine",
  GR: "Greece",
};

export const HTTP_STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};
