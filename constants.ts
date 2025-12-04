

import { CarClass, CarConfig, MapConfig, Obstacle, WeaponType, ItemPad } from './types';

export const TILE_SIZE = 100;

// --- LEVEL CONFIGURATION ---
export const getLevelConfig = (level: number) => {
  // Cap difficulty at level 20 roughly
  const difficultyCurve = Math.min(1, (level - 1) / 19);
  
  // Enemy Count: Starts at 1, slowly scales up
  const botCount = Math.min(8, Math.floor(1 + (level * 0.4)));

  // AI Stats
  const detectionRange = 400 + (difficultyCurve * 1000); // 400 -> 1400
  const accuracy = 0.2 + (difficultyCurve * 0.6); // Less accurate initially
  const turnSkill = 0.5 + (difficultyCurve * 0.8); // 0.5 -> 1.3
  
  // Player Buffs (To keep up with difficulty)
  const playerSpeedMult = 1 + (level * 0.02); // 2% faster per level

  return {
    botCount,
    detectionRange,
    accuracy,
    turnSkill,
    playerSpeedMult
  };
};

// --- CARS ---
// Physics tuned for Fixed-Forward aiming (Higher turn speeds needed to aim effectively)
export const CAR_STATS: Record<CarClass, CarConfig> = {
  SPEEDSTER: {
    name: 'Viper X-1',
    radius: 20,
    speed: 16,
    maxSpeed: 13,
    friction: 0.95,
    turnSpeed: 0.09, // Snappy turning
    maxHealth: 100,
    color: '#38bdf8' // Sky Blue
  },
  ENFORCER: {
    name: 'Goliath Tank',
    radius: 28,
    speed: 11,
    maxSpeed: 10,
    friction: 0.92,
    turnSpeed: 0.06,
    maxHealth: 220,
    color: '#f87171' // Red
  },
  DRIFTER: {
    name: 'Phantom Z',
    radius: 22,
    speed: 14,
    maxSpeed: 11,
    friction: 0.97,
    turnSpeed: 0.11, // Very sensitive turning
    maxHealth: 140,
    color: '#c084fc' // Purple
  }
};

// --- WEAPONS ---
export const WEAPON_STATS: Record<WeaponType, { damage: number; fireRate: number; speed: number; count: number; spread: number; ammo: number; color: string; explosionRadius?: number }> = {
  [WeaponType.BLASTER]: { damage: 15, fireRate: 200, speed: 25, count: 1, spread: 0.02, ammo: Infinity, color: '#fbbf24' },
  [WeaponType.MACHINE_GUN]: { damage: 8, fireRate: 70, speed: 28, count: 1, spread: 0.08, ammo: 100, color: '#60a5fa' },
  [WeaponType.SHOTGUN]: { damage: 8, fireRate: 900, speed: 20, count: 8, spread: 0.4, ammo: 20, color: '#f97316' },
  [WeaponType.CANNON]: { damage: 60, fireRate: 1500, speed: 32, count: 1, spread: 0, ammo: 12, color: '#ef4444', explosionRadius: 90 },
  [WeaponType.MISSILE]: { damage: 45, fireRate: 1200, speed: 18, count: 1, spread: 0, ammo: 6, color: '#10b981', explosionRadius: 60 },
  [WeaponType.MINE]: { damage: 90, fireRate: 1000, speed: 0, count: 1, spread: 0, ammo: 5, color: '#ec4899', explosionRadius: 90 },
  [WeaponType.BOMB]: { damage: 80, fireRate: 1100, speed: 16, count: 1, spread: 0, ammo: 8, color: '#eab308', explosionRadius: 110 },
  [WeaponType.SPIKES]: { damage: 30, fireRate: 200, speed: 0, count: 1, spread: 0, ammo: 10, color: '#94a3b8' },
};

export const NAMES = [
  "Speedy", "Crash", "DriftKing", "Turbo", "Nitro", "Axel", "Sprocket", "Vortex", "Glitch", "Rocket", "Shadow", "Blaze", "Neon", "Cyber", "Venom"
];

// --- MAPS ---
const createBox = (x: number, y: number, w: number, h: number, color: string): Obstacle => ({ x, y, width: w, height: h, color });
const createPad = (x: number, y: number): ItemPad => ({ id: Math.random().toString(), x, y, active: true, cooldownTimer: 0 });

export const MAPS: Record<string, MapConfig> = {
  GRID: {
    id: 'GRID',
    name: 'Sector 1: Neon Grid',
    width: 2000,
    height: 2000,
    gridColor: '#e2e8f0', 
    bgColor: '#f8fafc', 
    obstacles: [
      createBox(500, 500, 200, 200, '#475569'),
      createBox(1300, 500, 200, 200, '#475569'),
      createBox(500, 1300, 200, 200, '#475569'),
      createBox(1300, 1300, 200, 200, '#475569'),
      createBox(850, 850, 300, 300, '#334155'),
    ],
    itemPads: [
        createPad(1000, 400),
        createPad(1000, 1600),
        createPad(400, 1000),
        createPad(1600, 1000),
        createPad(1000, 1000),
        createPad(200, 200),
        createPad(1800, 1800)
    ]
  },
  MAZE: {
    id: 'MAZE',
    name: 'Sector 2: Cyber Maze',
    width: 2500,
    height: 2500,
    gridColor: '#312e81',
    bgColor: '#1e1b4b',
    obstacles: [
      createBox(200, 200, 600, 100, '#4338ca'),
      createBox(200, 200, 100, 600, '#4338ca'),
      createBox(1700, 1700, 600, 100, '#4338ca'),
      createBox(2200, 1700, 100, 600, '#4338ca'),
      createBox(1100, 0, 100, 800, '#3730a3'),
      createBox(1100, 1700, 100, 800, '#3730a3'),
      createBox(0, 1200, 800, 100, '#3730a3'),
      createBox(1700, 1200, 800, 100, '#3730a3'),
      createBox(1100, 1100, 300, 300, '#312e81')
    ],
    itemPads: [
        createPad(500, 500),
        createPad(2000, 2000),
        createPad(500, 2000),
        createPad(2000, 500),
        createPad(1250, 1250),
        createPad(1250, 900),
        createPad(1250, 1600)
    ]
  },
  ARENA: {
    id: 'ARENA',
    name: 'Sector 3: The Foundry',
    width: 1800,
    height: 1800,
    gridColor: '#94a3b8',
    bgColor: '#cbd5e1',
    obstacles: [
       createBox(300, 300, 150, 1200, '#475569'),
       createBox(1350, 300, 150, 1200, '#475569'),
       createBox(600, 800, 600, 200, '#334155'),
    ],
    itemPads: [
        createPad(900, 400),
        createPad(900, 1400),
        createPad(100, 900),
        createPad(1700, 900),
        createPad(900, 900)
    ]
  }
};