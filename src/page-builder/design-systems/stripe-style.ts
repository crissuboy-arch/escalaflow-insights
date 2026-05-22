import type { DesignSystemConfig } from "./types";

export const stripeStyle: DesignSystemConfig = {
  id: "stripe-style",
  name: "Stripe Style",
  description: "SaaS premium com gradientes suaves, tipografia forte — estilo Stripe/Notion",
  accentColor: "#635BFF",
  bgColor: "#FFFFFF",
  textColor: "#0A2540",
  headlineFont: "'Inter', system-ui, sans-serif",
  bodyFont: "'Inter', system-ui, sans-serif",
  borderRadius: "8px",
  shadow: "0 2px 12px rgba(99,91,255,0.1)",
  cssSnippet: `
:root{--bg:#fff;--bg2:#F6F9FC;--bg3:#EEF4FF;--text:#0A2540;--muted:#425466;--accent:#635BFF;--accent2:#7A73FF;--border:#E3E8EF;--btn:#635BFF;--btn-text:#fff;--r:8px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;line-height:1.6;}
h1{font-size:clamp(2rem,5vw,3.75rem);font-weight:900;line-height:1.1;letter-spacing:-0.03em;}
h2{font-size:clamp(1.5rem,3.5vw,2.75rem);font-weight:800;line-height:1.15;letter-spacing:-0.02em;}
.section{padding:96px 20px;max-width:860px;margin:0 auto;}
.section-wide{padding:96px 20px;max-width:1100px;margin:0 auto;}
.hero{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:120px 20px;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:14px 36px;border-radius:6px;font-size:15px;font-weight:600;border:none;cursor:pointer;text-decoration:none;transition:filter .2s,transform .2s;}
.btn:hover{filter:brightness(1.1);transform:translateY(-1px);}
.btn-lg{padding:18px 48px;font-size:17px;}
.card{background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.05);}
.badge{display:inline-flex;align-items:center;gap:6px;background:#F0F0FF;color:var(--accent);border:1px solid #D0CEFF;border-radius:99px;padding:5px 12px;font-size:13px;font-weight:600;}
.text-accent{color:var(--accent);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
