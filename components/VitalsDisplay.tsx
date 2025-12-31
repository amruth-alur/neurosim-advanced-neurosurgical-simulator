
import React from 'react';
import { Activity, Heart, Thermometer, Gauge, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { VitalsData } from '../types';

interface VitalsDisplayProps {
  vitals: VitalsData;
}

const getTrendIcon = (prev: number, current: number) => {
  if (Math.abs(current - prev) < 1) return <Minus size={12} className="text-slate-500" />;
  return current > prev ? <ArrowUp size={12} className="text-red-400" /> : <ArrowDown size={12} className="text-blue-400" />;
};

const VitalsDisplay: React.FC<VitalsDisplayProps> = ({ vitals }) => {
  return (
    <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 p-5 rounded-xl shadow-2xl flex flex-col gap-4 w-72">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 tracking-widest uppercase">
          <Activity size={14} /> Bio-Telemetry
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
          vitals.status === 'stable' ? 'bg-green-500/20 text-green-400' :
          vitals.status === 'critical' ? 'bg-orange-500/20 text-orange-400' :
          'bg-red-500/20 text-red-500 animate-pulse'
        }`}>
          {vitals.status}
        </span>
      </div>
      
      <div className="space-y-1">
        <VitalItem 
          label="Heart Rate" 
          value={Math.round(vitals.heartRate)} 
          unit="BPM"
          icon={<Heart className="text-rose-500" size={16} />} 
          status={vitals.heartRate < 50 || vitals.heartRate > 120 ? 'critical' : 'stable'}
        />
        <VitalItem 
          label="Blood Pressure" 
          value={`${Math.round(vitals.systolicBp)}/${Math.round(vitals.diastolicBp)}`} 
          unit="mmHg"
          icon={<Gauge className="text-sky-500" size={16} />} 
          status={vitals.systolicBp < 90 || vitals.systolicBp > 160 ? 'critical' : 'stable'}
        />
        <VitalItem 
          label="O2 Saturation" 
          value={Math.round(vitals.oxygenLevel)} 
          unit="%"
          icon={<Thermometer className="text-emerald-500" size={16} />} 
          status={vitals.oxygenLevel < 92 ? 'critical' : 'stable'}
        />
        <VitalItem 
          label="Intracranial Pressure" 
          value={vitals.intracranialPressure.toFixed(1)} 
          unit="mmHg"
          icon={<Activity className="text-amber-500" size={16} />} 
          status={vitals.intracranialPressure > 20 ? 'critical' : 'stable'}
        />
      </div>

      <div className="mt-2 bg-slate-900 rounded p-2 text-[10px] text-slate-500 mono border border-slate-800">
        > MONITORING SENSOR ARRAY ACTIVE<br/>
        > REAL-TIME DATA STREAM: STABLE
      </div>
    </div>
  );
};

const VitalItem = ({ label, value, unit, icon, status = 'stable' }: any) => (
  <div className="flex items-center justify-between p-2 hover:bg-slate-900/50 rounded transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 ${status === 'critical' ? 'animate-pulse border-red-900/50 bg-red-950/20' : ''}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">{label}</span>
        <span className="text-[9px] text-slate-600">{unit}</span>
      </div>
    </div>
    <div className={`text-lg font-mono font-bold tracking-tight ${
      status === 'critical' ? 'text-red-500' : 'text-slate-200'
    }`}>
      {value}
    </div>
  </div>
);

export default VitalsDisplay;
