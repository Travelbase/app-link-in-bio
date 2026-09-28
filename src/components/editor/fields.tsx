import { useId, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { isValidUrl } from "@/lib/linkinbio/validation";
import { uiText } from "@/lib/uiText";
import { SortableList } from "./SortableList";

const f = uiText.editor.fields;

export function TextField({ label, value, onChange, placeholder, hint, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; error?: string | null;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} className={error ? "border-destructive" : undefined} />
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function UrlField({ label, value, onChange, optional, hint, onBlur }: {
  label: string; value: string | undefined; onChange: (v: string) => void; optional?: boolean; hint?: string; onBlur?: () => void;
}) {
  const id = useId();
  const bad = !!value ? !isValidUrl(value) : !optional;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value ?? ""} inputMode="url" placeholder="https://" onBlur={onBlur}
        onChange={(e) => onChange(e.target.value.trim())} aria-invalid={bad} className={bad ? "border-amber-500" : undefined} />
      {bad ? <p className="text-xs text-amber-700">{f.urlHint}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={!!checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="font-normal">{label}</Label>
    </div>
  );
}

/** Editable list with add, remove and drag-to-reorder. */
export function ListEditor<T>({ label, items, onChange, makeItem, addLabel, itemTitle, renderFields }: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  makeItem: () => T;
  addLabel: string;
  itemTitle: (i: number) => string;
  renderFields: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  const list = items ?? [];
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <SortableList
        items={list}
        getId={(_, i) => String(i)}
        onReorder={onChange}
        className="space-y-2"
        renderItem={(item, i, { handle }) => (
          <div className="rounded-md border bg-background p-3 space-y-3">
            <div className="flex items-center gap-1">
              {handle}
              <span className="flex-1 text-xs font-medium text-muted-foreground">{itemTitle(i + 1)}</span>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={f.remove}
                onClick={() => onChange(list.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {renderFields(item, (patch) => onChange(list.map((it, j) => (j === i ? { ...it, ...patch } : it))), i)}
          </div>
        )}
      />
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onChange([...list, makeItem()])}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}
