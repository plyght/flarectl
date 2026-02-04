import type { AnalyticsPoint } from "../types/analytics.ts";

const SPARKLINE_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const BAR_FULL = "█";
const BAR_PARTIAL = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];
const BOX_LIGHT = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  cross: "┼",
  tLeft: "├",
  tRight: "┤",
  tTop: "┬",
  tBottom: "┴",
};

export interface SparklineOptions {
  width?: number;
  min?: number;
  max?: number;
}

export function sparkline(data: number[], options: SparklineOptions = {}): string {
  if (data.length === 0) return "";

  const { width = data.length, min: minOpt, max: maxOpt } = options;

  const min = minOpt ?? Math.min(...data);
  const max = maxOpt ?? Math.max(...data);
  const range = max - min || 1;

  const resampledData = resample(data, width);

  return resampledData
    .map((value) => {
      const normalized = (value - min) / range;
      const index = Math.min(Math.floor(normalized * SPARKLINE_CHARS.length), SPARKLINE_CHARS.length - 1);
      return SPARKLINE_CHARS[Math.max(0, index)];
    })
    .join("");
}

export function sparklineFromPoints(points: AnalyticsPoint[], options: SparklineOptions = {}): string {
  if (points.length === 0) return "";
  const values = points.map((p) => p.value);
  return sparkline(values, options);
}

function resample(data: number[], targetLength: number): number[] {
  if (data.length === 0) return [];
  if (data.length === targetLength) return data;
  if (data.length < targetLength) {
    const result: number[] = [];
    const ratio = (data.length - 1) / (targetLength - 1);
    for (let i = 0; i < targetLength; i++) {
      const pos = i * ratio;
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      const weight = pos - lower;
      if (lower === upper) {
        result.push(data[lower] ?? 0);
      } else {
        const lowerVal = data[lower] ?? 0;
        const upperVal = data[upper] ?? 0;
        result.push(lowerVal * (1 - weight) + upperVal * weight);
      }
    }
    return result;
  } else {
    const result: number[] = [];
    const ratio = data.length / targetLength;
    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      let sum = 0;
      let count = 0;
      for (let j = start; j < end && j < data.length; j++) {
        sum += data[j] ?? 0;
        count++;
      }
      result.push(count > 0 ? sum / count : 0);
    }
    return result;
  }
}

export interface BarChartOptions {
  width?: number;
  showValue?: boolean;
  maxLabelWidth?: number;
  valueFormatter?: (value: number) => string;
}

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

export function barChart(items: BarChartItem[], options: BarChartOptions = {}): string[] {
  if (items.length === 0) return [];

  const {
    width = 30,
    showValue = true,
    maxLabelWidth = 15,
    valueFormatter = (v) => v.toLocaleString(),
  } = options;

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return items.map((item) => {
    const label = item.label.substring(0, maxLabelWidth).padEnd(maxLabelWidth);
    const barWidth = Math.round((item.value / maxValue) * width);
    const fullBlocks = Math.floor(barWidth);
    const partialBlock = Math.round((barWidth - fullBlocks) * 8);
    
    let bar = BAR_FULL.repeat(fullBlocks);
    if (partialBlock > 0 && fullBlocks < width) {
      bar += BAR_PARTIAL[partialBlock] ?? "";
    }
    bar = bar.padEnd(width, " ");

    const valueStr = showValue ? ` ${valueFormatter(item.value)}` : "";
    return `${label} ${bar}${valueStr}`;
  });
}

export interface HistogramOptions {
  width?: number;
  height?: number;
  showAxis?: boolean;
  title?: string;
}

export function histogram(data: number[], options: HistogramOptions = {}): string[] {
  if (data.length === 0) return [];

  const { width = 50, height = 8, showAxis = true, title } = options;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const resampledData = resample(data, width);
  const normalizedData = resampledData.map((v) => (v - min) / range);

  const lines: string[] = [];

  if (title) {
    lines.push(title.substring(0, width).padStart(Math.floor(width / 2) + Math.floor(title.length / 2)));
    lines.push("");
  }

  for (let row = height - 1; row >= 0; row--) {
    const threshold = (row + 0.5) / height;
    let line = "";
    
    if (showAxis) {
      if (row === height - 1) {
        line += `${formatCompact(max).padStart(6)} │`;
      } else if (row === 0) {
        line += `${formatCompact(min).padStart(6)} │`;
      } else {
        line += "       │";
      }
    }

    for (let col = 0; col < width; col++) {
      const value = normalizedData[col] ?? 0;
      if (value >= threshold) {
        const blockIndex = Math.min(
          Math.floor((value - threshold) * height * SPARKLINE_CHARS.length),
          SPARKLINE_CHARS.length - 1
        );
        line += SPARKLINE_CHARS[Math.max(0, blockIndex)] ?? "█";
      } else if (value >= threshold - (1 / height)) {
        const partialHeight = (value - (threshold - 1 / height)) * height;
        const blockIndex = Math.floor(partialHeight * SPARKLINE_CHARS.length);
        line += SPARKLINE_CHARS[Math.max(0, blockIndex)] ?? " ";
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  if (showAxis) {
    lines.push("       └" + "─".repeat(width));
  }

  return lines;
}

export function histogramFromPoints(points: AnalyticsPoint[], options: HistogramOptions = {}): string[] {
  if (points.length === 0) return [];
  const values = points.map((p) => p.value);
  return histogram(values, options);
}

export interface AreaChartOptions {
  width?: number;
  height?: number;
  fill?: string;
  showLabels?: boolean;
}

export function areaChart(data: number[], options: AreaChartOptions = {}): string[] {
  if (data.length === 0) return [];

  const { width = 60, height = 10, showLabels = true } = options;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const resampledData = resample(data, width);
  const normalizedData = resampledData.map((v) => ((v - min) / range) * height);

  const lines: string[] = [];

  for (let row = height; row > 0; row--) {
    let line = showLabels ? `${row === height ? formatCompact(max) : row === 1 ? formatCompact(min) : ""}`.padStart(6) + " │ " : "";

    for (let col = 0; col < width; col++) {
      const value = normalizedData[col] ?? 0;
      if (value >= row) {
        line += "█";
      } else if (value >= row - 1) {
        const partial = value - Math.floor(value);
        const blockIndex = Math.floor(partial * SPARKLINE_CHARS.length);
        line += SPARKLINE_CHARS[blockIndex] ?? "▁";
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  if (showLabels) {
    lines.push("       └" + "─".repeat(width + 1));
  }

  return lines;
}

export function areaChartFromPoints(points: AnalyticsPoint[], options: AreaChartOptions = {}): string[] {
  if (points.length === 0) return [];
  const values = points.map((p) => p.value);
  return areaChart(values, options);
}

export interface ProgressBarOptions {
  width?: number;
  showPercentage?: boolean;
  filled?: string;
  empty?: string;
}

export function progressBar(value: number, max: number, options: ProgressBarOptions = {}): string {
  const { width = 20, showPercentage = true, filled = "█", empty = "░" } = options;

  const percentage = Math.min(Math.max(value / max, 0), 1);
  const filledWidth = Math.round(percentage * width);
  const emptyWidth = width - filledWidth;

  let bar = filled.repeat(filledWidth) + empty.repeat(emptyWidth);

  if (showPercentage) {
    bar += ` ${Math.round(percentage * 100)}%`;
  }

  return bar;
}

export interface DonutChartOptions {
  size?: number;
  showLegend?: boolean;
}

export interface DonutChartItem {
  label: string;
  value: number;
  char?: string;
}

export function donutChart(items: DonutChartItem[], options: DonutChartOptions = {}): string[] {
  const { size = 7, showLegend = true } = options;
  
  if (items.length === 0) return [];

  const total = items.reduce((acc, item) => acc + item.value, 0);
  const chars = ["█", "▓", "▒", "░", "▪", "▫", "◆", "◇"];
  
  const segments: Array<{ char: string; percentage: number; label: string }> = [];
  items.forEach((item, index) => {
    segments.push({
      char: item.char ?? chars[index % chars.length]!,
      percentage: item.value / total,
      label: item.label,
    });
  });

  const lines: string[] = [];
  const radius = Math.floor(size / 2);
  const center = radius;

  for (let y = 0; y < size; y++) {
    let line = "";
    for (let x = 0; x < size * 2; x++) {
      const dx = (x / 2) - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius && distance > radius * 0.4) {
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;
        const normalizedAngle = angle / (2 * Math.PI);

        let cumulativePercentage = 0;
        let segmentChar = segments[0]?.char ?? "█";
        for (const segment of segments) {
          cumulativePercentage += segment.percentage;
          if (normalizedAngle <= cumulativePercentage) {
            segmentChar = segment.char;
            break;
          }
        }
        line += segmentChar;
      } else if (distance <= radius * 0.4) {
        line += " ";
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  if (showLegend) {
    lines.push("");
    for (const segment of segments) {
      const percentage = Math.round(segment.percentage * 100);
      lines.push(`  ${segment.char} ${segment.label}: ${percentage}%`);
    }
  }

  return lines;
}

export interface TableOptions {
  headers: string[];
  columnWidths?: number[];
  alignments?: Array<"left" | "right" | "center">;
}

export function table(rows: string[][], options: TableOptions): string[] {
  const { headers, columnWidths, alignments } = options;

  const widths = columnWidths ?? headers.map((h, i) => {
    const maxDataWidth = Math.max(...rows.map((row) => (row[i] ?? "").length));
    return Math.max(h.length, maxDataWidth) + 2;
  });

  const align = (str: string, width: number, alignment: "left" | "right" | "center" = "left"): string => {
    const pad = width - str.length;
    if (pad <= 0) return str.substring(0, width);
    switch (alignment) {
      case "right":
        return " ".repeat(pad) + str;
      case "center":
        return " ".repeat(Math.floor(pad / 2)) + str + " ".repeat(Math.ceil(pad / 2));
      default:
        return str + " ".repeat(pad);
    }
  };

  const lines: string[] = [];

  const topBorder = BOX_LIGHT.topLeft + widths.map((w) => BOX_LIGHT.horizontal.repeat(w)).join(BOX_LIGHT.tTop) + BOX_LIGHT.topRight;
  lines.push(topBorder);

  const headerRow = BOX_LIGHT.vertical + headers.map((h, i) => align(h, widths[i]!, alignments?.[i])).join(BOX_LIGHT.vertical) + BOX_LIGHT.vertical;
  lines.push(headerRow);

  const headerSeparator = BOX_LIGHT.tLeft + widths.map((w) => BOX_LIGHT.horizontal.repeat(w)).join(BOX_LIGHT.cross) + BOX_LIGHT.tRight;
  lines.push(headerSeparator);

  for (const row of rows) {
    const rowStr = BOX_LIGHT.vertical + row.map((cell, i) => align(cell ?? "", widths[i]!, alignments?.[i])).join(BOX_LIGHT.vertical) + BOX_LIGHT.vertical;
    lines.push(rowStr);
  }

  const bottomBorder = BOX_LIGHT.bottomLeft + widths.map((w) => BOX_LIGHT.horizontal.repeat(w)).join(BOX_LIGHT.tBottom) + BOX_LIGHT.bottomRight;
  lines.push(bottomBorder);

  return lines;
}

export function formatCompact(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1e12) {
    return sign + (absValue / 1e12).toFixed(1) + "T";
  }
  if (absValue >= 1e9) {
    return sign + (absValue / 1e9).toFixed(1) + "B";
  }
  if (absValue >= 1e6) {
    return sign + (absValue / 1e6).toFixed(1) + "M";
  }
  if (absValue >= 1e3) {
    return sign + (absValue / 1e3).toFixed(1) + "K";
  }
  if (absValue >= 1) {
    return sign + absValue.toFixed(0);
  }
  if (absValue >= 0.01) {
    return sign + absValue.toFixed(2);
  }
  return sign + absValue.toPrecision(2);
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let unitIndex = 0;
  let size = Math.abs(bytes);

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return (bytes < 0 ? "-" : "") + size.toFixed(unitIndex > 0 ? 1 : 0) + " " + units[unitIndex];
}

export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date, format: "short" | "time" | "full" = "short"): string {
  switch (format) {
    case "time":
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    case "full":
      return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    default:
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

export function timelineLabels(points: AnalyticsPoint[], width: number): string {
  if (points.length === 0) return "";

  const first = points[0]?.timestamp;
  const last = points[points.length - 1]?.timestamp;

  if (!first || !last) return "";

  const firstLabel = formatDate(first, "full");
  const lastLabel = formatDate(last, "full");

  const padding = width - firstLabel.length - lastLabel.length;
  if (padding < 3) {
    return firstLabel.padEnd(width);
  }

  return firstLabel + " ".repeat(padding) + lastLabel;
}
