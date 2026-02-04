import { getAuthHeaders, getAccountId, loadCredentials } from "./auth.ts";
import type {
  TimeRange,
  TrafficMetrics,
  PerformanceMetrics,
  GeoTraffic,
  TopPath,
  TopReferrer,
  TopUserAgent,
  HTTPStatusBreakdown,
  RequestLog,
  WorkerMetrics,
  WorkerSummary,
  AnalyticsPoint,
  GraphQLResponse,
  ZoneAnalyticsData,
  WorkerAnalyticsData,
} from "../types/analytics.ts";

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

function getTimeRange(range: TimeRange): { start: string; end: string } {
  const end = new Date();
  let start: Date;

  switch (range) {
    case "24h":
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getDateRange(range: TimeRange): { start: string; end: string } {
  const end = new Date();
  let start: Date;

  switch (range) {
    case "24h":
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  return {
    start: startStr ?? start.toISOString().substring(0, 10),
    end: endStr ?? end.toISOString().substring(0, 10),
  };
}

async function graphqlQuery<T>(query: string, variables: Record<string, unknown>): Promise<GraphQLResponse<T>> {
  await loadCredentials();
  const headers = getAuthHeaders();
  
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json() as GraphQLResponse<T>;
  return data;
}

export async function fetchTrafficMetrics(zoneId: string, range: TimeRange): Promise<TrafficMetrics> {
  const { start, end } = getTimeRange(range);
  const dateRange = getDateRange(range);

  const query = `
    query TrafficMetrics($zoneTag: string!, $start: Time!, $end: Time!, $dateStart: Date!, $dateEnd: Date!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1dGroups(filter: { date_geq: $dateStart, date_leq: $dateEnd }, limit: 31, orderBy: [date_ASC]) {
            sum {
              requests
              bytes
              cachedBytes
              cachedRequests
              threats
              pageViews
            }
            uniq {
              uniques
            }
            dimensions {
              date
            }
          }
          httpRequests1hGroups(filter: { datetime_geq: $start, datetime_leq: $end }, limit: 720, orderBy: [datetime_ASC]) {
            sum {
              requests
              bytes
              cachedRequests
            }
            dimensions {
              datetime
            }
          }
        }
      }
    }
  `;

  const variables = {
    zoneTag: zoneId,
    start,
    end,
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
  };

  const result = await graphqlQuery<ZoneAnalyticsData>(query, variables);
  
  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) {
    return {
      totalRequests: 0,
      uniqueVisitors: 0,
      totalBandwidth: 0,
      cachedRequests: 0,
      uncachedRequests: 0,
      threats: 0,
      requestsOverTime: [],
      bandwidthOverTime: [],
    };
  }

  const dailyData = zone.httpRequests1dGroups ?? [];
  const hourlyData = zone.httpRequests1hGroups ?? [];

  const totals = dailyData.reduce(
    (acc, day) => ({
      requests: acc.requests + day.sum.requests,
      bytes: acc.bytes + day.sum.bytes,
      cachedBytes: acc.cachedBytes + day.sum.cachedBytes,
      cachedRequests: acc.cachedRequests + day.sum.cachedRequests,
      threats: acc.threats + day.sum.threats,
      uniqueVisitors: acc.uniqueVisitors + day.uniq.uniques,
    }),
    { requests: 0, bytes: 0, cachedBytes: 0, cachedRequests: 0, threats: 0, uniqueVisitors: 0 }
  );

  const requestsOverTime: AnalyticsPoint[] = hourlyData.map((h) => ({
    timestamp: new Date(h.dimensions.datetime),
    value: h.sum.requests,
  }));

  const bandwidthOverTime: AnalyticsPoint[] = hourlyData.map((h) => ({
    timestamp: new Date(h.dimensions.datetime),
    value: h.sum.bytes,
  }));

  return {
    totalRequests: totals.requests,
    uniqueVisitors: totals.uniqueVisitors,
    totalBandwidth: totals.bytes,
    cachedRequests: totals.cachedRequests,
    uncachedRequests: totals.requests - totals.cachedRequests,
    threats: totals.threats,
    requestsOverTime,
    bandwidthOverTime,
  };
}

export async function fetchPerformanceMetrics(zoneId: string, range: TimeRange): Promise<PerformanceMetrics> {
  const { start, end } = getTimeRange(range);

  const query = `
    query PerformanceMetrics($zoneTag: string!, $start: Time!, $end: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: 1000
            orderBy: [datetime_ASC]
          ) {
            count
            sum {
              edgeResponseBytes
            }
            avg {
              edgeTimeToFirstByteMs
              originResponseDurationMs
            }
            dimensions {
              datetimeHour
              cacheStatus
              edgeResponseStatus
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<ZoneAnalyticsData>(query, { zoneTag: zoneId, start, end });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) {
    return {
      avgResponseTime: 0,
      cacheHitRatio: 0,
      ttfbAvg: 0,
      errorRate: 0,
      responseTimeOverTime: [],
      errorRateOverTime: [],
    };
  }

  const groups = zone.httpRequestsAdaptiveGroups ?? [];
  
  let totalRequests = 0;
  let cachedRequests = 0;
  let totalTTFB = 0;
  let totalResponseTime = 0;
  let errorRequests = 0;
  let ttfbCount = 0;

  const responseTimeByHour: Map<string, { total: number; count: number }> = new Map();
  const errorsByHour: Map<string, { errors: number; total: number }> = new Map();

  for (const group of groups) {
    const count = group.count;
    totalRequests += count;
    
    if (group.dimensions.cacheStatus === "hit" || group.dimensions.cacheStatus === "stale") {
      cachedRequests += count;
    }
    
    if (group.avg.edgeTimeToFirstByteMs) {
      totalTTFB += group.avg.edgeTimeToFirstByteMs * count;
      ttfbCount += count;
    }
    
    if (group.avg.originResponseDurationMs) {
      totalResponseTime += group.avg.originResponseDurationMs * count;
    }
    
    const status = group.dimensions.edgeResponseStatus ?? 0;
    if (status >= 500) {
      errorRequests += count;
    }

    const hour = group.dimensions.datetimeHour;
    if (hour) {
      const existing = responseTimeByHour.get(hour) ?? { total: 0, count: 0 };
      existing.total += (group.avg.originResponseDurationMs ?? 0) * count;
      existing.count += count;
      responseTimeByHour.set(hour, existing);

      const errorExisting = errorsByHour.get(hour) ?? { errors: 0, total: 0 };
      errorExisting.total += count;
      if (status >= 500) {
        errorExisting.errors += count;
      }
      errorsByHour.set(hour, errorExisting);
    }
  }

  const responseTimeOverTime: AnalyticsPoint[] = Array.from(responseTimeByHour.entries())
    .map(([hour, data]) => ({
      timestamp: new Date(hour),
      value: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const errorRateOverTime: AnalyticsPoint[] = Array.from(errorsByHour.entries())
    .map(([hour, data]) => ({
      timestamp: new Date(hour),
      value: data.total > 0 ? (data.errors / data.total) * 100 : 0,
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
    cacheHitRatio: totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0,
    ttfbAvg: ttfbCount > 0 ? totalTTFB / ttfbCount : 0,
    errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
    responseTimeOverTime,
    errorRateOverTime,
  };
}

export async function fetchGeoTraffic(zoneId: string, range: TimeRange): Promise<GeoTraffic[]> {
  const { start, end } = getTimeRange(range);

  const query = `
    query GeoTraffic($zoneTag: string!, $start: Time!, $end: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: 250
            orderBy: [count_DESC]
          ) {
            count
            sum {
              edgeResponseBytes
            }
            dimensions {
              clientCountryName
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<ZoneAnalyticsData>(query, { zoneTag: zoneId, start, end });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) return [];

  const groups = zone.httpRequestsAdaptiveGroups ?? [];
  const countryMap: Map<string, { requests: number; bandwidth: number }> = new Map();
  let totalRequests = 0;

  for (const group of groups) {
    const country = group.dimensions.clientCountryName ?? "Unknown";
    totalRequests += group.count;
    
    const existing = countryMap.get(country) ?? { requests: 0, bandwidth: 0 };
    existing.requests += group.count;
    existing.bandwidth += group.sum.edgeResponseBytes;
    countryMap.set(country, existing);
  }

  return Array.from(countryMap.entries())
    .map(([country, data]) => ({
      countryCode: getCountryCode(country),
      countryName: country,
      requests: data.requests,
      bandwidth: data.bandwidth,
      percentage: totalRequests > 0 ? (data.requests / totalRequests) * 100 : 0,
    }))
    .sort((a, b) => b.requests - a.requests);
}

function getCountryCode(countryName: string): string {
  const codeMap: Record<string, string> = {
    "United States": "US",
    "China": "CN",
    "Japan": "JP",
    "Germany": "DE",
    "United Kingdom": "GB",
    "France": "FR",
    "India": "IN",
    "Brazil": "BR",
    "Canada": "CA",
    "Australia": "AU",
    "Russia": "RU",
    "South Korea": "KR",
    "Italy": "IT",
    "Spain": "ES",
    "Mexico": "MX",
    "Netherlands": "NL",
    "Singapore": "SG",
    "Hong Kong": "HK",
  };
  return codeMap[countryName] ?? "XX";
}

export async function fetchTopPaths(zoneId: string, range: TimeRange, limit = 10): Promise<TopPath[]> {
  const { start, end } = getTimeRange(range);

  const query = `
    query TopPaths($zoneTag: string!, $start: Time!, $end: Time!, $limit: Int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: $limit
            orderBy: [count_DESC]
          ) {
            count
            sum {
              edgeResponseBytes
            }
            avg {
              originResponseDurationMs
            }
            dimensions {
              clientRequestPath
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<ZoneAnalyticsData>(query, { zoneTag: zoneId, start, end, limit });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) return [];

  return (zone.httpRequestsAdaptiveGroups ?? [])
    .filter((g) => g.dimensions.clientRequestPath)
    .map((g) => ({
      path: g.dimensions.clientRequestPath ?? "/",
      requests: g.count,
      bandwidth: g.sum.edgeResponseBytes,
      avgResponseTime: g.avg.originResponseDurationMs ?? 0,
    }));
}

export async function fetchTopReferrers(zoneId: string, range: TimeRange, limit = 10): Promise<TopReferrer[]> {
  const { start, end } = getTimeRange(range);

  const query = `
    query TopReferrers($zoneTag: string!, $start: Time!, $end: Time!, $limit: Int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: $limit
            orderBy: [count_DESC]
          ) {
            count
            dimensions {
              clientRefererHost
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<ZoneAnalyticsData>(query, { zoneTag: zoneId, start, end, limit: limit + 10 });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) return [];

  const groups = (zone.httpRequestsAdaptiveGroups ?? []).filter((g) => g.dimensions.clientRefererHost);
  const totalRequests = groups.reduce((acc, g) => acc + g.count, 0);

  return groups
    .slice(0, limit)
    .map((g) => ({
      referrer: g.dimensions.clientRefererHost ?? "Direct",
      requests: g.count,
      percentage: totalRequests > 0 ? (g.count / totalRequests) * 100 : 0,
    }));
}

export async function fetchTopUserAgents(zoneId: string, range: TimeRange, limit = 10): Promise<TopUserAgent[]> {
  const { start, end } = getTimeRange(range);

  const query = `
    query TopUserAgents($zoneTag: string!, $start: Time!, $end: Time!, $limit: Int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: $limit
            orderBy: [count_DESC]
          ) {
            count
            dimensions {
              userAgent
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<ZoneAnalyticsData>(query, { zoneTag: zoneId, start, end, limit: limit + 10 });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) return [];

  const groups = (zone.httpRequestsAdaptiveGroups ?? []).filter((g) => g.dimensions.userAgent);
  const totalRequests = groups.reduce((acc, g) => acc + g.count, 0);

  return groups
    .slice(0, limit)
    .map((g) => {
      const ua = g.dimensions.userAgent ?? "Unknown";
      return {
        userAgent: ua.substring(0, 50) + (ua.length > 50 ? "..." : ""),
        browser: parseBrowser(ua),
        requests: g.count,
        percentage: totalRequests > 0 ? (g.count / totalRequests) * 100 : 0,
      };
    });
}

function parseBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome") && !ua.includes("edge")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("edge")) return "Edge";
  if (ua.includes("bot") || ua.includes("crawler")) return "Bot";
  return "Other";
}

export async function fetchHTTPStatusBreakdown(zoneId: string, range: TimeRange): Promise<HTTPStatusBreakdown[]> {
  const { start, end } = getTimeRange(range);

  const query = `
    query HTTPStatus($zoneTag: string!, $start: Time!, $end: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: 100
            orderBy: [count_DESC]
          ) {
            count
            dimensions {
              edgeResponseStatus
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<ZoneAnalyticsData>(query, { zoneTag: zoneId, start, end });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) return [];

  const groups = (zone.httpRequestsAdaptiveGroups ?? []).filter((g) => g.dimensions.edgeResponseStatus);
  const totalRequests = groups.reduce((acc, g) => acc + g.count, 0);

  const httpStatusText: Record<number, string> = {
    200: "OK", 201: "Created", 204: "No Content",
    301: "Moved", 302: "Found", 304: "Not Modified",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
    404: "Not Found", 429: "Too Many Requests",
    500: "Server Error", 502: "Bad Gateway", 503: "Unavailable", 504: "Timeout",
  };

  return groups.map((g) => {
    const status = g.dimensions.edgeResponseStatus ?? 0;
    return {
      status,
      statusText: httpStatusText[status] ?? "Unknown",
      count: g.count,
      percentage: totalRequests > 0 ? (g.count / totalRequests) * 100 : 0,
    };
  });
}

export async function fetchWorkerAnalytics(range: TimeRange): Promise<WorkerSummary[]> {
  await loadCredentials();
  const accountId = getAccountId();
  const { start, end } = getTimeRange(range);

  const query = `
    query WorkerAnalytics($accountTag: string!, $start: Time!, $end: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: 100
            orderBy: [sum_requests_DESC]
          ) {
            sum {
              requests
              errors
              subrequests
            }
            quantiles {
              cpuTimeP50
              cpuTimeP99
              durationP50
              durationP99
            }
            dimensions {
              scriptName
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<WorkerAnalyticsData>(query, { accountTag: accountId, start, end });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const account = result.data?.viewer?.accounts?.[0];
  if (!account) return [];

  return (account.workersInvocationsAdaptive ?? []).map((w) => ({
    name: w.dimensions.scriptName,
    invocations: w.sum.requests,
    errors: w.sum.errors,
    errorRate: w.sum.requests > 0 ? (w.sum.errors / w.sum.requests) * 100 : 0,
    cpuTimeAvg: (w.quantiles.cpuTimeP50 + w.quantiles.cpuTimeP99) / 2,
  }));
}

export async function fetchWorkerMetrics(scriptName: string, range: TimeRange): Promise<WorkerMetrics> {
  await loadCredentials();
  const accountId = getAccountId();
  const { start, end } = getTimeRange(range);

  const query = `
    query WorkerMetrics($accountTag: string!, $scriptName: string!, $start: Time!, $end: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            filter: { datetime_geq: $start, datetime_leq: $end, scriptName: $scriptName }
            limit: 1000
            orderBy: [datetime_ASC]
          ) {
            sum {
              requests
              errors
              subrequests
            }
            quantiles {
              cpuTimeP50
              cpuTimeP99
              durationP50
              durationP99
            }
            dimensions {
              scriptName
              datetime
            }
          }
        }
      }
    }
  `;

  const result = await graphqlQuery<WorkerAnalyticsData>(query, { 
    accountTag: accountId, 
    scriptName, 
    start, 
    end 
  });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const account = result.data?.viewer?.accounts?.[0];
  if (!account || !account.workersInvocationsAdaptive?.length) {
    return {
      scriptName,
      invocations: 0,
      errors: 0,
      cpuTimeAvg: 0,
      cpuTimeP50: 0,
      cpuTimeP99: 0,
      durationAvg: 0,
      durationP50: 0,
      durationP99: 0,
      requestsOverTime: [],
      errorsOverTime: [],
      cpuTimeOverTime: [],
    };
  }

  const data = account.workersInvocationsAdaptive;
  let totalInvocations = 0;
  let totalErrors = 0;
  let totalCpuP50 = 0;
  let totalCpuP99 = 0;
  let totalDurP50 = 0;
  let totalDurP99 = 0;

  const requestsOverTime: AnalyticsPoint[] = [];
  const errorsOverTime: AnalyticsPoint[] = [];
  const cpuTimeOverTime: AnalyticsPoint[] = [];

  for (const d of data) {
    totalInvocations += d.sum.requests;
    totalErrors += d.sum.errors;
    totalCpuP50 += d.quantiles.cpuTimeP50;
    totalCpuP99 += d.quantiles.cpuTimeP99;
    totalDurP50 += d.quantiles.durationP50;
    totalDurP99 += d.quantiles.durationP99;

    if (d.dimensions.datetime) {
      const ts = new Date(d.dimensions.datetime);
      requestsOverTime.push({ timestamp: ts, value: d.sum.requests });
      errorsOverTime.push({ timestamp: ts, value: d.sum.errors });
      cpuTimeOverTime.push({ timestamp: ts, value: d.quantiles.cpuTimeP50 });
    }
  }

  const count = data.length;
  return {
    scriptName,
    invocations: totalInvocations,
    errors: totalErrors,
    cpuTimeAvg: count > 0 ? (totalCpuP50 + totalCpuP99) / (2 * count) : 0,
    cpuTimeP50: count > 0 ? totalCpuP50 / count : 0,
    cpuTimeP99: count > 0 ? totalCpuP99 / count : 0,
    durationAvg: count > 0 ? (totalDurP50 + totalDurP99) / (2 * count) : 0,
    durationP50: count > 0 ? totalDurP50 / count : 0,
    durationP99: count > 0 ? totalDurP99 / count : 0,
    requestsOverTime,
    errorsOverTime,
    cpuTimeOverTime,
  };
}

export async function fetchRecentRequests(zoneId: string, limit = 20): Promise<RequestLog[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 5 * 60 * 1000);

  const query = `
    query RecentRequests($zoneTag: string!, $start: Time!, $end: Time!, $limit: Int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $start, datetime_leq: $end }
            limit: $limit
            orderBy: [datetime_DESC]
          ) {
            count
            sum {
              edgeResponseBytes
            }
            avg {
              originResponseDurationMs
            }
            dimensions {
              datetime
              clientRequestPath
              clientRequestHTTPMethodName
              edgeResponseStatus
              clientCountryName
              userAgent
              cacheStatus
            }
          }
        }
      }
    }
  `;

  interface ExtendedDimensions {
    datetime?: string;
    clientRequestPath?: string;
    clientRequestHTTPMethodName?: string;
    edgeResponseStatus?: number;
    clientCountryName?: string;
    userAgent?: string;
    cacheStatus?: string;
  }

  const result = await graphqlQuery<ZoneAnalyticsData>(query, { 
    zoneTag: zoneId, 
    start: start.toISOString(), 
    end: end.toISOString(),
    limit 
  });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const zone = result.data?.viewer?.zones?.[0];
  if (!zone) return [];

  return (zone.httpRequestsAdaptiveGroups ?? []).map((g) => {
    const dims = g.dimensions as ExtendedDimensions;
    return {
      timestamp: new Date(dims.datetime ?? new Date()),
      method: dims.clientRequestHTTPMethodName ?? "GET",
      path: dims.clientRequestPath ?? "/",
      status: dims.edgeResponseStatus ?? 200,
      responseTime: g.avg.originResponseDurationMs ?? 0,
      country: dims.clientCountryName ?? "Unknown",
      userAgent: dims.userAgent ?? "Unknown",
      cached: dims.cacheStatus === "hit" || dims.cacheStatus === "stale",
      bytes: g.sum.edgeResponseBytes,
    };
  });
}

export async function fetchZones(): Promise<Array<{ id: string; name: string }>> {
  await loadCredentials();
  const headers = getAuthHeaders();

  const response = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50", {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch zones: ${response.statusText}`);
  }

  interface ZoneListResponse {
    result: Array<{ id: string; name: string }>;
  }

  const data = await response.json() as ZoneListResponse;
  return (data.result ?? []).map((z) => ({
    id: z.id,
    name: z.name,
  }));
}
