
import { WeaponType } from '../types';

class SoundManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private noiseBuffer: AudioBuffer | null = null;
  private initialized: boolean = false;

  constructor() {
    // Initialize standard or webkit audio context
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.ctx.destination);

    this.generateNoiseBuffer();
  }

  private generateNoiseBuffer() {
    // Create a 2-second white noise buffer for explosions/shotguns
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  public async init() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.initialized = true;
  }

  public playShoot(weapon: WeaponType) {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    switch (weapon) {
      case WeaponType.BLASTER:
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        break;

      case WeaponType.SHOTGUN:
        this.playNoise(0.1, 0.4); // Burst of noise
        // Underlying punch
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;

      case WeaponType.MACHINE_GUN:
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
        break;
      
      case WeaponType.CANNON:
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.4);
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
        break;

      case WeaponType.MISSILE:
        // Hissing launch
        this.playNoise(0.5, 0.2);
        break;

      default:
        // Generic pop for others
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
    }
  }

  public playExplosion() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    
    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.5);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.5);

    // Noise blast
    this.playNoise(0.5, 0.6);
  }

  public playImpact(intensity: number = 1) {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    
    const vol = Math.min(0.5, intensity * 0.2);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playPickup() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.setValueAtTime(1800, t + 0.1);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);
    
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playUiHover() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.05);
    
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playUiClick() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  private playNoise(duration: number, volume: number) {
    if (!this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    
    const gain = this.ctx.createGain();
    source.connect(gain);
    gain.connect(this.masterGain);
    
    // Lowpass filter for explosion muffling
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    source.disconnect();
    source.connect(filter);
    filter.connect(gain);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    source.start(t);
    source.stop(t + duration);
  }
}

export const soundManager = new SoundManager();
