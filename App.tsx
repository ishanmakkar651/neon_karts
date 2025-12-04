

import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameEngine } from './services/GameEngine';
import { CAR_STATS, MAPS } from './constants';
import { CarClass } from './types';
import { soundManager } from './services/SoundManager';

export default function App() {
  const [gameState, setGameState] = useState<'START' | 'LOADING' | 'PLAYING' | 'GAMEOVER'>('START');
  const [lastScore, setLastScore] = useState(0);
  const [selectedMap, setSelectedMap] = useState<string>('GRID');
  const [selectedCar, setSelectedCar] = useState<CarClass>('SPEEDSTER');
  const [nickname, setNickname] = useState("Guest_01");
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const gameRef = useRef<GameEngine | null>(null);

  const startGame = () => {
    if (!nickname.trim()) return;
    soundManager.init(); 
    soundManager.playUiClick();
    
    // Fake loading sequence
    setGameState('LOADING');
    let p = 0;
    const interval = setInterval(() => {
        p += Math.random() * 5;
        if (p >= 100) {
            p = 100;
            clearInterval(interval);
            setTimeout(() => {
                setGameState('PLAYING');
            }, 500);
        }
        setLoadingProgress(p);
    }, 100);
  };

  const handleGameOver = (score: number) => {
    setLastScore(score);
    setGameState('GAMEOVER');
  };

  const handleRestart = () => {
    soundManager.playUiClick();
    setGameState('START'); 
  };

  const playHover = () => soundManager.playUiHover();
  const playClick = () => soundManager.playUiClick();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 font-fredoka select-none text-white">
      <style>{`
        .font-fredoka { font-family: 'Fredoka', sans-serif; }
        .font-blackops { font-family: 'Black Ops One', cursive; }
        .btn-3d {
          transition: all 0.1s;
          transform: translateY(0);
          border-bottom-width: 6px;
        }
        .btn-3d:active {
          transform: translateY(4px);
          border-bottom-width: 2px;
          margin-top: 4px; /* counteract move */
        }
        .animate-float {
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
        .loading-bar-stripes {
            background-image: linear-gradient(
                45deg, 
                rgba(255,255,255,0.15) 25%, 
                transparent 25%, 
                transparent 50%, 
                rgba(255,255,255,0.15) 50%, 
                rgba(255,255,255,0.15) 75%, 
                transparent 75%, 
                transparent
            );
            background-size: 20px 20px;
            animation: move-stripes 1s linear infinite;
        }
        @keyframes move-stripes {
            0% { background-position: 0 0; }
            100% { background-position: 20px 0; }
        }
      `}</style>
      
      {gameState === 'PLAYING' && (
        <>
          <GameCanvas 
            onGameOver={handleGameOver} 
            gameRef={gameRef} 
            mapId={selectedMap}
            carClass={selectedCar}
          />
          <UIOverlay gameEngine={gameRef.current} />
        </>
      )}

      {/* LOADING SCREEN */}
      {gameState === 'LOADING' && (
          <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center">
              <div className="w-1/2 max-w-lg">
                  <div className="text-4xl font-blackops text-center mb-8 animate-pulse text-blue-400 tracking-widest">
                      INITIALIZING ARENA...
                  </div>
                  
                  {/* Progress Bar Container */}
                  <div className="h-8 bg-slate-900 rounded-full border-4 border-slate-800 overflow-hidden relative shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                      <div 
                        className="h-full bg-blue-500 loading-bar-stripes transition-all duration-100 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      ></div>
                  </div>
                  
                  <div className="flex justify-between mt-2 text-xs font-bold text-slate-500 uppercase">
                      <span>Loading Assets</span>
                      <span>{Math.floor(loadingProgress)}%</span>
                  </div>

                  <div className="mt-12 text-center text-slate-400 text-sm font-bold bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <span className="text-yellow-400">TIP:</span> Drive through Item Pads to get weapons. Release drift sparks for a speed boost!
                  </div>
              </div>
          </div>
      )}

      {gameState === 'START' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1e293b]">
           {/* Background Pattern */}
           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]" />
           
           <div className="relative z-10 w-full max-w-6xl h-[85vh] flex gap-6 p-6">
              
              {/* Left Column: Profile & Campaign */}
              <div className="w-1/3 flex flex-col gap-6">
                 {/* Logo */}
                 <div className="bg-slate-800 p-4 rounded-3xl border-b-8 border-slate-950 shadow-xl text-center transform -rotate-2 hover:rotate-0 transition-transform cursor-pointer">
                    <h1 className="text-5xl font-blackops bg-gradient-to-br from-yellow-400 to-orange-500 text-transparent bg-clip-text drop-shadow-sm select-none">NEON<br/>KARTS</h1>
                 </div>

                 {/* Campaign Level Selector (Visual Map Select) */}
                 <div className="bg-slate-800 p-6 rounded-3xl border-b-8 border-slate-950 shadow-xl flex-1 flex flex-col gap-4">
                    <div className="text-center font-bold text-slate-400 uppercase tracking-widest text-sm border-b-2 border-slate-700 pb-2">
                        Campaign Sector
                    </div>
                    <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                       {Object.values(MAPS).map((map, index) => (
                           <button
                             key={map.id}
                             onClick={() => { setSelectedMap(map.id); playClick(); }}
                             className={`group relative p-4 rounded-xl border-b-4 transition-all text-left overflow-hidden ${
                               selectedMap === map.id 
                               ? 'bg-purple-600 border-purple-800 text-white scale-[1.02] shadow-lg' 
                               : 'bg-slate-700 border-slate-900 text-slate-300 hover:bg-slate-600'
                             }`}
                           >
                             <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-black text-white/50 mb-1">LEVEL 0{index + 1}</div>
                                    <div className="font-blackops text-lg">{map.name}</div>
                                </div>
                                {selectedMap === map.id && <div className="text-2xl animate-pulse">◈</div>}
                             </div>
                           </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Center Column: Character Preview */}
              <div className="flex-1 flex flex-col relative">
                  {/* Top Bar: Name Input */}
                  <div className="flex justify-center mb-4">
                      <div className="bg-slate-800 p-2 px-4 rounded-full border-4 border-slate-950 shadow-xl flex items-center gap-2">
                          <span className="text-slate-400 font-bold text-xs uppercase">PILOT ID</span>
                          <input 
                            type="text" 
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="bg-transparent text-center text-lg font-bold text-white focus:outline-none w-32 border-b-2 border-transparent focus:border-blue-500"
                            placeholder="NAME"
                            maxLength={10}
                          />
                      </div>
                  </div>

                  {/* Garage Platform */}
                  <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-slate-950/50 rounded-[100%] blur-xl pointer-events-none"></div>
                  
                  {/* Car Preview */}
                  <div className="flex-1 flex items-center justify-center animate-float pointer-events-none">
                      <div className="relative scale-150">
                          {/* Fake 3D Car */}
                          <div className="relative w-48 h-32 rounded-2xl border-b-[16px] border-black/30 shadow-2xl"
                               style={{ backgroundColor: CAR_STATS[selectedCar].color }}>
                                  {/* Wheels */}
                                  <div className="absolute -left-4 top-4 w-8 h-12 bg-slate-800 rounded-lg border-b-4 border-black/50"></div>
                                  <div className="absolute -right-4 top-4 w-8 h-12 bg-slate-800 rounded-lg border-b-4 border-black/50"></div>
                                  <div className="absolute -left-4 bottom-4 w-8 h-12 bg-slate-800 rounded-lg border-b-4 border-black/50"></div>
                                  <div className="absolute -right-4 bottom-4 w-8 h-12 bg-slate-800 rounded-lg border-b-4 border-black/50"></div>
                                  {/* Top */}
                                  <div className="absolute inset-x-4 -top-8 h-16 bg-white/20 rounded-t-xl backdrop-blur-sm border-t-4 border-white/30"></div>
                                  {/* Head */}
                                  <div className="absolute left-1/2 -translate-x-1/2 -top-12 w-16 h-16 bg-yellow-400 rounded-full border-b-4 border-yellow-600 shadow-lg flex items-center justify-center">
                                      <div className="w-12 h-4 bg-black/80 rounded-full mt-2"></div>
                                  </div>
                          </div>
                      </div>
                  </div>

                  {/* Play Button */}
                  <div className="mb-8 px-12">
                     <button 
                       onClick={startGame}
                       onMouseEnter={playHover}
                       className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 border-green-800 text-white font-black text-4xl py-6 rounded-3xl btn-3d shadow-[0_10px_0_rgb(21,128,61)] flex items-center justify-center gap-4 group transition-all"
                     >
                        <span className="drop-shadow-md">DEPLOY</span>
                        <span className="text-2xl group-hover:translate-x-2 transition-transform">▶</span>
                     </button>
                  </div>
              </div>

              {/* Right Column: Loadout */}
              <div className="w-1/4 flex flex-col gap-6">
                 {/* Stats Panel */}
                 <div className="bg-slate-800 p-6 rounded-3xl border-b-8 border-slate-950 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                       <h2 className="text-xl font-black italic">{CAR_STATS[selectedCar].name}</h2>
                       <span className="text-xs bg-black/30 px-2 py-1 rounded text-slate-400">{selectedCar}</span>
                    </div>
                    
                    <div className="space-y-4">
                       <div>
                          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">SPEED</div>
                          <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(CAR_STATS[selectedCar].maxSpeed / 13) * 100}%` }}></div>
                          </div>
                       </div>
                       <div>
                          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">ARMOR</div>
                          <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                             <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: `${(CAR_STATS[selectedCar].maxHealth / 220) * 100}%` }}></div>
                          </div>
                       </div>
                       <div>
                          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">HANDLING</div>
                          <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                             <div className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${(CAR_STATS[selectedCar].turnSpeed / 0.11) * 100}%` }}></div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Car Selector */}
                 <div className="bg-slate-800 p-6 rounded-3xl border-b-8 border-slate-950 shadow-xl flex-1 flex flex-col">
                     <div className="text-center font-bold text-slate-400 uppercase tracking-widest text-sm mb-4 border-b-2 border-slate-700 pb-2">Select Class</div>
                     <div className="grid grid-cols-1 gap-3 flex-1">
                        {(Object.keys(CAR_STATS) as CarClass[]).map(key => (
                           <button
                             key={key}
                             onClick={() => { setSelectedCar(key); playClick(); }}
                             className={`p-4 rounded-xl border-b-4 font-bold text-center transition-all flex items-center justify-between px-6 ${
                               selectedCar === key 
                               ? 'bg-blue-600 border-blue-800 text-white scale-105 shadow-lg' 
                               : 'bg-slate-700 border-slate-900 text-slate-300 hover:bg-slate-600'
                             }`}
                           >
                             <span>{CAR_STATS[key].name}</span>
                             {selectedCar === key && <span className="text-xs bg-white/20 px-2 rounded">EQUIPPED</span>}
                           </button>
                        ))}
                     </div>
                 </div>
              </div>

           </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 backdrop-blur-sm animate-fade-in font-fredoka">
          <div className="bg-slate-800 p-8 rounded-[3rem] border-b-8 border-slate-950 shadow-2xl max-w-md w-full text-center relative overflow-hidden transform scale-110">
            <h2 className="text-6xl font-blackops text-white mb-2 drop-shadow-lg stroke-black">GAME OVER</h2>
            <div className="text-slate-400 font-bold mb-8 uppercase tracking-widest text-sm">Better luck next time!</div>
            
            <div className="bg-slate-900 p-6 rounded-3xl mb-8 border-4 border-slate-700">
              <div className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">Total Score</div>
              <div className="text-5xl font-black text-yellow-400 drop-shadow-sm">{lastScore.toLocaleString()}</div>
            </div>

            <button 
              onClick={handleRestart}
              onMouseEnter={playHover}
              className="w-full bg-blue-500 hover:bg-blue-400 border-blue-700 text-white font-black text-2xl py-4 rounded-2xl btn-3d shadow-lg"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}