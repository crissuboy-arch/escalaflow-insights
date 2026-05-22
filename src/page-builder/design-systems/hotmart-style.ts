import type { DesignSystemConfig } from "./types";

export const hotmartStyle: DesignSystemConfig = {
  id: "hotmart-style",
  name: "Hotmart Style",
  description: "Dark hero com CTA laranja, estilo Hotmart/infoprodutor brasileiro",
  accentColor: "#F97316",
  bgColor: "#0D1117",
  textColor: "#F0F0F0",
  headlineFont: "system-ui, -apple-system, sans-serif",
  bodyFont: "system-ui, -apple-system, sans-serif",
  borderRadius: "10px",
  shadow: "0 8px 32px rgba(0,0,0,0.6)",
  cssSnippet: `
:root{--bg:#0D1117;--bg2:#161B22;--bg3:#21262D;--text:#F0F0F0;--muted:#8B949E;--accent:#F97316;--accent2:#FB923C;--border:rgba(255,255,255,0.1);--btn:#F97316;--btn-text:#fff;--r:10px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;line-height:1.6;}
h1{font-size:clamp(2rem,5vw,3.75rem);font-weight:900;line-height:1.1;}
h2{font-size:clamp(1.5rem,3vw,2.5rem);font-weight:800;line-height:1.2;}
h3{font-size:1.2rem;font-weight:700;}
.section{padding:80px 20px;max-width:900px;margin:0 auto;}
.section-wide{padding:80px 20px;max-width:1100px;margin:0 auto;}
.hero{background:linear-gradient(135deg,#0D1117 0%,#1A1A3E 100%);padding:100px 20px;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:20px 56px;border-radius:8px;font-size:18px;font-weight:800;border:none;cursor:pointer;text-decoration:none;text-transform:uppercase;letter-spacing:.05em;box-shadow:0 4px 20px rgba(249,115,22,0.5);transition:transform .2s,box-shadow .2s;}
.btn:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(249,115,22,0.7);}
.btn-lg{padding:24px 72px;font-size:20px;}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:24px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(249,115,22,0.15);color:var(--accent2);border:1px solid rgba(249,115,22,0.3);border-radius:4px;padding:6px 14px;font-size:13px;font-weight:700;text-transform:uppercase;}
.check{color:var(--accent);font-size:1.1em;}
.text-accent{color:var(--accent2);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}
@keyframes pulse{0%,100%{box-shadow:0 4px 20px rgba(249,115,22,0.5)}50%{box-shadow:0 8px 40px rgba(249,115,22,0.9)}}
.btn-pulse{animation:pulse 2s infinite;}`,
};
