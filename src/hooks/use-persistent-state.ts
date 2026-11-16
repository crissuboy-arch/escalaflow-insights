// Estado de UI (filtros, aba ativa) que sobrevive a um refresh da página.
// Só preferências — os DADOS vêm sempre do Supabase. Seguro em SSR: começa
// com o valor padrão e só lê o localStorage no browser, depois de montar.
import { useCallback, useEffect, useState } from "react";

const PREFIX = "scalaflow:ui:";

export function readPersisted<T>(key: string, fallback: T, isValid?: (v: unknown) => v is T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (isValid && !isValid(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writePersisted(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota/privado — ignora, é só preferência */
  }
}

export function usePersistentState<T>(
  key: string,
  fallback: T,
  isValid?: (v: unknown) => v is T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(readPersisted(key, fallback, isValid));
    // só na montagem / troca de chave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (v: T) => {
      setValue(v);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(v));
      } catch {
        /* quota/privado — ignora, é só preferência */
      }
    },
    [key],
  );

  return [value, set];
}

export const isString = (v: unknown): v is string => typeof v === "string";
