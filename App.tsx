
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Loader } from '@react-three/drei';
import { 
  Brain, Activity, RefreshCcw, Terminal, 
  Layers, CheckCircle2, Zap, AlertCircle,
  FileText, ShieldAlert, HeartPulse, User, Microscope,
  Drill, Scissors, Trash2, ZapIcon, Droplets, Pill, Scan, ShieldCheck, Trophy,
  ChevronDown
} from 'lucide-react';
import { GameState, PatientCase, VitalsData, BleedPoint } from './types';
import { generateEmergencyCase, getRealTimeGuidance } from './services/geminiService';
import BrainModel from './components/BrainModel';
import VitalsDisplay from './components/VitalsDisplay';
import CTScanView from './components/CTScanView';
import { SURGICAL_TOOLS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [currentCase, setCurrentCase] = useState<PatientCase | null>(null);
  const [vitals, setVitals] = useState<VitalsData | null>(null);
  const [activeTool, setActiveTool] = useState<string>('scalpel'); // Default to scalpel as drill is removed
  const [loading, setLoading] = useState<boolean>(false);
  const [consultantAdvice, setConsultantAdvice] = useState("Sterile field established. Waiting for scrub-in.");
  const [logs, setLogs] = useState<string[]>([]);
  // Removed 'bone' from surgical layers state
  const [surgicalLayers, setSurgicalLayers] = useState({ dura: true, cortex: true });
  const [medsCooldown, setMedsCooldown] = useState(0);
  const [showCT, setShowCT] = useState(false);
  const [procedureType, setProcedureType] = useState<string>('Craniotomy');
  
  // Scenario Selector State
  const [selectedScenario, setSelectedScenario] = useState<string>('');

  const vitalsRef = useRef<VitalsData | null>(null);

  const startSurgery = async () => {
    setLoading(true);
    try {
      // Pass the selected scenario to the generator
      const newCase = await generateEmergencyCase(selectedScenario);
      setCurrentCase(newCase);
      setProcedureType('Craniotomy'); // Reset default
      
      // REALISM UPDATE: Use the AI-generated ICP to reflect the true severity of the trauma.
      let startICP = newCase.initialVitals.intracranialPressure;
      if (startICP > 48) startICP = 48; 
      if (startICP < 8) startICP = 8; 

      const initial: VitalsData = { 
        ...newCase.initialVitals, 
        heartRate: Math.max(50, newCase.initialVitals.heartRate), 
        systolicBp: Math.max(90, newCase.initialVitals.systolicBp), 
        intracranialPressure: startICP, 
        status: startICP > 25 ? 'critical' : 'stable' 
      };
      
      setVitals(initial);
      vitalsRef.current = initial;
      setGameState(GameState.SURGERY);
      // Initialize without bone
      setSurgicalLayers({ dura: true, cortex: true });
      setLogs(["Trauma Center: Neuro Unit Active.", `CASE: ${newCase.pathology}`, "Patient vitals loaded from triage."]);
      
      // Custom Initial Advice based on Case Type
      if (newCase.pathology.includes('Penetrating')) {
        setConsultantAdvice("CRITICAL: Foreign object visible. Remove it with Forceps BEFORE checking the Dura.");
      } else {
        setConsultantAdvice("Bone flap is already removed. Review CT Scan and focus on the Dura.");
      }
      
      setShowCT(true); // Auto-show CT on start
      setActiveTool(newCase.pathology.includes('Penetrating') ? 'forceps' : 'scalpel');
    } catch (err) {
      console.error(err);
      setConsultantAdvice("Error initializing simulation core. Retry.");
    } finally {
      setLoading(false);
    }
  };

  // Advanced Physiology Engine
  useEffect(() => {
    if (gameState !== GameState.SURGERY || !currentCase || !vitalsRef.current) return;

    const interval = setInterval(() => {
      const v = { ...vitalsRef.current! };
      const untreated = currentCase.bleeds.filter(b => !b.isTreated).length;
      const critical = currentCase.bleeds.filter(b => !b.isTreated && b.severity === 'critical').length;
      
      // 1. ICP Dynamics
      let icpRate = 0.03; 
      if (currentCase.pathology.includes('Epidural')) icpRate = 0.06; 
      if (currentCase.pathology.includes('Posterior')) icpRate = 0.07; // Posterior fossa compresses quickly
      if (currentCase.pathology.includes('Edema')) icpRate = 0.08; // Swelling rises fast

      if (untreated > 0) {
        v.intracranialPressure += (untreated * icpRate) + (critical * 0.03);
      } else {
        // Recovery logic
        let recoveryRate = 1.5;
        // Case 6: Edema does NOT recover easily. It stays high.
        if (currentCase.pathology === 'Massive Cerebral Edema') recoveryRate = 0.2; 
        
        v.intracranialPressure = Math.max(10, v.intracranialPressure - recoveryRate);
      }

      // 2. Cardiovascular Reflexes
      if (v.intracranialPressure > 30) {
        v.systolicBp += (v.intracranialPressure - 30) * 0.1;
        v.heartRate -= (v.intracranialPressure - 30) * 0.05;
      } else {
        if (v.systolicBp > 120) v.systolicBp -= 0.5;
        if (v.heartRate < 80) v.heartRate += 0.2;
      }

      // 3. Status logic
      if (v.intracranialPressure > 40) v.status = 'crashing';
      else if (v.intracranialPressure > 25) v.status = 'critical';
      else v.status = 'stable';

      // 4. Mortality checks
      if (v.heartRate < 15 || v.systolicBp < 30 || v.oxygenLevel < 40 || v.intracranialPressure > 60) {
        v.status = 'brain-dead';
        setGameState(GameState.DEBRIEF);
      }

      vitalsRef.current = v;
      setVitals(v);
      
      if (medsCooldown > 0) setMedsCooldown(c => c - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, currentCase, medsCooldown]);

  const administerMeds = () => {
    if (medsCooldown > 0 || !vitalsRef.current) return;
    
    setMedsCooldown(30); // 30 second cooldown
    const v = { ...vitalsRef.current };
    // Meds are potent: rapid drop in ICP
    v.intracranialPressure = Math.max(10, v.intracranialPressure - 12); 
    v.systolicBp = Math.min(160, v.systolicBp + 10);
    vitalsRef.current = v;
    setVitals(v);
    setLogs(prev => ["Mannitol administered. Osmotic gradient established.", ...prev]);
    setConsultantAdvice("ICP suppressed. Focus on treating the bleeds to ensure permanent stability.");
  };

  const handleSurgicalAction = (targetId: string, point?: any) => {
    if (!currentCase) return;

    let logMsg = "";
    
    // Check if patient is fully treated
    const allTreated = currentCase.bleeds.every(b => b.isTreated);
    const foreignBodyClear = currentCase.isForeignBodyRemoved;

    // --- CASE SPECIFIC ACTION LOGIC ---

    if (activeTool === 'suture') {
        const isEdema = currentCase.pathology.includes('Edema');
        
        if (!allTreated) {
             logMsg = "Cannot close: Active bleeding detected.";
             setConsultantAdvice("You must control all hemorrhage points before closing.");
        }
        else if (!foreignBodyClear) {
             logMsg = "Cannot close: Foreign body detected.";
             setConsultantAdvice("You must remove the foreign object (Forceps) before closing.");
        }
        else if (isEdema) {
             // DECOMPRESSIVE LOGIC - No bone to replace anyway
             setProcedureType('Decompressive Craniectomy');
             logMsg = "Scalp sutured over mesh. Decompression achieved.";
             setGameState(GameState.VICTORY);
        } 
        else {
             // STANDARD CLOSURE
             setProcedureType('Standard Craniotomy');
             logMsg = "Scalp sutured. Surgery complete.";
             setGameState(GameState.VICTORY);
        }
    }
    // HANDLE FOREIGN BODY REMOVAL
    else if (targetId === 'foreign-body' && activeTool === 'forceps') {
       setCurrentCase(prev => prev ? { ...prev, isForeignBodyRemoved: true } : null);
       logMsg = "Foreign object extracted successfully.";
       setConsultantAdvice("Object removed. Now Incise the Dura (Scalpel) to check for bleeds.");
       markStepDone("Prep"); 
       // Also mark 'Remove' if generated
       markStepDone("Remove");
       markStepDone("Foreign");
    }
    // DURA LAYER INTERACTION
    else if (targetId === 'dura-layer' && activeTool === 'scalpel') {
      if (!foreignBodyClear && currentCase.pathology.includes('Penetrating')) {
         logMsg = "OBSTRUCTION: Cannot reflect Dura.";
         setConsultantAdvice("Remove the Foreign Body (Forceps) FIRST. It is pinning the Dura.");
      }
      else if (surgicalLayers.dura) {
        setSurgicalLayers(prev => ({ ...prev, dura: false }));
        logMsg = "Dura reflected. Brain cortex visible.";
        setConsultantAdvice("Suction the pooled blood immediately.");
        markStepDone("Incise");
        markStepDone("Open");
      }
    }
    // BLEED INTERACTION (Must be accessed)
    else if (!surgicalLayers.dura) {
      const bleed = currentCase.bleeds.find(b => b.id === targetId);
      if (bleed) {
        let nextStage = bleed.treatmentStage;

        switch (activeTool) {
          case 'suction':
            if (['hidden', 'exposed', 'accessible'].includes(bleed.treatmentStage)) {
              nextStage = 'suctioned';
              logMsg = `Blood evacuated from ${bleed.vesselName}. Field clearing.`;
              setConsultantAdvice("Vessel is pinpointed. Seal it with the Bipolar Cautery.");
              markStepDone("Suction");
            }
            break;
          case 'cautery':
            if (bleed.treatmentStage === 'suctioned') {
              nextStage = 'cauterized';
              updateBleed(targetId, { isTreated: true, treatmentStage: 'cauterized' });
              
              const remaining = currentCase.bleeds.filter(b => b.id !== targetId && !b.isTreated).length;
              if (remaining === 0) {
                  logMsg = `Ruptured ${bleed.vesselType} sealed. Hemostasis ACHIEVED.`;
                  setConsultantAdvice("Patient stable. Suture to close.");
              } else {
                  logMsg = `Ruptured ${bleed.vesselType} sealed.`;
                  setConsultantAdvice("Keep going. Treat all bleed points.");
              }
              markStepDone("Cauterize");
              markStepDone("Seal");
            }
            break;
          case 'irrigation':
            if (bleed.treatmentStage === 'cauterized') {
              nextStage = 'irrigated';
              logMsg = "Region cleaned. Neural tissue appears viable.";
              setConsultantAdvice("Vessel confirmed stable. Scan for other bleeds or begin closure.");
              markStepDone("Dissect");
              markStepDone("Wash");
            }
            break;
          default:
            logMsg = `The ${activeTool} is ineffective for this stage of hemostasis.`;
        }

        if (nextStage !== bleed.treatmentStage) {
          updateBleed(targetId, { treatmentStage: nextStage });
        }
      }
    } else {
      logMsg = "Dura is intact. Use Scalpel to access the cortex.";
    }

    if (logMsg) setLogs(prev => [logMsg, ...prev.slice(0, 15)]);
  };

  const updateBleed = (id: string, updates: Partial<BleedPoint>) => {
    setCurrentCase(prev => {
      if (!prev) return null;
      return {
        ...prev,
        bleeds: prev.bleeds.map(b => b.id === id ? { ...b, ...updates } : b)
      };
    });
  };

  const markStepDone = (keyword: string) => {
    setCurrentCase(prev => {
      if (!prev) return null;
      return {
        ...prev,
        surgicalSteps: prev.surgicalSteps.map(s => 
          s.instruction.toLowerCase().includes(keyword.toLowerCase()) ? { ...s, isCompleted: true } : s
        )
      };
    });
  };

  if (gameState === GameState.LOBBY) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <Microscope size={800} className="text-white -translate-y-20 -translate-x-20" />
        </div>
        <div className="z-10 text-center max-w-4xl px-4">
           <div className="mb-10 flex justify-center scale-110">
              <div className="p-10 bg-blue-600/10 border-4 border-blue-600/30 rounded-[2.5rem] shadow-[0_0_150px_rgba(37,99,235,0.25)] animate-pulse">
                 <Brain className="w-24 h-24 text-blue-500" />
              </div>
           </div>
           <h1 className="text-8xl font-black mb-6 tracking-tighter text-white">NEURO<span className="text-blue-500">CORE</span></h1>
           <p className="text-slate-400 text-2xl mb-8 font-light max-w-2xl mx-auto leading-relaxed">
             Advanced Neurosurgical Simulator. Trauma Protocol V2.1.
           </p>

           <div className="max-w-md mx-auto mb-10">
              <label className="block text-left text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Select Trauma Scenario</label>
              <div className="relative">
                <select 
                  value={selectedScenario} 
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Random Trauma Case (Internal/External)</option>
                  <option value="Penetrating Brain Injury">Penetrating Injury (Foreign Body)</option>
                  <option value="Massive Cerebral Edema">Internal Injury: Massive Edema</option>
                  <option value="Intracerebral Hemorrhage (ICH)">Internal Injury: Deep Hemorrhage</option>
                  <option value="Epidural Hematoma (EDH)">Traumatic Epidural Hematoma</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={16} className="text-slate-400" />
                </div>
              </div>
           </div>

           <button 
             onClick={startSurgery}
             disabled={loading}
             className="px-20 py-8 bg-blue-600 hover:bg-blue-500 rounded-3xl font-black text-3xl text-white transition-all hover:scale-105 active:scale-95 shadow-2xl disabled:opacity-50"
           >
             {loading ? 'CALIBRATING...' : 'BEGIN SURGERY'}
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#020617] flex flex-col overflow-hidden text-slate-200">
      <header className="px-10 py-6 border-b border-slate-800 bg-slate-950/90 backdrop-blur-3xl flex justify-between items-center z-50">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-5 border-r border-slate-800 pr-12">
             <div className="p-4 bg-blue-600/20 border-2 border-blue-600/30 rounded-2xl">
                <Microscope className="text-blue-500 w-7 h-7" />
             </div>
             <div>
                <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-blue-500 mb-1"> Trauma</h2>
                <div className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Live Procedure
                </div>
             </div>
          </div>
          
          <div className="hidden lg:flex gap-6">
             <div className="px-5 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cerebral Health</span>
                <span className={`text-sm font-mono font-bold tracking-tighter ${
                  vitals && vitals.intracranialPressure > 25 ? 'text-red-500' : 'text-emerald-500'
                }`}>
                  {vitals ? (100 - (vitals.intracranialPressure - 10) * 2.5).toFixed(0) : '0'}%
                </span>
             </div>
             <div className="px-5 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-center">
                <button 
                  onClick={() => setShowCT(true)}
                  className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                >
                  <Scan size={18} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">View CT Scan</span>
                </button>
             </div>
             <div className="px-5 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col">
                <button 
                  onClick={administerMeds}
                  disabled={medsCooldown > 0}
                  className={`flex items-center gap-2 transition-all ${medsCooldown > 0 ? 'opacity-30' : 'hover:text-blue-400'}`}
                >
                   <Pill size={16} className={medsCooldown > 0 ? '' : 'animate-bounce'} />
                   <span className="text-[9px] font-black uppercase tracking-wider">Stabilize (Meds)</span>
                   {medsCooldown > 0 && <span className="text-[10px] font-mono">[{medsCooldown}s]</span>}
                </button>
             </div>
          </div>
        </div>

        <button 
          onClick={() => setGameState(GameState.LOBBY)}
          className="group p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-red-950/30 hover:border-red-500/50 transition-all"
        >
          <RefreshCcw size={22} className="text-slate-400 group-hover:text-red-500 transition-colors" />
        </button>
      </header>

      <div className="flex-1 relative flex overflow-hidden">
        <aside className="w-[360px] border-r border-slate-800 bg-slate-950/60 p-6 flex flex-col gap-6 backdrop-blur-3xl">
           {vitals && <VitalsDisplay vitals={vitals} />}
           
           <div className="flex-1 flex flex-col bg-slate-900/30 border border-slate-800/50 rounded-[2.5rem] p-6 min-h-0">
              <div className="flex items-center gap-4 mb-4 border-b border-slate-800/40 pb-4">
                 <Terminal size={18} className="text-blue-500" />
                 <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Surgical Log</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                 {logs.map((log, i) => (
                   <div key={i} className="text-[11px] font-mono leading-relaxed border-l-2 border-blue-500/40 pl-3 py-1.5 bg-blue-500/5 rounded-r-lg">
                      <span className="text-slate-300">{log}</span>
                   </div>
                 ))}
              </div>
           </div>
        </aside>

        <main className="flex-1 relative bg-black cursor-crosshair">
           {/* UPDATED CAMERA POSITION */}
           <Canvas 
             camera={{ position: [0, 0, 11], fov: 45 }} 
             gl={{ antialias: true, localClippingEnabled: true }}
           >
              <color attach="background" args={['#1a1a1a']} />
              <Environment preset="city" />
              <Suspense fallback={null}>
                {currentCase && (
                  <BrainModel 
                    bleeds={currentCase.bleeds} 
                    onInteractBleed={handleSurgicalAction}
                    activeTool={activeTool}
                    layers={surgicalLayers}
                    pathology={currentCase.pathology}
                    isForeignBodyRemoved={currentCase.isForeignBodyRemoved}
                  />
                )}
              </Suspense>
           </Canvas>
           <Loader />

           {showCT && currentCase && (
             <CTScanView 
               bleeds={currentCase.bleeds} 
               pathology={currentCase.pathology} 
               report={currentCase.ctReport}
               onClose={() => setShowCT(false)} 
             />
           )}

           <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] pointer-events-none">
              <div className="bg-slate-950/95 border border-blue-500/30 backdrop-blur-3xl p-6 rounded-[30px] shadow-2xl flex gap-6 pointer-events-auto">
                 <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl">
                    <Zap className="text-blue-500 w-8 h-8" />
                 </div>
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 block mb-1">Sr. Consultant Instruction</span>
                    <p className="text-base text-blue-50 font-bold leading-tight">
                      "{consultantAdvice}"
                    </p>
                 </div>
              </div>
           </div>

           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 p-4 bg-slate-950/90 backdrop-blur-3xl border border-slate-800 rounded-[40px] shadow-2xl">
              {SURGICAL_TOOLS.map(tool => (
                <button 
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`group relative flex flex-col items-center justify-center w-20 h-20 xl:w-24 xl:h-24 rounded-[28px] transition-all duration-300 border-2 ${
                    activeTool === tool.id 
                    ? 'bg-blue-600 border-blue-300 shadow-xl scale-110 -translate-y-4' 
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-2xl mb-1">
                    {tool.id === 'drill' && <Drill size={28} />}
                    {tool.id === 'scalpel' && <Scissors size={28} />}
                    {tool.id === 'suction' && <Trash2 size={28} />}
                    {tool.id === 'cautery' && <ZapIcon size={28} />}
                    {tool.id === 'irrigation' && <Droplets size={28} />}
                    {tool.id === 'forceps' && <Layers size={28} />}
                    {tool.id === 'suture' && <ShieldCheck size={28} />}
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${activeTool === tool.id ? 'text-white' : 'text-slate-500'}`}>
                    {tool.id}
                  </span>
                </button>
              ))}
           </div>
        </main>

        <aside className="w-[360px] border-l border-slate-800 bg-slate-950/60 p-6 flex flex-col gap-6 backdrop-blur-3xl">
           <div className="bg-slate-900/30 border border-slate-800/50 rounded-[2.5rem] p-6 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-4 mb-6 border-b border-slate-800/40 pb-4">
                 <FileText size={18} className="text-slate-500" />
                 <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Procedure Checklist</h3>
              </div>
              
              {currentCase && (
                <div className="mb-4 p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl">
                   <h4 className="text-[9px] text-blue-400 font-bold uppercase mb-1">Primary Pathology</h4>
                   <p className="text-xs text-white font-mono">{currentCase.pathology}</p>
                </div>
              )}

              <div className="space-y-6 overflow-y-auto scrollbar-hide pr-2">
                 {currentCase?.surgicalSteps.map((step, i) => (
                   <div key={i} className={`flex gap-4 items-start transition-all ${step.isCompleted ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                      <div className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        step.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'
                      }`}>
                         {/* Checkmark icon removed */}
                      </div>
                      <div className="flex flex-col gap-1">
                         <span className={`text-xs font-bold leading-snug ${step.isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                           {step.instruction}
                         </span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-red-950/20 border border-red-900/40 p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                 <ShieldAlert size={18} className="text-red-500" />
                 <h3 className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">Physiological Alert</h3>
              </div>
              <p className="text-[11px] text-red-100/70 leading-relaxed italic">
                Cushing's triad detected. Keep ICP below 25mmHg to prevent brainstem herniation.
              </p>
           </div>
        </aside>
      </div>

      {/* DEATH SCREEN */}
      {gameState === GameState.DEBRIEF && (
        <div className="absolute inset-0 z-[200] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-12 text-center">
           <div className="max-w-2xl w-full">
              <AlertCircle size={80} className="text-red-600 mx-auto mb-8" />
              <h2 className="text-6xl font-black text-white mb-6 tracking-tighter uppercase">Case Terminated</h2>
              
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-10 text-left">
                 <h4 className="text-[11px] font-black uppercase text-slate-500 mb-4">Post-Op Analysis</h4>
                 <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                       <span className="text-xs text-slate-400">Final ICP:</span>
                       <span className="text-sm font-mono text-red-500">{vitals?.intracranialPressure.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                       <span className="text-xs text-slate-400">Cause of Death:</span>
                       <span className="text-xs font-bold text-red-400 uppercase">Herniation / Cardiovascular Collapse</span>
                    </div>
                 </div>
                 <p className="mt-6 text-sm text-slate-400 italic">
                   "You must work faster once the dura is opened. Every second of bleed-pool adds exponential ICP pressure. Use the stabilizer meds to buy time."
                 </p>
              </div>

              <button 
                onClick={() => setGameState(GameState.LOBBY)}
                className="px-16 py-6 bg-white text-slate-950 font-black text-xl rounded-2xl hover:bg-slate-200 transition-all shadow-2xl"
              >
                RETURN TO HQ
              </button>
           </div>
        </div>
      )}

      {/* VICTORY SCREEN */}
      {gameState === GameState.VICTORY && (
        <div className="absolute inset-0 z-[200] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-12 text-center">
           <div className="max-w-3xl w-full">
              <div className="flex justify-center mb-8 relative">
                 <div className="absolute animate-ping opacity-30 bg-emerald-500 rounded-full w-24 h-24"></div>
                 <Trophy size={80} className="text-emerald-500 relative z-10" />
              </div>
              <h2 className="text-6xl font-black text-white mb-2 tracking-tighter uppercase">Success</h2>
              <p className="text-xl text-emerald-400 font-bold mb-8 uppercase tracking-widest">{procedureType} Complete</p>
              
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-3xl p-8 mb-10 text-left relative overflow-hidden">
                 {/* Decorative background element */}
                 <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <Brain size={200} className="text-white" />
                 </div>

                 <h4 className="text-[11px] font-black uppercase text-emerald-600 mb-6">Operative Summary</h4>
                 
                 <div className="grid grid-cols-2 gap-8 mb-6 relative z-10">
                    <div>
                        <div className="text-[10px] uppercase text-emerald-500/50 font-bold mb-1">Patient Diagnosis</div>
                        <div className="text-sm font-bold text-white mb-4">{currentCase?.pathology}</div>
                        
                        <div className="text-[10px] uppercase text-emerald-500/50 font-bold mb-1">Procedure Performed</div>
                        <div className="text-sm font-bold text-white">{procedureType}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-emerald-500/50 font-bold mb-1">Final Intracranial Pressure</div>
                        <div className="text-3xl font-mono font-bold text-emerald-400 mb-4">{vitals?.intracranialPressure.toFixed(1)} <span className="text-sm text-emerald-600">mmHg</span></div>
                        
                        <div className="text-[10px] uppercase text-emerald-500/50 font-bold mb-1">Neuro-Status</div>
                        <div className="text-sm font-bold text-white uppercase flex items-center gap-2">
                           <CheckCircle2 size={14} className="text-emerald-500" />
                           Stable / Reactive Pupils
                        </div>
                    </div>
                 </div>

                 <p className="mt-6 text-sm text-emerald-200/80 italic border-t border-emerald-900/30 pt-4">
                   "Excellent work, Doctor. The hematoma was evacuated efficiently, and the dura was sealed perfectly. The patient is stable and responsive."
                 </p>
              </div>

              <button 
                onClick={() => setGameState(GameState.LOBBY)}
                className="px-16 py-6 bg-blue-600 text-white font-black text-xl rounded-2xl hover:bg-blue-500 transition-all shadow-2xl hover:scale-105"
              >
                NEXT PATIENT
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
