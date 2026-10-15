import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { AlertCircle, CalendarIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { backend, type LinkStats } from "@/lib/linkinbio/backend";
import { uiText } from "@/lib/uiText";
import { cn } from "@/lib/utils";

const t = uiText.editor.analytics;
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
/** Lookup names → names used by the map file. */
const MAP_ALIASES: Record<string, string> = {
  "United States": "United States of America", "Bosnia and Herzegovina": "Bosnia and Herz.", "Dominican Republic": "Dominican Rep.",
  "Czech Republic": "Czechia", "Central African Republic": "Central African Rep.", "South Sudan": "S. Sudan", "North Macedonia": "Macedonia",
  "Democratic Republic of the Congo": "Dem. Rep. Congo", "Congo - Kinshasa": "Dem. Rep. Congo", "Congo - Brazzaville": "Congo", "Côte d’Ivoire": "Côte d'Ivoire",
  "Equatorial Guinea": "Eq. Guinea", "Solomon Islands": "Solomon Is.", "Falkland Islands": "Falkland Is.", "Western Sahara": "W. Sahara", "Eswatini": "eSwatini",
  "Myanmar (Burma)": "Myanmar", "Türkiye": "Turkey",
};

type RangeKey = "7" | "30" | "90" | "custom";
interface Period { key: RangeKey; custom?: DateRange }
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
function resolve(p: Period): { from: string; to: string } | null {
  const today = new Date();
  if (p.key !== "custom") return { from: ymd(subDays(today, Number(p.key) - 1)), to: ymd(today) };
  if (!p.custom?.from) return null;
  return { from: ymd(p.custom.from), to: ymd(p.custom.to ?? p.custom.from) };
}

function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function RangePicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const r = resolve(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.key} onValueChange={(k) => onChange({ key: k as RangeKey, custom: value.custom })}>
        <SelectTrigger className="h-8 w-[150px] text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(t.ranges) as RangeKey[]).map((k) => <SelectItem key={k} value={k}>{t.ranges[k]}</SelectItem>)}</SelectContent>
      </Select>
      {value.key === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 font-normal", !r && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {r ? `${format(parseISO(r.from), "d MMM yyyy")} – ${format(parseISO(r.to), "d MMM yyyy")}` : t.pickDates}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={value.custom} onSelect={(c) => onChange({ key: "custom", custom: c })} disabled={{ after: new Date() }} numberOfMonths={1} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-destructive/40 p-6 text-center text-sm">
      <AlertCircle className="h-5 w-5 text-destructive" />
      <p>{t.error}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>{t.retry}</Button>
    </div>
  );
}

function MetricChart({ title, total, totalLabel, data, dataKey, max, suffix = "", today }: {
  title: string; total: string; totalLabel: string; data: Record<string, number | string | boolean>[]; dataKey: string; max?: number; suffix?: string; today: string;
}) {
  return (
    <section className="border-t pt-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide">{title}</h4>
        <div className="text-right"><p className="text-2xl font-semibold leading-none tabular-nums">{total}</p><p className="mt-1 text-[11px] uppercase text-muted-foreground">{totalLabel}</p></div>
      </div>
      <div className="mt-2 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} domain={[0, max ?? "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--primary))", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Record<string, unknown>;
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow">
                    <p className="font-medium">{String(p.label)}{p.day === today ? ` · ${t.legendPartial}` : ""}</p>
                    <p className="tabular-nums">{p.hasData ? `${p[dataKey]}${suffix}` : t.legendNoData}</p>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#g-${dataKey})`}
              dot={(props: { cx?: number; cy?: number; payload?: Record<string, unknown>; index?: number }) => {
                const { cx = 0, cy = 0, payload, index } = props;
                const partial = payload?.day === today;
                return <circle key={index} cx={cx} cy={cy} r={partial ? 3.5 : 2.5}
                  fill={partial ? "hsl(var(--background))" : payload?.hasData ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.35)"}
                  stroke={partial ? "hsl(var(--primary))" : "none"} strokeWidth={1.5} />;
              }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{t.legendData}</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" />{t.legendNoData}</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />{t.legendPartial}</span>
    </div>
  );
}

const regionName = (() => {
  try { const names = new Intl.DisplayNames(["en"], { type: "region" }); return (code: string) => names.of(code) ?? code; }
  catch { return (code: string) => code; }
})();

function TopList({ title, items }: { title: string; items: { name: string; pct: number }[] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide">{title}</h4>
      {!items.length ? <p className="text-sm text-muted-foreground">–</p> : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_3rem] items-center gap-2 text-sm">
              <span className="truncate" title={it.name}>{it.name}</span>
              <span className="h-3 rounded-sm bg-muted"><span className="block h-full rounded-sm bg-primary" style={{ width: `${Math.max(it.pct, 2)}%` }} /></span>
              <span className="text-right tabular-nums">{it.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const top = (items: { name: string; clicks: number }[]) => {
  const total = items.reduce((a, b) => a + b.clicks, 0);
  return [...items].sort((a, b) => b.clicks - a.clicks).slice(0, 5).map((it) => ({ name: it.name, pct: total ? (it.clicks / total) * 100 : 0 }));
};

function CountryMap({ stats }: { stats: LinkStats }) {
  const mapCounts = new Map<string, number>();
  for (const c of stats.countries) {
    const name = regionName(c.country);
    mapCounts.set(MAP_ALIASES[name] ?? name, (mapCounts.get(MAP_ALIASES[name] ?? name) ?? 0) + c.clicks);
  }
  const maxC = Math.max(0, ...mapCounts.values());
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide">{t.mapTitle}</h4>
      <div className="mt-2 flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
        {t.low}<span className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--primary)))" }} />{t.high}
      </div>
      <ComposableMap projectionConfig={{ scale: 150 }} width={800} height={400} className="mt-2 h-auto w-full">
        <Geographies geography={GEO_URL}>
          {({ geographies }) => geographies.map((geo) => {
            const v = mapCounts.get(geo.properties.name as string) ?? 0;
            const fill = v ? `hsl(var(--primary) / ${(0.2 + 0.8 * (v / maxC)).toFixed(2)})` : "hsl(var(--muted))";
            return <Geography key={geo.rsmKey} geography={geo} fill={fill} stroke="hsl(var(--background))" strokeWidth={0.5}
              style={{ default: { outline: "none" }, hover: { outline: "none", opacity: 0.8 }, pressed: { outline: "none" } }}>
              <title>{`${geo.properties.name}: ${v}`}</title>
            </Geography>;
          })}
        </Geographies>
      </ComposableMap>
    </div>
  );
}

/** Visits through the page's bit.ly link, read from Bitly by the backend. */
export function AnalyticsTab({ pageId, shortUrl }: { pageId?: string; shortUrl: string | null }) {
  const [period, setPeriod] = useState<Period>({ key: "30" });
  const r = resolve(period);
  const q = useQuery({
    queryKey: ["link-stats", pageId, r?.from, r?.to],
    queryFn: () => backend.linkStats(pageId!, r!.from, r!.to),
    enabled: !!r && !!pageId,
  });
  const today = ymd(new Date());
  const rows = useMemo(() => (q.data?.daily ?? []).map((d) => ({ day: d.day, label: format(parseISO(d.day), "d MMM"), visits: d.clicks, hasData: d.clicks > 0 })), [q.data]);
  const visits = rows.reduce((a, b) => a + b.visits, 0);
  if (!pageId) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t.visitsTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.visitsIntro}</p>
        {shortUrl && <p className="text-sm">{t.shortLink} <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{shortUrl}</a></p>}
      </div>
      {q.data === null ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t.noBitly}</p> : (
        <>
          <Legend />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <RangePicker value={period} onChange={setPeriod} />
            <Button size="sm" variant="outline" className="h-8" disabled={!rows.length}
              onClick={() => downloadCsv(`page-visits-${r?.from}-${r?.to}.csv`, t.csvDaily, rows.map((d) => [d.day, d.visits]))}>
              <Download className="h-3.5 w-3.5" />{t.exportCsv}
            </Button>
          </div>
          {q.isError ? <ErrorBox onRetry={() => q.refetch()} /> : q.isLoading || !r || !q.data ? (
            <div className="space-y-4"><Skeleton className="h-44 w-full" /><Skeleton className="h-72 w-full" /></div>
          ) : (
            <>
              {!visits && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t.empty}</p>}
              <MetricChart title={t.visits} total={String(visits)} totalLabel={t.total} data={rows} dataKey="visits" today={today} max={visits ? undefined : 4} />
              <CountryMap stats={q.data} />
              <div className="grid gap-6 sm:grid-cols-2">
                <TopList title={t.topCountry} items={top(q.data.countries.map((c) => ({ name: regionName(c.country), clicks: c.clicks })))} />
                <TopList title={t.referrers} items={top(q.data.referrers)} />
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
