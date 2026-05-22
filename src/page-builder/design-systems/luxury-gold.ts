import type { DesignSystemConfig } from "./types";

export const luxuryGold: DesignSystemConfig = {
  id: "luxury-gold",
  name: "Luxury Gold",
  description: "Preto e dourado para produtos premium e high ticket",
  accentColor: "#D4AF37",
  bgColor: "#0C0C0C",
  textColor: "#F5F0E8",
  headlineFont: "'Georgia', 'Times New Roman', serif",
  bodyFont: "system-ui, -apple-system, sans-serif",
  borderRadius: "4px",
  shadow: "0 4px 24px rgba(212,175,55,0.2)",
  cssSnippet: `
:root{--bg:#0C0C0C;--bg2:#141414;--bg3:#1C1C1C;--text:#F5F0E8;--muted:#9E9080;--accent:#D4AF37;--accent2:#F0D060;--border:rgba(212,175,55,0.2);--btn:#D4AF37;--btn-text:#0C0C0C;--r:4px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;line-height:1.7;}
h1{font-family:'Georgia','Times New Roman',serif;font-size:clamp(1.875rem,4.5vw,3.5rem);font-weight:700;line-height:1.15;letter-spacing:.02em;}
h2{font-family:'Georgia','Times New Roman',serif;font-size:clamp(1.4rem,3vw,2.5rem);font-weight:700;line-height:1.2;}
h3{font-size:1.15rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;}
.section{padding:96px 20px;max-width:860px;margin:0 auto;}
.section-wide{padding:96px 20px;max-width:1100px;margin:0 auto;}
.hero{background:linear-gradient(180deg,#0C0C0C 0%,#1A1500 100%);border-bottom:1px solid rgba(212,175,55,0.3);}
.btn{display:inline-block;background:transparent;color:var(--accent);padding:16px 48px;border-radius:2px;font-size:14px;font-weight:700;border:1px solid var(--accent);cursor:pointer;text-decoration:none;text-transform:uppercase;letter-spacing:.15em;transition:background .25s,color .25s;}
.btn:hover,.btn-filled{background:var(--btn);color:var(--btn-text);}
.btn-lg{padding:20px 64px;font-size:15px;}
.card{background:var(--bg2);border:1px solid var(--border);padding:32px;}
.gold-line{height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);margin:40px 0;}
.text-accent{color:var(--accent2);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
