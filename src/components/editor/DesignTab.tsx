import { useId, type CSSProperties, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BlockShadow, BlockShape, BlockStyleKind, FontKey, PageData, PageDesign } from "@/lib/linkinbio/types";
import { FONTS } from "@/lib/linkinbio/theme";
import { THEME_KEYS, THEME_PRESETS, matchingTheme } from "@/lib/linkinbio/presets";
import { uiText } from "@/lib/uiText";
import { ImageUpload } from "./ImageUpload";

const t = uiText.editor.design;

interface Props {
  page: PageData;
  update: (patch: Partial<PageData>) => void;
}

export function DesignTab({ page, update }: Props) {
  const active = matchingTheme(page);
  return (
    <div className="space-y-6">
      <Section title={t.themes}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {THEME_KEYS.map((k) => (
            <ThemeTile key={k} label={t.themeNames[k]} design={{ ...THEME_PRESETS[k], background_image_url: null }} selected={active === k}
              onClick={() => update(THEME_PRESETS[k])} />
          ))}
          <ThemeTile label={t.custom} design={page} selected={active === null} onClick={() => undefined} />
        </div>
      </Section>

      <Section title={t.page}>
        <Row label={t.background}>
          <Segmented
            value={page.background_type}
            options={[{ value: "color", label: t.color }, { value: "image", label: t.image }]}
            onChange={(v) => update({ background_type: v as PageDesign["background_type"] })}
          />
        </Row>
        {page.background_type === "image" ? (
          <ImageUpload value={page.background_image_url} onChange={(background_image_url) => update({ background_image_url })} />
        ) : (
          <ColorRow label={t.color} value={page.background_color} onChange={(background_color) => update({ background_color })} allowGradient />
        )}
        <ColorRow label={t.textIconColor} value={page.text_color} onChange={(text_color) => update({ text_color })} />
        <Row label={t.font}>
          <Select value={page.font} onValueChange={(v) => update({ font: v as FontKey })}>
            <SelectTrigger className="w-56" style={{ fontFamily: FONTS[page.font].body }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FONTS) as FontKey[]).map((k) => (
                <SelectItem key={k} value={k} style={{ fontFamily: FONTS[k].display }}>{t.fontNames[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Section>

      <Section title={t.blockDesign}>
        <ColorRow label={t.blockColor} value={page.block_color} onChange={(block_color) => update({ block_color })} />
        <ColorRow label={t.blockTextColor} value={page.block_text_color} onChange={(block_text_color) => update({ block_text_color })} />
        <OptionRow<BlockShape> label={t.shape} value={page.block_shape} onChange={(block_shape) => update({ block_shape })}
          options={(["round_sides", "rounded", "square"] as BlockShape[]).map((v) => ({
            value: v, label: t.shapes[v],
            sample: <span className="h-4 w-7 border-2 border-foreground" style={{ borderRadius: v === "round_sides" ? 999 : v === "rounded" ? 4 : 0 }} />,
          }))} />
        <OptionRow<BlockStyleKind> label={t.style} value={page.block_style} onChange={(block_style) => update({ block_style })}
          options={(["solid", "outline"] as BlockStyleKind[]).map((v) => ({
            value: v, label: t.styles[v],
            sample: <span className={cn("h-4 w-4 rounded-sm border-2 border-foreground", v === "solid" && "bg-foreground")} />,
          }))} />
        <OptionRow<BlockShadow> label={t.shadow} value={page.block_shadow} onChange={(block_shadow) => update({ block_shadow })}
          options={(["none", "soft", "hard"] as BlockShadow[]).map((v) => ({
            value: v, label: t.shadows[v],
            sample: <span className="h-4 w-4 rounded-sm bg-foreground" style={{ boxShadow: v === "soft" ? "0 2px 6px rgba(0,0,0,.35)" : v === "hard" ? "3px 3px 0 hsl(var(--primary))" : "none" }} />,
          }))} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className="font-normal">{label}</Label>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange, allowGradient }: { label: string; value: string; onChange: (v: string) => void; allowGradient?: boolean }) {
  const id = useId();
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="space-y-1">
      <Row label={label} htmlFor={id}>
        <div className="flex h-9 w-56 overflow-hidden rounded-md border">
          <input type="color" aria-label={label} value={isHex ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)}
            className="h-full w-10 cursor-pointer border-r bg-transparent p-0.5" />
          <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-full rounded-none border-0 font-mono text-xs focus-visible:ring-0" />
        </div>
      </Row>
      {allowGradient && !isHex && value.includes("gradient") && <p className="text-right text-xs text-muted-foreground">{t.gradientNote}</p>}
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-md border p-0.5" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("rounded px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === o.value ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OptionRow<V extends string>({ label, value, options, onChange }: {
  label: string; value: V; options: { value: V; label: string; sample: ReactNode }[]; onChange: (v: V) => void;
}) {
  return (
    <Row label={label}>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
            className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === o.value ? "border-primary bg-primary/10 text-foreground" : "hover:bg-muted")}>
            {o.sample}
            {o.label}
          </button>
        ))}
      </div>
    </Row>
  );
}

function ThemeTile({ label, design, selected, onClick }: { label: string; design: PageDesign; selected: boolean; onClick: () => void }) {
  const bg: CSSProperties = design.background_type === "image" && design.background_image_url
    ? { backgroundImage: `url("${design.background_image_url}")`, backgroundSize: "cover" }
    : { background: design.background_color };
  const radius = design.block_shape === "round_sides" ? 999 : design.block_shape === "rounded" ? 3 : 0;
  const bar: CSSProperties = design.block_style === "outline"
    ? { border: `1.5px solid ${design.block_color}`, borderRadius: radius }
    : { background: design.block_color, borderRadius: radius };
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn("group space-y-1 text-left focus-visible:outline-none", selected && "cursor-default")}>
      <div className={cn("flex aspect-[3/4] flex-col items-center gap-1.5 rounded-md border-2 p-2 pt-3 transition-all group-focus-visible:ring-2 group-focus-visible:ring-ring",
        selected ? "border-primary" : "border-transparent ring-1 ring-border hover:ring-primary/50")} style={bg}>
        <span className="h-3 w-3 rounded-full" style={{ background: design.text_color, opacity: 0.8 }} />
        <span className="h-1 w-8 rounded" style={{ background: design.text_color, opacity: 0.6 }} />
        <span className="mt-1 h-2.5 w-full" style={bar} />
        <span className="h-2.5 w-full" style={bar} />
        <span className="h-2.5 w-full" style={bar} />
      </div>
      <p className={cn("text-center text-xs", selected ? "font-semibold text-primary" : "text-muted-foreground")} style={{ fontFamily: FONTS[design.font]?.body }}>{label}</p>
    </button>
  );
}
