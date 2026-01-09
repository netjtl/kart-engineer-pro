import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TelemetrySettings, Track, WeatherType, RaceResult, TrackHistory, RaceEntry, AIDifficulty } from './types';
import { TRACKS, WEATHER_OPTIONS, AI_CONFIGS } from './constants';
import { simulateRace, verifyLink } from './services/geminiService';
import Slider from './components/Slider';
import RaceVisualizer from './components/RaceVisualizer';
import TelemetryDashboard from './components/TelemetryDashboard';
import TrackComparisonCard from './components/TrackComparisonCard';
import HistoryTrendChart from './components/HistoryTrendChart';

type StintStatus = 'idle' | 'simulating' | 'analyzing';
type ConnectionStatus = 'disconnected' | 'verifying' | 'connected' | 'sandbox';

const App: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  
  const getSavedSetup = () => {
    try {
      const saved = localStorage.getItem('kart_saved_setup');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const savedSetup = getSavedSetup();

  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [selectedTrack, setSelectedTrack] = useState<Track>(() => 
    savedSetup ? (TRACKS.find(t => t.id === savedSetup.trackId) || TRACKS[0]) : TRACKS[0]
  );
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>(() => 
    savedSetup?.weather || WeatherType.SUNNY
  );
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(() => 
    savedSetup?.aiDifficulty || AIDifficulty.OFF
  );
  const [sessionNotes, setSessionNotes] = useState<string>('');
  
  const [telemetry, setTelemetry] = useState<TelemetrySettings>(() => 
    savedSetup?.telemetry || {
      tirePressure: 20,
      gearRatio: 4.5,
      aeroDownforce: 50,
      engineMapping: 3,
      brakeBias: 52,
    }
  );

  const [history, setHistory] = useState<TrackHistory>(() => {
    try {
      const saved = localStorage.getItem('kart_history');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [stintStatus, setStintStatus] = useState<StintStatus>('idle');
  const [currentResult, setCurrentResult] = useState<RaceResult | null>(null);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raceId, setRaceId] = useState<number>(0);

  const lastLoggedRaceId = useRef<number>(-1);
  const isFinalizing = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('kart_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const init = async () => {
      setConnectionStatus('verifying');
      const ok = await verifyLink();
      if (ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (stintStatus === 'simulating' && animationFinished && currentResult && lastLoggedRaceId.current !== raceId && !isFinalizing.current) {
      isFinalizing.current = true;
      lastLoggedRaceId.current = raceId;
      const finalize = () => {
        const newEntry: RaceEntry = {
          timestamp: Date.now(),
          telemetry: { ...telemetry },
          result: currentResult,
          weather: selectedWeather,
          aiDifficulty: aiDifficulty,
          notes: sessionNotes,
        };
        setHistory(prev => {
          const trackHistory = prev[selectedTrack.id] || [];
          return { ...prev, [selectedTrack.id]: [...trackHistory, newEntry] };
        });
        setStintStatus('analyzing');
        isFinalizing.current = false;
      };
      finalize();
    }
  }, [stintStatus, animationFinished, currentResult, raceId, telemetry, selectedTrack, selectedWeather, aiDifficulty, sessionNotes]);

  const handleVerifyKey = async () => {
    setConnectionStatus('verifying');
    setError(null);
    try {
      const ok = await verifyLink(manualKey);
      if (ok) {
        setConnectionStatus('connected');
        setIsSandboxMode(false);
        setShowKeyPanel(false);
      } else {
        setConnectionStatus('disconnected');
        setError("Verification link failed. Please check your API key.");
      }
    } catch (err: any) {
      setConnectionStatus('disconnected');
      setError("Network error during key verification.");
    }
  };

  const handleStartSandbox = () => {
    setIsSandboxMode(true);
    setConnectionStatus('sandbox');
    setShowKeyPanel(false);
    setError(null);
  };

  const handleSaveSetup = () => {
    const config = {
      trackId: selectedTrack.id,
      weather: selectedWeather,
      aiDifficulty,
      telemetry
    };
    localStorage.setItem('kart_saved_setup', JSON.stringify(config));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleRecallSetup = () => {
    const saved = getSavedSetup();
    if (saved) {
      const track = TRACKS.find(t => t.id === saved.trackId) || TRACKS[0];
      setSelectedTrack(track);
      setSelectedWeather(saved.weather);
      setAiDifficulty(saved.aiDifficulty);
      setTelemetry(saved.telemetry);
      setError(null);
    }
  };

  const handleRunRace = useCallback(async () => {
    setError(null);
    setCurrentResult(null);
    setAnimationFinished(false);
    isFinalizing.current = false;
    const newId = Date.now();
    setRaceId(newId);
    setStintStatus('simulating');

    try {
      const trackHistory = history[selectedTrack.id] || [];
      const data = await simulateRace(telemetry, selectedTrack, selectedWeather, isSandboxMode, trackHistory, aiDifficulty, manualKey);
      setCurrentResult(data);
    } catch (err: any) {
      let userFriendlyMessage = "The physics engine encountered an unexpected technical failure.";
      if (err.message === "AUTH_REQUIRED") {
        setShowKeyPanel(true);
        userFriendlyMessage = "Pro Physics requires a Secure Link. Switch to Sandbox or enter a key.";
      } else if (err.message) {
        userFriendlyMessage = `Engine Error: ${err.message}`;
      }
      setError(userFriendlyMessage);
      setStintStatus('idle');
      setCurrentResult(null);
    }
  }, [telemetry, selectedTrack, selectedWeather, history, isSandboxMode, aiDifficulty, manualKey]);

  const updateTelemetry = (key: keyof TelemetrySettings, value: number) => {
    setTelemetry(prev => ({ ...prev, [key]: value }));
  };

  const isSimulating = stintStatus === 'simulating';
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.netlify.app';
  const iframeSnippet = `<iframe src="${currentDomain}" width="100%" height="900px" style="border:none; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></iframe>`;

  return (
    <div className="min-h-screen pb-20 bg-black text-white selection:bg-emerald-500 selection:text-black">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded flex items-center justify-center rotate-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                 <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">
                Kart Engineer <span className="text-emerald-500">Pro</span>
              </h1>
              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1 block">
                Session Control • {connectionStatus === 'connected' ? 'Cloud Verified' : 'Local Ready'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setShowKeyPanel(!showKeyPanel); setShowEmbedCode(false); }}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
                connectionStatus === 'connected' ? 'border-emerald-500/30 bg-emerald-500/5' : 
                connectionStatus === 'sandbox' ? 'border-zinc-700 bg-zinc-900' : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                connectionStatus === 'verifying' ? 'bg-yellow-500 animate-pulse' : 
                connectionStatus === 'sandbox' ? 'bg-blue-500' : 'bg-red-500 animate-pulse'
              }`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                {connectionStatus === 'connected' ? 'Secure Link Active' : 
                 connectionStatus === 'verifying' ? 'Verifying...' : 
                 connectionStatus === 'sandbox' ? 'Sandbox Mode' : 'Link Offline'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${showKeyPanel ? 'rotate-180' : ''}`}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-500 bg-zinc-900/90 border-b border-zinc-800 ${showKeyPanel ? 'max-h-[500px]' : 'max-h-0'}`}>
          <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col md:flex-row items-end gap-6">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Secure Physics Key</label>
                <div className="relative group">
                  <input 
                    type="password"
                    placeholder="Paste your Gemini API key here..."
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700 text-emerald-400"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={handleVerifyKey}
                  className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
                  disabled={!manualKey || connectionStatus === 'verifying'}
                >
                  Verify
                </button>
                <button 
                  onClick={handleStartSandbox}
                  className="flex-1 md:flex-none px-6 py-3 bg-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-zinc-700 transition-all active:scale-95"
                >
                  Sandbox
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button 
                onClick={() => setShowEmbedCode(!showEmbedCode)}
                className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-emerald-500 transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                WordPress Embed Assistant
              </button>
              
              {showEmbedCode && (
                <div className="mt-4 p-4 bg-black border border-zinc-800 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase tracking-widest">
                    Paste this snippet into a "Custom HTML" block on your WordPress site:
                  </p>
                  <div className="relative group">
                    <pre className="p-3 bg-zinc-900 rounded-lg text-xs font-mono text-emerald-500 overflow-x-auto border border-zinc-800">
                      {iframeSnippet}
                    </pre>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(iframeSnippet); alert('Copied to clipboard!'); }}
                      className="absolute top-2 right-2 p-1.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700 hover:text-white hover:bg-zinc-700 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Environment Setup</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handleRecallSetup}
                    disabled={!localStorage.getItem('kart_saved_setup') || isSimulating}
                    className="flex items-center gap-2 px-2 py-1 rounded border border-zinc-700 text-[8px] font-black uppercase tracking-widest text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    Recall
                  </button>
                  <button 
                    onClick={handleSaveSetup}
                    disabled={isSimulating}
                    className={`flex items-center gap-2 px-2 py-1 rounded border text-[8px] font-black uppercase tracking-widest transition-all ${
                      saveStatus === 'saved' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {saveStatus === 'saved' ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17L4 12"/></svg>
                        Saved
                      </>
                    ) : (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase font-black block mb-2">Target Circuit</label>
                  <select 
                    disabled={isSimulating}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50 transition-all"
                    onChange={(e) => setSelectedTrack(TRACKS.find(t => t.id === e.target.value) || TRACKS[0])}
                    value={selectedTrack.id}
                  >
                    {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase font-black block mb-2">Climate Condition</label>
                  <div className="flex flex-wrap gap-2">
                    {WEATHER_OPTIONS.map(w => (
                      <button
                        key={w.id}
                        disabled={isSimulating}
                        onClick={() => setSelectedWeather(w.id)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black border transition-all flex-1 ${selectedWeather === w.id ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase font-black block mb-2">Difficulty Projection</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(AI_CONFIGS).map(([key, config]) => (
                      <button
                        key={key}
                        disabled={isSimulating}
                        onClick={() => setAiDifficulty(key as AIDifficulty)}
                        className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${aiDifficulty === key ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Physics Parameters</h2>
              <div className="space-y-3">
                <Slider label="Tire Pressure" value={telemetry.tirePressure} min={10} max={30} unit=" PSI" description="Pressure dictates the contact patch and mechanical grip." onChange={(v) => !isSimulating && updateTelemetry('tirePressure', v)} />
                <Slider label="Gear Ratio" value={telemetry.gearRatio} min={2.5} max={6.5} step={0.1} description="Shorter gears for acceleration, longer for top speed." onChange={(v) => !isSimulating && updateTelemetry('gearRatio', v)} />
                <Slider label="Aero Load" value={telemetry.aeroDownforce} min={0} max={100} unit="%" description="Downforce improves cornering at the cost of drag." onChange={(v) => !isSimulating && updateTelemetry('aeroDownforce', v)} />
                <Slider label="Mapping" value={telemetry.engineMapping} min={1} max={5} description="Engine aggressiveness vs fuel/heat efficiency." onChange={(v) => !isSimulating && updateTelemetry('engineMapping', v)} />
              </div>
            </section>

            <div className="space-y-3">
              <button
                onClick={handleRunRace}
                disabled={isSimulating}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-tighter text-xl transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 ${isSimulating ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'}`}
              >
                {isSimulating ? 'Projecting Telemetry...' : 'Run Simulation'}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg animate-in slide-in-from-top-2">
                <div className="shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                </div>
                <div className="flex-1 leading-tight">
                  <p className="font-bold text-red-500 mb-0.5">Simulation Error</p>
                  <p className="text-zinc-400 normal-case font-medium">{error}</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="relative rounded-[2rem] overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl min-h-[440px] flex flex-col group">
              <img src={selectedTrack.image} className="absolute inset-0 w-full h-full object-cover opacity-5 mix-blend-overlay pointer-events-none group-hover:scale-105 transition-transform duration-[15s]" />
              <div className="flex-1 flex flex-col p-8 z-10">
                {stintStatus === 'idle' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center text-zinc-700 animate-pulse">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <div className="max-w-xs">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">System Idle</h2>
                      <p className="text-zinc-500 text-xs leading-relaxed uppercase font-bold tracking-widest mt-2">
                        {isSandboxMode ? 'Sandbox engine active.' : 'Pro Link standby. Awaiting telemetry trigger.'}
                      </p>
                    </div>
                  </div>
                )}
                {(stintStatus === 'simulating' || stintStatus === 'analyzing') && (
                  <div className="w-full h-full flex flex-col justify-center">
                    <RaceVisualizer 
                      key={raceId}
                      result={currentResult} 
                      isSimulating={isSimulating} 
                      onAnimationComplete={() => setAnimationFinished(true)}
                      aiDifficulty={aiDifficulty}
                    />
                  </div>
                )}
              </div>
            </div>

            {stintStatus === 'analyzing' && currentResult && (
              <TelemetryDashboard 
                result={currentResult} 
                telemetry={telemetry} 
                history={history[selectedTrack.id] || []} 
                aiDifficulty={aiDifficulty}
              />
            )}
            
            {Object.keys(history).length > 0 && stintStatus !== 'simulating' && (
              <HistoryTrendChart history={history} activeTrackId={selectedTrack.id} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;