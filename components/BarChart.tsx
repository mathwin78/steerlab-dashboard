"use client";

interface DataPoint {
  date: string;
  count: number;
}

interface BarChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  label?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BarChart({
  data,
  color = "#6366f1",
  height = 180,
  label = "Count",
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barAreaHeight = height - 36; // leave space for labels
  const barWidth = 100 / data.length;
  const gap = 0.5; // percent gap between bars

  return (
    <div style={{ height }} className="w-full select-none">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: barAreaHeight }}
      >
        {data.map((point, i) => {
          const barH = (point.count / maxCount) * barAreaHeight;
          const x = i * barWidth + gap / 2;
          const w = barWidth - gap;
          const y = barAreaHeight - barH;

          return (
            <g key={point.date}>
              <rect
                x={`${x}%`}
                y={y}
                width={`${w}%`}
                height={barH}
                fill={color}
                rx={2}
                opacity={0.85}
              />
            </g>
          );
        })}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-0">
        {data.map((point) => (
          <span
            key={point.date}
            className="text-slate-500 text-xs truncate"
            style={{ width: `${100 / data.length}%`, textAlign: "center" }}
          >
            {formatDate(point.date)}
          </span>
        ))}
      </div>

      {/* Tooltip info: accessible as title */}
      <p className="sr-only">
        {label}: {data.map((d) => `${formatDate(d.date)}: ${d.count}`).join(", ")}
      </p>
    </div>
  );
}
