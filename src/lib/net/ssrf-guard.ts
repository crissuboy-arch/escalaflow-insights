// Shared SSRF guard for any server-side feature that fetches a
// user-supplied URL (today: the offer scraper, src/lib/scraper/
// playwright-scraper.ts). A literal hostname blocklist alone (the
// previous approach) only catches a target that is spelled out as
// "localhost"/"127.0.0.1"/etc. — it does not catch a public-looking
// hostname whose DNS record resolves to a private/reserved IP (DNS
// rebinding), nor a redirect hop that lands on one after the initial
// check already passed. This module adds the resolve-then-classify
// step; callers must invoke it for the initial URL AND for every
// redirect hop (see playwright-scraper.ts's request routing).
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const BLOCKED_HOSTNAME_LITERALS = [
  "localhost", "127.0.0.1", "::1",
  "169.254.", "10.", "192.168.", "172.16.",
];

/** Fast, sync pre-check against the literal hostname string, before any
 *  DNS lookup — kept for parity with the previous behavior and as a
 *  cheap first filter. */
export function isBlockedHostnameLiteral(hostname: string): boolean {
  return BLOCKED_HOSTNAME_LITERALS.some(
    (blocked) => hostname === blocked || hostname.startsWith(blocked),
  );
}

/** Classifies a single resolved IP address (v4 or v6) as private/reserved
 *  (loopback, link-local, RFC1918, CGNAT, multicast/reserved, IPv4-mapped
 *  IPv6 of any of those). Unknown/unparseable input fails closed (true). */
export function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0) return true; // "this network"
    if (a === 10) return true; // RFC1918
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true; // shared/CGNAT (RFC6598)
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local (fc00::/7)
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }

  // Not a parseable IP at all — never treat as safe.
  return true;
}

/** Resolves a hostname and reports whether ANY of its A/AAAA records
 *  point at a private/reserved address. A DNS failure also fails closed
 *  (treated as unsafe) — an unresolvable host has no legitimate public
 *  page to scrape anyway. */
export async function resolvesToPrivateIp(hostname: string): Promise<boolean> {
  if (isBlockedHostnameLiteral(hostname)) return true;
  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return true;
    return records.some((r) => isPrivateOrReservedIp(r.address));
  } catch {
    return true;
  }
}
