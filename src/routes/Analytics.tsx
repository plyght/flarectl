import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../lib/theme-context.tsx";
import type { TimeRange, TrafficMetrics, PerformanceMetrics, GeoTraffic, WorkerSummary, RequestLog } from "../types/analytics.ts";
import { TIME_RANGES } from "../types/analytics.ts";
import {
  fetchTrafficMetrics,
  fetchPerformanceMetrics,
  fetchGeoTraffic,
  fetchWorkerAnalytics,
  fetchRecentRequests,
  fetchZones,
} from "../lib/analytics-api.ts";
import {
  sparklineFromPoints,
  formatCompact,
  formatBytes,
  formatDuration,
  formatPercentage,
  progressBar,
  barChart,
  histogramFromPoints,
  timelineLabels,
} from "../lib/ascii-charts.ts";
import { renderWorldMapWithHeat, generateWorldMapData, renderTopCountriesTable } from "../lib/ascii-worldmap.ts";

type AnalyticsView = "overview" | "traffic" | "performance" | "geo" | "workers" | "realtime";

interface Zone {
  id: string;
  name: string;
}

export function Analytics() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [view, setView] = useState<AnalyticsView>("overview");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [traffic, setTraffic] = useState<TrafficMetrics | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [geoTraffic, setGeoTraffic] = useState<GeoTraffic[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestLog[]>([]);

  const selectedZone = zones[selectedZoneIndex];

  const loadZones = useCallback(async () => {
    try {
      const fetchedZones = await fetchZones();
      setZones(fetchedZones);
      if (fetchedZones.length > 0) {
        setSelectedZoneIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones");
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!selectedZone) return;

    setLoading(true);
    setError(null);

    try {
      const [trafficData, perfData, geoData, workerData] = await Promise.all([
        fetchTrafficMetrics(selectedZone.id, timeRange),
        fetchPerformanceMetrics(selectedZone.id, timeRange),
        fetchGeoTraffic(selectedZone.id, timeRange),
        fetchWorkerAnalytics(timeRange),
      ]);

      setTraffic(trafficData);
      setPerformance(perfData);
      setGeoTraffic(geoData);
      setWorkers(workerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedZone, timeRange]);

  const loadRealtimeRequests = useCallback(async () => {
    if (!selectedZone) return;
    try {
      const requests = await fetchRecentRequests(selectedZone.id, 15);
      setRecentRequests(requests);
    } catch {
    }
  }, [selectedZone]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  useEffect(() => {
    if (selectedZone) {
      loadAnalytics();
    }
  }, [selectedZone, loadAnalytics]);

  useEffect(() => {
    if (view === "realtime" && selectedZone) {
      loadRealtimeRequests();
      const interval = setInterval(loadRealtimeRequests, 5000);
      return () => clearInterval(interval);
    }
  }, [view, selectedZone, loadRealtimeRequests]);

  useKeyboard((key) => {
    if (key.name === "1") setView("overview");
    if (key.name === "2") setView("traffic");
    if (key.name === "3") setView("performance");
    if (key.name === "4") setView("geo");
    if (key.name === "5") setView("workers");
    if (key.name === "6") setView("realtime");

    if (key.name === "h" || key.name === "H") {
      setTimeRange("24h");
    }
    if (key.name === "w" || key.name === "W") {
      setTimeRange("7d");
    }
    if (key.name === "m" || key.name === "M") {
      setTimeRange("30d");
    }

    if (key.name === "r" || key.name === "R") {
      loadAnalytics();
    }

    if (key.name === "tab" && zones.length > 1) {
      setSelectedZoneIndex((prev) => (prev + 1) % zones.length);
    }
  });

  const renderHeader = () => (
    <box flexDirection="column" gap={0}>
      <text>
        <strong fg={colors.primary}>Analytics Dashboard</strong>
        <span fg={colors.textMuted}> - {selectedZone?.name ?? "No zone selected"}</span>
      </text>
      <box flexDirection="row" gap={2} marginTop={1}>
        <text>
          <span fg={view === "overview" ? colors.primary : colors.textMuted}>[1] Overview</span>
        </text>
        <text>
          <span fg={view === "traffic" ? colors.primary : colors.textMuted}>[2] Traffic</span>
        </text>
        <text>
          <span fg={view === "performance" ? colors.primary : colors.textMuted}>[3] Performance</span>
        </text>
        <text>
          <span fg={view === "geo" ? colors.primary : colors.textMuted}>[4] Geo</span>
        </text>
        <text>
          <span fg={view === "workers" ? colors.primary : colors.textMuted}>[5] Workers</span>
        </text>
        <text>
          <span fg={view === "realtime" ? colors.primary : colors.textMuted}>[6] Live</span>
        </text>
      </box>
      <box flexDirection="row" gap={2} marginTop={1}>
        <text>
          <span fg={colors.textMuted}>Time:</span>
        </text>
        <text>
          <span fg={timeRange === "24h" ? colors.primary : colors.textMuted}>[H] 24h</span>
        </text>
        <text>
          <span fg={timeRange === "7d" ? colors.primary : colors.textMuted}>[W] 7d</span>
        </text>
        <text>
          <span fg={timeRange === "30d" ? colors.primary : colors.textMuted}>[M] 30d</span>
        </text>
        <text>
          <span fg={colors.textMuted}>[R] Refresh</span>
        </text>
        {zones.length > 1 && (
          <text>
            <span fg={colors.textMuted}>[Tab] Switch Zone</span>
          </text>
        )}
      </box>
    </box>
  );

  const renderOverview = () => {
    if (!traffic || !performance) return null;

    const requestSparkline = sparklineFromPoints(traffic.requestsOverTime, { width: 30 });
    const bandwidthSparkline = sparklineFromPoints(traffic.bandwidthOverTime, { width: 30 });

    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.text}>Quick Stats</strong>
        </text>
        <box flexDirection="row" gap={2} flexWrap="wrap">
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Total Requests</span>
              </text>
              <text>
                <span fg={colors.primary}>{formatCompact(traffic.totalRequests)}</span>
              </text>
              <text>
                <span fg={colors.info}>{requestSparkline}</span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Bandwidth</span>
              </text>
              <text>
                <span fg={colors.primary}>{formatBytes(traffic.totalBandwidth)}</span>
              </text>
              <text>
                <span fg={colors.success}>{bandwidthSparkline}</span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Unique Visitors</span>
              </text>
              <text>
                <span fg={colors.primary}>{formatCompact(traffic.uniqueVisitors)}</span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Threats Blocked</span>
              </text>
              <text>
                <span fg={traffic.threats > 0 ? colors.error : colors.success}>
                  {formatCompact(traffic.threats)}
                </span>
              </text>
            </box>
          </box>
        </box>

        <text marginTop={1}>
          <strong fg={colors.text}>Performance</strong>
        </text>
        <box flexDirection="row" gap={2}>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Cache Hit Ratio</span>
              </text>
              <text>
                <span fg={performance.cacheHitRatio > 80 ? colors.success : colors.warning}>
                  {formatPercentage(performance.cacheHitRatio)}
                </span>
              </text>
              <text>
                <span fg={colors.textMuted}>
                  {progressBar(performance.cacheHitRatio, 100, { width: 18, showPercentage: false })}
                </span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Avg Response Time</span>
              </text>
              <text>
                <span fg={performance.avgResponseTime < 200 ? colors.success : colors.warning}>
                  {formatDuration(performance.avgResponseTime)}
                </span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Error Rate</span>
              </text>
              <text>
                <span fg={performance.errorRate < 1 ? colors.success : colors.error}>
                  {formatPercentage(performance.errorRate)}
                </span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={24}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>TTFB (avg)</span>
              </text>
              <text>
                <span fg={performance.ttfbAvg < 100 ? colors.success : colors.warning}>
                  {formatDuration(performance.ttfbAvg)}
                </span>
              </text>
            </box>
          </box>
        </box>

        {geoTraffic.length > 0 && (
          <>
            <text marginTop={1}>
              <strong fg={colors.text}>Top Countries</strong>
            </text>
            <box flexDirection="column">
              {geoTraffic.slice(0, 5).map((geo, i) => (
                <box key={geo.countryCode} flexDirection="row" gap={1}>
                  <text>
                    <span fg={colors.textMuted}>{(i + 1).toString().padStart(2)}.</span>
                  </text>
                  <text>
                    <span fg={colors.text}>{geo.countryName.padEnd(20)}</span>
                  </text>
                  <text>
                    <span fg={colors.primary}>{formatCompact(geo.requests).padStart(8)}</span>
                  </text>
                  <text>
                    <span fg={colors.textMuted}>{formatPercentage(geo.percentage).padStart(7)}</span>
                  </text>
                </box>
              ))}
            </box>
          </>
        )}
      </box>
    );
  };

  const renderTraffic = () => {
    if (!traffic) return null;

    const histogram = histogramFromPoints(traffic.requestsOverTime, {
      width: 60,
      height: 10,
      showAxis: true,
      title: "Requests Over Time",
    });

    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.text}>Traffic Analytics</strong>
        </text>

        <box flexDirection="row" gap={2}>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Total Requests</span>
              </text>
              <text>
                <span fg={colors.primary}>{formatCompact(traffic.totalRequests)}</span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Cached Requests</span>
              </text>
              <text>
                <span fg={colors.success}>{formatCompact(traffic.cachedRequests)}</span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={30}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Uncached Requests</span>
              </text>
              <text>
                <span fg={colors.warning}>{formatCompact(traffic.uncachedRequests)}</span>
              </text>
            </box>
          </box>
        </box>

        <box marginTop={1} flexDirection="column">
          {histogram.map((line, i) => (
            <text key={i}>
              <span fg={colors.info}>{line}</span>
            </text>
          ))}
          <text>
            <span fg={colors.textMuted}>
              {timelineLabels(traffic.requestsOverTime, 60)}
            </span>
          </text>
        </box>

        <box marginTop={1} flexDirection="column">
          <text>
            <strong fg={colors.text}>Bandwidth Over Time</strong>
          </text>
          <text>
            <span fg={colors.success}>
              {sparklineFromPoints(traffic.bandwidthOverTime, { width: 60 })}
            </span>
          </text>
          <text>
            <span fg={colors.textMuted}>Total: {formatBytes(traffic.totalBandwidth)}</span>
          </text>
        </box>
      </box>
    );
  };

  const renderPerformance = () => {
    if (!performance) return null;

    const responseTimeHistogram = histogramFromPoints(performance.responseTimeOverTime, {
      width: 50,
      height: 8,
      showAxis: true,
      title: "Response Time (ms)",
    });

    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.text}>Performance Metrics</strong>
        </text>

        <box flexDirection="row" gap={2}>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={28}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Cache Hit Ratio</span>
              </text>
              <text>
                <span fg={performance.cacheHitRatio > 80 ? colors.success : colors.warning}>
                  {formatPercentage(performance.cacheHitRatio)}
                </span>
              </text>
              <text>
                <span fg={colors.textMuted}>
                  {progressBar(performance.cacheHitRatio, 100, { width: 20 })}
                </span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={28}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Avg Response Time</span>
              </text>
              <text>
                <span fg={performance.avgResponseTime < 200 ? colors.success : colors.warning}>
                  {formatDuration(performance.avgResponseTime)}
                </span>
              </text>
            </box>
          </box>
          <box borderStyle="single" borderColor={colors.border} padding={1} width={28}>
            <box flexDirection="column">
              <text>
                <span fg={colors.textMuted}>Error Rate</span>
              </text>
              <text>
                <span fg={performance.errorRate < 1 ? colors.success : colors.error}>
                  {formatPercentage(performance.errorRate)}
                </span>
              </text>
            </box>
          </box>
        </box>

        <box marginTop={1} flexDirection="column">
          {responseTimeHistogram.map((line, i) => (
            <text key={i}>
              <span fg={colors.info}>{line}</span>
            </text>
          ))}
        </box>

        <box marginTop={1} flexDirection="column">
          <text>
            <strong fg={colors.text}>Error Rate Over Time</strong>
          </text>
          <text>
            <span fg={colors.error}>
              {sparklineFromPoints(performance.errorRateOverTime, { width: 50, min: 0 })}
            </span>
          </text>
        </box>
      </box>
    );
  };

  const renderGeo = () => {
    if (geoTraffic.length === 0) return null;

    const worldMapData = generateWorldMapData(geoTraffic);
    const mapLines = renderWorldMapWithHeat(worldMapData, { showTop: 10 });

    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.text}>Geographic Distribution</strong>
        </text>

        <box flexDirection="column">
          {mapLines.map((line, i) => (
            <text key={i}>
              <span fg={colors.text}>{line}</span>
            </text>
          ))}
        </box>
      </box>
    );
  };

  const renderWorkers = () => {
    if (workers.length === 0) {
      return (
        <box flexDirection="column" gap={1}>
          <text>
            <strong fg={colors.text}>Worker Analytics</strong>
          </text>
          <text>
            <span fg={colors.textMuted}>No workers found or no data available</span>
          </text>
        </box>
      );
    }

    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.text}>Worker Analytics</strong>
        </text>

        <box borderStyle="single" borderColor={colors.border} padding={1} flexDirection="column">
          <box flexDirection="row" gap={1}>
            <text>
              <span fg={colors.textMuted}>{"Worker Name".padEnd(25)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Invocations".padStart(12)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Errors".padStart(10)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Error %".padStart(10)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"CPU (ms)".padStart(10)}</span>
            </text>
          </box>
          <box flexDirection="row">
            <text>
              <span fg={colors.border}>{"─".repeat(75)}</span>
            </text>
          </box>
          {workers.map((worker) => (
            <box key={worker.name} flexDirection="row" gap={1}>
              <text>
                <span fg={colors.text}>{worker.name.substring(0, 25).padEnd(25)}</span>
              </text>
              <text>
                <span fg={colors.primary}>{formatCompact(worker.invocations).padStart(12)}</span>
              </text>
              <text>
                <span fg={worker.errors > 0 ? colors.error : colors.success}>
                  {formatCompact(worker.errors).padStart(10)}
                </span>
              </text>
              <text>
                <span fg={worker.errorRate > 1 ? colors.error : colors.success}>
                  {formatPercentage(worker.errorRate).padStart(10)}
                </span>
              </text>
              <text>
                <span fg={colors.info}>{worker.cpuTimeAvg.toFixed(2).padStart(10)}</span>
              </text>
            </box>
          ))}
        </box>
      </box>
    );
  };

  const renderRealtime = () => {
    return (
      <box flexDirection="column" gap={1}>
        <text>
          <strong fg={colors.text}>Real-Time Request Log</strong>
          <span fg={colors.textMuted}> (updates every 5s)</span>
        </text>

        <box borderStyle="single" borderColor={colors.border} padding={1} flexDirection="column">
          <box flexDirection="row" gap={1}>
            <text>
              <span fg={colors.textMuted}>{"Time".padEnd(10)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Method".padEnd(7)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Path".padEnd(30)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Status".padEnd(7)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Time".padEnd(8)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Country".padEnd(8)}</span>
            </text>
            <text>
              <span fg={colors.textMuted}>{"Cache"}</span>
            </text>
          </box>
          <box flexDirection="row">
            <text>
              <span fg={colors.border}>{"─".repeat(85)}</span>
            </text>
          </box>
          {recentRequests.length === 0 ? (
            <text>
              <span fg={colors.textMuted}>Waiting for requests...</span>
            </text>
          ) : (
            recentRequests.map((req, i) => {
              const statusColor = req.status < 300 ? colors.success : req.status < 400 ? colors.info : req.status < 500 ? colors.warning : colors.error;
              return (
                <box key={i} flexDirection="row" gap={1}>
                  <text>
                    <span fg={colors.textMuted}>
                      {req.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).padEnd(10)}
                    </span>
                  </text>
                  <text>
                    <span fg={colors.info}>{req.method.padEnd(7)}</span>
                  </text>
                  <text>
                    <span fg={colors.text}>{req.path.substring(0, 30).padEnd(30)}</span>
                  </text>
                  <text>
                    <span fg={statusColor}>{req.status.toString().padEnd(7)}</span>
                  </text>
                  <text>
                    <span fg={colors.textMuted}>{formatDuration(req.responseTime).padEnd(8)}</span>
                  </text>
                  <text>
                    <span fg={colors.textMuted}>{req.country.substring(0, 8).padEnd(8)}</span>
                  </text>
                  <text>
                    <span fg={req.cached ? colors.success : colors.warning}>{req.cached ? "HIT" : "MISS"}</span>
                  </text>
                </box>
              );
            })
          )}
        </box>
      </box>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <box marginTop={2}>
          <text>
            <span fg={colors.textMuted}>Loading analytics data...</span>
          </text>
        </box>
      );
    }

    if (error) {
      return (
        <box marginTop={2} flexDirection="column" gap={1}>
          <text>
            <span fg={colors.error}>Error: {error}</span>
          </text>
          <text>
            <span fg={colors.textMuted}>Press [R] to retry</span>
          </text>
        </box>
      );
    }

    if (zones.length === 0) {
      return (
        <box marginTop={2}>
          <text>
            <span fg={colors.textMuted}>No zones found. Make sure you're authenticated.</span>
          </text>
        </box>
      );
    }

    switch (view) {
      case "overview":
        return renderOverview();
      case "traffic":
        return renderTraffic();
      case "performance":
        return renderPerformance();
      case "geo":
        return renderGeo();
      case "workers":
        return renderWorkers();
      case "realtime":
        return renderRealtime();
      default:
        return renderOverview();
    }
  };

  return (
    <box flexDirection="column" gap={1}>
      {renderHeader()}
      <box marginTop={1}>{renderContent()}</box>
    </box>
  );
}
