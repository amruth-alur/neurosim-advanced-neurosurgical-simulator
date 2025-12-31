
import React, { useEffect, useRef } from 'react';
import { BleedPoint, TraumaPathology } from '../types';
import { Scan, X } from 'lucide-react';

interface CTScanViewProps {
  bleeds: BleedPoint[];
  pathology: TraumaPathology;
  report: string;
  onClose: () => void;
}

const CTScanView: React.FC<CTScanViewProps> = ({ bleeds, pathology, report, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // CT Scan Visualization Logic
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 100; // Scale 3D units to pixels

    // 1. Black Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 2. Brain Matter (Gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
    ctx.fillStyle = '#334155'; // Dark slate gray
    ctx.fill();

    // 3. Ventricles (Darker fluid in middle)
    ctx.beginPath();
    // Simplified butterfly shape for ventricles
    ctx.moveTo(centerX - 10, centerY - 20);
    ctx.quadraticCurveTo(centerX - 30, centerY - 40, centerX - 10, centerY + 10);
    ctx.moveTo(centerX + 10, centerY - 20);
    ctx.quadraticCurveTo(centerX + 30, centerY - 40, centerX + 10, centerY + 10);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // 4. Render Bleeds (Hyperdensity)
    bleeds.forEach(bleed => {
      // Map 3D pos (x, y, z) to Top-down 2D (x, z)
      // Assuming coordinates from BrainModel: X is left/right, Z is front/back
      const x = centerX + bleed.position[0] * scale;
      const y = centerY + bleed.position[2] * scale;

      ctx.beginPath();
      
      if (pathology.includes('Epidural')) {
        // Lens shape approximation
        ctx.ellipse(x, y, bleed.size * scale, bleed.size * scale * 0.6, Math.PI / 4, 0, Math.PI * 2);
      } else if (pathology.includes('Subdural')) {
        // Crescent shape approximation (arc)
        ctx.arc(centerX, centerY, 145, 0, Math.PI, false); // Simplified
        ctx.arc(x, y, bleed.size * scale * 1.5, 0, Math.PI * 2);
      } else {
        // Intracerebral - Blob
        ctx.arc(x, y, bleed.size * scale, 0, Math.PI * 2);
      }

      ctx.fillStyle = '#ffffff'; // Acute blood is bright white on CT
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 5. Overlay Scan Lines / Noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < height; i += 4) {
      ctx.fillRect(0, i, width, 1);
    }
    
    // 6. Labels
    ctx.font = '12px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('R', 20, centerY);
    ctx.fillText('L', width - 20, centerY);
    ctx.fillText('A', centerX, 20);
    ctx.fillText('P', centerX, height - 20);
    ctx.fillText('WL: 40 WW: 80', 20, height - 20); // Window Level/Width standard for Brain

  }, [bleeds, pathology]);

  return (
    <div className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-8">
      <div className="bg-black border-2 border-slate-700 rounded-xl shadow-2xl flex flex-col max-w-4xl w-full h-[600px] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-4">
            <Scan className="text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wider">SIEMENS SOMATOM FORCE</h2>
              <p className="text-xs text-slate-400 font-mono">NON-CONTRAST HEAD CT • SLICE 14/32</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Viewer */}
          <div className="flex-1 bg-black flex items-center justify-center relative border-r border-slate-800">
             <canvas 
               ref={canvasRef} 
               width={512} 
               height={512} 
               className="w-full h-full object-contain opacity-90"
             />
             <div className="absolute top-4 left-4 text-slate-500 font-mono text-[10px]">
               kVp: 120<br/>
               mA: 300<br/>
               FOV: 240mm
             </div>
          </div>

          {/* Radiologist Report Side Panel */}
          <div className="w-80 bg-slate-900/50 p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Patient Data</h3>
              <div className="space-y-1 font-mono text-sm text-slate-300">
                <div className="flex justify-between"><span>ID:</span> <span>{Math.floor(Math.random()*100000)}</span></div>
                <div className="flex justify-between"><span>DOB:</span> <span>19XX-05-12</span></div>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3">Radiologist Findings</h3>
              <div className="bg-black/40 border border-slate-800 p-4 rounded-lg">
                <p className="font-mono text-sm text-green-400 leading-relaxed mb-4">
                  > {pathology.toUpperCase()} DETECTED.
                </p>
                <p className="font-sans text-sm text-slate-300 leading-6">
                  {report}
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
              <h4 className="text-red-500 font-bold text-xs uppercase mb-1">Diagnostic Impression</h4>
              <p className="text-red-200 text-sm">Immediate neurosurgical intervention recommended.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTScanView;
