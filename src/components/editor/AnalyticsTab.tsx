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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
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

async function fetchStats<T>(pageId: string, kind: string, r: { from: string; to: string }): Promise<T> {
  const { data, error } = await supabase.functions.invoke("analytics-stats", { body: { pageId, kind, ...r } });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as T;
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

interface Daily { day: string; views: number; button_clicks: number; post_clicks: number }
interface TopLink { item_label: string; block_type: string; destination: string; clicks: number }
interface Loc { country: string | null; city: string | null; views: number }

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

function Interactions({ pageId, publicUrl }: { pageId: string; publicUrl: string }) {
  const [period, setPeriod] = useState<Period>({ key: "7" });
  const r = resolve(period);
  const q = useQuery({
    queryKey: ["analytics", pageId, "interactions", r?.from, r?.to],
    queryFn: () => fetchStats<{ daily: Daily[]; topLinks: TopLink[] }>(pageId, "interactions", r!),
    enabled: !!r && !!pageId,
  });
  const today = ymd(new Date());
  const rows = useMemo(() => (q.data?.daily ?? []).map((d) => {
    const clicks = Number(d.button_clicks) + Number(d.post_clicks);
    const views = Number(d.views);
    return { day: d.day, label: format(parseISO(d.day), "d MMM"), views, button_clicks: Number(d.button_clicks), post_clicks: Number(d.post_clicks),
      ctr: views ? Math.round((clicks / views) * 1000) / 10 : 0, hasData: views + clicks > 0 };
  }), [q.data]);
  const sum = (k: "views" | "button_clicks" | "post_clicks") => rows.reduce((a, b) => a + b[k], 0);
  const views = sum("views"), bc = sum("button_clicks"), pc = sum("post_clicks");
  const avg = views ? `${(((bc + pc) / views) * 100).toFixed(1)}%` : "0%";
  const empty = !!q.data && views + bc + pc === 0;
  const allClicks = (q.data?.topLinks ?? []).reduce((a, l) => a + Number(l.clicks), 0);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t.interactionsTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.interactionsIntro}</p>
        <p className="text-sm">{t.pageLabel} <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{publicUrl}</a></p>
      </div>
      <Legend />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RangePicker value={period} onChange={setPeriod} />
        <Button size="sm" variant="outline" className="h-8" disabled={!rows.length}
          onClick={() => downloadCsv(`page-interactions-${r?.from}-${r?.to}.csv`, t.csvDaily, rows.map((d) => [d.day, d.views, d.button_clicks, d.post_clicks, d.ctr]))}>
          <Download className="h-3.5 w-3.5" />{t.exportCsv}
        </Button>
      </div>
      {q.isError ? <ErrorBox onRetry={() => q.refetch()} /> : q.isLoading || !r ? (
        <div className="space-y-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)}</div>
      ) : (
        <>
          {empty && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t.empty}</p>}
          <MetricChart title={t.pageViews} total={String(views)} totalLabel={t.total} data={rows} dataKey="views" today={today} max={empty ? 4 : undefined} />
          <MetricChart title={t.buttonClicks} total={String(bc)} totalLabel={t.total} data={rows} dataKey="button_clicks" today={today} max={empty ? 4 : undefined} />
          <MetricChart title={t.postClicks} total={String(pc)} totalLabel={t.total} data={rows} dataKey="post_clicks" today={today} max={empty ? 4 : undefined} />
          <MetricChart title={t.ctr} total={avg} totalLabel={t.avgCtr} data={rows} dataKey="ctr" suffix="%" today={today} max={empty ? 100 : undefined} />
          <section className="border-t pt-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide">{t.topLinks}</h4>
            {!q.data?.topLinks.length ? <p className="text-sm text-muted-foreground">{t.noLinks}</p> : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>{t.colLink}</TableHead><TableHead>{t.colType}</TableHead><TableHead className="text-right">{t.colClicks}</TableHead><TableHead className="text-right">{t.colShare}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {q.data.topLinks.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px]"><p className="truncate font-medium" title={l.item_label}>{l.item_label}</p><p className="truncate text-xs text-muted-foreground" title={l.destination}>{l.destination}</p></TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{t.blockTypes[l.block_type] ?? l.block_type}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.clicks}</TableCell>
                        <TableCell className="text-right tabular-nums">{allClicks ? `${((Number(l.clicks) / allClicks) * 100).toFixed(1)}%` : "–"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

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

function Locations({ pageId }: { pageId: string }) {
  const [period, setPeriod] = useState<Period>({ key: "7" });
  const r = resolve(period);
  const q = useQuery({
    queryKey: ["analytics", pageId, "locations", r?.from, r?.to],
    queryFn: () => fetchStats<{ locations: Loc[] }>(pageId, "locations", r!),
    enabled: !!r && !!pageId,
  });
  const locs = q.data?.locations ?? [];
  const total = locs.reduce((a, l) => a + Number(l.views), 0);
  const byCountry = new Map<string, number>();
  const byCity = new Map<string, number>();
  for (const l of locs) {
    const c = l.country || t.unknown;
    byCountry.set(c, (byCountry.get(c) ?? 0) + Number(l.views));
    const city = l.city || t.unknown;
    byCity.set(city, (byCity.get(city) ?? 0) + Number(l.views));
  }
  const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, v]) => ({ name, pct: total ? (v / total) * 100 : 0 }));
  const mapCounts = new Map<string, number>();
  byCountry.forEach((v, k) => mapCounts.set(MAP_ALIASES[k] ?? k, v));
  const maxC = Math.max(0, ...mapCounts.values());

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t.locationTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.locationIntro}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RangePicker value={period} onChange={setPeriod} />
        <Button size="sm" variant="outline" className="h-8" disabled={!locs.length}
          onClick={() => downloadCsv(`page-locations-${r?.from}-${r?.to}.csv`, t.csvLocation, locs.map((l) => [l.country || t.unknown, l.city || t.unknown, l.views]))}>
          <Download className="h-3.5 w-3.5" />{t.exportCsv}
        </Button>
      </div>
      {q.isError ? <ErrorBox onRetry={() => q.refetch()} /> : q.isLoading || !r ? <Skeleton className="h-72 w-full" /> : (
        <>
          {!total && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t.empty}</p>}
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
          <div className="grid gap-6 sm:grid-cols-2">
            <TopList title={t.topCountry} items={top(byCountry)} />
            <TopList title={t.topCity} items={top(byCity)} />
          </div>
        </>
      )}
    </section>
  );
}

export function AnalyticsTab({ pageId, publicUrl }: { pageId?: string; publicUrl: string }) {
  if (!pageId) return null;
  return (
    <div className="space-y-10">
      <Interactions pageId={pageId} publicUrl={publicUrl} />
      <Locations pageId={pageId} />
    </div>
  );
}
