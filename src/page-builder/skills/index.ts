import type { PageSkillConfig } from "./types";
import { landingPageSkill } from "./landing-page.skill";
import { vslPageSkill } from "./vsl-page.skill";
import { advertorialSkill } from "./advertorial.skill";
import { checkoutPageSkill } from "./checkout-page.skill";
import { ebookPageSkill } from "./ebook-page.skill";
import { productPageSkill } from "./product-page.skill";
import { coursePageSkill } from "./course-page.skill";
import { lowTicketPageSkill } from "./low-ticket-page.skill";
import { supplementPageSkill } from "./supplement-page.skill";
import { tiktokProductPageSkill } from "./tiktok-product-page.skill";
import { kiwifyStylePageSkill } from "./kiwify-style-page.skill";
import { hotmartStylePageSkill } from "./hotmart-style-page.skill";

export const PAGE_SKILLS: PageSkillConfig[] = [
  landingPageSkill,
  vslPageSkill,
  advertorialSkill,
  checkoutPageSkill,
  ebookPageSkill,
  productPageSkill,
  coursePageSkill,
  lowTicketPageSkill,
  supplementPageSkill,
  tiktokProductPageSkill,
  kiwifyStylePageSkill,
  hotmartStylePageSkill,
];

export function getSkillById(id: string): PageSkillConfig | undefined {
  return PAGE_SKILLS.find((s) => s.id === id);
}

export { landingPageSkill, vslPageSkill, advertorialSkill, checkoutPageSkill,
  ebookPageSkill, productPageSkill, coursePageSkill, lowTicketPageSkill,
  supplementPageSkill, tiktokProductPageSkill, kiwifyStylePageSkill, hotmartStylePageSkill };
export type { PageSkillConfig };
