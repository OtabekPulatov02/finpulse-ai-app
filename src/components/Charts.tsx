/* Площадной график в духе shadcn/ui charts: две серии с градиентной заливкой,
   тонкая сетка, подсказка по наведению. Без сторонних библиотек — SVG. */
import { useMemo, useRef, useState } from "react";

export type Series = { key: string; label: string; color: string; values: number[] };

export function AreaChart({ labels, series, height = 220, format = (v: number) => String(v) }: {
  labels: string[]; series: Series[]; height?: number; format?: (v: number) => string;
}) {
  const W = 1000, H = height, PAD_L = 28, PAD_B = 22, PAD_T = 10;
  const n = labels.length;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = useMemo(() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; }, [max]);
  const x = (i: number) => PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD_L - 4));
  const y = (v: number) => PAD_T + (1 - v / niceMax) * (H - PAD_T - PAD_B);
  /* сглаженная линия (monotone-ish через кубические Безье по средним точкам) */
  const path = (vals: number[]) => vals.map((v, i) => {
    if (i === 0) return `M${x(0)},${y(v)}`;
    const cx = (x(i - 1) + x(i)) / 2;
    return `C${cx},${y(vals[i - 1])} ${cx},${y(v)} ${x(i)},${y(v)}`;
  }).join(" ");
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r || n < 1) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD_L) / (W - PAD_L - 4)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const ticks = [0, 0.5, 1].map((t) => Math.round(niceMax * t));
  const step = Math.max(1, Math.ceil(n / 7));
  const hoverLeft = hover === null ? 0 : (x(hover) / W) * 100;

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[220px] w-full" style={{ height }}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.label).join(", ")}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="95%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => <line key={t} x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke="#eef0f3" strokeDasharray={t === 0 ? "" : "4 4"} vectorEffect="non-scaling-stroke" />)}
        {series.map((s) => (
          <g key={s.key}>
            <path d={`${path(s.values)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#g-${s.key})`} />
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </g>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={H - PAD_B} stroke="#cbd0d8" vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* подписи осей — HTML, чтобы текст не растягивался вместе с SVG */}
      <div className="pointer-events-none absolute inset-0">
        {ticks.map((t) => (
          <span key={t} className="absolute left-0 -translate-y-1/2 text-[10px] text-slate-400 tabular-nums" style={{ top: `${(y(t) / H) * 100}%` }}>{t}</span>
        ))}
        {labels.map((l, i) => (i % step === 0 || i === n - 1) && (
          <span key={i} className={`absolute bottom-0 text-[10px] whitespace-nowrap text-slate-400 ${i === 0 ? "" : i === n - 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(x(i) / W) * 100}%` }}>{l}</span>
        ))}
        {hover !== null && series.map((s) => (
          <span key={s.key} className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${hoverLeft}%`, top: `${(y(s.values[hover]) / H) * 100}%`, background: s.color }} />
        ))}
      </div>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg"
          style={{ left: `${hoverLeft}%`, transform: `translateX(${hoverLeft > 70 ? "calc(-100% - 12px)" : "12px"})` }}>
          <div className="mb-1 font-medium text-slate-900">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-slate-600">
              <span className="size-2 rounded-sm" style={{ background: s.color }} />{s.label}
              <span className="ml-auto pl-3 font-medium text-slate-900 tabular-nums">{format(s.values[hover])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
