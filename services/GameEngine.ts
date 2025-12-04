

import { Entity, GameState, InputState, Kart, Particle, Projectile, Vector2, WeaponType, Obstacle, MapConfig, CarClass, ParticleType, ItemPad } from '../types';
import { CAR_STATS, MAPS, NAMES, TILE_SIZE, WEAPON_STATS, getLevelConfig } from '../constants';
import { soundManager } from './SoundManager';

export class GameEngine {
  public state: GameState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  
  private lastTime: number = 0;
  private animationId: number = 0;
  private input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shoot: false,
    drift: false,
    mouseX: 0,
    mouseY: 0
  };

  private onGameOver: (score: number) => void;

  constructor(canvas: HTMLCanvasElement, mapId: string, playerClass: CarClass, onGameOver: (score: number) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.onGameOver = onGameOver;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const selectedMap = MAPS[mapId] || MAPS.GRID;
    
    // Deep copy items to reset cooldowns on restart
    const mapInstance = JSON.parse(JSON.stringify(selectedMap));

    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = mapInstance.width;
    this.bgCanvas.height = mapInstance.height;
    this.bgCtx = this.bgCanvas.getContext('2d')!;
    
    this.drawStaticBackground(mapInstance);

    this.state = this.createInitialState(mapInstance, playerClass);
    
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    // Mouse aiming removed for "Real Car Controls" - aiming is by driving
  }

  private createInitialState(map: MapConfig, playerClass: CarClass): GameState {
    const stats = CAR_STATS[playerClass];
    const startPos = { x: map.width / 2, y: map.height / 2 };
    
    const player: Kart = {
      id: 'player',
      pos: startPos,
      velocity: { x: 0, y: 0 },
      rotation: -Math.PI / 2,
      turretRotation: -Math.PI / 2,
      radius: stats.radius,
      color: stats.color,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      weapon: WeaponType.BLASTER,
      ammo: Infinity,
      score: 0,
      isPlayer: true,
      speed: 0,
      acceleration: 0,
      turnSpeed: stats.turnSpeed,
      lastShotTime: 0,
      markedForDeletion: false,
      name: "YOU",
      carClass: playerClass,
      drifting: false,
      driftCharge: 0,
      boostTime: 0,
      isBot: false,
      isDead: false,
      respawnTimer: 0,
      invulnerabilityTimer: 0
    };

    return {
      player,
      enemies: [],
      projectiles: [],
      particles: [],
      itemPads: map.itemPads, // Use map's fixed pads
      obstacles: map.obstacles,
      camera: { x: player.pos.x, y: player.pos.y },
      trauma: 0,
      map: map,
      score: 0,
      isGameOver: false,
      level: 1,
      levelTransitionTimer: 0,
      killFeed: []
    };
  }

  private drawStaticBackground(map: MapConfig) {
    const ctx = this.bgCtx;
    
    // Background Color
    ctx.fillStyle = map.bgColor;
    ctx.fillRect(0, 0, map.width, map.height);

    // Grid Lines (Thick and Soft)
    ctx.strokeStyle = map.gridColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    for (let x = 0; x <= map.width; x += TILE_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, map.height);
    }
    for (let y = 0; y <= map.height; y += TILE_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(map.width, y);
    }
    ctx.stroke();
    
    // Draw 3D-ish Obstacles
    map.obstacles.forEach(obs => {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(obs.x + 10, obs.y + 10, obs.width, obs.height);

      // Side (Depth)
      const depth = 20;
      ctx.fillStyle = this.adjustColor(obs.color, -40); // Darker side
      ctx.fillRect(obs.x, obs.y + obs.height, obs.width, depth);

      // Top Face
      ctx.fillStyle = obs.color;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      // Highlight Edge
      ctx.fillStyle = this.adjustColor(obs.color, 40); // Lighter top edge
      ctx.fillRect(obs.x, obs.y, obs.width, 4);
    });
  }

  // Helper to darken/lighten hex color
  private adjustColor(color: string, amount: number) {
      return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
  }

  public start() {
    this.lastTime = performance.now();
    this.loop();
    this.startLevel(1);
  }

  public stop() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private loop = () => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;

    if (!this.state.isGameOver) {
      this.update(dt);
    }
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private handleResize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': 
      case 'ArrowUp': this.input.forward = true; break;
      case 'KeyS': 
      case 'ArrowDown': this.input.backward = true; break;
      case 'KeyA': 
      case 'ArrowLeft': this.input.left = true; break;
      case 'KeyD': 
      case 'ArrowRight': this.input.right = true; break;
      case 'ShiftLeft': 
      case 'ShiftRight': 
        this.input.drift = true; break;
      case 'Space': this.input.shoot = true; break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': 
      case 'ArrowUp': this.input.forward = false; break;
      case 'KeyS': 
      case 'ArrowDown': this.input.backward = false; break;
      case 'KeyA': 
      case 'ArrowLeft': this.input.left = false; break;
      case 'KeyD': 
      case 'ArrowRight': this.input.right = false; break;
      case 'ShiftLeft': 
      case 'ShiftRight': 
        this.input.drift = false; break;
      case 'Space': this.input.shoot = false; break;
    }
  };

  private addTrauma(amount: number) {
    this.state.trauma = Math.min(1.0, this.state.trauma + amount);
  }

  // --- LOGIC ---

  private startLevel(level: number) {
      this.state.level = level;
      this.state.levelTransitionTimer = 0;
      
      const config = getLevelConfig(level);
      this.spawnEnemies(config.botCount);
      
      // Level Text
      this.spawnParticle(this.state.player.pos.x, this.state.player.pos.y, 'LEVEL_TEXT', 3.0, '#fbbf24', `WAVE ${level}`);
      
      // Heal player slightly for surviving
      this.state.player.health = Math.min(this.state.player.maxHealth, this.state.player.health + 30);
  }

  private update(dt: number) {
    const { player, enemies, projectiles, particles, itemPads } = this.state;
    
    // Level Progression Logic
    const activeEnemies = enemies.filter(e => !e.markedForDeletion);
    if (activeEnemies.length === 0 && this.state.levelTransitionTimer === 0) {
        this.state.levelTransitionTimer = 3.0; // Wait 3 seconds before next level
    }

    if (this.state.levelTransitionTimer > 0) {
        this.state.levelTransitionTimer -= dt;
        if (this.state.levelTransitionTimer <= 0) {
            this.startLevel(this.state.level + 1);
        }
    }

    if (this.state.trauma > 0) this.state.trauma = Math.max(0, this.state.trauma - dt * 1.5);

    // Update Player
    if (!player.isDead) {
        this.updateKart(player, this.input, dt);
    }
    if (player.invulnerabilityTimer > 0) player.invulnerabilityTimer -= dt;

    // Update Camera (Lerp to player with shake)
    const shake = this.state.trauma * this.state.trauma * 20;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeY = (Math.random() - 0.5) * shake;
    
    this.state.camera.x += (player.pos.x - this.state.camera.x) * 5 * dt;
    this.state.camera.y += (player.pos.y - this.state.camera.y) * 5 * dt;

    // Update Enemies (AI)
    enemies.forEach(enemy => {
        if (enemy.markedForDeletion) return;
        
        // Invulnerability Fade logic
        if (enemy.invulnerabilityTimer > 0) {
            enemy.invulnerabilityTimer -= dt;
        }

        this.updateAI(enemy, dt);
        this.updateKart(enemy, {
            forward: true, // AI always tries to move
            backward: false,
            left: false,
            right: false,
            shoot: false, 
            drift: false,
            mouseX: 0,
            mouseY: 0
        }, dt); 
    });

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.timeLeft -= dt;
      
      if (p.isLobbed && p.zHeight !== undefined) {
         // Fake gravity for bomb
         const progress = 1 - (p.timeLeft / (WEAPON_STATS[WeaponType.BOMB].speed / 10)); // rough estimate
         p.zHeight = Math.sin(progress * Math.PI) * 100;
         if (p.timeLeft <= 0) p.zHeight = 0;
      }

      if (p.isHoming && p.targetId) {
         const target = [player, ...enemies].find(e => e.id === p.targetId);
         if (target && !target.markedForDeletion) {
            const dx = target.pos.x - p.pos.x;
            const dy = target.pos.y - p.pos.y;
            const angle = Math.atan2(dy, dx);
            // Steer projectile
            const curAngle = Math.atan2(p.velocity.y, p.velocity.x);
            const steer = 0.1; // Turn rate
            let newAngle = curAngle;
            // Simple angle lerp
            if (Math.abs(angle - curAngle) < Math.PI) {
               if (angle > curAngle) newAngle += steer;
               else newAngle -= steer;
            } else {
               if (angle > curAngle) newAngle -= steer;
               else newAngle += steer;
            }
            const speed = WEAPON_STATS[WeaponType.MISSILE].speed * 20; 
            p.velocity.x = Math.cos(newAngle) * speed;
            p.velocity.y = Math.sin(newAngle) * speed;
            p.rotation = newAngle; // Rotate projectile visual
         }
      }

      p.pos.x += p.velocity.x * dt * 20; // Speed adjustment
      p.pos.y += p.velocity.y * dt * 20;

      // Projectile Wall Collisions
      if (!p.isLobbed && this.checkWallCollision(p.pos, 5)) {
        p.markedForDeletion = true;
        this.spawnParticle(p.pos.x, p.pos.y, 'SPARK', 5, p.color);
        if (this.isVisible(p.pos)) soundManager.playImpact(0.5);
      }

      if (p.timeLeft <= 0) {
        p.markedForDeletion = true;
        if (p.isLobbed) {
             // Explosion on timeout (Bomb)
             this.createExplosion(p.pos, 100, 70, p.ownerId);
        }
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.pos.x += p.velocity.x * dt;
        p.pos.y += p.velocity.y * dt;
        if (p.life <= 0) p.markedForDeletion = true;
    }

    // Update Item Pads
    itemPads.forEach(pad => {
        if (!pad.active) {
            pad.cooldownTimer -= dt;
            if (pad.cooldownTimer <= 0) pad.active = true;
        }
    });

    // --- COLLISIONS ---

    // Filter Active Karts
    const activeKarts = [player, ...enemies].filter(k => !k.markedForDeletion && !k.isDead);

    // 1. Kart vs ItemPad
    activeKarts.forEach(kart => {
        itemPads.forEach(pad => {
            if (pad.active) {
                const dist = Math.hypot(kart.pos.x - pad.x, kart.pos.y - pad.y);
                if (dist < kart.radius + 30) {
                    pad.active = false;
                    pad.cooldownTimer = 10;
                    this.giveRandomWeapon(kart);
                    this.spawnParticle(pad.x, pad.y, 'SHOCKWAVE', 1, '#fff');
                    if (kart.isPlayer) soundManager.playPickup();
                }
            }
        });
    });

    // 2. Projectile vs Kart
    projectiles.forEach(p => {
       if (p.markedForDeletion) return;
       // Skip bomb in air
       if (p.isLobbed && (p.zHeight || 0) > 10) return;

       activeKarts.forEach(target => {
          if (p.ownerId === target.id) return; 
          // Invulnerable check
          if (target.invulnerabilityTimer > 0) return;
          
          const dist = Math.hypot(p.pos.x - target.pos.x, p.pos.y - target.pos.y);
          if (dist < target.radius + 10) {
             p.markedForDeletion = true;
             
             // Apply Damage
             if (WEAPON_STATS[p.type]?.explosionRadius) {
                 this.createExplosion(p.pos, WEAPON_STATS[p.type].explosionRadius!, p.damage, p.ownerId);
             } else {
                 this.damageKart(target, p.damage, p.ownerId);
                 this.spawnParticle(p.pos.x, p.pos.y, 'SPARK', 8, p.color);
                 if (target.isPlayer || p.ownerId === 'player') soundManager.playImpact(1);
             }
          }
       });
    });

    // 3. Kart vs Kart
    for (let i = 0; i < activeKarts.length; i++) {
        for (let j = i + 1; j < activeKarts.length; j++) {
            this.resolveKartCollision(activeKarts[i], activeKarts[j]);
        }
    }

    // 4. Kart vs Walls
    activeKarts.forEach(k => this.resolveWallCollision(k));

    // Cleanup
    this.state.projectiles = projectiles.filter(p => !p.markedForDeletion);
    this.state.particles = particles.filter(p => !p.markedForDeletion);
    this.state.enemies = enemies.filter(e => !e.markedForDeletion);

    // Game Over check
    if (player.health <= 0 && !this.state.isGameOver) {
        this.state.isGameOver = true;
        this.onGameOver(this.state.score);
    }

    // Killfeed cleanup
    const nowTime = Date.now();
    this.state.killFeed = this.state.killFeed.filter(k => nowTime - k.time < 3000);
  }

  private isVisible(pos: Vector2): boolean {
    const { camera } = this.state;
    const { width, height } = this.canvas;
    return (
        pos.x > camera.x - width/2 && 
        pos.x < camera.x + width/2 &&
        pos.y > camera.y - height/2 &&
        pos.y < camera.y + height/2
    );
  }

  private updateKart(kart: Kart, input: InputState, dt: number) {
    if (kart.markedForDeletion) return;

    const stats = CAR_STATS[kart.carClass];
    // Level scaling for player
    const levelConfig = getLevelConfig(this.state.level);
    const speedMultStats = kart.isPlayer ? levelConfig.playerSpeedMult : 1;

    // -- Physics --
    
    // Drifting state
    if (input.drift && Math.hypot(kart.velocity.x, kart.velocity.y) > 2) {
        if (!kart.drifting) {
            kart.drifting = true;
            kart.driftCharge = 0;
        }
        kart.driftCharge += dt;
        if (kart.driftCharge > 1.0 && Math.random() < 0.3) {
             const color = kart.driftCharge > 2.5 ? '#ef4444' : kart.driftCharge > 1.2 ? '#f97316' : '#3b82f6';
             this.spawnParticle(kart.pos.x, kart.pos.y, 'DRIFT_SPARK', 1, color);
        }
    } else {
        if (kart.drifting) {
            // Release Drift Boost
            if (kart.driftCharge > 1.2) {
                kart.boostTime = kart.driftCharge > 2.5 ? 2.0 : 1.0;
                this.spawnParticle(kart.pos.x, kart.pos.y, 'SHOCKWAVE', 1, '#3b82f6');
                if (kart.isPlayer) soundManager.playImpact(0.2); 
            }
            kart.drifting = false;
        }
        kart.driftCharge = 0;
    }

    // Boost Logic
    let speedBoostMult = 1.0;
    if (kart.boostTime > 0) {
        kart.boostTime -= dt;
        speedBoostMult = 1.5;
        if (Math.random() < 0.5) {
             this.spawnParticle(kart.pos.x - Math.cos(kart.rotation)*20, kart.pos.y - Math.sin(kart.rotation)*20, 'BOOST_TRAIL', 1, '#3b82f6');
        }
    }

    // Acceleration
    let acc = 0;
    if (kart.isPlayer) {
        if (input.forward) acc = stats.speed * speedBoostMult * speedMultStats;
        if (input.backward) acc = -stats.speed * 0.5 * speedMultStats;
        
        // Turning
        if (Math.abs(acc) > 0 || Math.hypot(kart.velocity.x, kart.velocity.y) > 1) {
             const dir = input.backward ? -1 : 1;
             // Sharper turning for player responsiveness
             const turnMult = 1.2;
             if (input.left) kart.rotation -= stats.turnSpeed * turnMult * dir;
             if (input.right) kart.rotation += stats.turnSpeed * turnMult * dir;
        }
    } else {
        acc = kart.acceleration * speedBoostMult;
    }
    
    // Apply Acceleration Vector
    kart.velocity.x += Math.cos(kart.rotation) * acc * dt;
    kart.velocity.y += Math.sin(kart.rotation) * acc * dt;

    // Friction
    let friction = stats.friction;
    if (kart.drifting) friction = 0.985; 
    
    kart.velocity.x *= friction;
    kart.velocity.y *= friction;

    // Position
    kart.pos.x += kart.velocity.x * dt * 20; 
    kart.pos.y += kart.velocity.y * dt * 20;

    // Turret / Shooting
    // LOCKED TO CAR DIRECTION FOR "REAL" FEEL
    kart.turretRotation = kart.rotation; 

    // Auto-Targeting for Player Missiles
    if (kart.isPlayer && kart.weapon === WeaponType.MISSILE) {
       // Find closest enemy in front cone
       let bestTarget = null;
       let maxScore = -Infinity;
       
       this.state.enemies.forEach(e => {
           if(e.markedForDeletion) return;
           const dx = e.pos.x - kart.pos.x;
           const dy = e.pos.y - kart.pos.y;
           const dist = Math.hypot(dx, dy);
           if (dist > 600) return;

           const angleTo = Math.atan2(dy, dx);
           let angleDiff = Math.abs(kart.rotation - angleTo);
           while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
           angleDiff = Math.abs(angleDiff);

           // 60 degree cone
           if (angleDiff < Math.PI / 3) {
               // Closer + Center = Better
               const score = (1000/dist) + (100 * (Math.PI/3 - angleDiff));
               if (score > maxScore) {
                   maxScore = score;
                   bestTarget = e;
               }
           }
       });

       if (bestTarget) {
           kart.aiTargetEntityId = (bestTarget as Kart).id;
       } else {
           kart.aiTargetEntityId = undefined;
       }
    }

    // Shooting
    if (input.shoot) {
        this.fireWeapon(kart);
    }
    
    kart.lastShotTime -= dt;
  }

  private updateAI(bot: Kart, dt: number) {
      if (bot.markedForDeletion) return;

      const levelConfig = getLevelConfig(this.state.level);
      const allEntities = [this.state.player, ...this.state.enemies.filter(e => e.id !== bot.id && !e.markedForDeletion)];
      
      // 1. Target Scoring
      let bestTarget: Kart | null = null;
      let maxScore = -Infinity;

      allEntities.forEach(target => {
          if (target.health <= 0 || target.markedForDeletion) return;
          const dist = Math.hypot(target.pos.x - bot.pos.x, target.pos.y - bot.pos.y);
          if (dist > levelConfig.detectionRange) return;

          let score = 1000 / (dist + 1); 
          if (target.isPlayer) score += 50; 
          if (target.health < 30) score += 40; 
          if (this.hasLineOfSight(bot.pos, target.pos)) score += 200; 

          if (score > maxScore) {
              maxScore = score;
              bestTarget = target;
          }
      });

      const canSeeTarget = bestTarget && maxScore > 200;

      // 2. State Decision
      if (bot.health < bot.maxHealth * 0.25) {
          bot.aiMode = 'FLEE';
      } else if (bot.weapon === WeaponType.BLASTER && maxScore < 200) {
          bot.aiMode = 'SEEK_ITEM';
      } else if (bestTarget) {
          bot.aiMode = 'ATTACK';
          bot.aiTarget = bestTarget.pos;
          bot.aiTargetEntityId = bestTarget.id;
      } else {
          bot.aiMode = 'WANDER';
      }

      // 3. Execution
      let targetPos: Vector2 | null = null;
      let targetSpeed = CAR_STATS[bot.carClass].speed;
      let shouldShoot = false;

      switch(bot.aiMode) {
          case 'FLEE':
              if (bestTarget) {
                  const dx = bot.pos.x - bestTarget.pos.x;
                  const dy = bot.pos.y - bestTarget.pos.y;
                  targetPos = { x: bot.pos.x + dx, y: bot.pos.y + dy };
              } else {
                  bot.aiMode = 'WANDER'; 
              }
              break;
          
          case 'SEEK_ITEM':
             let closestPad: ItemPad | null = null;
             let minPadDist = Infinity;
             this.state.itemPads.forEach(pad => {
                 if (pad.active) {
                     const d = Math.hypot(pad.x - bot.pos.x, pad.y - bot.pos.y);
                     if (d < minPadDist) { minPadDist = d; closestPad = pad; }
                 }
             });
             if (closestPad) targetPos = { x: (closestPad as ItemPad).x, y: (closestPad as ItemPad).y };
             else bot.aiMode = 'WANDER';
             break;

          case 'ATTACK':
             if (bestTarget) {
                 targetPos = bestTarget.pos;
                 const dist = Math.hypot(targetPos.x - bot.pos.x, targetPos.y - bot.pos.y);

                 // Maintain distance if using ranged
                 if (bot.weapon === WeaponType.MISSILE || bot.weapon === WeaponType.CANNON) {
                     if (dist < 400) targetSpeed = -targetSpeed * 0.5; 
                 }

                 // Since weapons are fixed forward, bot needs to aim WITH the car
                 const angleToTarget = Math.atan2(targetPos.y - bot.pos.y, targetPos.x - bot.pos.x);
                 const angleDiff = Math.abs(bot.rotation - angleToTarget);
                 
                 // Shoot if roughly facing target
                 if (canSeeTarget && angleDiff < 0.4) {
                     shouldShoot = true;
                 }
             }
             break;
          
          case 'WANDER':
             bot.aiTimer = (bot.aiTimer || 0) - dt;
             if (bot.aiTimer <= 0) {
                 bot.aiTarget = {
                     x: Math.random() * this.state.map.width,
                     y: Math.random() * this.state.map.height
                 };
                 bot.aiTimer = 3;
             }
             targetPos = bot.aiTarget!;
             break;
      }

      // 4. Movement Execution
      if (targetPos) {
          const dx = targetPos.x - bot.pos.x;
          const dy = targetPos.y - bot.pos.y;
          const desiredAngle = Math.atan2(dy, dx);
          
          let diff = desiredAngle - bot.rotation;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          
          const turnRate = CAR_STATS[bot.carClass].turnSpeed * levelConfig.turnSkill;
          
          if (Math.abs(diff) > turnRate) {
              bot.rotation += Math.sign(diff) * turnRate;
          } else {
              bot.rotation = desiredAngle;
          }

          const lookAhead = 80;
          const whiskerX = bot.pos.x + Math.cos(bot.rotation) * lookAhead;
          const whiskerY = bot.pos.y + Math.sin(bot.rotation) * lookAhead;
          if (this.checkWallCollision({x: whiskerX, y: whiskerY}, bot.radius)) {
              targetSpeed = -targetSpeed * 0.5;
              bot.rotation += turnRate * 2; 
          }
          
          if (Math.abs(diff) < Math.PI / 2) {
              bot.acceleration = targetSpeed;
          } else {
              bot.acceleration = targetSpeed * 0.2; 
          }
      }

      if (shouldShoot) this.fireWeapon(bot);
  }

  private hasLineOfSight(start: Vector2, end: Vector2): boolean {
      for (const obs of this.state.obstacles) {
          if (this.lineIntersectsRect(start, end, obs)) return false;
      }
      return true;
  }

  private lineIntersectsRect(p1: Vector2, p2: Vector2, r: Obstacle): boolean {
      const minX = r.x;
      const maxX = r.x + r.width;
      const minY = r.y;
      const maxY = r.y + r.height;
      
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const steps = Math.ceil(dist / 40); 
      for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = p1.x + (p2.x - p1.x) * t;
          const y = p1.y + (p2.y - p1.y) * t;
          if (x > minX && x < maxX && y > minY && y < maxY) return true;
      }
      return false;
  }

  private resolveKartCollision(k1: Kart, k2: Kart) {
      if (k1.markedForDeletion || k2.markedForDeletion) return;

      const dx = k2.pos.x - k1.pos.x;
      const dy = k2.pos.y - k1.pos.y;
      const dist = Math.hypot(dx, dy);
      const minDist = k1.radius + k2.radius;
      
      if (dist < minDist) {
          const angle = Math.atan2(dy, dx);
          const overlap = minDist - dist;
          
          const moveX = Math.cos(angle) * overlap * 0.5;
          const moveY = Math.sin(angle) * overlap * 0.5;
          
          k1.pos.x -= moveX;
          k1.pos.y -= moveY;
          k2.pos.x += moveX;
          k2.pos.y += moveY;
          
          const v1 = Math.hypot(k1.velocity.x, k1.velocity.y);
          const v2 = Math.hypot(k2.velocity.x, k2.velocity.y);
          
          k1.velocity.x -= Math.cos(angle) * v2 * 0.5;
          k1.velocity.y -= Math.sin(angle) * v2 * 0.5;
          k2.velocity.x += Math.cos(angle) * v1 * 0.5;
          k2.velocity.y += Math.sin(angle) * v1 * 0.5;
          
          this.spawnParticle((k1.pos.x+k2.pos.x)/2, (k1.pos.y+k2.pos.y)/2, 'SPARK', 3, '#fff');
          
          if (k1.isPlayer || k2.isPlayer) {
              this.addTrauma(0.2);
              soundManager.playImpact(Math.max(v1, v2) / 20); 
          }
      }
  }

  private resolveWallCollision(k: Kart) {
      if (k.markedForDeletion) return;

      let collided = false;
      let velocity = 0;
      
      if (k.pos.x < k.radius) { k.pos.x = k.radius; k.velocity.x *= -0.5; collided = true; velocity = Math.abs(k.velocity.x); }
      if (k.pos.y < k.radius) { k.pos.y = k.radius; k.velocity.y *= -0.5; collided = true; velocity = Math.abs(k.velocity.y); }
      if (k.pos.x > this.state.map.width - k.radius) { k.pos.x = this.state.map.width - k.radius; k.velocity.x *= -0.5; collided = true; velocity = Math.abs(k.velocity.x); }
      if (k.pos.y > this.state.map.height - k.radius) { k.pos.y = this.state.map.height - k.radius; k.velocity.y *= -0.5; collided = true; velocity = Math.abs(k.velocity.y); }

      this.state.obstacles.forEach(obs => {
          const testX = Math.max(obs.x, Math.min(k.pos.x, obs.x + obs.width));
          const testY = Math.max(obs.y, Math.min(k.pos.y, obs.y + obs.height));
          
          const dx = k.pos.x - testX;
          const dy = k.pos.y - testY;
          const dist = Math.hypot(dx, dy);
          
          if (dist < k.radius) {
              collided = true;
              const overlap = k.radius - dist;
              let nx = dx / dist;
              let ny = dy / dist;
              
              if (dist === 0) { nx = 1; ny = 0; } 
              
              k.pos.x += nx * overlap;
              k.pos.y += ny * overlap;
              
              const dot = k.velocity.x * nx + k.velocity.y * ny;
              k.velocity.x = (k.velocity.x - 2 * dot * nx) * 0.5; 
              k.velocity.y = (k.velocity.y - 2 * dot * ny) * 0.5;
              
              if (Math.abs(dot) > 5) {
                 if (k.isPlayer) this.addTrauma(0.1);
                 velocity = Math.abs(dot);
              }
          }
      });

      if (collided && k.isPlayer && velocity > 2) {
          soundManager.playImpact(velocity / 15);
      }
  }

  private fireWeapon(kart: Kart) {
      if (kart.lastShotTime > 0) return;
      if (kart.ammo <= 0 && kart.weapon !== WeaponType.BLASTER) {
          kart.weapon = WeaponType.BLASTER; 
          return;
      }

      const stats = WEAPON_STATS[kart.weapon];
      kart.lastShotTime = 60 / stats.fireRate; 

      if (kart.weapon !== WeaponType.BLASTER) {
          kart.ammo--;
      }

      if (this.isVisible(kart.pos)) {
          soundManager.playShoot(kart.weapon);
      }

      if (kart.weapon === WeaponType.MINE || kart.weapon === WeaponType.SPIKES) {
          this.state.projectiles.push({
              id: Math.random().toString(),
              pos: { x: kart.pos.x - Math.cos(kart.rotation)*40, y: kart.pos.y - Math.sin(kart.rotation)*40 },
              velocity: { x: 0, y: 0 },
              radius: 15,
              color: stats.color,
              markedForDeletion: false,
              damage: stats.damage,
              ownerId: kart.id,
              timeLeft: 20, 
              type: kart.weapon, 
              rotation: 0
          });
          return;
      }

      const angle = kart.turretRotation;
      
      for (let i = 0; i < stats.count; i++) {
          const spread = (Math.random() - 0.5) * stats.spread;
          const finalAngle = angle + spread;
          
          this.state.projectiles.push({
              id: Math.random().toString(),
              pos: { 
                  x: kart.pos.x + Math.cos(finalAngle) * (kart.radius + 10), 
                  y: kart.pos.y + Math.sin(finalAngle) * (kart.radius + 10) 
              },
              velocity: { 
                  x: Math.cos(finalAngle) * stats.speed, 
                  y: Math.sin(finalAngle) * stats.speed 
              },
              radius: kart.weapon === WeaponType.CANNON ? 8 : 4,
              color: stats.color,
              markedForDeletion: false,
              damage: stats.damage,
              ownerId: kart.id,
              timeLeft: 2,
              type: kart.weapon,
              rotation: finalAngle,
              isHoming: kart.weapon === WeaponType.MISSILE,
              isLobbed: kart.weapon === WeaponType.BOMB,
              targetId: kart.aiTargetEntityId 
          });
      }

      kart.velocity.x -= Math.cos(angle) * (stats.damage / 10);
      kart.velocity.y -= Math.sin(angle) * (stats.damage / 10);

      if (kart.isPlayer) this.addTrauma(stats.damage / 200);
      
      this.spawnParticle(
          kart.pos.x + Math.cos(angle) * 30, 
          kart.pos.y + Math.sin(angle) * 30, 
          'MUZZLE_FLASH', 
          0.1, 
          stats.color
      );
  }

  private giveRandomWeapon(kart: Kart) {
      const weapons = Object.values(WeaponType).filter(w => w !== WeaponType.BLASTER);
      const pick = weapons[Math.floor(Math.random() * weapons.length)];
      kart.weapon = pick;
      kart.ammo = WEAPON_STATS[pick].ammo;
      
      this.spawnParticle(kart.pos.x, kart.pos.y, 'TEXT', 1, '#fff', pick);
      this.playWeaponPickupEffect(kart.pos, pick);
  }

  private playWeaponPickupEffect(pos: Vector2, weapon: WeaponType) {
      const stats = WEAPON_STATS[weapon];
      const color = stats.color;

      // 1. Primary Halo / Shockwave
      this.spawnParticle(pos.x, pos.y, 'SHOCKWAVE', 0.6, color);

      // 2. Weapon-specific flourishes
      switch(weapon) {
          case WeaponType.MISSILE:
              // Spiral rising particles (green data stream)
              for(let i=0; i<10; i++) {
                  this.state.particles.push({
                      id: Math.random().toString(),
                      pos: { x: pos.x + (Math.random()-0.5)*20, y: pos.y + (Math.random()-0.5)*20 },
                      velocity: { x: 0, y: -20 - Math.random()*20 }, // Moving UP relative to screen (not world z)
                      radius: 3,
                      color: color,
                      life: 0.8,
                      maxLife: 0.8,
                      type: 'SPARK',
                      rotation: 0,
                      markedForDeletion: false,
                      startRadius: 3
                  });
              }
              break;
          
          case WeaponType.MACHINE_GUN:
              // Rapid fire sparks outward
              for(let i=0; i<8; i++) {
                  const angle = (Math.PI*2/8) * i + Math.random();
                  const speed = 15;
                  this.state.particles.push({
                      id: Math.random().toString(),
                      pos: { x: pos.x, y: pos.y },
                      velocity: { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
                      radius: 2,
                      color: color,
                      life: 0.4,
                      maxLife: 0.4,
                      type: 'SPARK',
                      rotation: angle,
                      markedForDeletion: false,
                      startRadius: 2
                  });
              }
              break;

          case WeaponType.CANNON:
          case WeaponType.BOMB:
              // Heavy explosion style pickup
              this.createExplosion(pos, 20, 0, 'none'); // purely visual explosion
              break;

          case WeaponType.MINE:
          case WeaponType.SPIKES:
              // Drop down effect - particles falling?
              // Or just a static ring that fades
              this.spawnParticle(pos.x, pos.y, 'SHOCKWAVE', 1.0, color);
              break;
          
          case WeaponType.SHOTGUN:
               // Wide scatter burst
               for(let i=0; i<15; i++) {
                   const angle = Math.random() * Math.PI * 2;
                   const dist = Math.random() * 30;
                   this.state.particles.push({
                      id: Math.random().toString(),
                      pos: { x: pos.x + Math.cos(angle)*dist, y: pos.y + Math.sin(angle)*dist },
                      velocity: { x: 0, y: 0 },
                      radius: 4,
                      color: color,
                      life: 0.5,
                      maxLife: 0.5,
                      type: 'SPARK',
                      rotation: 0,
                      markedForDeletion: false,
                      startRadius: 4
                   });
               }
               break;
      }
  }

  private damageKart(target: Kart, amount: number, attackerId: string) {
      if (target.markedForDeletion) return;

      target.health -= amount;
      this.spawnParticle(target.pos.x, target.pos.y, 'TEXT', 0.5, '#f00', `-${Math.ceil(amount)}`);
      
      if (target.health <= 0) {
          // Both player and bots die visually here
          this.createExplosion(target.pos, 60, 0, attackerId);
          
          if (target.isPlayer) {
               // Player death is handled in update loop for game over
          } else {
              // Bot dies permanently
              target.markedForDeletion = true;
          }
          
          if (attackerId === 'player') {
              this.state.score += 100;
          }
          
          const killer = attackerId === 'player' ? this.state.player : this.state.enemies.find(e => e.id === attackerId);
          const killerName = killer ? killer.name : 'Unknown';
          this.state.killFeed.push({
              id: Math.random().toString(),
              killer: killerName,
              victim: target.name,
              time: Date.now()
          });
      } else {
          if (target.isBot && target.aiMode !== 'FLEE') {
              target.aiTargetEntityId = attackerId;
          }
      }
  }

  private createExplosion(pos: Vector2, radius: number, damage: number, ownerId: string) {
      for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 10;
          this.state.particles.push({
              id: Math.random().toString(),
              type: 'FIRE',
              pos: { x: pos.x, y: pos.y },
              velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
              radius: 5 + Math.random() * 10,
              color: '#f59e0b',
              life: 0.5 + Math.random() * 0.5,
              maxLife: 1,
              rotation: 0,
              markedForDeletion: false,
              startRadius: 10
          });
      }
      this.spawnParticle(pos.x, pos.y, 'SHOCKWAVE', 0.5, '#fff');
      
      if (this.isVisible(pos)) {
          this.addTrauma(0.5);
          soundManager.playExplosion();
      }

      if (damage > 0) {
          [this.state.player, ...this.state.enemies].filter(k => !k.markedForDeletion).forEach(k => {
              const dist = Math.hypot(k.pos.x - pos.x, k.pos.y - pos.y);
              if (dist < radius) {
                  this.damageKart(k, damage * (1 - dist/radius), ownerId);
              }
          });
      }
  }

  private spawnEnemies(count: number) {
      for (let i = 0; i < count; i++) {
          const classKeys = Object.keys(CAR_STATS) as CarClass[];
          const rndClass = classKeys[Math.floor(Math.random() * classKeys.length)];
          const stats = CAR_STATS[rndClass];
          
          let x = 0, y = 0;
          let safe = false;
          while(!safe) {
              x = Math.random() * this.state.map.width;
              y = Math.random() * this.state.map.height;
              safe = true;
              if (this.checkWallCollision({x, y}, 40)) safe = false;
          }

          this.state.enemies.push({
              id: Math.random().toString(),
              pos: { x, y },
              velocity: { x: 0, y: 0 },
              rotation: Math.random() * Math.PI * 2,
              turretRotation: 0,
              radius: stats.radius,
              color: stats.color,
              health: stats.maxHealth,
              maxHealth: stats.maxHealth,
              weapon: WeaponType.BLASTER,
              ammo: Infinity,
              score: 0,
              isPlayer: false,
              speed: 0,
              acceleration: 0,
              turnSpeed: stats.turnSpeed,
              lastShotTime: 0,
              markedForDeletion: false,
              name: NAMES[Math.floor(Math.random() * NAMES.length)],
              carClass: rndClass,
              drifting: false,
              driftCharge: 0,
              boostTime: 0,
              isBot: true,
              aiMode: 'WANDER',
              aiTimer: 0,
              isDead: false,
              respawnTimer: 0,
              invulnerabilityTimer: 2.0 // Spawning immunity
          });
          
          // Spawn effect
          this.spawnParticle(x, y, 'RESPAWN_BEAM', 1.0, '#ef4444');
      }
  }

  private checkWallCollision(pos: Vector2, radius: number): boolean {
      if (pos.x < radius || pos.y < radius || pos.x > this.state.map.width - radius || pos.y > this.state.map.height - radius) return true;
      for (const obs of this.state.obstacles) {
          if (pos.x > obs.x - radius && pos.x < obs.x + obs.width + radius && 
              pos.y > obs.y - radius && pos.y < obs.y + obs.height + radius) return true;
      }
      return false;
  }

  private spawnParticle(x: number, y: number, type: ParticleType, life: number, color: string, text?: string) {
      this.state.particles.push({
          id: Math.random().toString(),
          pos: { x, y },
          velocity: { x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2 },
          radius: type === 'SHOCKWAVE' ? 10 : 3,
          color,
          life,
          maxLife: life,
          type,
          text,
          rotation: Math.random() * Math.PI * 2,
          markedForDeletion: false,
          startRadius: type === 'SHOCKWAVE' ? 10 : 3
      });
  }

  private draw() {
    const { width, height } = this.canvas;
    const { camera, map } = this.state;
    const ctx = this.ctx;

    ctx.fillStyle = map.bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    
    const shake = this.state.trauma * this.state.trauma * 15;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    ctx.translate(width / 2 - camera.x + sx, height / 2 - camera.y + sy);

    ctx.drawImage(this.bgCanvas, 0, 0);

    this.state.itemPads.forEach(pad => {
        ctx.save();
        ctx.translate(pad.x, pad.y);
        // Draw 3D Pad
        ctx.fillStyle = '#475569';
        ctx.fillRect(-25, -25, 50, 50); // Base shadow
        
        const offsetY = pad.active ? Math.sin(Date.now() / 200) * 5 : 0;
        
        ctx.fillStyle = pad.active ? '#fbbf24' : '#64748b';
        ctx.fillRect(-22, -22 + offsetY, 44, 44);
        
        // Side face
        ctx.fillStyle = pad.active ? '#d97706' : '#475569';
        ctx.fillRect(-22, 22 + offsetY, 44, 5);

        if (pad.active) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px Fredoka';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', 0, offsetY + 2);
        }
        ctx.restore();
    });

    this.state.projectiles.forEach(p => this.drawProjectile(ctx, p));

    // Sort by Y position for fake depth sorting
    const karts = [...this.state.enemies, this.state.player].sort((a, b) => a.pos.y - b.pos.y);
    karts.forEach(k => this.drawKart(ctx, k));

    this.state.particles.forEach(p => this.drawParticle(ctx, p));

    ctx.restore();

    this.drawMinimap(ctx);
  }

  private drawKart(ctx: CanvasRenderingContext2D, k: Kart) {
      if (k.markedForDeletion) return;

      const x = k.pos.x;
      const y = k.pos.y;
      
      ctx.save();
      ctx.translate(x, y);

      if (k.invulnerabilityTimer > 0) {
          const alpha = 1 - (k.invulnerabilityTimer / 2.0);
          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      }

      ctx.rotate(k.rotation);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 25, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#1e293b';
      // Rear Left
      ctx.fillRect(-22, -22, 12, 8);
      // Rear Right
      ctx.fillRect(-22, 14, 12, 8);
      // Front Left
      ctx.fillRect(12, -22, 12, 8);
      // Front Right
      ctx.fillRect(12, 14, 12, 8);

      // Chassis Body (Bottom Layer / Side)
      const bodyColor = k.color;
      const darkerColor = this.adjustColor(bodyColor, -40);
      
      // Side/Bottom pseudo-3D
      ctx.fillStyle = darkerColor;
      ctx.beginPath();
      ctx.roundRect(-25, -15 + 5, 50, 30, 5); 
      ctx.fill();

      // Chassis Top
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-25, -15, 50, 30, 5);
      ctx.fill();
      
      // Highlight on top
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-20, -10, 40, 20);

      // Engine / Rear detail
      ctx.fillStyle = '#334155';
      ctx.fillRect(-25, -8, 8, 16);

      // Drift Fire
      if (k.drifting) {
          ctx.fillStyle = k.driftCharge > 2.5 ? '#ef4444' : '#fbbf24';
          // Sparks near rear wheels
          ctx.beginPath();
          ctx.arc(-22, 20, 3 + Math.random()*3, 0, Math.PI*2);
          ctx.arc(-22, -20, 3 + Math.random()*3, 0, Math.PI*2);
          ctx.fill();
      }

      // Weapon Mount (Fixed forward)
      ctx.fillStyle = '#475569';
      ctx.fillRect(5, -5, 15, 10);
      // Barrel
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(15, -2, 10, 4);

      // Driver Head
      ctx.fillStyle = '#fbbf24'; // Skin tone-ish or helmet
      ctx.beginPath();
      ctx.arc(-5, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      // Goggles
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(-2, -4, 6, 8);

      ctx.restore();

      // Health Bar (Floating above)
      ctx.save();
      ctx.translate(x, y - 50);
      if (k.invulnerabilityTimer > 0) ctx.globalAlpha = 1 - (k.invulnerabilityTimer / 2.0);
      
      // Name
      if (!k.isPlayer) {
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 12px Fredoka';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeText(k.name, 0, -8);
          ctx.fillStyle = '#fff';
          ctx.fillText(k.name, 0, -8);
      }

      // Bar container
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-20, 0, 40, 8, 4);
      ctx.fill();
      
      // Health value
      ctx.fillStyle = k.health / k.maxHealth > 0.5 ? '#22c55e' : '#ef4444';
      const healthW = 36 * (Math.max(0, k.health) / k.maxHealth);
      ctx.beginPath();
      ctx.roundRect(-18, 2, healthW, 4, 2);
      ctx.fill();
      
      ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      
      if (p.isLobbed && p.zHeight) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI*2);
          ctx.fill();
          
          ctx.translate(0, -p.zHeight);
          const scale = 1 + p.zHeight / 100;
          ctx.scale(scale, scale);
      }

      ctx.rotate(p.rotation);
      
      // Cartoon Outline
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = p.color;

      if (p.isLobbed) {
           ctx.beginPath();
           ctx.arc(0, 0, Math.max(0, p.radius), 0, Math.PI * 2);
           ctx.fill();
           ctx.stroke();
      } else {
           // Bullet shape
           ctx.beginPath();
           ctx.roundRect(-8, -4, 16, 8, 2);
           ctx.fill();
           ctx.stroke();
      }
      ctx.restore();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
      if (p.life <= 0) return;
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      
      const alpha = p.life / p.maxLife;

      if (p.type === 'TEXT') {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.font = '900 24px "Black Ops One"';
          ctx.strokeText(p.text || '', 0, 0 - (1-alpha)*30);
          ctx.fillText(p.text || '', 0, 0 - (1-alpha)*30); 
      } else if (p.type === 'LEVEL_TEXT') {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 5;
          ctx.font = '900 64px "Black Ops One"';
          const yOff = (1-alpha) * 50;
          ctx.strokeText(p.text || '', 0, yOff);
          ctx.fillText(p.text || '', 0, yOff);
      } else if (p.type === 'SHOCKWAVE') {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 6;
          const r = p.startRadius + (1 - alpha) * 60;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0, r), 0, Math.PI * 2);
          ctx.stroke();
      } else if (p.type === 'RESPAWN_BEAM') {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-4, -800 + (1-alpha)*800, 8, 800);
          ctx.beginPath();
          ctx.arc(0, 0, 30 * alpha, 0, Math.PI*2);
          ctx.fill();
      } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0, p.radius * alpha), 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.restore();
  }

  private drawMinimap(ctx: CanvasRenderingContext2D) {
      const mapW = this.state.map.width;
      const mapH = this.state.map.height;
      const miniSize = 150;
      const scale = miniSize / Math.max(mapW, mapH);
      const margin = 20;

      const tx = this.canvas.width - miniSize - margin;
      const ty = this.canvas.height - miniSize - margin;

      ctx.save();
      ctx.translate(tx, ty);
      
      // Minimap Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(0, 0, miniSize, miniSize, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      this.state.obstacles.forEach(o => {
          ctx.fillRect(o.x * scale, o.y * scale, o.width * scale, o.height * scale);
      });

      // Item Pads (Yellow dots)
      ctx.fillStyle = '#fbbf24';
      this.state.itemPads.forEach(p => {
         if (p.active) {
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, 3, 0, Math.PI*2);
            ctx.fill();
         }
      });

      // Enemies (Red)
      ctx.fillStyle = '#ef4444';
      this.state.enemies.forEach(e => {
          if (e.markedForDeletion) return;
          ctx.beginPath();
          ctx.arc(e.pos.x * scale, e.pos.y * scale, 3, 0, Math.PI*2);
          ctx.fill();
      });

      // Player (Green Arrow)
      if (!this.state.player.markedForDeletion) {
          ctx.fillStyle = '#22c55e';
          const p = this.state.player;
          ctx.save();
          ctx.translate(p.pos.x * scale, p.pos.y * scale);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.moveTo(5, 0);
          ctx.lineTo(-3, -3);
          ctx.lineTo(-3, 3);
          ctx.fill();
          ctx.restore();
      }

      ctx.restore();
  }
}