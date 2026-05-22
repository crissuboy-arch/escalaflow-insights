import type { PageSkillConfig } from "./types";

export const advertorialSkill: PageSkillConfig = {
  id: "advertorial",
  name: "Advertorial",
  description: "Conteúdo editorial com aparência de artigo/notícia que vende de forma suave",
  systemPrompt: `You are an expert native advertising copywriter who creates advertorials.
Generate a COMPLETE HTML advertorial page that reads like editorial content.

REQUIRED STRUCTURE:
1. MASTHEAD: Fake publication name + date + "Publicidade" label (small, honest)
2. HEADLINE: Curiosity/news style — NOT salesy (e.g., "Médico revela método que...")
3. BYLINE: "Por [author name], Correspondente Especial"
4. LEAD PARAGRAPH: Hook story — specific person with relatable problem
5. STORY BODY (4-5 paragraphs): Journey from problem → discovery → transformation
6. PRODUCT REVEAL (paragraph 4): Natural introduction as "the solution I found"
7. HOW IT WORKS: 3-step simple explanation woven into the story
8. TESTIMONIALS: 2-3 reader letters styled as comments
9. SOFT CTA: "Para mais informações, acesse..." button
10. DISCLAIMER: Small "este é um artigo patrocinado" at bottom

EDITORIAL RULES:
- No exclamation marks in headlines
- No all-caps
- Write in first person or third person narrative
- Font must look like a news site (serif for body, clean sans for headlines)
- Use pull quotes to highlight key statements
- Include a fake author photo placeholder`,
  sections: ["masthead", "headline", "byline", "lead", "body", "reveal", "testimonials", "cta", "disclaimer"],
  bestFor: ["suplementos", "produtos de saúde", "serviços", "tráfego nativo"],
};
