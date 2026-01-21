/** Factory Run Metrics Chart (PR-96) - SVG timeline visualization */
"use client";

interface TimelineBucket {
  t: string;
  started: number;
  completed: number;
  failed: number;
}

interface FactoryRunMetricsChartProps {
  timeline: TimelineBucket[];
}

const COLORS = {
  started: "#3b82f6", // blue-500
  completed: "#22c55e", // green-500
  failed: "#ef4444", // red-500
};

const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 40 };
const BAR_GAP = 4;

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FactoryRunMetricsChart({ timeline }: FactoryRunMetricsChartProps) {
  if (timeline.length === 0) {
    return (
      <div data-testid="metrics-chart-empty" className="text-center text-muted-foreground py-8">
        No timeline data available
      </div>
    );
  }

  const chartWidth = Math.max(400, timeline.length * 60);
  const innerWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Find max value for y-axis scaling
  const maxValue = Math.max(1, ...timeline.map((b) => Math.max(b.started, b.completed + b.failed)));

  // Bar dimensions
  const barWidth = Math.max(20, (innerWidth / timeline.length) - BAR_GAP);

  // Scale functions
  const xScale = (index: number) => CHART_PADDING.left + index * (barWidth + BAR_GAP) + barWidth / 2;
  const yScale = (value: number) => CHART_PADDING.top + innerHeight - (value / maxValue) * innerHeight;
  const heightScale = (value: number) => (value / maxValue) * innerHeight;

  return (
    <div className="space-y-3">
      <svg
        data-testid="metrics-chart"
        width={chartWidth}
        height={CHART_HEIGHT}
        className="overflow-visible"
      >
        {/* Y-axis */}
        <line
          x1={CHART_PADDING.left}
          y1={CHART_PADDING.top}
          x2={CHART_PADDING.left}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke="currentColor"
          strokeOpacity={0.2}
        />

        {/* X-axis */}
        <line
          x1={CHART_PADDING.left}
          y1={CHART_HEIGHT - CHART_PADDING.bottom}
          x2={chartWidth - CHART_PADDING.right}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke="currentColor"
          strokeOpacity={0.2}
        />

        {/* Y-axis label */}
        <text
          x={10}
          y={CHART_PADDING.top + innerHeight / 2}
          fontSize={10}
          fill="currentColor"
          fillOpacity={0.5}
          textAnchor="middle"
          transform={`rotate(-90, 10, ${CHART_PADDING.top + innerHeight / 2})`}
        >
          Count
        </text>

        {/* Buckets */}
        {timeline.map((bucket, index) => {
          const x = xScale(index) - barWidth / 2;
          const startedHeight = heightScale(bucket.started);
          const completedHeight = heightScale(bucket.completed);
          const failedHeight = heightScale(bucket.failed);

          return (
            <g key={bucket.t} data-testid="bucket-bar">
              {/* Started bar (background) */}
              <rect
                x={x}
                y={yScale(bucket.started)}
                width={barWidth}
                height={startedHeight}
                fill={COLORS.started}
                opacity={0.3}
                rx={2}
              />

              {/* Completed bar */}
              <rect
                x={x}
                y={yScale(bucket.completed + bucket.failed)}
                width={barWidth}
                height={completedHeight}
                fill={COLORS.completed}
                rx={2}
              />

              {/* Failed bar (stacked on completed) */}
              <rect
                x={x}
                y={yScale(bucket.failed)}
                width={barWidth}
                height={failedHeight}
                fill={COLORS.failed}
                rx={2}
              />

              {/* Time label */}
              <text
                x={xScale(index)}
                y={CHART_HEIGHT - CHART_PADDING.bottom + 16}
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.7}
                textAnchor="middle"
              >
                {formatTime(bucket.t)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 justify-center text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.started, opacity: 0.3 }} />
          <span>Started</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.completed }} />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.failed }} />
          <span>Failed</span>
        </div>
      </div>
    </div>
  );
}
