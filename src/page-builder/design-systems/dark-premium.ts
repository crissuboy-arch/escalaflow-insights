import type { DesignSystemConfig } from "./types";

export const darkPremium: DesignSystemConfig = {
  id: "dark-premium",
  name: "Dark Premium",
  description: "Dark mode luxuoso com acentos violeta e glow effects",
  accentColor: "#6366F1",
  bgColor: "#0A0A0B",
  textColor: "#F8F8FA",
  headlineFont: "system-ui, -apple-system, sans-serif",
  bodyFont: "system-ui, -apple-system, sans-serif",
  borderRadius: "12px",
  shadow: "0 4px 24px rgba(0,0,0,0.5)",
  cssSnippet: `
:root{--bg:#0A0A0B;--bg2:#111113;--bg3:#1A1A2E;--text:#F8F8FA;--muted:#8888A0;--accent:#6366F1;--accent2:#818CF8;--border:rgba(255,255,255,0.08);--btn:#6366F1;--btn-text:#fff;--r:12px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;line-height:1.6;}
h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:900;line-height:1.1;letter-spacing:-0.02em;}
h2{font-size:clamp(1.5rem,3vw,2.5rem);font-weight:800;line-height:1.2;}
h3{font-size:1.25rem;font-weight:700;}
.section{padding:80px 20px;max-width:900px;margin:0 auto;}
.section-wide{padding:80px 20px;max-width:1100px;margin:0 auto;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:18px 48px;border-radius:8px;font-size:18px;font-weight:700;border:none;cursor:pointer;text-decoration:none;box-shadow:0 0 40px rgba(99,102,241,0.4);transition:transform .2s,box-shadow .2s;letter-spacing:.01em;}
.btn:hover{transform:translateY(-3px);box-shadow:0 0 60px rgba(99,102,241,0.6);}
.btn-lg{padding:22px 64px;font-size:20px;}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:24px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(99,102,241,0.15);color:var(--accent2);border:1px solid rgba(99,102,241,0.3);border-radius:99px;padding:6px 14px;font-size:13px;font-weight:600;}
.divider{height:1px;background:var(--border);margin:40px 0;}
.text-accent{color:var(--accent2);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}
@keyframes pulse{0%,100%{box-shadow:0 0 40px rgba(99,102,241,0.4)}50%{box-shadow:0 0 80px rgba(99,102,241,0.7)}}
.btn-pulse{animation:pulse 2s infinite;}`,
};
