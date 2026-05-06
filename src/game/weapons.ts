export type WeaponId = "pistol" | "smg" | "sniper";

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
  zoom?: number;
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: { id: "pistol", name: "PULSE-9", damage: 28, fireRateMs: 220, spread: 0.012, range: 60, ammo: 14, reloadMs: 1100, color: "#7df9ff" },
  smg:    { id: "smg",    name: "VIPER-SMG", damage: 14, fireRateMs: 80,  spread: 0.035, range: 45, ammo: 32, reloadMs: 1600, color: "#ffaa33" },
  sniper: { id: "sniper", name: "RAIL-X",    damage: 95, fireRateMs: 1100, spread: 0.001, range: 200, ammo: 5, reloadMs: 2200, color: "#ff44aa", zoom: 35 },
};

export const WEAPON_ORDER: WeaponId[] = ["pistol", "smg", "sniper"];
