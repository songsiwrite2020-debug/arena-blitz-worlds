import { useRef, MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface BotEntry {
  id: string;
  username: string;
  pos: [number, number, number];
  rotY: number;
  hp: number;
  dead: boolean;
}

interface Internal extends BotEntry {
  velY: number;
  onGround: boolean;
  wanderTarget: THREE.Vector3;
  wanderTimer: number;
  lastShot: number;
  strafeDir: number;
  strafeTimer: number;
  respawnTimer: number;
}

const BOT_SPEED      = 4.5;
const BOT_FIRE_MS    = 1500;
const BOT_DAMAGE     = 18;
const ENGAGE_RANGE   = 28;
const SHOOT_RANGE    = 18;
const GRAVITY        = 22;
const HEIGHT         = 1.7;
const RADIUS         = 0.4;

function make(e: BotEntry, arenaSize: number): Internal {
  const half = arenaSize / 2 - 3;
  return {
    ...e,
    velY: 0,
    onGround: true,
    wanderTarget: new THREE.Vector3(
      (Math.random() - 0.5) * half * 2,
      0,
      (Math.random() - 0.5) * half * 2,
    ),
    wanderTimer: 1 + Math.random() * 3,
    lastShot: -BOT_FIRE_MS * Math.random(), // stagger initial shots
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    strafeTimer: 1 + Math.random() * 2,
    respawnTimer: 0,
  };
}

interface Props {
  botsRef:    MutableRefObject<BotEntry[]>;
  botPosRef:  MutableRefObject<Record<string, { pos: [number, number, number]; rotY: number }>>;
  meRef:      MutableRefObject<{ pos: [number, number, number]; hp: number }>;
  obstacles:  THREE.Box3[];
  arenaSize:  number;
  onBotShoot: (dmg: number, origin: [number,number,number], end: [number,number,number]) => void;
}

export function BotController({ botsRef, botPosRef, meRef, obstacles, arenaSize, onBotShoot }: Props) {
  const internals = useRef<Internal[]>(botsRef.current.map(b => make(b, arenaSize)));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const mp  = meRef.current.pos;
    const playerPos   = new THREE.Vector3(mp[0], mp[1], mp[2]);
    const playerAlive = meRef.current.hp > 0;

    for (let i = 0; i < internals.current.length; i++) {
      const bot = internals.current[i];

      // --- Dead / respawn ---
      if (bot.dead) {
        bot.respawnTimer -= dt * 1000;
        if (bot.respawnTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const r     = 8 + Math.random() * 12;
          bot.pos  = [Math.cos(angle) * r, HEIGHT, Math.sin(angle) * r];
          bot.hp   = 100;
          bot.dead = false;
          bot.velY = 0;
          botsRef.current[i].hp   = 100;
          botsRef.current[i].dead = false;
          botsRef.current[i].pos  = [...bot.pos] as [number,number,number];
        }
        continue;
      }

      // Sync HP from shared ref (player may have shot the bot)
      const sharedHp = botsRef.current[i].hp;
      if (sharedHp !== bot.hp) bot.hp = sharedHp;
      if (bot.hp <= 0) {
        bot.dead = true;
        bot.respawnTimer = 3000;
        botsRef.current[i].dead = true;
        botPosRef.current[bot.id] = { pos: [...bot.pos] as [number,number,number], rotY: bot.rotY };
        continue;
      }

      const botPos = new THREE.Vector3(bot.pos[0], bot.pos[1], bot.pos[2]);
      const dist   = botPos.distanceTo(playerPos);

      // Strafe cycle
      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir   = Math.random() > 0.5 ? 1 : -1;
        bot.strafeTimer = 1.5 + Math.random() * 2;
      }

      let moveX = 0, moveZ = 0;

      if (dist < ENGAGE_RANGE && playerAlive) {
        // Pursue + strafe
        const toPlayer = new THREE.Vector3(playerPos.x - botPos.x, 0, playerPos.z - botPos.z).normalize();
        if (dist > 5) { moveX += toPlayer.x * 0.75; moveZ += toPlayer.z * 0.75; }
        moveX += -toPlayer.z * bot.strafeDir * 0.4;
        moveZ +=  toPlayer.x * bot.strafeDir * 0.4;
        bot.rotY = Math.atan2(-(playerPos.x - botPos.x), -(playerPos.z - botPos.z));

        // Shoot
        if (dist < SHOOT_RANGE && now - bot.lastShot > BOT_FIRE_MS) {
          bot.lastShot = now;
          const origin: [number,number,number] = [bot.pos[0], bot.pos[1] - 0.1, bot.pos[2]];
          const end:    [number,number,number] = [mp[0], mp[1], mp[2]];
          onBotShoot(BOT_DAMAGE, origin, end);
        }
      } else {
        // Wander
        bot.wanderTimer -= dt;
        const tgt = bot.wanderTarget;
        const dx = tgt.x - bot.pos[0], dz = tgt.z - bot.pos[2];
        if (bot.wanderTimer <= 0 || Math.abs(dx) + Math.abs(dz) < 1.5) {
          const half = arenaSize / 2 - 3;
          tgt.set((Math.random() - 0.5) * half * 2, 0, (Math.random() - 0.5) * half * 2);
          bot.wanderTimer = 3 + Math.random() * 4;
        }
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0.5) {
          moveX = dx / len;
          moveZ = dz / len;
          bot.rotY = Math.atan2(-moveX, -moveZ);
        }
      }

      // Normalize + speed
      const ml = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (ml > 1) { moveX /= ml; moveZ /= ml; }
      moveX *= BOT_SPEED;
      moveZ *= BOT_SPEED;

      // Gravity
      bot.velY -= GRAVITY * dt;

      // Collision move
      const tryMove = (ax: "x" | "y" | "z", amt: number) => {
        const nx = bot.pos[0] + (ax === "x" ? amt : 0);
        const ny = bot.pos[1] + (ax === "y" ? amt : 0);
        const nz = bot.pos[2] + (ax === "z" ? amt : 0);
        const half = arenaSize / 2 - RADIUS;
        const cx = Math.max(-half, Math.min(half, nx));
        const cz = Math.max(-half, Math.min(half, nz));
        const box = new THREE.Box3(
          new THREE.Vector3(cx - RADIUS, ny - HEIGHT, cz - RADIUS),
          new THREE.Vector3(cx + RADIUS, ny, cz + RADIUS),
        );
        for (const obs of obstacles) {
          if (box.intersectsBox(obs)) {
            if (ax === "y" && amt < 0) {
              bot.velY = 0; bot.onGround = true;
              bot.pos[1] = obs.max.y + HEIGHT;
            }
            return;
          }
        }
        if (ax === "x") bot.pos[0] = cx;
        if (ax === "y") bot.pos[1] = ny;
        if (ax === "z") bot.pos[2] = cz;
      };

      bot.onGround = false;
      tryMove("x", moveX * dt);
      tryMove("z", moveZ * dt);
      tryMove("y", bot.velY * dt);
      if (bot.pos[1] <= HEIGHT) { bot.pos[1] = HEIGHT; bot.velY = 0; bot.onGround = true; }

      // Publish to refs
      botsRef.current[i].pos   = [...bot.pos] as [number,number,number];
      botsRef.current[i].rotY  = bot.rotY;
      botPosRef.current[bot.id] = { pos: botsRef.current[i].pos, rotY: bot.rotY };
    }
  });

  return null;
}
