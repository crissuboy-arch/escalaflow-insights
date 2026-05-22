import type { PageSkillConfig } from "./types";

export const coursePageSkill: PageSkillConfig = {
  id: "course-page",
  name: "Página de Curso Online",
  description: "Página de venda para cursos online e memberships",
  systemPrompt: `You are an expert at selling online courses and educational programs.
Generate a COMPLETE HTML sales page for an online course or membership.

REQUIRED STRUCTURE:
1. HERO: Transformation headline + "Em X semanas você vai..." + enrollment CTA + urgency
2. TRANSFORMATION VISION: Before/after description (life before vs. after the course)
3. WHO IT'S FOR: 4-5 ideal student profiles
4. CURRICULUM: Module-by-module breakdown (4-6 modules with lesson titles)
5. INSTRUCTOR BIO: Photo placeholder, credentials, 3 authority signals, personal story
6. STUDENT RESULTS: 3-4 case studies with specific numbers (ex: "Saiu do zero para R$8.000/mês")
7. WHAT'S INCLUDED: Full access details (videos, PDFs, community, calls, etc.)
8. PRICING: One or two tier options with features comparison
9. BONUSES: 3-4 exclusive bonuses with values
10. GUARANTEE: "Satisfação garantida ou dinheiro de volta em X dias"
11. FAQ: 7 questions (including "quando começa?", "tenho suporte?")
12. FINAL ENROLLMENT CTA: Final urgency + reminder of transformation

COURSE-SPECIFIC RULES:
- Module curriculum must look like a real course outline (locked/unlocked icons)
- Include "mais de X alunos já transformaram suas vidas" social proof
- Video placeholder for instructor welcome message
- Show platform/community preview (community icon)
- Emphasize: lifetime access, mobile learning, certificate`,
  sections: ["hero", "transformation", "for-who", "curriculum", "instructor", "results", "whats-included", "pricing", "bonuses", "guarantee", "faq", "enrollment"],
  bestFor: ["cursos online", "memberships", "mentorias", "bootcamps", "academias digitais"],
};
