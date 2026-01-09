
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrackHistory, Track, RaceEntry } from '../types';
import { TRACKS } from '../constants';

interface HistoryTrendChartProps {
  history: TrackHistory;
  activeTrackId: string;
}

const HistoryTrendChart: React.FC<HistoryTrendChartProps> = ({ history, activeTrackId }) => {
  const maxSessions = useMemo(() => {
    const values = Object.values(history) as RaceEntry[][];
    if (values.length === 0) return 0;
    return Math.max(0, ...values.map(h => h.length));
  }, [history]);

  const chartData = useMemo(() => {
    if (maxSessions === 0) return [];
    const data: any[] = [];
    for (let i = 0; i < maxSessions; i++) {
      const sessionPoint: any = { session: i + 1 };
      TRACKS.forEach(track => {
        const trackRuns = history[track.id];
        if (trackRuns && trackRuns[i] && trackRuns[i].result && trackRuns[i].result.lapTimes && trackRuns[i].result.lapTimes.length > 0) {
          const validLaps = trackRuns[i].result.lapTimes.filter(l => typeof l === 'number' && !isNaN(l));
          if (validLaps.length > 0) {
            sessionPoint[track.id] = Math.min(...validLaps);
          }
        }
      });
      data.push(sessionPoint);
    }
    return data;
  }, [history, maxSessions]);

  if (maxSessions < 1 || chartData.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Global Performance Comparison</h3>
          <p className="text-[10px] text-zinc-600">Cross-track progression (Best Lap vs Session Count)</p>
        </div>
        <div className="text-[10px] font-bold uppercase text-emerald-500 flex items-center gap-2">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live Analysis
        </div>
      </div>
      
      <div className="h-64 w-full" style={{ minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="session" 
              stroke="#71717a" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              label={{ value: 'Session Number', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#71717a' }}
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }}
              labelStyle={{ color: '#71717a', marginBottom: '4px', fontWeight: 'bold' }}
              formatter={(value: number, name: string) => {
                const trackName = TRACKS.find(t => t.id === name)?.name || name;
                return [`${value.toFixed(3)}s`, trackName];
              }}
              labelFormatter={(label) => `Session ${label}`}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle" 
              wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }} 
            />
            
            {TRACKS.map(track => {
              const isActive = track.id === activeTrackId;
              const hasData = history[track.id] && history[track.id].length > 0;
              if (!hasData) return null;

              return (
                <Line
                  key={track.id}
                  type="monotone"
                  dataKey={track.id}
                  name={track.name}
                  stroke={isActive ? '#10b981' : '#3f3f46'}
                  strokeWidth={isActive ? 3 : 1.5}
                  strokeOpacity={isActive ? 1 : 0.4}
                  dot={{ r: isActive ? 4 : 2, fill: isActive ? '#10b981' : '#3f3f46', strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: isActive ? '#10b981' : '#3f3f46', strokeWidth: 2, fill: '#09090b' }}
                  animationDuration={1500}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-4">
        {TRACKS.map(track => (
          <div key={track.id} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${track.id === activeTrackId ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
            <span className={`text-[10px] uppercase font-bold tracking-tight ${track.id === activeTrackId ? 'text-zinc-200' : 'text-zinc-600'}`}>
              {track.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryTrendChart;
