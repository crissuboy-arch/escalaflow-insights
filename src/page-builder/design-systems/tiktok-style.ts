import type { DesignSystemConfig } from "./types";

export const tiktokStyle: DesignSystemConfig = {
  id: "tiktok-style",
  name: "TikTok Style",
  description: "Bold, high-contrast, mobile-first — estilo TikTok Shop viral",
  accentColor: "#FE2C55",
  bgColor: "#000000",
  textColor: "#FFFFFF",
  headlineFont: "system-ui, -apple-system, sans-serif",
  bodyFont: "system-ui, -apple-system, sans-serif",
  borderRadius: "12px",
  shadow: "0 4px 20px rgba(254,44,85,0.4)",
  cssSnippet: `
:root{--bg:#000;--bg2:#111;--bg3:#1A1A1A;--text:#fff;--muted:#aaa;--accent:#FE2C55;--accent2:#25F4EE;--border:rgba(255,255,255,0.12);--btn:#FE2C55;--btn-text:#fff;--r:12px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;line-height:1.5;font-size:16px;}
h1{font-size:clamp(1.75rem,6vw,3rem);font-weight:900;line-height:1.1;letter-spacing:-0.01em;}
h2{font-size:clamp(1.4rem,4vw,2.25rem);font-weight:800;line-height:1.2;}
h3{font-size:1.1rem;font-weight:700;}
.section{padding:60px 16px;max-width:480px;margin:0 auto;}
.section-wide{padding:60px 16px;max-width:600px;margin:0 auto;}
.btn{display:block;width:100%;background:linear-gradient(135deg,#FE2C55,#FF6B6B);color:#fff;padding:18px 32px;border-radius:99px;font-size:17px;font-weight:800;border:none;cursor:pointer;text-decoration:none;text-align:center;box-shadow:0 4px 20px rgba(254,44,85,0.5);transition:transform .2s;}
.btn:hover{transform:scale(1.02);}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:20px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(254,44,85,0.2);color:var(--accent);border:1px solid rgba(254,44,85,0.4);border-radius:6px;padding:5px 12px;font-size:13px;font-weight:700;}
.badge-teal{background:rgba(37,244,238,0.15);color:var(--accent2);border-color:rgba(37,244,238,0.3);}
.text-accent{color:var(--accent);}
.text-teal{color:var(--accent2);}
.text-muted{color:var(--muted);}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.btn-bounce{animation:bounce 1.5s infinite;}`,
};
