import React, { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend
} from 'recharts';
import { RaceResult, AIDifficulty } from '../types';
import { AI_CONFIGS } from '../constants';

interface LapTimeChartProps {
  result: RaceResult;
  aiDifficulty?: AIDifficulty;
}

const LapTimeChart: React.FC<LapTimeChartProps> = ({ result, aiDifficulty }) => {
  const { lapTimes, aiLapTimes } = result;

  const bestLap = Math.min(...lapTimes);
  const worstLap = Math.max(...lapTimes);
  const avgLap = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
  const bestLapIndex = lapTimes.indexOf(bestLap);
  const consistency = (1 - (worstLap - bestLap) / avgLap) * 100;

  const aiBestLap = aiLapTimes ? Math.min(...aiLapTimes) : null;
  const aiAvgLap = aiLapTimes
    ? aiLapTimes.reduce((a, b) => a + b, 0) / aiLapTimes.length
    : null;

  const data = lapTimes.map((time, i) => ({
    lap: `L${i + 1}`,
    player: parseFloat(time.toFixed(3)),
    ai: aiLapTimes?.[i] != null ? parseFloat(aiLapTimes[i].toFixed(3)) : undefined,
    isBest: i === bestLapIndex,
  }));

  const yDomain = useMemo(() => {
    const all = [...lapTimes, ...(aiLapTimes || [])];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const pad = (max - min) * 0.35;
    return [
      parseFloat((min - pad).toFixed(2)),
      parseFloat((max + pad * 0.5).toFixed(2)),
    ];
  }, [lapTimes, aiLapTimes]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const playerTime = payload.find((p: any) => p.dataKey === 'player')?.value;
    const aiTime = payload.find((p: any) => p.dataKey === 'ai')?.value;
    const lapIdx = data.findIndex(d => d.lap === label);
    const isBest = lapIdx === bestLapIndex;

    return (
      <div className="bg-zinc-950/95 border border-zinc-800 p-4 rounded-xl shadow-xl backdrop-blur-sm min-w-[160px]">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
        {isBest && (
          <p className="text-[8px] font-black uppercase tracking-widest text-yellow-400 mb-2">★ Best Lap</p>
        )}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-6">
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">You</span>
            <span className="text-sm font-mono font-black text-white">{playerTime?.toFixed(3)}s</span>
          </div>
          {aiTime != null && (
            <div className="flex justify-between items-center gap-6">
              <span className="text-[10px] text-red-400 font-black uppercase tracking-widest">Rival</span>
              <span className="text-sm font-mono font-black text-zinc-300">{aiTime.toFixed(3)}s</span>
            </div>
          )}
          {aiTime != null && (
            <div className="flex justify-between items-center gap-6 pt-2 border-t border-zinc-800">
              <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Gap</span>
              <span
                className={`text-xs font-mono font-black ${
                  playerTime < aiTime ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {playerTime < aiTime ? '' : '+'}{(playerTime - aiTime).toFixed(3)}s
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const improvement = lapTimes[lapTimes.length - 1] - lapTimes[0];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Lap Time Analysis</h3>
        {aiDifficulty && aiDifficulty !== AIDifficulty.OFF && AI_CONFIGS[aiDifficulty] && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-400">
              {AI_CONFIGS[aiDifficulty].label} AI
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-black/50 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-yellow-500/70 mb-1">Best Lap</p>
          <p className="text-lg font-mono font-black text-yellow-400">
            {bestLap.toFixed(3)}
            <span className="text-[10px] text-zinc-600 ml-1">s</span>
          </p>
          <p className="text-[8px] text-zinc-600 font-bold">Lap {bestLapIndex + 1}</p>
        </div>

        <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Average</p>
          <p className="text-lg font-mono font-black text-zinc-300">
            {avgLap.toFixed(3)}
            <span className="text-[10px] text-zinc-600 ml-1">s</span>
          </p>
          <p className="text-[8px] text-zinc-600 font-bold">{lapTimes.length} laps</p>
        </div>

        <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Consistency</p>
          <p
            className={`text-lg font-mono font-black ${
              consistency >= 90 ? 'text-emerald-400' : consistency >= 75 ? 'text-yellow-400' : 'text-red-400'
            }`}
          >
            {consistency.toFixed(1)}
            <span className="text-[10px] text-zinc-600 ml-1">%</span>
          </p>
          <p className="text-[8px] text-zinc-600 font-bold">±{((worstLap - bestLap) / 2).toFixed(3)}s spread</p>
        </div>

        {aiBestLap !== null && aiAvgLap !== null ? (
          <div className="bg-black/50 border border-red-500/20 rounded-lg p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-red-400/70 mb-1">Rival Best</p>
            <p className="text-lg font-mono font-black text-red-400">
              {aiBestLap.toFixed(3)}
              <span className="text-[10px] text-zinc-600 ml-1">s</span>
            </p>
            <p
              className={`text-[8px] font-bold ${
                bestLap < aiBestLap ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {bestLap < aiBestLap ? '▲ You faster' : '▼ Rival faster'}
            </p>
          </div>
        ) : (
          <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Improvement</p>
            <p
              className={`text-lg font-mono font-black ${
                improvement < 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {improvement < 0 ? '' : '+'}{Math.abs(improvement).toFixed(3)}
              <span className="text-[10px] text-zinc-600 ml-1">s</span>
            </p>
            <p className="text-[8px] text-zinc-600 font-bold">L1 → Final</p>
          </div>
        )}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="lap" stroke="#71717a" fontSize={10} tickLine={false} />
            <YAxis
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              tickFormatter={(v: number) => `${v.toFixed(1)}s`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={bestLap}
              stroke="#eab308"
              strokeWidth={1}
              strokeDasharray="4 4"
              label={{ value: 'Best', position: 'right', fontSize: 9, fill: '#eab308' }}
            />
            <ReferenceLine
              y={avgLap}
              stroke="#52525b"
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{ value: 'Avg', position: 'right', fontSize: 9, fill: '#52525b' }}
            />
            <Bar dataKey="player" name="You" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isBest ? '#eab308' : '#10b981'}
                  fillOpacity={entry.isBest ? 1 : 0.7}
                />
              ))}
            </Bar>
            {aiLapTimes && (
              <Line
                type="monotone"
                dataKey="ai"
                name="Rival"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#ef4444', stroke: '#ef4444' }}
                activeDot={{ r: 5 }}
              />
            )}
            {aiLapTimes && (
              <Legend
                iconType="circle"
                wrapperStyle={{
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  paddingTop: '8px',
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LapTimeChart;
