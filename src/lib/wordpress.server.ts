/**
 * Cliente simples para a WordPress REST API usando Application Password (Basic Auth).
 * Fase 1: 1 site só, credenciais via .env (WORDPRESS_URL, WORDPRESS_USER,
 * WORDPRESS_APP_PASSWORD). Sem storage de credenciais por projeto ainda.
 */

/**
 * Credenciais de um site WordPress. Quando passadas (vindas do projeto), têm
 * prioridade sobre o .env — é o que habilita o multi-site (1 conjunto por projeto).
 */
export interface WpCredentials {
  url: string;
  user: string;
  password: string;
}

function wpConfig(creds?: WpCredentials): { base: string; auth: string } {
  const url = creds?.url ?? process.env.WORDPRESS_URL;
  const user = creds?.user ?? process.env.WORDPRESS_USER;
  const pass = creds?.password ?? process.env.WORDPRESS_APP_PASSWORD;
  if (!url || !user || !pass) {
    throw new Error(
      "WordPress não configurado. Informe URL, Usuário e Application Password no projeto, ou defina WORDPRESS_URL, WORDPRESS_USER e WORDPRESS_APP_PASSWORD no .env.",
    );
  }
  const base = url.replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  return { base, auth };
}

// ── Mídia ───────────────────────────────────────────────────────────────────

export async function uploadMedia(
  imageUrlOuBase64: string,
  filename: string,
  creds?: WpCredentials,
): Promise<{ mediaId: number; url: string }> {
  const { base, auth } = wpConfig(creds);

  let bytes: Buffer;
  let contentType = "image/png";
  if (imageUrlOuBase64.startsWith("data:")) {
    const m = imageUrlOuBase64.match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) throw new Error("Imagem base64 inválida.");
    contentType = m[1];
    bytes = Buffer.from(m[2], "base64");
  } else if (/^https?:\/\//i.test(imageUrlOuBase64)) {
    const r = await fetch(imageUrlOuBase64);
    if (!r.ok) throw new Error(`Falha ao baixar a imagem (${r.status}).`);
    contentType = r.headers.get("content-type") || contentType;
    bytes = Buffer.from(await r.arrayBuffer());
  } else {
    // base64 cru, sem prefixo data:
    bytes = Buffer.from(imageUrlOuBase64, "base64");
  }

  const res = await fetch(`${base}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    // Blob garante um BodyInit válido em ambos os runtimes (Node e Workers).
    body: new Blob([new Uint8Array(bytes)]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`WordPress media ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: number; source_url: string };
  return { mediaId: json.id, url: json.source_url };
}

// ── Termos (categorias/tags) ──────────────────────────────────────────────────
// A WP REST API exige IDs (não nomes) ao publicar. Resolve por nome: busca e,
// se não existir, cria. Degrada em silêncio (retorna null) se faltar permissão.

async function ensureTerm(
  base: string,
  auth: string,
  taxonomy: "categories" | "tags",
  name: string,
): Promise<number | null> {
  const clean = name.trim();
  if (!clean) return null;
  try {
    const q = await fetch(`${base}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(clean)}`, {
      headers: { Authorization: auth },
    });
    if (q.ok) {
      const arr = (await q.json()) as Array<{ id: number; name: string }>;
      const found = arr.find((t) => t.name.toLowerCase() === clean.toLowerCase());
      if (found) return found.id;
    }
    const c = await fetch(`${base}/wp-json/wp/v2/${taxonomy}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });
    if (c.ok) {
      const j = (await c.json()) as { id: number };
      return j.id;
    }
    // termo já existe → a API retorna o id em data.term_id
    const err = (await c.json().catch(() => null)) as { data?: { term_id?: number } } | null;
    if (err?.data?.term_id) return err.data.term_id;
  } catch {
    // ignora — publica sem o termo
  }
  return null;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export interface PublishPostInput {
  titulo: string;
  corpoHtml: string;
  slug: string;
  metaDescricao: string;
  categoriaSugerida: string;
  tags: string[];
  featuredMediaId?: number;
  status: "draft" | "publish";
}

export async function publishPost(
  input: PublishPostInput,
  creds?: WpCredentials,
): Promise<{ postId: number; url: string }> {
  const { base, auth } = wpConfig(creds);

  const tagIds: number[] = [];
  for (const t of input.tags ?? []) {
    const id = await ensureTerm(base, auth, "tags", t);
    if (id) tagIds.push(id);
  }
  const catIds: number[] = [];
  if (input.categoriaSugerida) {
    const id = await ensureTerm(base, auth, "categories", input.categoriaSugerida);
    if (id) catIds.push(id);
  }

  const body: Record<string, unknown> = {
    title: input.titulo,
    content: input.corpoHtml,
    slug: input.slug,
    excerpt: input.metaDescricao, // campo nativo mais próximo de meta description
    status: input.status,
  };
  if (input.featuredMediaId) body.featured_media = input.featuredMediaId;
  if (catIds.length) body.categories = catIds;
  if (tagIds.length) body.tags = tagIds;

  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`WordPress post ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: number; link: string };
  return { postId: json.id, url: json.link };
}

// ── Páginas (Home, Sobre, Contato, FAQ, Política, Termos) ──────────────────────
// Mesma autenticação do publishPost, mas no endpoint /pages. Páginas não usam
// categorias/tags; aceitam menu_order para ordenar no menu.

export interface PublishPageInput {
  titulo: string;
  corpoHtml: string;
  slug: string;
  status: "draft" | "publish";
  menuOrder?: number;
}

export async function publishPage(
  input: PublishPageInput,
  creds?: WpCredentials,
): Promise<{ pageId: number; url: string }> {
  const { base, auth } = wpConfig(creds);

  const body: Record<string, unknown> = {
    title: input.titulo,
    content: input.corpoHtml,
    slug: input.slug,
    status: input.status,
  };
  if (typeof input.menuOrder === "number") body.menu_order = input.menuOrder;

  const res = await fetch(`${base}/wp-json/wp/v2/pages`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`WordPress page ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: number; link: string };
  return { pageId: json.id, url: json.link };
}
