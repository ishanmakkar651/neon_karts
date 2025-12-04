

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../services/GameEngine';
import { WeaponType } from '../types';
import { WEAPON_STATS } from '../constants';

interface UIOverlayProps {
  gameEngine: GameEngine | null;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ gameEngine }) => {
  const [hudState, setHudState] = useState({
    health: 100,
    ammo: 0,
    weapon: WeaponType.BLASTER,
    score: 0,
    maxHealth: 100,
    level: 1,
    killFeed: [] as any[],
    boostTime: 0,
    rechargeProgress: 1, // 0 to 1
    lockedTargetId: null as string | null
  });

  const reqRef = useRef<number>(0);

  useEffect(() => {
    if (!gameEngine) return;

    const update = () => {
      const state = gameEngine.state;
      const p = state.player;
      
      const stats = WEAPON_STATS[p.weapon];
      const fireInterval = 60 / stats.fireRate;
      const recharge = Math.min(1, Math.max(0, 1 - (p.lastShotTime / fireInterval)));
      
      // Auto-Lock indicator
      const lockedTargetId = p.aiTargetEntityId || null;

      setHudState({
        health: p.health,
        maxHealth: p.maxHealth,
        ammo: p.ammo,
        weapon: p.weapon,
        score: state.score,
        level: state.level,
        killFeed: [...state.killFeed].reverse(),
        boostTime: p.boostTime,
        rechargeProgress: recharge,
        lockedTargetId
      });

      reqRef.current = requestAnimationFrame(update);
    };

    reqRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [gameEngine]);

  const getWeaponColor = (w: WeaponType) => WEAPON_STATS[w].color;
  const lowHealth = hudState.health < hudState.maxHealth * 0.3;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between overflow-hidden font-fredoka">
      
      {/* Reticle: Fixed to center of screen since camera follows player */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 opacity-30 pointer-events-none flex items-center justify-center">
         {/* Forward Indicator */}
         <div className="w-1 h-8 bg-white/50 mb-12"></div>
         <div className="absolute w-2 h-2 bg-white rounded-full"></div>
      </div>

      {/* Target Lock Indicator (Screen Space) - We need to project world pos to screen, 
          but for simplicity in React, we assume centered camera for now or let the Engine handle drawing specific target reticles. 
          Actually, let's just show a 'LOCKED' text near the crosshair if we have a target.
      */}
      {hudState.weapon === WeaponType.MISSILE && hudState.lockedTargetId && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80px] text-red-500 font-blackops text-lg animate-pulse">
               TARGET LOCKED
           </div>
       )}

      {/* Full Screen Damage Vignette */}
      <div 
         className="absolute inset-0 z-0 transition-opacity duration-300 pointer-events-none"
         style={{ 
           background: lowHealth 
             ? 'radial-gradient(circle, transparent 50%, rgba(220, 38, 38, 0.5) 100%)' 
             : hudState.boostTime > 0 
               ? 'radial-gradient(circle, transparent 50%, rgba(59, 130, 246, 0.3) 100%)'
               : 'none',
         }}
      />

      {/* Header: Score & Kill Feed */}
      <div className="relative z-10 flex justify-between items-start pt-2 px-2">
        {/* Score Card */}
        <div className="flex flex-col gap-2">
           <div className="bg-slate-900/90 text-white p-2 px-4 rounded-xl border-b-4 border-slate-950 shadow-xl transform skew-x-[-5deg]">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider skew-x-[5deg]">Score</div>
              <div className="text-4xl font-black text-yellow-400 skew-x-[5deg] font-blackops drop-shadow-md">
                {hudState.score.toLocaleString()}
              </div>
           </div>
           
           {/* Level Indicator */}
           <div className="w-48 h-6 bg-slate-900/80 rounded-full border-2 border-slate-800 relative overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 bg-blue-600/20"></div>
               <div className="text-xs font-black text-white z-10 font-blackops uppercase">
                   WAVE {hudState.level}
               </div>
           </div>
        </div>

        {/* Kill Feed */}
        <div className="flex flex-col gap-2 items-end w-64">
          {hudState.killFeed.map((kill) => (
             <div key={kill.id} className="bg-slate-800/90 text-white px-3 py-1.5 rounded-lg font-bold text-sm animate-bounce-in shadow-lg border-l-4 border-red-500 flex items-center gap-2">
                <span className={kill.killer === 'YOU' ? 'text-yellow-400' : 'text-red-400'}>{kill.killer}</span>
                <span className="text-slate-400 text-xs">➔</span>
                <span className="text-white">{kill.victim}</span>
             </div>
          ))}
        </div>
      </div>

      {/* Center Prompt */}
      {hudState.score < 100 && (
         <div className="absolute top-[20%] left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-60">
             <div className="bg-black/60 text-white px-6 py-3 rounded-2xl backdrop-blur-sm border-2 border-white/20">
                 <div className="text-sm font-bold">WASD to Drive • SPACE to Fire</div>
                 <div className="text-xs font-bold mt-1">Aim with your car!</div>
             </div>
         </div>
      )}

      {/* Footer: Stats & Loadout */}
      <div className="relative z-10 flex items-end justify-between pb-2 px-2">
         
         {/* Health Bubble */}
         <div className="relative group">
            <div className="bg-slate-900 p-1.5 rounded-2xl border-4 border-slate-800 shadow-2xl flex items-center gap-3 pr-4">
                <div className="bg-slate-800 w-12 h-12 rounded-xl flex items-center justify-center text-2xl">❤️</div>
                <div className="flex flex-col w-48">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-1 uppercase">
                       <span>Health</span>
                       <span>{Math.ceil(hudState.health)}/{hudState.maxHealth}</span>
                    </div>
                    <div className="h-6 w-full bg-slate-800 rounded-lg overflow-hidden relative">
                         <div 
                           className={`h-full transition-all duration-200 ${lowHealth ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} 
                           style={{ width: `${(hudState.health / hudState.maxHealth) * 100}%` }}
                         />
                         {/* Shine effect */}
                         <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20" />
                    </div>
                </div>
            </div>
         </div>

         {/* Weapon Card */}
         <div className="bg-slate-900 p-1.5 rounded-2xl border-4 border-slate-800 shadow-2xl flex items-center gap-3 pr-6 min-w-[200px]">
             <div 
               className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl text-white shadow-inner relative overflow-hidden"
               style={{ backgroundColor: getWeaponColor(hudState.weapon) }}
             >
                 {/* Icon representation */}
                 {hudState.weapon === WeaponType.BLASTER ? '🔫' : 
                  hudState.weapon === WeaponType.MISSILE ? '🚀' :
                  hudState.weapon === WeaponType.BOMB ? '💣' :
                  hudState.weapon === WeaponType.SHOTGUN ? '💥' :
                  hudState.weapon === WeaponType.MINE ? '☢️' : '⚡'}
                 
                 {/* Cooldown overlay */}
                 <div 
                   className="absolute bottom-0 left-0 w-full bg-black/50 transition-all duration-100"
                   style={{ height: `${(1 - hudState.rechargeProgress) * 100}%` }}
                 />
             </div>
             
             <div className="flex flex-col">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipped</div>
                 <div className="text-xl font-black text-white uppercase leading-none mt-1" style={{ color: getWeaponColor(hudState.weapon) }}>
                     {hudState.weapon.replace('_', ' ')}
                 </div>
                 <div className="text-sm font-bold text-slate-500 mt-1">
                     {hudState.weapon === WeaponType.BLASTER ? 'INFINITE' : `${hudState.ammo} AMMO`}
                 </div>
             </div>
         </div>

      </div>
    </div>
  );
};