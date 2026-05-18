import { PLATFORM_CATALOG } from "@/lib/scale/i18n";

export function PlatformPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  function toggleGroup(ids: string[]) {
    const allOn = ids.every((id) => value.includes(id));
    onChange(allOn ? value.filter((v) => !ids.includes(v)) : Array.from(new Set([...value, ...ids])));
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
        {PLATFORM_CATALOG.map((group) => {
          const ids = group.placements.map((p) => p.id);
          const allOn = ids.every((id) => value.includes(id));
          return (
            <div key={group.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{group.label}</p>
                <button
                  type="button"
                  onClick={() => toggleGroup(ids)}
                  className="text-[11px] text-muted-foreground hover:text-primary"
                >
                  {allOn ? "Desmarcar tudo" : "Marcar tudo"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.placements.map((p) => {
                  const on = value.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.hint}
                      onClick={() => toggle(p.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
  );
}