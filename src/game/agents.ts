export type AbilityId = "smoke" | "flash" | "dash" | "wall" | "recon";

export interface Ability {
  id: AbilityId;
  name: string;
  key: "Q" | "E";
  cooldownMs: number;
  durationMs: number;
  color: string;
  desc: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  q: Ability;
  e: Ability;
  desc: string;
}

export const AGENTS: Record<string, Agent> = {
  phantom: {
    id: "phantom", name: "PHANTOM", role: "Duelist", color: "#ff3366",
    desc: "Aggressive entry. Dash + flash to overwhelm.",
    q: { id: "flash", name: "Blind", key: "Q", cooldownMs: 12000, durationMs: 1800, color: "#ffffff", desc: "Blinding flash forward" },
    e: { id: "dash", name: "Blink", key: "E", cooldownMs: 10000, durationMs: 200, color: "#ff3366", desc: "Forward dash 8m" },
  },
  cipher: {
    id: "cipher", name: "CIPHER", role: "Controller", color: "#7df9ff",
    desc: "Smoke walls and recon. Lock down sites.",
    q: { id: "smoke", name: "Smoke", key: "Q", cooldownMs: 14000, durationMs: 8000, color: "#7df9ff", desc: "Smoke cloud blocks vision" },
    e: { id: "recon", name: "Recon", key: "E", cooldownMs: 18000, durationMs: 5000, color: "#7df9ff", desc: "Reveal nearby enemies" },
  },
  bastion: {
    id: "bastion", name: "BASTION", role: "Sentinel", color: "#00ff88",
    desc: "Defensive walls. Hold angles tight.",
    q: { id: "wall", name: "Barrier", key: "Q", cooldownMs: 16000, durationMs: 12000, color: "#00ff88", desc: "Spawn cover wall" },
    e: { id: "smoke", name: "Vapor", key: "E", cooldownMs: 14000, durationMs: 7000, color: "#00ff88", desc: "Smoke trap" },
  },
  vortex: {
    id: "vortex", name: "VORTEX", role: "Initiator", color: "#aa66ff",
    desc: "Recon and flashes. Pop sites.",
    q: { id: "recon", name: "Pulse", key: "Q", cooldownMs: 16000, durationMs: 4000, color: "#aa66ff", desc: "Reveal enemies in radius" },
    e: { id: "flash", name: "Strobe", key: "E", cooldownMs: 11000, durationMs: 1600, color: "#ffffff", desc: "Long-range flash" },
  },
};

export const AGENT_LIST = Object.values(AGENTS);
