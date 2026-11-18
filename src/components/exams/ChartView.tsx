/* The chart an IELTS Academic Task 1 is written about, drawn from the
   generated data. Plain SVG with theme tokens, so it follows light/dark like
   the rest of the page and needs no chart library. */
import { niceMax } from '@/lib/exams/display';
import type { ChartData } from '@/lib/exams/generation';

const SERIES_COLORS = [
  'var(--color-primary-blue)',
  'var(--color-accent-rose)',
  'var(--color-green-accent)',
  'var(--color-orange-accent)',
  'var(--color-accent-indigo)',
];

const W = 640;
const H = 340;
const PAD = { top: 20, right: 16, bottom: 56, left: 56 };

const formatTick = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 1 : 0);

export const ChartView = ({ chart }: { chart: ChartData }) => {
  const max = niceMax(Math.max(...chart.series.flatMap((s) => s.values)));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const y = (value: number) => PAD.top + plotH - (Math.max(value, 0) / max) * plotH;
  const band = plotW / chart.labels.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-[15px] font-bold text-(--color-primary-blue-dark)">
        {chart.title}
        {chart.unit && <span className="font-semibold text-(--color-muted-text)"> ({chart.unit})</span>}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={chart.title}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-surface-border)" />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="12" fill="var(--color-muted-text)">
              {formatTick(tick)}
            </text>
          </g>
        ))}
        {chart.labels.map((label, i) => (
          <text
            key={label + i}
            x={PAD.left + band * i + band / 2}
            y={H - PAD.bottom + 20}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-text-secondary)"
          >
            {label.length > 14 ? `${label.slice(0, 13)}…` : label}
          </text>
        ))}
        {chart.kind === 'bar'
          ? chart.series.map((series, si) => {
              const barW = (band * 0.72) / chart.series.length;
              return series.values.map((value, i) => (
                <rect
                  key={`${si}-${i}`}
                  x={PAD.left + band * i + band * 0.14 + barW * si}
                  y={y(value)}
                  width={Math.max(barW - 2, 1)}
                  height={PAD.top + plotH - y(value)}
                  rx={3}
                  fill={SERIES_COLORS[si % SERIES_COLORS.length]}
                >
                  <title>{`${series.name}, ${chart.labels[i]}: ${value}${chart.unit ? ` ${chart.unit}` : ''}`}</title>
                </rect>
              ));
            })
          : chart.series.map((series, si) => {
              const color = SERIES_COLORS[si % SERIES_COLORS.length];
              const points = series.values.map((value, i) => [PAD.left + band * i + band / 2, y(value)] as const);
              return (
                <g key={si}>
                  <polyline
                    points={points.map(([px, py]) => `${px},${py}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                  {points.map(([px, py], i) => (
                    <circle key={i} cx={px} cy={py} r={3.5} fill={color}>
                      <title>{`${series.name}, ${chart.labels[i]}: ${series.values[i]}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
      </svg>
      {chart.series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {chart.series.map((series, si) => (
            <li key={series.name + si} className="flex items-center gap-2 text-[13px] font-semibold text-(--color-text-secondary)">
              <span className="size-3 rounded-sm" style={{ background: SERIES_COLORS[si % SERIES_COLORS.length] }} />
              {series.name}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
};
