
import React, { useEffect, useState, useRef } from 'react';
import { RaceResult, AIDifficulty } from '../types';
import { AI_CONFIGS } from '../constants';

interface RaceVisualizerProps {
  result: RaceResult | null;
  isSimulating: boolean;
  onAnimationComplete?: () => void;
  aiDifficulty?: AIDifficulty;
}

const RaceVisualizer: React.FC<RaceVisualizerProps> = ({ result, isSimulating, onAnimationComplete, aiDifficulty = AIDifficulty.OFF }) => {
  const [progress, setProgress] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  
  // Player Telemetry
  const [velocity, setVelocity] = useState(0);
  const [engineTemp, setEngineTemp] = useState(80);
  const [brakeTemp, setBrakeTemp] = useState(100);

  // AI Telemetry
  const [aiVelocity, setAiVelocity] = useState(0);
  const [aiEngineTemp, setAiEngineTemp] = useState(80);
  const [aiBrakeTemp, setAiBrakeTemp] = useState(100);
  
  const intervalRef = useRef<number | null>(null);
  const internalProgressRef = useRef(0);
  const internalAiProgressRef = useRef(0);
  const resultRef = useRef<RaceResult | null>(result);
  const onCompleteRef = useRef(onAnimationComplete);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    if (isSimulating) {
      internalProgressRef.current = 0;
      internalAiProgressRef.current = 0;
      
      setProgress(0);
      setAiProgress(0);
      setVelocity(0);
      setEngineTemp(80);
      setBrakeTemp(100);
      setAiVelocity(0);
      setAiEngineTemp(80);
      setAiBrakeTemp(100);

      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = window.setInterval(() => {
        const currentResult = resultRef.current;
        const aiConf = AI_CONFIGS[aiDifficulty] || AI_CONFIGS[AIDifficulty.OFF];
        
        // Player incremental progress
        internalProgressRef.current += 0.5;
        const currentProgress = Math.min(100, internalProgressRef.current);
        setProgress(currentProgress);

        // Performance Ratio Calculation
        // If we have API results, use the actual lap time ratio.
        // Otherwise, use the difficulty modifier as a speed factor.
        let perfRatio = 1.0;
        if (currentResult && currentResult.aiLapTimes) {
          const p = currentResult.lapTimes.reduce((a, b) => a + b, 0);
          const a = currentResult.aiLapTimes.reduce((a, b) => a + b, 0);
          perfRatio = p / a; // If Player is faster (p=200, a=220), ratio is ~0.9. AI is 0.9x as fast.
        } else {
          // Fallback: AI speed is inverse of the lap time modifier
          // e.g., Rookie modifier is 1.15 (15% slower lap time), so speed factor is 1/1.15 ≈ 0.87
          perfRatio = aiDifficulty === AIDifficulty.OFF ? 0 : 1 / aiConf.modifier;
        }

        if (aiDifficulty !== AIDifficulty.OFF) {
          internalAiProgressRef.current += (0.5 * perfRatio);
          const currentAiProgress = Math.min(100, internalAiProgressRef.current);
          setAiProgress(currentAiProgress);
        }

        // Player Target Telemetry
        const targetVel = currentResult ? currentResult.topSpeed : 175;
        const targetEng = currentResult ? currentResult.engineHeat : 90;
        const targetBrk = currentResult ? currentResult.brakeTemp : 240;

        // AI Physics Simulation
        // Difficulty affects how "on the edge" the AI drives.
        // High difficulty (Legend) = Higher top speed, higher temps (pushing harder), lower jitter.
        const aiTargetVel = currentResult?.aiTopSpeed || (targetVel * perfRatio);
        
        // Heat simulation: Aggressive AI runs hotter
        const heatMod = aiDifficulty === AIDifficulty.LEGEND ? 1.1 : (aiDifficulty === AIDifficulty.PRO ? 1.05 : 0.95);
        const aiTargetEng = currentResult?.aiEngineHeat || (targetEng * heatMod);
        const aiTargetBrk = currentResult?.aiBrakeTemp || (targetBrk * heatMod);

        // Smooth Updates with Difficulty-Scaled Jitter
        // Legends have very consistent physics (low jitter), Rookies are erratic.
        const jitterScale = aiConf.jitter || 0.5;
        const updatePhysics = (current: number, target: number, speed: number, baseJitter: number) => {
          const jitter = (Math.random() - 0.5) * (baseJitter * jitterScale);
          const step = (target - current) * speed;
          return current + step + jitter;
        };

        setVelocity(v => updatePhysics(v, targetVel, 0.1, 5));
        setEngineTemp(t => updatePhysics(t, targetEng, 0.02, 0.2));
        setBrakeTemp(b => updatePhysics(b, targetBrk, 0.02, 3));

        if (aiDifficulty !== AIDifficulty.OFF) {
          setAiVelocity(v => updatePhysics(v, aiTargetVel, 0.1, 4));
          setAiEngineTemp(t => updatePhysics(t, aiTargetEng, 0.02, 0.15));
          setAiBrakeTemp(b => updatePhysics(b, aiTargetBrk, 0.02, 2.5));
        }

        if (internalProgressRef.current >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setTimeout(() => {
            onCompleteRef.current?.();
          }, 50);
        }
      }, 50);
    } 
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, aiDifficulty]); 

  const isDone = progress >= 100;
  
  const displayVal = (locked: boolean, sim: number, final: number | undefined) => (locked && final !== undefined ? final : sim);

  const stats = [
    { 
      label: 'Speed', 
      val: displayVal(isDone, velocity, result?.topSpeed), 
      aiVal: displayVal(isDone, aiVelocity, result?.aiTopSpeed),
      unit: 'km/h', 
      color: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      max: 220 
    },
    { 
      label: 'Heat', 
      val: displayVal(isDone, engineTemp, result?.engineHeat), 
      aiVal: displayVal(isDone, aiEngineTemp, result?.aiEngineHeat),
      unit: '°C', 
      color: 'text-orange-400',
      barColor: 'bg-orange-500',
      max: 150 
    },
    { 
      label: 'Brakes', 
      val: displayVal(isDone, brakeTemp, result?.brakeTemp), 
      aiVal: displayVal(isDone, aiBrakeTemp, result?.aiBrakeTemp),
      unit: '°C', 
      color: 'text-red-400',
      barColor: 'bg-red-600',
      max: 600 
    },
    { 
      label: 'Lap', 
      val: isDone ? 5 : (Math.floor(progress / 20) + 1), 
      aiVal: isDone ? 5 : (Math.floor(aiProgress / 20) + 1),
      unit: '/ 5', 
      color: 'text-blue-400', 
      barColor: 'bg-blue-500',
      isLap: true,
      max: 5
    },
    { 
      label: 'Tires', 
      val: displayVal(isDone, (100 - (progress * 0.1)), (100 - (result?.tireWear || 0))), 
      aiVal: 100 - (aiProgress * 0.08),
      unit: '%', 
      color: 'text-zinc-400',
      barColor: 'bg-zinc-600',
      max: 100
    }
  ];

  const playerTimeEstimate = (progress / 100) * (result?.lapTimes.reduce((a,b) => a+b, 0) || 275);
  const aiTimeEstimate = (aiProgress / 100) * (result?.aiLapTimes?.reduce((a,b) => a+b, 0) || 275);
  const splitTime = aiProgress > 0 ? (playerTimeEstimate - aiTimeEstimate) : 0;

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 overflow-hidden relative shadow-inner">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-red-600 animate-pulse' : (result && isDone ? 'bg-emerald-500' : 'bg-zinc-800')}`} />
          {isSimulating ? 'Stint Feed' : (isDone ? 'Session Locked' : 'Pit Wait')}
        </h3>
        {aiProgress > 0 && !isDone && (
          <div className={`px-3 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest ${splitTime < 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            SPLIT: {splitTime < 0 ? '' : '+'}{splitTime.toFixed(3)}s
          </div>
        )}
        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest font-black">
          {isSimulating ? 'Realtime Simulation' : 'Physics Record'}
        </span>
      </div>

      <div className="relative h-24 bg-black rounded-2xl border border-zinc-900 flex items-center px-10 mb-8">
        <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-zinc-900 -translate-y-1/2" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex flex-col opacity-20">
           <div className="flex-1 flex"><div className="w-1/2 bg-white" /><div className="w-1/2 bg-black" /></div>
           <div className="flex-1 flex"><div className="w-1/2 bg-black" /><div className="w-1/2 bg-white" /></div>
        </div>

        { (aiDifficulty !== AIDifficulty.OFF && (result?.aiLapTimes || (isSimulating && aiProgress > 0))) && (
          <div 
            className="absolute transition-all duration-300 ease-linear z-0 opacity-40 grayscale"
            style={{ left: `calc(${aiProgress}% - 14px)`, top: '15%' }}
          >
            <div className="text-[6px] font-black text-center mb-1 tracking-tighter uppercase text-zinc-500">Rival</div>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500"><path d="M10 2H3v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4h-7"/><circle cx="7" cy="18" r="3"/><circle cx="17" cy="18" r="3"/></svg>
          </div>
        )}

        <div 
          className="absolute transition-all duration-300 ease-linear z-10"
          style={{ left: `calc(${progress}% - 14px)`, top: '35%' }}
        >
          <div className={`p-2 rounded-xl transition-colors ${isDone ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-white shadow-lg'} text-black`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10 2H3v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4h-7"/><circle cx="7" cy="18" r="3"/><circle cx="17" cy="18" r="3"/></svg>
          </div>
          <div className={`text-[6px] font-black text-center mt-1 tracking-tighter uppercase ${isDone ? 'text-emerald-500' : 'text-zinc-400'}`}>You</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="p-4 bg-black/40 border border-zinc-900 rounded-2xl flex flex-col justify-between relative group overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">{stat.label}</p>
                <p className={`text-xl font-mono font-black ${stat.color} tracking-tighter`}>
                  {stat.isLap ? stat.val : stat.val.toFixed(1)}
                  <span className="text-[9px] text-zinc-800 ml-1 font-bold">{stat.unit}</span>
                </p>
              </div>
              {aiDifficulty !== AIDifficulty.OFF && aiProgress > 0 && !stat.isLap && (
                <div className="text-right">
                  <p className="text-[7px] text-zinc-700 uppercase font-black tracking-tighter">Rival</p>
                  <p className="text-[10px] font-mono font-bold text-zinc-600 leading-none">
                    {stat.aiVal.toFixed(0)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 relative h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              {/* Rival Indicator (Small Bar Behind) */}
              {aiDifficulty !== AIDifficulty.OFF && aiProgress > 0 && (
                <div 
                  className="absolute top-0 left-0 h-full bg-white/10 transition-all duration-300 ease-out z-0"
                  style={{ width: `${Math.min(100, (stat.aiVal / stat.max) * 100)}%` }}
                />
              )}
              {/* Player Indicator (Main Bar) */}
              <div 
                className={`absolute top-0 left-0 h-full ${stat.barColor} transition-all duration-300 ease-out z-10`}
                style={{ width: `${Math.min(100, (stat.val / stat.max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RaceVisualizer;
