import storyChiefRaw from "../../../public/agents/storytelling/story-chief.md?raw";
import hormoziOffersRaw from "../../../public/agents/hormozi-squad/hormozi-offers.md?raw";
import garyHalbertRaw from "../../../public/agents/copy-master/gary-halbert.md?raw";
import davidOgilvyRaw from "../../../public/agents/copy-master/david-ogilvy.md?raw";
import trafficChiefRaw from "../../../public/agents/traffic-masters/traffic-chief.md?raw";
import alexHormoziRaw from "../../../public/agents/hormozi-squad/alex-hormozi.md?raw";
import mediaBuyerRaw from "../../../public/agents/traffic-masters/media-buyer.md?raw";

export const AGENT_STORY_CHIEF = storyChiefRaw;
export const AGENT_HORMOZI_OFFERS = hormoziOffersRaw;
export const AGENT_GARY_HALBERT = garyHalbertRaw;
export const AGENT_DAVID_OGILVY = davidOgilvyRaw;
export const AGENT_TRAFFIC_CHIEF = trafficChiefRaw;
export const AGENT_ALEX_HORMOZI = alexHormoziRaw;
export const AGENT_MEDIA_BUYER = mediaBuyerRaw;

export function withAgent(agent: string, systemPrompt: string): string {
  return `${agent}\n\n---\n\n${systemPrompt}`;
}
