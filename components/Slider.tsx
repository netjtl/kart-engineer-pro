
import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  description: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, unit = "", onChange, description }) => {
  return (
    <div className="space-y-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{label}</label>
        <span className="text-emerald-400 font-mono text-lg">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
      <p className="text-xs text-zinc-500 italic">{description}</p>
    </div>
  );
};

export default Slider;
