import type { DesignSystemConfig } from "./types";

export const ecommerceModern: DesignSystemConfig = {
  id: "ecommerce-modern",
  name: "E-commerce Modern",
  description: "Branco moderno com laranja, estilo Amazon/Shopee premium",
  accentColor: "#F97316",
  bgColor: "#FFFFFF",
  textColor: "#1A1A1A",
  headlineFont: "'Inter', system-ui, sans-serif",
  bodyFont: "'Inter', system-ui, sans-serif",
  borderRadius: "8px",
  shadow: "0 1px 8px rgba(0,0,0,0.1)",
  cssSnippet: `
:root{--bg:#fff;--bg2:#F7F8FA;--bg3:#FFF7ED;--text:#1A1A1A;--muted:#6B7280;--accent:#F97316;--accent2:#FB923C;--border:#E5E7EB;--btn:#F97316;--btn-text:#fff;--r:8px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;line-height:1.55;}
h1{font-size:clamp(1.75rem,4vw,2.75rem);font-weight:800;line-height:1.2;}
h2{font-size:clamp(1.3rem,3vw,2rem);font-weight:700;line-height:1.25;}
h3{font-size:1rem;font-weight:600;}
.section{padding:72px 16px;max-width:1000px;margin:0 auto;}
.section-wide{padding:72px 16px;max-width:1200px;margin:0 auto;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:14px 36px;border-radius:6px;font-size:15px;font-weight:700;border:none;cursor:pointer;text-decoration:none;transition:filter .2s;}
.btn:hover{filter:brightness(1.08);}
.btn-lg{padding:18px 48px;font-size:17px;border-radius:8px;}
.card{background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:20px;box-shadow:0 1px 6px rgba(0,0,0,0.06);}
.badge{display:inline-flex;align-items:center;gap:4px;background:#FFF7ED;color:var(--accent);border:1px solid #FDBA74;border-radius:4px;padding:3px 10px;font-size:12px;font-weight:700;}
.price-main{font-size:2rem;font-weight:800;color:var(--accent);}
.price-old{font-size:1rem;color:var(--muted);text-decoration:line-through;}
.stars{color:#FBBF24;font-size:1.1em;}
.text-accent{color:var(--accent);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
@media(max-width:768px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr 1fr;}}
@media(max-width:480px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr;}}`,
};
