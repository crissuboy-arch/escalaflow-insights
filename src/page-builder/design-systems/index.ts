import type { DesignSystemConfig } from "./types";
import { darkPremium } from "./dark-premium";
import { minimalClean } from "./minimal-clean";
import { hotmartStyle } from "./hotmart-style";
import { kiwifyStyle } from "./kiwify-style";
import { stripeStyle } from "./stripe-style";
import { tiktokStyle } from "./tiktok-style";
import { luxuryGold } from "./luxury-gold";
import { femininePremium } from "./feminine-premium";
import { healthClean } from "./health-clean";
import { ecommerceModern } from "./ecommerce-modern";
import { brutalist } from "./brutalist";
import { spiritualSoft } from "./spiritual-soft";

export const DESIGN_SYSTEMS: DesignSystemConfig[] = [
  darkPremium,
  minimalClean,
  hotmartStyle,
  kiwifyStyle,
  stripeStyle,
  tiktokStyle,
  luxuryGold,
  femininePremium,
  healthClean,
  ecommerceModern,
  brutalist,
  spiritualSoft,
];

export function getDesignSystemById(id: string): DesignSystemConfig | undefined {
  return DESIGN_SYSTEMS.find((ds) => ds.id === id);
}

export {
  darkPremium, minimalClean, hotmartStyle, kiwifyStyle, stripeStyle,
  tiktokStyle, luxuryGold, femininePremium, healthClean, ecommerceModern,
  brutalist, spiritualSoft,
};
export type { DesignSystemConfig };
