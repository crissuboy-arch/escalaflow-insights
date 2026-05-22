import type { DesignSystemConfig } from "./types";

export const healthClean: DesignSystemConfig = {
  id: "health-clean",
  name: "Health Clean",
  description: "Branco clínico, verde natural — para saúde, fitness e bem-estar",
  accentColor: "#16A34A",
  bgColor: "#F8FBF8",
  textColor: "#1A2E1A",
  headlineFont: "system-ui, -apple-system, sans-serif",
  bodyFont: "system-ui, -apple-system, sans-serif",
  borderRadius: "10px",
  shadow: "0 2px 12px rgba(22,163,74,0.1)",
  cssSnippet: `
:root{--bg:#F8FBF8;--bg2:#fff;--bg3:#ECFDF5;--text:#1A2E1A;--muted:#4B6356;--accent:#16A34A;--accent2:#22C55E;--border:#BBF7D0;--btn:#16A34A;--btn-text:#fff;--r:10px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;line-height:1.65;}
h1{font-size:clamp(1.875rem,4.5vw,3.25rem);font-weight:800;line-height:1.15;}
h2{font-size:clamp(1.4rem,3vw,2.25rem);font-weight:700;line-height:1.25;}
h3{font-size:1.1rem;font-weight:600;}
.section{padding:88px 20px;max-width:860px;margin:0 auto;}
.section-wide{padding:88px 20px;max-width:1100px;margin:0 auto;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:16px 44px;border-radius:8px;font-size:16px;font-weight:700;border:none;cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(22,163,74,0.3);transition:background .2s,transform .2s;}
.btn:hover{background:#15803D;transform:translateY(-2px);}
.btn-lg{padding:20px 56px;font-size:18px;}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:24px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:#ECFDF5;color:var(--accent);border:1px solid var(--border);border-radius:99px;padding:5px 14px;font-size:13px;font-weight:600;}
.check{color:var(--accent2);font-size:1.1em;}
.text-accent{color:var(--accent);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
