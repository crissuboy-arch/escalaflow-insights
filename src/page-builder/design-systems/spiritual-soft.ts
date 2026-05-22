import type { DesignSystemConfig } from "./types";

export const spiritualSoft: DesignSystemConfig = {
  id: "spiritual-soft",
  name: "Spiritual Soft",
  description: "Tons terrosos, suave, orgânico — para espiritualidade, terapia e autoconhecimento",
  accentColor: "#92697A",
  bgColor: "#FAF7F4",
  textColor: "#2E2218",
  headlineFont: "'Georgia', serif",
  bodyFont: "system-ui, -apple-system, sans-serif",
  borderRadius: "16px",
  shadow: "0 2px 12px rgba(146,105,122,0.1)",
  cssSnippet: `
:root{--bg:#FAF7F4;--bg2:#fff;--bg3:#F2EBE5;--text:#2E2218;--muted:#7A6455;--accent:#92697A;--accent2:#B38E9E;--border:#E2D5CC;--btn:#92697A;--btn-text:#fff;--r:16px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;line-height:1.8;}
h1{font-family:'Georgia',serif;font-size:clamp(1.75rem,4.5vw,3rem);font-weight:700;line-height:1.25;letter-spacing:.01em;}
h2{font-family:'Georgia',serif;font-size:clamp(1.3rem,3vw,2rem);font-weight:700;line-height:1.35;}
h3{font-size:1.05rem;font-weight:600;letter-spacing:.04em;}
.section{padding:88px 20px;max-width:800px;margin:0 auto;}
.section-wide{padding:88px 20px;max-width:1000px;margin:0 auto;}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);padding:16px 44px;border-radius:99px;font-size:15px;font-weight:600;border:none;cursor:pointer;text-decoration:none;transition:background .2s,transform .2s;}
.btn:hover{background:#7A5568;transform:translateY(-2px);}
.btn-lg{padding:20px 56px;font-size:16px;}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:28px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:var(--bg3);color:var(--accent);border:1px solid var(--border);border-radius:99px;padding:5px 14px;font-size:13px;font-weight:600;}
.divider-soft{height:1px;background:linear-gradient(90deg,transparent,var(--border),transparent);margin:48px 0;}
.text-accent{color:var(--accent2);}
.text-muted{color:var(--muted);}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr;}}`,
};
