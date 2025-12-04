

export interface Vector2 {
  x: number;
  y: number;
}

export enum WeaponType {
  BLASTER = 'BLASTER',
  SHOTGUN = 'SHOTGUN',
  MACHINE_GUN = 'MACHINE_GUN',
  CANNON = 'CANNON',
  MISSILE = 'MISSILE',
  MINE = 'MINE',
  BOMB = 'BOMB',
  SPIKES = 'SPIKES'
}

export type CarClass = 'SPEEDSTER' | 'ENFORCER' | 'DRIFTER';

export interface Entity {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  radius: number;
  rotation: number;
  color: string;
  markedForDeletion: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface ItemPad {
  id: string;
  x: number;
  y: number;
  active: boolean;
  cooldownTimer: number;
}

export interface MapConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  obstacles: Obstacle[];
  itemPads: ItemPad[];
  gridColor: string;
  bgColor: string;
}

export interface CarConfig {
  name: string;
  radius: number;
  speed: number;
  maxSpeed: number;
  friction: number;
  turnSpeed: number;
  maxHealth: number;
  color: string;
}

export interface Kart extends Entity {
  health: number;
  maxHealth: number;
  turretRotation: number;
  weapon: WeaponType;
  ammo: number;
  score: number;
  isPlayer: boolean;
  speed: number;
  acceleration: number;
  turnSpeed: number;
  lastShotTime: number;
  name: string;
  carClass: CarClass;
  drifting: boolean;
  driftCharge: number; // 0 to 1+
  boostTime: number; // Time remaining for boost
  isBot: boolean;
  
  // AI State
  aiMode?: 'WANDER' | 'CHASE' | 'SEEK_ITEM' | 'FLEE' | 'ATTACK';
  aiTarget?: Vector2;
  aiTargetEntityId?: string; // ID of the kart being targeted
  aiTimer?: number;

  // Respawn State
  isDead: boolean;
  respawnTimer: number;
  invulnerabilityTimer: number;
}

export interface Projectile extends Entity {
  damage: number;
  ownerId: string;
  timeLeft: number;
  isHoming?: boolean;
  targetId?: string; 
  isLobbed?: boolean; // For Bomb
  zHeight?: number; // For 3D arc effect
  type: WeaponType;
}

export type ParticleType = 'FIRE' | 'SMOKE' | 'SPARK' | 'TEXT' | 'SHOCKWAVE' | 'MUZZLE_FLASH' | 'DRIFT_SPARK' | 'BOOST_TRAIL' | 'RESPAWN_BEAM' | 'LEVEL_TEXT';

export interface Particle extends Entity {
  type: ParticleType;
  life: number;
  maxLife: number;
  startRadius: number;
  text?: string;
}

export interface KillEvent {
  id: string;
  killer: string;
  victim: string;
  time: number;
}

export interface GameState {
  player: Kart;
  enemies: Kart[];
  projectiles: Projectile[];
  particles: Particle[];
  itemPads: ItemPad[];
  obstacles: Obstacle[];
  camera: Vector2;
  trauma: number;
  map: MapConfig;
  score: number;
  isGameOver: boolean;
  level: number;
  levelTransitionTimer: number; // Delay between levels
  killFeed: KillEvent[];
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  drift: boolean; // Spacebar
  mouseX: number;
  mouseY: number;
}