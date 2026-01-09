
import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend 
} from 'recharts';
import { RaceResult, RaceEntry, TelemetrySettings, AIDifficulty } from '../types';
import { AI_CONFIGS } from '../constants';

interface TelemetryDashboardProps {
  result: RaceResult;
  telemetry: TelemetrySettings;
  history?: RaceEntry[];
  notes?: string;
  aiDifficulty?: AIDifficulty;
}

const COMPONENT_DESCRIPTIONS: Record<string, Record<string, string>> = {
  'Top Velocity': {
    base: 'Chassis aerodynamic profile and mechanical efficiency at baseline.',
    engine: 'Total thermodynamic work potential converted into rotational force.',
    mapping: 'Aggressive air-fuel ratios (AFR) and ignition timing maximize top-end power delivery.',
    gears: 'Mechanical leverage optimization. Higher numerical ratios prioritize peak velocity over low-end torque.'
  },
  'Lateral Grip': {
    base: 'Native mechanical grip dictated by track temperature and compound chemistry.',
    aero: 'Vertical load-induced friction. High-velocity airflow generates downforce, compressing the contact patch.',
    psi: 'Elasticity control. Optimal pressure prevents sidewall deflection or crown ballooning during high-G maneuvers.'
  },
  'Thermal Index': {
    base: 'Baseline thermal radiation from continuous high-speed friction and atmospheric heat.',
    bias: 'Braking force distribution. Excessive front bias spikes rotor temperatures during trail braking.',
    engine: 'Combustion heat rejection. High-performance mappings increase thermal stress on the engine block.'
  },
  'Tire Integrity': {
    base: 'Standard vulcanized rubber degradation across the circuit length.',
    psi: 'Heat-induced wear. Sub-optimal pressure causes irregular heat cycles, accelerating rubber breakdown.'
  },
  'Heat Sink': {
    base: 'The chassis and radiator system\'s ability to reject thermal energy into the atmosphere.',
    mapping: 'Reduced thermal margin. Aggressive mapping pushes internal temperatures closer to critical failure limits.'
  }
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    return (
      <div className="bg-zinc-950/95 border border-zinc-800 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,1)] max-w-[320px] backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex justify-between items-start mb-4 border-b border-zinc-800 pb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">
              Physics Diagnostic
            </p>
            <h4 className="text-lg font-black text-white italic uppercase tracking-tighter">
              {label}
            </h4>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-mono text-zinc-600 block">SCORE</span>
            <span className="text-sm font-mono font-black text-zinc-300">{total.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="space-y-5">
          {payload.map((item: any, index: number) => {
            const desc = COMPONENT_DESCRIPTIONS[label]?.[item.dataKey];
            if (!item.value || item.value < 1 || !desc) return null;
            
            const percentage = ((item.value / total) * 100).toFixed(0);
            
            return (
              <div key={index} className="space-y-1.5 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm rotate-45" style={{ backgroundColor: item.fill }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-200">
                      {item.name || item.dataKey}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-zinc-900 rounded-full overflow-hidden">
                       <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: item.fill }} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold min-w-[3ch]">{percentage}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium pl-4 border-l border-zinc-800">
                  {desc}
                </p>
              </div>
            );
          })}
        </div>
        
        <div className="mt-5 pt-3 border-t border-zinc-800/50">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-700 text-center">
            PRO ENGINEER PHYSICS LINK • ACTIVE
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const getDifficultyIndicator = (difficulty?: AIDifficulty) => {
  if (!difficulty || difficulty === AIDifficulty.OFF) return null;
  
  const colors = {
    [AIDifficulty.ROOKIE]: 'bg-emerald-500',
    [AIDifficulty.AMATEUR]: 'bg-blue-500',
    [AIDifficulty.PRO]: 'bg-amber-500',
    [AIDifficulty.LEGEND]: 'bg-red-500',
    [AIDifficulty.OFF]: 'bg-zinc-500'
  };

  const label = AI_CONFIGS[difficulty]?.label || 'Unknown';
  
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 ml-auto">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[difficulty] || 'bg-zinc-500 shadow-[0_0_8px_rgba(255,255,255,0.2)]'}`} />
      <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-400">{label} AI</span>
    </div>
  );
};

const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({ result, telemetry, history = [], notes, aiDifficulty }) => {
  if (!result || !result.lapTimes) return null;

  const lapData = result.lapTimes.map((time, index) => ({
    lap: `Lap ${index + 1}`,
    player: parseFloat((time || 0).toFixed(3)),
    ai: (result.aiLapTimes && result.aiLapTimes[index]) ? parseFloat(result.aiLapTimes[index].toFixed(3)) : undefined
  }));

  const deltaData = result.lapTimes.map((time, index) => {
    if (result.aiLapTimes && result.aiLapTimes[index] !== undefined) {
      return {
        lap: `Lap ${index + 1}`,
        delta: parseFloat(((time || 0) - result.aiLapTimes[index]).toFixed(3)),
        type: 'Rival Gap'
      };
    }
    const delta = index === 0 ? 0 : (time || 0) - (result.lapTimes[index - 1] || 0);
    return {
      lap: `Lap ${index + 1}`,
      delta: parseFloat(delta.toFixed(3)),
      type: 'Pace Delta'
    };
  });

  const stackedMetricsData = useMemo(() => {
    const topSpeed = result.topSpeed || 150;
    const g = result.avgCorneringG || 2.0;
    const bTemp = result.brakeTemp || 200;
    const wear = result.tireWear || 10;
    const eHeat = result.engineHeat || 90;

    return [
      {
        name: 'Top Velocity',
        base: topSpeed * 0.5,
        engine: (telemetry.engineMapping / 5) * (topSpeed * 0.3),
        gears: (1 - Math.max(0, Math.min(1, (telemetry.gearRatio - 2.5) / 4))) * (topSpeed * 0.2),
      },
      {
        name: 'Lateral Grip',
        base: (g * 50) * 0.5,
        aero: (telemetry.aeroDownforce / 100) * ((g * 50) * 0.4),
        psi: (1 - Math.min(1, Math.abs(telemetry.tirePressure - 18) / 12)) * ((g * 50) * 0.1),
      },
      {
        name: 'Thermal Index',
        base: (bTemp / 6) * 0.4,
        bias: (telemetry.brakeBias / 60) * ((bTemp / 6) * 0.3),
        engine: (telemetry.engineMapping / 5) * ((bTemp / 6) * 0.3),
      },
      {
        name: 'Tire Integrity',
        base: (100 - wear) * 0.6,
        psi: (1 - Math.min(1, Math.abs(telemetry.tirePressure - 20) / 20)) * ((100 - wear) * 0.4),
      },
      {
        name: 'Heat Sink',
        base: Math.max(0, 150 - eHeat) * 0.7,
        mapping: (1 - (telemetry.engineMapping / 5)) * Math.max(0, 150 - eHeat) * 0.3,
      }
    ];
  }, [result, telemetry]);

  const historicalProgression = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.slice(-10).map((entry, index) => {
      const laps = entry.result?.lapTimes || [];
      const validLaps = laps.filter(l => typeof l === 'number' && !isNaN(l));
      if (validLaps.length === 0) return { session: index + 1, best: 0, average: 0 };
      const best = Math.min(...validLaps);
      const avg = validLaps.reduce((a, b) => a + b, 0) / validLaps.length;
      return {
        session: index + 1,
        best: parseFloat(best.toFixed(3)),
        average: parseFloat(avg.toFixed(3))
      };
    });
  }, [history]);

  return (
    <div className="TelemetryDashboard space-y-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center mb-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
              {result.aiLapTimes ? 'Player vs Rival Pace (s)' : 'Stint Performance (s)'}
            </h3>
            {getDifficultyIndicator(aiDifficulty)}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="lap" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="player" name="You" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                {result.aiLapTimes && <Line type="monotone" dataKey="ai" name="Rival" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center mb-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
              {result.aiLapTimes ? 'Rival Gap (Δs)' : 'Lap Delta (Δs)'}
            </h3>
            {getDifficultyIndicator(aiDifficulty)}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deltaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="lap" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [`${value > 0 ? '+' : ''}${value}s`, result.aiLapTimes ? 'Gap' : 'Delta']} />
                <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
                <Line type="stepAfter" dataKey="delta" stroke={result.aiLapTimes ? "#ef4444" : "#a855f7"} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col">
          <h3 className="text-xs font-black text-zinc-500 mb-4 uppercase tracking-[0.2em]">Setup Contribution</h3>
          <div className="h-48 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedMetricsData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} width={90} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  content={<CustomBarTooltip />}
                />
                <Bar dataKey="base" name="Base" stackId="a" fill="#3f3f46" />
                <Bar dataKey="engine" name="Engine" stackId="a" fill="#10b981" />
                <Bar dataKey="mapping" name="Mapping" stackId="a" fill="#10b981" />
                <Bar dataKey="gears" name="Gearing" stackId="a" fill="#3b82f6" />
                <Bar dataKey="aero" name="Aero" stackId="a" fill="#3b82f6" />
                <Bar dataKey="psi" name="Pressure" stackId="a" fill="#f97316" />
                <Bar dataKey="bias" name="Bias" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {historicalProgression.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-xs font-black text-zinc-500 mb-6 uppercase tracking-[0.2em]">Evolution of Pace (Last 10 Stints)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="session" stroke="#52525b" fontSize={10} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={10} domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="average" stroke="#3f3f46" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="best" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-xl">
          <h4 className="text-emerald-400 font-black mb-2 uppercase text-[10px] tracking-[0.2em]">Engineering Summary</h4>
          <p className="text-zinc-300 text-sm italic">"{result.summary || 'Simulation complete.'}"</p>
          {notes && (
            <div className="mt-4 pt-4 border-t border-emerald-500/10">
               <h5 className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">Session Notes</h5>
               <p className="text-xs text-zinc-400 italic">"{notes}"</p>
            </div>
          )}
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-xl">
          <h4 className="text-blue-400 font-black mb-2 uppercase text-[10px] tracking-[0.2em]">Technical Directive</h4>
          <p className="text-zinc-300 text-sm leading-relaxed">{result.advice || 'No specific advice for this session.'}</p>
        </div>
      </div>
    </div>
  );
};

export default TelemetryDashboard;
