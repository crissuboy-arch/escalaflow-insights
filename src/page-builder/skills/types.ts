export type PageSkillConfig = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  sections: string[];
  bestFor: string[];
};

export type PageBuilderInput = {
  skillId: string;
  designSystemId: string;
  productName: string;
  niche: string;
  targetAudience: string;
  country: string;
  language: string;
  offerType: string;
  pricePoint: string;
  mainPromise: string;
  painPoints: string;
  benefits: string;
  bonuses: string;
  guarantee: string;
  callToAction: string;
  brandName: string;
  toneOfVoice: string;
  trafficSource: string;
  pageGoal: string;
  mineracaoContext?: string;
};
