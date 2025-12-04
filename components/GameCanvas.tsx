

import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../services/GameEngine';
import { CarClass } from '../types';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  gameRef: React.MutableRefObject<GameEngine | null>;
  mapId: string;
  carClass: CarClass;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameRef, mapId, carClass }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Difficulty is now dynamic/progressive, handled internally by GameEngine
    const game = new GameEngine(canvasRef.current, mapId, carClass, onGameOver);
    gameRef.current = game;
    game.start();

    // Auto focus for keyboard events
    canvasRef.current.focus();

    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, [onGameOver, gameRef, mapId, carClass]);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full cursor-crosshair touch-none outline-none bg-slate-900"
      tabIndex={0}
    />
  );
};