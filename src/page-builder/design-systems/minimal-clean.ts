import type { DesignSystemConfig } from "./types";

export const minimalClean: DesignSystemConfig = {
  id: "minimal-clean",
  name: "Minimal Clean",
  description: "Design minimalista, branco, tipografia forte — estilo Apple/Linear",
  accentColor: "#2563EB",
  bgColor: "#FFFFFF",
  textColor: "#111827",
  headlineFont: "'Inter', system-ui, sans-serif",
  bodyFont: "'Inter', system-ui, sans-serif",
  borderRadius: "8px",
  shadow: "0 1px 8px rgba(0,0,0,0.08)",
  cssSnippet: `
:root{--bg:#fff;--bg2:#F9FAFB;--bg3:#F3F4F6;--text:#111827;--muted:#6B7280;--accent:#2563EB;--border:#E5E7EB;--btn:#2563EB;--btn-text:#fff;--r:8px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;line-height:1.65;}
h1{font-size:clamp(2rem,5vw,3.75rem);font-weight:900;line-height:1.1;letter-spacing:-0.03em;}
h2{font-size:clamp(1.5rem,3.5vw,2.75rem);font-weight:800;line-height:1.15;letter-spacing:-0.02em;}
h3{font-size:1.25rem;font-weight:700;}
.section{padding:96px 20px;max-width:800px;margin:0 auto;}
.section-wide{padding:96px 20px;max-width:1100px;margin:0 auto;}
.section-gray{background:var(--bg2);}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:16px 40px;border-radius:6px;font-size:16px;font-weight:600;border:none;cursor:pointer;text-decoration:none;transition:background .2s,transform .2s;}
.btn:hover{background:#1D4ED8;transform:translateY(-1px);}
.btn-lg{padding:20px 56px;font-size:18px;border-radius:8px;}
.card{background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:28px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:#EFF6FF;color:var(--accent);border:1px solid #BFDBFE;border-radius:99px;padding:5px 12px;font-size:13px;font-weight:600;}
.divider{height:1px;background:var(--border);margin:48px 0;}
.text-accent{color:var(--accent);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
