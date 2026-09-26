'use client';

type Point = { label: string; value: number; secondary?: number };

export function formatPkr(n: number) {
  return `Rs ${Math.round(n).toLocaleString('en-PK')}`;
}

export function formatPct(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  change,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'accent';
  change?: number;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-300'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-white';

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/[0.03]" />
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`mt-2 font-display text-2xl md:text-3xl ${toneClass}`}>{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {typeof change === 'number' && (
          <span
            className={
              change >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }
          >
            {formatPct(change)} vs prior
          </span>
        )}
        {hint && <span className="text-stone-500">{hint}</span>}
      </div>
    </div>
  );
}

export function LineBarChart({
  data,
  height = 180,
  color = '#e0a82e',
  secondaryColor = '#34d399',
  showSecondary = false,
}: {
  data: Point[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  showSecondary?: boolean;
}) {
  if (!data.length) {
    return <div className="grid h-44 place-items-center text-sm text-stone-500">No data yet</div>;
  }

  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary || 0)), 1);
  const w = 560;
  const h = height;
  const pad = 16;
  const gap = 4;
  const barW = Math.max(4, (w - pad * 2) / data.length - gap);

  const points = data
    .map((d, i) => {
      const x = pad + i * ((w - pad * 2) / data.length) + barW / 2;
      const y = h - pad - (d.value / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-full" role="img" aria-label="Revenue chart">
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = h - pad - t * (h - pad * 2);
          return (
            <line
              key={t}
              x1={pad}
              x2={w - pad}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}
        {data.map((d, i) => {
          const x = pad + i * ((w - pad * 2) / data.length);
          const bh = (d.value / max) * (h - pad * 2);
          const sh = ((d.secondary || 0) / max) * (h - pad * 2);
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={h - pad - bh}
                width={barW}
                height={bh}
                rx="2"
                fill={color}
                opacity={0.85}
              >
                <title>{`${d.label}: ${formatPkr(d.value)}`}</title>
              </rect>
              {showSecondary && d.secondary != null && (
                <rect
                  x={x}
                  y={h - pad - sh}
                  width={Math.max(2, barW * 0.35)}
                  height={sh}
                  rx="1"
                  fill={secondaryColor}
                  opacity={0.9}
                >
                  <title>{`Profit: ${formatPkr(d.secondary)}`}</title>
                </rect>
              )}
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          points={points}
          opacity={0.35}
        />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-stone-500">
        <span>{data[0]?.label.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.label.slice(5)}</span>
        <span>{data[data.length - 1]?.label.slice(5)}</span>
      </div>
    </div>
  );
}

export function DonutChart({
  slices,
  size = 160,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 140 140" className="shrink-0">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
        {slices.map((slice) => {
          const len = (slice.value / total) * c;
          const el = (
            <circle
              key={slice.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            >
              <title>{`${slice.label}: ${formatPkr(slice.value)}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="fill-stone-400" fontSize="10">
          Mix
        </text>
        <text x="70" y="84" textAnchor="middle" className="fill-white" fontSize="12" fontWeight="600">
          {formatPkr(total).replace('Rs ', '')}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-stone-300">{s.label}</span>
            <span className="ml-auto font-medium text-white">{formatPkr(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBars({
  rows,
  valueLabel = 'Revenue',
}: {
  rows: { label: string; value: number; meta?: string }[];
  valueLabel?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-stone-300">{r.label}</span>
            <span className="shrink-0 font-medium text-white">{formatPkr(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent"
              style={{ width: `${(r.value / max) * 100}%` }}
              title={`${valueLabel}: ${formatPkr(r.value)}${r.meta ? ` · ${r.meta}` : ''}`}
            />
          </div>
          {r.meta && <p className="mt-1 text-[11px] text-stone-500">{r.meta}</p>}
        </div>
      ))}
      {!rows.length && <p className="text-sm text-stone-500">No data in this range.</p>}
    </div>
  );
}
