export type WeaponCategory = "sidearm" | "smg" | "rifle" | "sniper" | "heavy" | "melee";
export type WeaponId = "pistol" | "ghost" | "sherif" | "smg" | "spectre" | "vandal" | "phantom" | "bucky" | "odin" | "marshal" | "sniper" | "knife";

export interface Weapon {
  id: WeaponId;
  name: string;
  damage: number;
  fireRateMs: number;
  spread: number;
  range: number;
  ammo: number;
  reloadMs: number;
  color: string;
  category: WeaponCategory;
  price: number;
  killReward: number;
  zoom?: number;
  melee?: boolean;
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  // Sidearms
  pistol:  { id: "pistol",  name: "PULSE-9",    category: "sidearm", price: 0,    killReward: 200, damage: 28, fireRateMs: 220,  spread: 0.012, range: 60,  ammo: 14, reloadMs: 1100, color: "#7df9ff" },
  ghost:   { id: "ghost",   name: "GHOST-45",   category: "sidearm", price: 500,  killReward: 200, damage: 35, fireRateMs: 200,  spread: 0.008, range: 65,  ammo: 15, reloadMs: 1100, color: "#aaddff" },
  sherif:  { id: "sherif",  name: "SHERIF-X",   category: "sidearm", price: 600,  killReward: 200, damage: 55, fireRateMs: 540,  spread: 0.004, range: 70,  ammo: 6,  reloadMs: 1200, color: "#ffdd88" },
  // SMGs
  smg:     { id: "smg",     name: "VIPER-SMG",  category: "smg",     price: 900,  killReward: 200, damage: 14, fireRateMs: 80,   spread: 0.035, range: 45,  ammo: 32, reloadMs: 1600, color: "#ffaa33" },
  spectre: { id: "spectre", name: "SPECTRE-P",  category: "smg",     price: 1000, killReward: 200, damage: 18, fireRateMs: 90,   spread: 0.028, range: 50,  ammo: 30, reloadMs: 1400, color: "#ff8844" },
  // Rifles
  phantom: { id: "phantom", name: "PHANTOM-R",  category: "rifle",   price: 1400, killReward: 300, damage: 35, fireRateMs: 90,   spread: 0.014, range: 110, ammo: 30, reloadMs: 1800, color: "#cc88ff" },
  vandal:  { id: "vandal",  name: "VANDAL-AR",  category: "rifle",   price: 1500, killReward: 300, damage: 40, fireRateMs: 100,  spread: 0.018, range: 100, ammo: 25, reloadMs: 2000, color: "#ff6644" },
  // Heavy
  bucky:   { id: "bucky",   name: "BUCKY-SG",   category: "heavy",   price: 850,  killReward: 200, damage: 90, fireRateMs: 700,  spread: 0.08,  range: 20,  ammo: 5,  reloadMs: 2400, color: "#ff8833" },
  odin:    { id: "odin",    name: "ODIN-LMG",   category: "heavy",   price: 1300, killReward: 200, damage: 16, fireRateMs: 75,   spread: 0.04,  range: 80,  ammo: 100, reloadMs: 3500, color: "#44ff88" },
  // Snipers
  marshal: { id: "marshal", name: "MARSHAL-SR", category: "sniper",  price: 800,  killReward: 300, damage: 75, fireRateMs: 800,  spread: 0.002, range: 160, ammo: 5,  reloadMs: 2000, color: "#88ddff", zoom: 30 },
  sniper:  { id: "sniper",  name: "RAIL-X",     category: "sniper",  price: 1700, killReward: 300, damage: 95, fireRateMs: 1100, spread: 0.001, range: 200, ammo: 5,  reloadMs: 2200, color: "#ff44aa", zoom: 35 },
  // Melee
  knife:   { id: "knife",   name: "VOID-EDGE",  category: "melee",   price: 0,    killReward: 200, damage: 55, fireRateMs: 500,  spread: 0,     range: 2.5, ammo: 1,  reloadMs: 0,    color: "#00ffcc", melee: true },
};

export const WEAPON_ORDER: WeaponId[] = ["pistol", "ghost", "sherif", "smg", "spectre", "phantom", "vandal", "bucky", "odin", "marshal", "sniper", "knife"];

export const WEAPON_CATEGORIES: { id: WeaponCategory; label: string; color: string }[] = [
  { id: "sidearm", label: "SIDEARMS", color: "#7df9ff" },
  { id: "smg",     label: "SMGs",     color: "#ffaa33" },
  { id: "rifle",   label: "RIFLES",   color: "#ff6644" },
  { id: "sniper",  label: "SNIPERS",  color: "#ff44aa" },
  { id: "heavy",   label: "HEAVY",    color: "#44ff88" },
  { id: "melee",   label: "MELEE",    color: "#00ffcc" },
];
