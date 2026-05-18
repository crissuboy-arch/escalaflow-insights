import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { COUNTRIES, REGION_PRESETS, countryByCode } from "@/lib/scale/i18n";

export function CountryMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {REGION_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.codes)}
            className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
          >
            {p.label}
          </button>
        ))}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            Limpar
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="truncate text-left">
              {value.length === 0 ? "Selecionar países..." : `${value.length} país(es) selecionado(s)`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar país..." />
            <CommandList>
              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => {
                  const selected = value.includes(c.code);
                  return (
                    <CommandItem key={c.code} value={`${c.name} ${c.code}`} onSelect={() => toggle(c.code)}>
                      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      <span className="mr-2">{c.flag}</span>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.code}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((code) => {
            const c = countryByCode(code);
            if (!c) return null;
            return (
              <Badge key={code} variant="secondary" className="gap-1">
                <span>{c.flag}</span>
                <span>{c.name}</span>
                <button type="button" onClick={() => toggle(code)} className="ml-1 opacity-60 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}