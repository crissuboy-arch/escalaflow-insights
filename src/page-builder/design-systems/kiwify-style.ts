import type { DesignSystemConfig } from "./types";

export const kiwifyStyle: DesignSystemConfig = {
  id: "kiwify-style",
  name: "Kiwify Style",
  description: "Clean moderno com roxo, cards elevados — estilo Kiwify brasileiro",
  accentColor: "#7C3AED",
  bgColor: "#FAFAFA",
  textColor: "#1E1B4B",
  headlineFont: "'Inter', system-ui, sans-serif",
  bodyFont: "'Inter', system-ui, sans-serif",
  borderRadius: "16px",
  shadow: "0 4px 16px rgba(124,58,237,0.12)",
  cssSnippet: `
:root{--bg:#FAFAFA;--bg2:#fff;--bg3:#F3F4FF;--text:#1E1B4B;--muted:#6B7280;--accent:#7C3AED;--accent2:#A78BFA;--border:#E9D5FF;--btn:#7C3AED;--btn-text:#fff;--r:16px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;line-height:1.65;}
h1{font-size:clamp(1.875rem,4.5vw,3.5rem);font-weight:900;line-height:1.1;letter-spacing:-0.02em;}
h2{font-size:clamp(1.4rem,3vw,2.25rem);font-weight:800;line-height:1.2;letter-spacing:-0.01em;}
h3{font-size:1.15rem;font-weight:700;}
.section{padding:88px 20px;max-width:860px;margin:0 auto;}
.section-wide{padding:88px 20px;max-width:1100px;margin:0 auto;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:16px 40px;border-radius:99px;font-size:16px;font-weight:700;border:none;cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(124,58,237,0.3);transition:transform .2s,box-shadow .2s;}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,0.4);}
.btn-lg{padding:20px 56px;font-size:18px;}
.card{background:var(--bg2);border:1px solid #EDE9FE;border-radius:var(--r);padding:28px;box-shadow:0 2px 12px rgba(124,58,237,0.07);}
.badge{display:inline-flex;align-items:center;gap:6px;background:#F5F3FF;color:var(--accent);border:1px solid var(--border);border-radius:99px;padding:5px 14px;font-size:13px;font-weight:600;}
.text-accent{color:var(--accent);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
