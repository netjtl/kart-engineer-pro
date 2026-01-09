
import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Track, RaceEntry, TelemetrySettings } from '../types';

interface TrackComparisonCardProps {
  track: Track;
  history: RaceEntry[];
  onResetTrack: (trackId: string) => void;
  isActive: boolean;
  onLoadTelemetry: (telemetry: TelemetrySettings, notes?: string) => void;
}

const TrackComparisonCard: React.FC<TrackComparisonCardProps> = ({ 
  track, 
  history, 
  onResetTrack, 
  isActive,
  onLoadTelemetry 
}) => {
  const hasHistory = history.length > 0;
  
  // Compute Best Lap and the entry associated with it for Quick-Load
  const { bestLap, bestEntry } = useMemo(() => {
    if (!hasHistory) return { bestLap: null, bestEntry: null };
    let best = Infinity;
    let entry: RaceEntry | null = null;
    history.forEach(h => {
      const minInRun = Math.min(...h.result.lapTimes);
      if (minInRun < best) {
        best = minInRun;
        entry = h;
      }
    });
    return { bestLap: best, bestEntry: entry };
  }, [history, hasHistory]);

  const lastEntry = hasHistory ? history[history.length - 1] : null;
  const lastBestLap = lastEntry ? Math.min(...lastEntry.result.lapTimes) : null;

  // Calculate Delta: Last Run vs All-time Best (prior to last run)
  const delta = useMemo(() => {
    if (history.length < 2 || !lastBestLap || !bestLap) return null;
    const previousEntries = history.slice(0, -1);
    const prevBest = Math.min(...previousEntries.flatMap(h => h.result.lapTimes));
    return lastBestLap - prevBest;
  }, [history, lastBestLap, bestLap]);

  // Sparkline data (last 10 sessions)
  const sparkData = useMemo(() => {
    return history.slice(-10).map((h, i) => ({
      val: Math.min(...h.result.lapTimes),
      index: i
    }));
  }, [history]);

  return (
    <div className={`bg-zinc-900 border transition-all duration-500 rounded-xl overflow-hidden flex flex-col h-full group relative ${
      isActive ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50' : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="relative h-24 overflow-hidden">
        <img 
          src={track.image} 
          alt={track.name} 
          className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
        
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {bestEntry && (
            <button 
              onClick={(e) => { e.stopPropagation(); onLoadTelemetry(bestEntry.telemetry, bestEntry.notes); }}
              className="p-1.5 bg-emerald-500 text-black rounded-md border border-emerald-400 hover:bg-emerald-400 transition-all shadow-lg"
              title="Load Best Setup"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5l5 5 5-5m-5 5V3" />
              </svg>
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onResetTrack(track.id); }}
            className="p-1.5 bg-zinc-950/80 rounded-md border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50 transition-all"
            title="Reset track history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-2 left-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black uppercase tracking-tighter italic">{track.name}</h4>
            {isActive && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
          </div>
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{track.type}</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col space-y-4">
        {hasHistory ? (
          <>
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Personal Best</p>
                {delta !== null && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${delta <= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {delta <= 0 ? '' : '+'}{delta.toFixed(3)}s
                  </span>
                )}
              </div>
              <p className="text-2xl font-mono text-white leading-none tracking-tighter">
                {bestLap?.toFixed(3)}<span className="text-xs text-zinc-600 ml-1">s</span>
              </p>
            </div>

            <div className="h-10 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <YAxis domain={['auto', 'auto']} hide />
                  <Line 
                    type="monotone" 
                    dataKey="val" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={false} 
                    animationDuration={1000} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
              <div>
                <p className="text-[8px] text-zinc-600 uppercase font-black">Total Runs</p>
                <p className="text-xs font-mono text-zinc-300">{history.length}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-zinc-600 uppercase font-black">Last Setup</p>
                <p className="text-[9px] font-mono text-zinc-400">
                  {lastEntry?.telemetry.tirePressure}PSI / {lastEntry?.telemetry.gearRatio}G
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[9px] text-zinc-500 leading-tight italic line-clamp-2">
                "{lastEntry?.notes || lastEntry?.result.summary}"
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed border-zinc-800 rounded-lg opacity-40">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[10px] uppercase font-black tracking-widest">No Logs Yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackComparisonCard;
