import { describe, it, expect, vi, beforeEach } from "vitest";

const lookupMock = vi.fn();
vi.mock("node:dns/promises", () => ({
  lookup: (...args: unknown[]) => lookupMock(...args),
}));

const {
  isBlockedHostnameLiteral,
  isPrivateOrReservedIp,
  resolvesToPrivateIp,
} = await import("./ssrf-guard");

beforeEach(() => {
  lookupMock.mockReset();
});

describe("isBlockedHostnameLiteral", () => {
  it("bloqueia localhost e variações de loopback", () => {
    expect(isBlockedHostnameLiteral("localhost")).toBe(true);
    expect(isBlockedHostnameLiteral("127.0.0.1")).toBe(true);
    expect(isBlockedHostnameLiteral("::1")).toBe(true);
  });

  it("bloqueia prefixos de rede privada/link-local", () => {
    expect(isBlockedHostnameLiteral("10.0.0.5")).toBe(true);
    expect(isBlockedHostnameLiteral("192.168.1.1")).toBe(true);
    expect(isBlockedHostnameLiteral("172.16.0.1")).toBe(true);
    expect(isBlockedHostnameLiteral("169.254.169.254")).toBe(true);
  });

  it("permite um domínio público comum", () => {
    expect(isBlockedHostnameLiteral("example.com")).toBe(false);
  });
});

describe("isPrivateOrReservedIp — IPv4", () => {
  it.each([
    ["10.1.2.3", true],
    ["127.0.0.1", true],
    ["169.254.169.254", true], // cloud metadata endpoint
    ["172.20.0.1", true],
    ["192.168.0.1", true],
    ["100.64.0.1", true], // CGNAT
    ["0.0.0.0", true],
    ["240.0.0.1", true], // reserved
    ["8.8.8.8", false],
    ["93.184.216.34", false],
  ])("%s -> privado/reservado: %s", (ip, expected) => {
    expect(isPrivateOrReservedIp(ip)).toBe(expected);
  });
});

describe("isPrivateOrReservedIp — IPv6", () => {
  it.each([
    ["::1", true],
    ["::", true],
    ["fe80::1", true],
    ["fc00::1", true],
    ["fd12:3456::1", true],
    ["::ffff:127.0.0.1", true], // IPv4-mapped loopback
    ["::ffff:169.254.169.254", true], // IPv4-mapped metadata endpoint
    ["2001:4860:4860::8888", false], // public (Google DNS)
  ])("%s -> privado/reservado: %s", (ip, expected) => {
    expect(isPrivateOrReservedIp(ip)).toBe(expected);
  });

  it("entrada não-IP falha fechado (trata como privado)", () => {
    expect(isPrivateOrReservedIp("not-an-ip")).toBe(true);
  });
});

describe("resolvesToPrivateIp", () => {
  it("bloqueia direto por literal sem nem chamar DNS", async () => {
    const blocked = await resolvesToPrivateIp("localhost");
    expect(blocked).toBe(true);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("bloqueia quando a resolução DNS aponta para IP privado (DNS rebinding)", async () => {
    lookupMock.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    const blocked = await resolvesToPrivateIp("attacker-controlled.example.com");
    expect(blocked).toBe(true);
  });

  it("permite quando todas as resoluções são IPs públicos", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const blocked = await resolvesToPrivateIp("example.com");
    expect(blocked).toBe(false);
  });

  it("bloqueia (falha fechada) se a resolução DNS falhar", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    const blocked = await resolvesToPrivateIp("does-not-resolve.invalid");
    expect(blocked).toBe(true);
  });

  it("bloqueia se QUALQUER um dos registros resolvidos for privado, mesmo com outros públicos", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);
    const blocked = await resolvesToPrivateIp("multi-record.example.com");
    expect(blocked).toBe(true);
  });
});
