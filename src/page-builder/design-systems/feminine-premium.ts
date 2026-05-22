import type { DesignSystemConfig } from "./types";

export const femininePremium: DesignSystemConfig = {
  id: "feminine-premium",
  name: "Feminine Premium",
  description: "Rose gold, nude, elegante — para beleza, bem-estar e autodesenvolvimento feminino",
  accentColor: "#D4596A",
  bgColor: "#FDF8F6",
  textColor: "#2D1B1E",
  headlineFont: "'Georgia', serif",
  bodyFont: "'Inter', system-ui, sans-serif",
  borderRadius: "20px",
  shadow: "0 4px 20px rgba(212,89,106,0.12)",
  cssSnippet: `
:root{--bg:#FDF8F6;--bg2:#fff;--bg3:#FFF0ED;--text:#2D1B1E;--muted:#7D6060;--accent:#D4596A;--accent2:#E8927F;--border:#FADADD;--btn:#D4596A;--btn-text:#fff;--r:20px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;line-height:1.7;}
h1{font-family:'Georgia',serif;font-size:clamp(1.75rem,4.5vw,3.25rem);font-weight:700;line-height:1.2;letter-spacing:.01em;}
h2{font-family:'Georgia',serif;font-size:clamp(1.4rem,3vw,2.25rem);font-weight:700;line-height:1.3;}
h3{font-size:1.1rem;font-weight:600;}
.section{padding:88px 20px;max-width:820px;margin:0 auto;}
.section-wide{padding:88px 20px;max-width:1100px;margin:0 auto;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:16px 44px;border-radius:99px;font-size:16px;font-weight:600;border:none;cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(212,89,106,0.35);transition:transform .2s,box-shadow .2s;}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(212,89,106,0.5);}
.btn-lg{padding:20px 56px;font-size:17px;}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:28px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:#FFF0ED;color:var(--accent);border:1px solid var(--border);border-radius:99px;padding:5px 14px;font-size:13px;font-weight:600;}
.text-accent{color:var(--accent);}
.text-muted{color:var(--muted);}
.divider-rose{height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);margin:48px 0;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
