import type { DesignSystemConfig } from "./types";

export const brutalist: DesignSystemConfig = {
  id: "brutalist",
  name: "Brutalist",
  description: "Negrito, contraste máximo, sem sombras — estilo bold/neo-brutalist",
  accentColor: "#FFEE00",
  bgColor: "#FFFFFF",
  textColor: "#000000",
  headlineFont: "'Arial Black', 'Impact', sans-serif",
  bodyFont: "'Arial', sans-serif",
  borderRadius: "0px",
  shadow: "4px 4px 0px #000",
  cssSnippet: `
:root{--bg:#fff;--bg2:#f0f0f0;--bg3:#FFEE00;--text:#000;--muted:#333;--accent:#FFEE00;--accent2:#FF3300;--border:#000;--btn:#FFEE00;--btn-text:#000;--r:0px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Arial',sans-serif;line-height:1.5;}
h1{font-family:'Arial Black','Impact',sans-serif;font-size:clamp(2.5rem,7vw,5rem);font-weight:900;line-height:1.0;text-transform:uppercase;letter-spacing:-.02em;}
h2{font-family:'Arial Black','Impact',sans-serif;font-size:clamp(1.75rem,4vw,3rem);font-weight:900;line-height:1.05;text-transform:uppercase;}
h3{font-size:1.1rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;}
.section{padding:80px 20px;max-width:900px;margin:0 auto;}
.section-wide{padding:80px 20px;max-width:1100px;margin:0 auto;}
.hero{background:#FFEE00;border-bottom:3px solid #000;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:18px 48px;border:3px solid #000;border-radius:0;font-size:18px;font-weight:900;cursor:pointer;text-decoration:none;text-transform:uppercase;letter-spacing:.08em;box-shadow:5px 5px 0 #000;transition:transform .1s,box-shadow .1s;}
.btn:hover{transform:translate(3px,3px);box-shadow:2px 2px 0 #000;}
.btn-red{background:#FF3300;color:#fff;}
.btn-lg{padding:22px 64px;font-size:20px;}
.card{background:var(--bg);border:3px solid #000;padding:24px;box-shadow:5px 5px 0 #000;}
.badge{display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#000;border:2px solid #000;padding:6px 14px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;}
.text-accent{color:var(--accent2);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
