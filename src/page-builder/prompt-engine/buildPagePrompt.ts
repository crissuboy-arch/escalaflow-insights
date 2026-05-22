import type { PageBuilderInput } from "../skills/types";
import type { PageSkillConfig } from "../skills/types";
import type { DesignSystemConfig } from "../design-systems/types";

export function buildPagePrompt(
  input: PageBuilderInput,
  skill: PageSkillConfig,
  ds: DesignSystemConfig,
): { systemPrompt: string; userPrompt: string } {
  const lang = input.language || "pt-BR";
  const langLabel = lang === "pt-BR" ? "Portuguese (Brazilian)" : lang === "en" ? "English" : lang === "es" ? "Spanish" : lang;

  const systemPrompt = `You are an elite direct-response copywriter and professional landing page developer.

Your task: generate a COMPLETE, self-contained HTML landing page that converts visitors into buyers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN SYSTEM: ${ds.name}
${ds.description}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BASE CSS (use as foundation, adapt as needed):
<style>
${ds.cssSnippet}
</style>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE TYPE: ${skill.name}
${skill.description}

INSTRUCTIONS FOR THIS PAGE TYPE:
${skill.systemPrompt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UNIVERSAL REQUIREMENTS (MANDATORY for every page):
1. Language: ALL copy must be in ${langLabel}. Every word. No exceptions.
2. Complete HTML: Start with <!DOCTYPE html> and end with </html>
3. Self-contained: ALL CSS must be inline (<style> in <head>). NO external CSS links.
4. Mobile responsive: Use max-width, padding, and media queries for 390px+ viewports
5. Required sections (in order): ${skill.sections.join(" → ")}
6. Headline quality: Use proven DR copywriting formulas (outcome + timeframe, contrarian reveal, specific numbers)
7. Copy specificity: Every benefit must state a specific, measurable outcome — NO vague claims
8. CTA minimum: Primary CTA button must appear AT LEAST 3 times on the page
9. Urgency: Include at least one ethical urgency/scarcity element
10. Trust: Include payment security signals and guarantee prominently
11. Testimonials: Include at least 3 testimonials with full name, city, and specific result
12. FAQ: Include at least 5 FAQ items addressing real objections
13. No Lorem Ipsum: Every text must be real, persuasive copy
14. Professional quality: Output must be indistinguishable from a professional $5,000 landing page

COPY WRITING RULES:
- Use "você/seu/sua" (or "you/your" in English) constantly
- Never start with "Nosso produto..." or "Nossa empresa..."
- Headlines must be specific: "Perca 8kg em 21 dias" not "Perca peso"
- Benefits must start with a verb: "Elimine", "Descubra", "Aumente"
- Urgency must be believable: countdown timer visual, limited spots, introductory price

TECHNICAL REQUIREMENTS:
- <meta name="viewport" content="width=device-width, initial-scale=1">
- Smooth scroll behavior: html { scroll-behavior: smooth; }
- Button hover effects (transition: all 0.2s)
- Font fallbacks: use system fonts or Google Fonts via @import
- Color scheme: follow the ${ds.name} design system exactly

CRITICAL: Return ONLY the complete HTML. No explanations, no markdown code blocks, no backticks.
Start your response with: <!DOCTYPE html>
End your response with: </html>`;

  const parts: string[] = [
    `═══ PRODUCT & OFFER DETAILS ═══`,
    `Product Name: ${input.productName}`,
    `Niche: ${input.niche || "not specified"}`,
    `Target Audience: ${input.targetAudience || "general audience"}`,
    `Country: ${input.country || "Brazil"}`,
    `Language: ${langLabel}`,
    `Offer Type: ${input.offerType || "digital product"}`,
    `Price Point: ${input.pricePoint || "not specified"}`,
    ``,
    `═══ COPY INGREDIENTS ═══`,
    `Main Promise: ${input.mainPromise || "not specified"}`,
  ];

  if (input.painPoints) {
    parts.push(`\nPain Points (use all of these):\n${input.painPoints}`);
  }
  if (input.benefits) {
    parts.push(`\nKey Benefits (include all):\n${input.benefits}`);
  }
  if (input.bonuses) {
    parts.push(`\nBonuses:\n${input.bonuses}`);
  }
  if (input.guarantee) {
    parts.push(`\nGuarantee: ${input.guarantee}`);
  }
  if (input.callToAction) {
    parts.push(`\nCTA Button Text: "${input.callToAction}"`);
  }
  if (input.brandName) {
    parts.push(`Brand Name: ${input.brandName}`);
  }
  if (input.toneOfVoice) {
    parts.push(`Tone of Voice: ${input.toneOfVoice}`);
  }
  if (input.trafficSource) {
    parts.push(`Traffic Source (adapt copy accordingly): ${input.trafficSource}`);
  }
  if (input.pageGoal) {
    parts.push(`Page Goal: ${input.pageGoal}`);
  }
  if (input.mineracaoContext) {
    parts.push(`\n═══ MARKET RESEARCH CONTEXT (use to enrich copy) ═══\n${input.mineracaoContext}`);
  }

  parts.push(`\n═══ TASK ═══`);
  parts.push(`Generate the complete ${skill.name} HTML page now. Make it exceptional. Include ALL required sections. Write ALL copy in ${langLabel}.`);

  return {
    systemPrompt,
    userPrompt: parts.join("\n"),
  };
}
